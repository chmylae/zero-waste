"""ZERO WASTE AI 3.0

Public site + citizen waste reports + personal account + company workspace + admin panel.
All 2.x API routes are kept; new routes are added below them.
"""
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, send_file, abort
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
from datetime import datetime, timedelta, date
from pathlib import Path
from collections import defaultdict, deque
import sqlite3, csv, io, math, os, re, json, secrets, sys, time, uuid

try:
    from PIL import Image, ImageOps
except ImportError:  # Pillow is in requirements.txt; the app still runs without it
    Image = None

BASE = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get('ZERO_WASTE_DB', BASE / 'zero_waste.db'))
UPLOAD_DIR = BASE / 'static' / 'uploads'
REPORT_DIR = UPLOAD_DIR / 'reports'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_IMAGE_SIZE = 8 * 1024 * 1024
MATERIALS = ('Plastic', 'Metal', 'Organic', 'Paper', 'Glass', 'Other')

# ---- new catalogs (3.0) ----
REPORT_TYPES = ('household', 'plastic', 'construction', 'hazardous', 'organic', 'tires', 'metal', 'electronics', 'paper', 'glass')
HAZARD_TYPES = {'hazardous', 'tires', 'electronics'}
VOLUMES = {'bag': 1, 'few': 2, 'container': 3, 'heap': 4, 'truck': 5}
STATUSES = ('new', 'progress', 'resolved', 'rejected')
CITIES = ('Астана', 'Алматы', 'Шымкент', 'Қарағанды', 'Ақтөбе', 'Тараз', 'Павлодар', 'Өскемен', 'Семей', 'Атырау', 'Қостанай',
          'Қызылорда', 'Орал', 'Петропавл', 'Ақтау', 'Түркістан', 'Көкшетау', 'Талдықорған', 'Жезқазған', 'Екібастұз', 'Қонаев')
KZ_BOUNDS = (40.0, 56.0, 46.0, 88.0)  # lat min/max, lng min/max
REPORTS_PER_DAY = int(os.environ.get('ZERO_WASTE_REPORTS_PER_DAY', 10))
NAME_RE = re.compile(r"^[^\W\d_]+(?:[ \-'][^\W\d_]+)*$", re.UNICODE)
EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
PHONE_RE = re.compile(r'^\+?[0-9 ()\-]{6,20}$')

app = Flask(__name__)


def _secret_key():
    env = os.environ.get('ZERO_WASTE_SECRET')
    if env:
        return env
    key_file = BASE / '.secret_key'
    if not key_file.exists():
        key_file.write_text(secrets.token_hex(32))
    return key_file.read_text().strip()


app.secret_key = _secret_key()
app.config.update(
    MAX_CONTENT_LENGTH=MAX_IMAGE_SIZE + 512 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.environ.get('ZERO_WASTE_HTTPS') == '1',
    PERMANENT_SESSION_LIFETIME=timedelta(days=30),
)


def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _columns(con, table):
    return {r['name'] for r in con.execute(f'PRAGMA table_info({table})').fetchall()}


def init_db():
    with db() as con:
        con.executescript('''
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS waste_records(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, material TEXT NOT NULL, amount REAL NOT NULL, unit TEXT NOT NULL, cost REAL NOT NULL, source TEXT NOT NULL, note TEXT DEFAULT '', FOREIGN KEY(user_id) REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS waste_scans(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, filename TEXT NOT NULL, material TEXT NOT NULL, confidence REAL NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS recycling_points(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, material TEXT NOT NULL, address TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, phone TEXT DEFAULT '', is_demo INTEGER DEFAULT 0, created_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, created_at TEXT NOT NULL, city TEXT DEFAULT '', address TEXT DEFAULT '', lat REAL NOT NULL, lng REAL NOT NULL, types TEXT NOT NULL, volume TEXT NOT NULL, severity INTEGER NOT NULL, composition TEXT NOT NULL, description TEXT DEFAULT '', reporter_name TEXT DEFAULT '', photo TEXT NOT NULL, thumb TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', admin_comment TEXT DEFAULT '', updated_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS report_events(id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER NOT NULL, admin_id INTEGER, at TEXT NOT NULL, status TEXT NOT NULL, comment TEXT DEFAULT '');
        CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
        ''')
        # 3.0 migration: roles, account type, profile fields, blocking.
        cols = _columns(con, 'users')
        for name, ddl in (('role', "TEXT NOT NULL DEFAULT 'user'"), ('account_type', "TEXT NOT NULL DEFAULT 'company'"),
                          ('city', "TEXT DEFAULT ''"), ('phone', "TEXT DEFAULT ''"), ('is_blocked', 'INTEGER NOT NULL DEFAULT 0'),
                          ('last_login', 'TEXT')):
            if name not in cols:
                con.execute(f'ALTER TABLE users ADD COLUMN {name} {ddl}')
        row = con.execute('SELECT id FROM users WHERE email=?', ('demo@zerowaste.ai',)).fetchone()
        if not row:
            cur = con.execute('INSERT INTO users(company,name,email,password,created_at,account_type) VALUES(?,?,?,?,?,?)',
                ('EcoFactory Demo', 'Demo Manager', 'demo@zerowaste.ai', generate_password_hash('demo1234'), datetime.now().isoformat(timespec='seconds'), 'company'))
            uid = cur.lastrowid
            samples = [
                (0,'Plastic',125,'kg',62500,'Packaging','Қаптама қалдықтары'), (1,'Metal',48,'kg',38400,'Cutting','Металл кесінділері'),
                (2,'Organic',210,'kg',31500,'Processing','Органикалық қалдық'), (3,'Paper',75,'kg',15000,'Packaging','Қағаз қалдықтары'),
                (4,'Plastic',98,'kg',49000,'Packaging','Пластик қаптама'), (5,'Metal',35,'kg',28000,'Cutting','Металл кесінділері'),
                (6,'Organic',185,'kg',27750,'Processing','Органикалық қалдық'), (7,'Paper',62,'kg',12400,'Packaging','Қағаз қалдықтары'),
                (8,'Plastic',112,'kg',56000,'Packaging','Пластик қаптама'), (9,'Metal',41,'kg',32800,'Cutting','Металл кесінділері'),
                (10,'Organic',160,'kg',24000,'Processing','Органикалық қалдық'), (11,'Paper',54,'kg',10800,'Packaging','Қағаз қалдықтары')]
            today = date.today()
            for days, material, amount, unit, cost, source, note in samples:
                con.execute('INSERT INTO waste_records(user_id,date,material,amount,unit,cost,source,note) VALUES(?,?,?,?,?,?,?,?)',
                    (uid, (today-timedelta(days=days)).isoformat(), material, amount, unit, cost, source, note))
            demo_points = [
                ('Демо пункт · Сарыарқа', 'Plastic', 'Астана · демонстрациялық нүкте', 51.1694, 71.4491),
                ('Демо пункт · Есіл', 'Paper', 'Астана · демонстрациялық нүкте', 51.1282, 71.4304),
                ('Демо пункт · Алматы ауданы', 'Metal', 'Астана · демонстрациялық нүкте', 51.1500, 71.4700)]
            for name, material, address, lat, lng in demo_points:
                con.execute('INSERT INTO recycling_points(user_id,name,material,address,lat,lng,is_demo,created_at) VALUES(?,?,?,?,?,?,1,?)',
                    (uid, name, material, address, lat, lng, datetime.now().isoformat(timespec='seconds')))
        demo_user = con.execute('SELECT id FROM users WHERE email=?', ('demo@zerowaste.ai',)).fetchone()
        if demo_user:
            existing_points = con.execute('SELECT COUNT(*) FROM recycling_points WHERE user_id=?', (demo_user['id'],)).fetchone()[0]
            if existing_points == 0:
                demo_points = [
                    ('Демо пункт · Сарыарқа', 'Plastic', 'Астана · демонстрациялық нүкте', 51.1694, 71.4491),
                    ('Демо пункт · Есіл', 'Paper', 'Астана · демонстрациялық нүкте', 51.1282, 71.4304),
                    ('Демо пункт · Алматы ауданы', 'Metal', 'Астана · демонстрациялық нүкте', 51.1500, 71.4700)]
                for name, material, address, lat, lng in demo_points:
                    con.execute('INSERT INTO recycling_points(user_id,name,material,address,lat,lng,is_demo,created_at) VALUES(?,?,?,?,?,?,1,?)',
                        (demo_user['id'], name, material, address, lat, lng, datetime.now().isoformat(timespec='seconds')))
        # Administrator account: created from env or with the documented default; password must be changed after first login.
        admin_email = os.environ.get('ZERO_WASTE_ADMIN_EMAIL', 'admin@zerowaste.kz').strip().lower()
        admin_pass = os.environ.get('ZERO_WASTE_ADMIN_PASSWORD', 'ZeroWaste2026!')
        if not con.execute("SELECT 1 FROM users WHERE role='admin'").fetchone():
            existing = con.execute('SELECT id FROM users WHERE email=?', (admin_email,)).fetchone()
            if existing:
                con.execute("UPDATE users SET role='admin' WHERE id=?", (existing['id'],))
            else:
                con.execute("INSERT INTO users(company,name,email,password,created_at,role,account_type) VALUES(?,?,?,?,?,'admin','company')",
                    ('Zero Waste AI', 'Администратор', admin_email, generate_password_hash(admin_pass), datetime.now().isoformat(timespec='seconds')))


# ---------------- security helpers (3.0) ----------------
_attempts = defaultdict(deque)


def client_ip():
    return (request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0]).strip()


def rate_limited(key, limit, window):
    """True when `key` already used `limit` hits within `window` seconds (sliding window, in memory)."""
    now = time.time(); q = _attempts[key]
    while q and q[0] < now - window:
        q.popleft()
    return len(q) >= limit


def hit(key):
    _attempts[key].append(time.time())


def csrf_token():
    if '_csrf' not in session:
        session['_csrf'] = secrets.token_urlsafe(24)
    return session['_csrf']


app.jinja_env.globals['csrf_token'] = csrf_token


@app.before_request
def csrf_protect():
    if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
        sent = request.headers.get('X-CSRF-Token') or request.form.get('_csrf')
        if not sent or not secrets.compare_digest(sent, session.get('_csrf', '')):
            if request.path.startswith('/api/'):
                return jsonify({'ok': False, 'code': 'csrf', 'message': 'Бетті жаңартып, қайта көріңіз.'}), 400
            flash('csrf', 'error')
            return redirect(request.path)


@app.before_request
def load_user():
    """Re-check the session user on every request so blocking or role changes apply at once."""
    uid = session.get('user_id')
    request.user = None
    if uid:
        with db() as con:
            u = con.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
        if not u or u['is_blocked']:
            session.pop('user_id', None)
        else:
            request.user = u


@app.after_request
def security_headers(resp):
    resp.headers.setdefault('X-Content-Type-Options', 'nosniff')
    resp.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
    resp.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    return resp


def api_error(code, message, status=400):
    return jsonify({'ok': False, 'code': code, 'message': message}), status


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not getattr(request, 'user', None):
            if request.path.startswith('/api/'):
                return jsonify({'ok': False, 'code': 'auth', 'message': 'Сессия аяқталды. Қайта кіріңіз.'}), 401
            return redirect(url_for('login', next=request.full_path.rstrip('?')))
        return fn(*args, **kwargs)
    return wrapper


def company_required(fn):
    """Company workspace tools: company accounts and administrators only."""
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        u = request.user
        if u['account_type'] != 'company' and u['role'] != 'admin':
            if request.path.startswith('/api/'):
                return api_error('company_only', 'Бұл бөлім тек кәсіпорын аккаунтына ашық.', 403)
            return redirect(url_for('cabinet'))
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if request.user['role'] != 'admin':
            if request.path.startswith('/api/'):
                return api_error('forbidden', 'Бұл әрекет тек әкімшіге рұқсат етілген.', 403)
            abort(403)
        return fn(*args, **kwargs)
    return wrapper


def current_user_id():
    return session.get('user_id')


def user_public(u):
    if not u:
        return None
    return {'id': u['id'], 'name': u['name'], 'email': u['email'], 'company': u['company'], 'role': u['role'],
            'account_type': u['account_type'], 'city': u['city'] or '', 'phone': u['phone'] or '', 'created_at': u['created_at']}


def record_data():
    with db() as con:
        return [dict(r) for r in con.execute('SELECT * FROM waste_records WHERE user_id=? ORDER BY date DESC,id DESC', (current_user_id(),)).fetchall()]


def safe_float(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_next(target):
    return target if target and target.startswith('/') and not target.startswith('//') else None


# ---------------- pages ----------------
def render_site(view):
    return render_template('site.html', view=view, me=user_public(request.user), cities=CITIES)


@app.route('/')
def index():
    return render_site('home')


@app.route('/map')
def map_page():
    return render_site('map')


@app.route('/report')
@login_required
def report_page():
    return render_site('report')


@app.route('/cabinet')
@login_required
def cabinet():
    return render_site('user')


@app.route('/admin')
@admin_required
def admin_page():
    return render_site('admin')


@app.route('/dashboard')
@login_required
def dashboard():
    # 2.x URL kept: the personal account replaces it.
    return redirect(url_for('cabinet'))


@app.route('/classic')
@company_required
def classic_dashboard():
    # The 2.x control centre stays available unchanged.
    return render_template('dashboard.html', user=request.user['name'], company=request.user['company'])


@app.route('/classic/home')
def classic_home():
    return render_template('landing.html')


def _redirect_after_login(u):
    nxt = safe_next(request.args.get('next') or request.form.get('next'))
    if nxt:
        return redirect(nxt)
    return redirect(url_for('admin_page') if u['role'] == 'admin' else url_for('cabinet'))


@app.route('/login', methods=['GET','POST'])
def login():
    if request.user and request.method == 'GET':
        return _redirect_after_login(request.user)
    form = {}
    if request.method == 'POST':
        email = request.form.get('email','').strip().lower()
        password = request.form.get('password','')
        form = {'email': email}
        key = f'login:{client_ip()}:{email}'
        if rate_limited(key, 5, 15*60):
            flash('too_many', 'error')
            return render_template('login.html', form=form), 429
        with db() as con:
            user = con.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        if user and check_password_hash(user['password'], password):
            if user['is_blocked']:
                flash('blocked', 'error')
                return render_template('login.html', form=form), 403
            _attempts.pop(key, None)
            session.clear()
            session.permanent = bool(request.form.get('remember'))
            session.update(user_id=user['id'], name=user['name'], company=user['company'], email=user['email'])
            csrf_token()
            with db() as con:
                con.execute('UPDATE users SET last_login=? WHERE id=?', (datetime.now().isoformat(timespec='seconds'), user['id']))
            return _redirect_after_login(user)
        hit(key)
        flash('bad_login', 'error')
    return render_template('login.html', form=form)


def validate_registration(f):
    errors = {}
    account_type = f.get('account_type') if f.get('account_type') in ('citizen', 'company') else 'citizen'
    name = ' '.join(f.get('name','').split())
    email = f.get('email','').strip().lower()
    company = ' '.join(f.get('company','').split())
    city = f.get('city','').strip()
    phone = f.get('phone','').strip()
    password = f.get('password','')
    if not (2 <= len(name) <= 60) or not NAME_RE.match(name):
        errors['name'] = 'err_name'
    if len(email) > 120 or not EMAIL_RE.match(email):
        errors['email'] = 'err_email'
    if account_type == 'company' and not (2 <= len(company) <= 80):
        errors['company'] = 'err_company'
    if city and city not in CITIES:
        errors['city'] = 'err_city'
    if phone and not PHONE_RE.match(phone):
        errors['phone'] = 'err_phone'
    if not (8 <= len(password) <= 64) or not re.search(r'[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІіЁё]', password) or not re.search(r'\d', password):
        errors['password'] = 'err_password'
    elif email and email.split('@')[0] and email.split('@')[0] in password.lower():
        errors['password'] = 'err_password_email'
    if password != f.get('password2',''):
        errors['password2'] = 'err_password2'
    if not f.get('terms'):
        errors['terms'] = 'err_terms'
    data = {'account_type': account_type, 'name': name, 'email': email, 'company': company if account_type == 'company' else '',
            'city': city, 'phone': phone}
    return errors, data


@app.route('/register', methods=['GET','POST'])
def register():
    if request.user and request.method == 'GET':
        return redirect(url_for('cabinet'))
    errors, form = {}, {'account_type': 'citizen'}
    if request.method == 'POST':
        if request.form.get('website'):  # honeypot field, invisible to people
            return redirect(url_for('register'))
        ipkey = f'register:{client_ip()}'
        if rate_limited(ipkey, 5, 3600):
            flash('too_many_reg', 'error')
            return render_template('register.html', errors={}, form=request.form, cities=CITIES), 429
        errors, form = validate_registration(request.form)
        if not errors:
            try:
                with db() as con:
                    cur = con.execute('INSERT INTO users(company,name,email,password,created_at,role,account_type,city,phone,last_login) VALUES(?,?,?,?,?,?,?,?,?,?)',
                        (form['company'], form['name'], form['email'], generate_password_hash(request.form['password']),
                         datetime.now().isoformat(timespec='seconds'), 'user', form['account_type'], form['city'], form['phone'],
                         datetime.now().isoformat(timespec='seconds')))
                hit(ipkey)
                session.clear()
                session.update(user_id=cur.lastrowid, name=form['name'], company=form['company'], email=form['email'])
                csrf_token()
                flash('welcome', 'ok')
                return redirect(url_for('cabinet'))
            except sqlite3.IntegrityError:
                errors['email'] = 'err_email_taken'
        flash('fix_errors', 'error')
    return render_template('register.html', errors=errors, form=form, cities=CITIES)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))


@app.errorhandler(403)
def forbidden(_e):
    return render_template('error.html', code=403, me=user_public(getattr(request, 'user', None))), 403


@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith('/api/'):
        return api_error('not_found', 'Табылмады.', 404)
    return render_template('error.html', code=404, me=user_public(getattr(request, 'user', None))), 404


# ---------------- 2.x workspace API (kept; now company accounts only) ----------------
@app.get('/api/records')
@company_required
def get_records():
    return jsonify(record_data())


@app.post('/api/records')
@company_required
def add_record():
    data = request.get_json(silent=True) or request.form
    try:
        record_date = data.get('date') or date.today().isoformat()
        datetime.strptime(record_date, '%Y-%m-%d')
        material = str(data.get('material','')).strip()
        amount = float(data.get('amount',0)); unit = str(data.get('unit','kg'))
        cost = float(data.get('cost',0)); source = str(data.get('source','Other')).strip(); note = str(data.get('note','')).strip()[:300]
        if not material or amount <= 0 or amount > 1e7 or cost < 0 or unit not in ('kg','ton','pcs','L'):
            raise ValueError
        with db() as con:
            cur = con.execute('INSERT INTO waste_records(user_id,date,material,amount,unit,cost,source,note) VALUES(?,?,?,?,?,?,?,?)',
                (current_user_id(),record_date,material,amount,unit,cost,source,note))
        return jsonify({'ok':True,'id':cur.lastrowid,'message':'Жазба сақталды.'})
    except (ValueError, TypeError):
        return jsonify({'ok':False,'code':'check_data','message':'Деректерді тексеріңіз. Күні мен мөлшері дұрыс болуы керек.'}),400


@app.delete('/api/records/<int:record_id>')
@company_required
def delete_record(record_id):
    with db() as con:
        cur = con.execute('DELETE FROM waste_records WHERE id=? AND user_id=?', (record_id,current_user_id()))
    return jsonify({'ok':cur.rowcount > 0})


@app.get('/api/summary')
@company_required
def summary():
    rows = record_data(); total = sum(r['amount'] for r in rows); cost = sum(r['cost'] for r in rows)
    materials = {}; monthly = {}
    for r in rows:
        materials[r['material']] = materials.get(r['material'],0) + r['amount']
        month = r['date'][:7]; monthly[month] = monthly.get(month,0) + r['amount']
    sorted_months = sorted(monthly.items())[-6:]
    return jsonify({'total':round(total,1),'cost':round(cost,0),'records':len(rows),'materials':materials,
        'months':{'labels':[x[0] for x in sorted_months],'values':[round(x[1],1) for x in sorted_months]},
        'recycled':round(total*0.62,1),'landfill':round(total*0.38,1)})


def forecast_for(rows):
    if not rows: return {'next':0,'next30':0,'confidence':0,'trend':'Дерек жеткіліксіз','daily':0,'method':'Дерек жеткіліксіз'}
    last14 = [r for r in rows if r['date'] >= (date.today()-timedelta(days=14)).isoformat()]
    base_rows = last14 or rows
    unique_days = max(1, len({r['date'] for r in base_rows}))
    daily = sum(r['amount'] for r in base_rows) / min(14, unique_days)
    cutoff = (date.today()-timedelta(days=7)).isoformat()
    older = [r for r in rows if r['date'] < cutoff]; newer = [r for r in rows if r['date'] >= cutoff]
    old_avg = sum(r['amount'] for r in older) / max(1,len(older)); new_avg = sum(r['amount'] for r in newer) / max(1,len(newer))
    trend = 'Өсу қаупі' if newer and older and new_avg > old_avg*1.1 else ('Төмендеу' if newer and older and new_avg < old_avg*0.9 else 'Тұрақты')
    return {'next':round(daily*7,1),'next30':round(daily*30,1),'confidence':min(90, 50+len(rows)*2),'trend':trend,'daily':round(daily,1),'method':'Соңғы деректердің орташа күндік көлемі; ML моделі емес.'}


@app.get('/api/forecast')
@company_required
def forecast():
    return jsonify(forecast_for(record_data()))


@app.post('/api/analyze')
@company_required
def analyze():
    data = request.get_json(silent=True) or {}
    try:
        production = float(data.get('production',0)); waste = float(data.get('waste',0)); material = data.get('material','Plastic')
        if production <= 0 or waste < 0 or waste > production: raise ValueError
    except (ValueError,TypeError):
        return jsonify({'ok':False,'message':'Өндіріс көлемі 0-ден үлкен, қалдық көлемі теріс емес және өндірістен аспауы керек.'}),400
    thresholds = {'Plastic':4.0,'Metal':3.0,'Organic':6.0,'Paper':5.0,'Glass':2.5}; rate = waste/production*100; target = thresholds.get(material,4.0)
    if rate <= target: status,level,advice='Қалыпты','low','Көрсеткіш бақылау шегінде. Осы режимді сақтап, апталық мониторинг жүргізіңіз.'
    elif rate <= target*1.5: status,level,advice='Назар аудару керек','medium','Шикізат беру дәлдігін, жабдық баптауын және оператор әрекеттерін тексеріңіз.'
    else: status,level,advice='Жоғары тәуекел','high','Қалдық нормадан жоғары. Ақаудың негізгі себебін анықтап, шикізат пен жабдық параметрлерін салыстырыңыз.'
    return jsonify({'ok':True,'rate':round(rate,2),'target':target,'status':status,'level':level,'potential':round(max(0,waste-production*target/100),2),'advice':advice,
        'explanation':'Ережелік demo-модель. Нақты ML моделі ретінде ұсынылмайды.'})


@app.get('/api/recommendations')
@company_required
def recommendations():
    rows=record_data(); totals={}
    for r in rows: totals[r['material']]=totals.get(r['material'],0)+r['amount']
    if not totals: return jsonify([])
    largest=max(totals,key=totals.get)
    tips={'Plastic':'Қаптама өлшемін оңтайландырып, қайта пайдаланылатын тасымалдау қораптарын сынаңыз.','Metal':'Кесу карталарын nesting тәсілімен оңтайландырып, металл қиындысын бөлек жинаңыз.','Organic':'Шикізатты сақтау мерзімін бақылап, органикалық қалдықты компост бағытына бөліңіз.','Paper':'Қаптама макетін оңтайландырып, қағазды бөлек жинаңыз.','Glass':'Сынуды азайту үшін тасымалдау кезіндегі қорғаныш төсемдерін тексеріңіз.'}
    return jsonify([{'title':f'{largest} қалдығына басымдық беріңіз','text':tips.get(largest,'Қалдық көзін зерттеңіз.'),'impact':'Жоғары','type':largest},
        {'title':'Әр ауысымда өлшеу жүргізіңіз','text':'Қалдықты ауысым, желі және оператор бойынша тіркеп, себептерін салыстырыңыз.','impact':'Орташа','type':'Process'},
        {'title':'Қайта өңдеу үлесін арттырыңыз','text':'Материалдарды араластырмай жинап, қайта өңдеуші серіктестермен жұмыс істеңіз.','impact':'Орташа','type':'Circular'}])


@app.post('/api/calculator')
@company_required
def calculator():
    data=request.get_json(silent=True) or {}
    try:
        output=float(data.get('output',0)); rate=float(data.get('rate',0)); unit_cost=float(data.get('unit_cost',0)); reduction=float(data.get('reduction',0))
        if output<=0 or unit_cost<0 or not 0<=rate<=100 or not 0<=reduction<=100: raise ValueError
    except (ValueError,TypeError): return jsonify({'ok':False,'message':'Мәндерді дұрыс енгізіңіз.'}),400
    current=output*rate/100*unit_cost; saving=current*reduction/100
    return jsonify({'ok':True,'current':round(current),'saving':round(saving),'annual':round(saving*12),'new_rate':round(rate*(1-reduction/100),2)})


def save_clean_image(file_storage, dest_dir, prefix, max_side=1600, thumb=None):
    """Validate an upload, re-encode it as JPEG (this also drops EXIF metadata such as GPS) and optionally make a square thumbnail.
    Returns (filename, thumb_filename) relative to static/uploads."""
    ext = file_storage.filename.rsplit('.',1)[-1].lower() if '.' in file_storage.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError('bad_type')
    raw = file_storage.read()
    if len(raw) > MAX_IMAGE_SIZE:
        raise ValueError('too_big')
    stamp = datetime.now().strftime('%Y%m%d%H%M%S') + '_' + uuid.uuid4().hex[:8]
    rel = dest_dir.relative_to(UPLOAD_DIR).as_posix()
    rel = '' if rel == '.' else rel + '/'
    if Image is None:
        name = f'{prefix}_{stamp}.{ext}'
        (dest_dir / name).write_bytes(raw)
        return rel + name, rel + name
    try:
        img = Image.open(io.BytesIO(raw)); img.verify()
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
    except Exception:
        raise ValueError('bad_image')
    img.thumbnail((max_side, max_side))
    name = f'{prefix}_{stamp}.jpg'
    img.save(dest_dir / name, 'JPEG', quality=82, optimize=True)
    tname = name
    if thumb:
        t = ImageOps.fit(img, (thumb, thumb))
        tname = f'{prefix}_{stamp}_t.jpg'
        t.save(dest_dir / tname, 'JPEG', quality=75)
    return rel + name, rel + tname


@app.post('/api/scanner')
@company_required
def scanner():
    image=request.files.get('image'); material=request.form.get('material','Other').strip(); note=request.form.get('note','').strip()[:200]
    if not image or not image.filename: return jsonify({'ok':False,'message':'Алдымен қалдықтың суретін таңдаңыз.'}),400
    if material not in MATERIALS: material='Other'
    try:
        filename, _ = save_clean_image(image, UPLOAD_DIR, f'u{current_user_id()}', 1280)
    except ValueError as e:
        return jsonify({'ok':False,'code':str(e),'message':'PNG, JPG, JPEG немесе WEBP суретін таңдаңыз (8 MB дейін).'}),400
    confidence={'Plastic':91,'Metal':89,'Organic':87,'Paper':90,'Glass':88,'Other':60}[material]
    guidance={'Plastic':'Пластикті түрі бойынша бөліп, таза және құрғақ күйде жинаңыз. Қайта өңдеу белгісін тексеріңіз.',
        'Metal':'Металл қалдықтарын қара және түсті металл бойынша бөліп, өткір жиектерін қауіпсіз контейнерге салыңыз.',
        'Organic':'Органикалық қалдықты бөлек жинап, компосттау немесе биоқалдық өңдеу мүмкіндігін қарастырыңыз.',
        'Paper':'Қағазды құрғақ сақтап, картон мен аралас қағазды бөлек сұрыптаңыз.',
        'Glass':'Шыныны түсі бойынша сұрыптап, сынған бөлшектерді қауіпсіз қаптамаға салыңыз.',
        'Other':'Материал құрамы анықталғанша бөлек белгіленген контейнерде сақтаңыз.'}[material]
    explanation='Бұл нұсқада сурет жүктеу, тіркеу және материалға қатысты ереже-негізді ұсыныс жұмыс істейді. Таңдалған материал түрі оператордың растауы; суреттен автоматты танитын үйретілген компьютерлік көру моделі әлі қосылмаған.'
    with db() as con:
        cur=con.execute('INSERT INTO waste_scans(user_id,filename,material,confidence,note,created_at) VALUES(?,?,?,?,?,?)',
            (current_user_id(),filename,material,confidence,note,datetime.now().isoformat(timespec='seconds')))
    return jsonify({'ok':True,'id':cur.lastrowid,'image_url':url_for('static',filename='uploads/'+filename),'material':material,'confidence':confidence,'guidance':guidance,'explanation':explanation})


@app.get('/api/scans')
@company_required
def scans():
    with db() as con:
        rows=con.execute('SELECT id,filename,material,confidence,note,created_at FROM waste_scans WHERE user_id=? ORDER BY id DESC LIMIT 20',(current_user_id(),)).fetchall()
    return jsonify([dict(r, image_url=url_for('static',filename='uploads/'+r['filename'])) for r in rows])


@app.get('/api/ecoscore')
@company_required
def ecoscore():
    rows=record_data(); total=sum(r['amount'] for r in rows)
    by_material={}
    for r in rows: by_material[r['material']]=by_material.get(r['material'],0)+r['amount']
    record_score=min(100,len(rows)*8); diversity_score=min(100,len(by_material)*18)
    consistency=min(100,len({r['date'] for r in rows})*7)
    score=round(record_score*.35+diversity_score*.25+consistency*.40) if rows else 0
    return jsonify({'score':score,'grade':'Өте жақсы' if score>=80 else 'Жақсы' if score>=60 else 'Бастапқы деңгей','total':round(total,1),'records':len(rows),
        'categories':len(by_material),'components':[{'name':'Деректерді жүйелі тіркеу','score':record_score,'weight':35},{'name':'Материалдарды бөлек есепке алу','score':diversity_score,'weight':25},{'name':'Өлшеу күндерінің тұрақтылығы','score':consistency,'weight':40}],
        'note':'EcoScore — осы прототиптің ашық формуламен есептелетін demo-индексі. Ол ресми экологиялық сертификат немесе нақты көміртек аудиті емес.'})


@app.post('/api/assistant')
@company_required
def assistant():
    data=request.get_json(silent=True) or {}; question=str(data.get('question','')).strip()[:500]
    if not question: return jsonify({'ok':False,'message':'Сұрағыңызды жазыңыз.'}),400
    rows=record_data(); total=sum(r['amount'] for r in rows); by={}
    for r in rows: by[r['material']]=by.get(r['material'],0)+r['amount']
    biggest=max(by,key=by.get) if by else None; fc=forecast_for(rows)
    q=question.lower()
    if any(w in q for w in ('көп','көбей','неге','қай материал','which','most')):
        answer=(f'Қазір ең көп тіркелген қалдық түрі — {biggest}: {by[biggest]:.1f} kg. Жалпы тіркелген көлем {total:.1f} kg. Осы материалдың өндіріс көзін ауысым бойынша салыстырыңыз.') if biggest else 'Әзірге қалдық деректері жоқ. Waste Monitor бөлімінде жазба енгізіңіз.'
    elif any(w in q for w in ('болж','ертең','келесі','forecast','30')):
        answer=f'Қолдағы дерек бойынша келесі 7 күнге шамамен {fc["next"]:.1f} kg, 30 күнге {fc["next30"]:.1f} kg қалдық болжанады. Бұл тарихи орташаға негізделген demo-болжам.'
    elif any(w in q for w in ('үнем','ақша','құн','cost','save')):
        answer='Business Calculator бөлімінде айлық өндіріс көлемін, қалдық үлесін және шикізат құнын енгізіңіз. Жүйе айлық және жылдық ықтимал үнемді есептейді.'
    elif any(w in q for w in ('сұрып','қайта өңде','recycl')):
        answer='Пластик, металл, қағаз, шыны және органикалық қалдықтарды бөлек жинаңыз. Материал таза әрі құрғақ болуы керек; нақты қабылдау шартын жергілікті қайта өңдеушіден растаңыз.'
    else:
        answer=f'Қазір жүйеде {len(rows)} қалдық жазбасы және {total:.1f} kg тіркелген. Нақтырақ көмектесу үшін қалдық көлемі, болжам, қайта өңдеу немесе үнем туралы сұраңыз.'
    return jsonify({'ok':True,'answer':answer,'based_on_records':len(rows),'model':'Ереже-негізді Eco Assistant demo'})


@app.get('/api/map/points')
@login_required
def map_points():
    with db() as con:
        rows=con.execute('SELECT id,name,material,address,lat,lng,phone,is_demo FROM recycling_points WHERE user_id=? ORDER BY id DESC',(current_user_id(),)).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post('/api/map/points')
@company_required
def add_map_point():
    data=request.get_json(silent=True) or {}
    try:
        name=str(data.get('name','')).strip()[:80]; material=str(data.get('material','Other')).strip(); address=str(data.get('address','')).strip()[:140]
        lat=float(data.get('lat')); lng=float(data.get('lng')); phone=str(data.get('phone','')).strip()[:30]
        if not name or not address or not -90<=lat<=90 or not -180<=lng<=180: raise ValueError
        if phone and not PHONE_RE.match(phone): raise ValueError
        with db() as con:
            cur=con.execute('INSERT INTO recycling_points(user_id,name,material,address,lat,lng,phone,is_demo,created_at) VALUES(?,?,?,?,?,?,?,0,?)',
                (current_user_id(),name,material,address,lat,lng,phone,datetime.now().isoformat(timespec='seconds')))
        return jsonify({'ok':True,'id':cur.lastrowid})
    except (ValueError,TypeError): return jsonify({'ok':False,'code':'check_data','message':'Атауы, мекенжайы және дұрыс координаталарды енгізіңіз.'}),400


@app.get('/api/export.csv')
@company_required
def export_csv():
    rows=record_data(); output=io.StringIO(); writer=csv.writer(output)
    writer.writerow(['Date','Material','Amount','Unit','Cost_KZT','Source','Note'])
    for r in rows: writer.writerow([r['date'],r['material'],r['amount'],r['unit'],r['cost'],r['source'],r['note']])
    mem=io.BytesIO(('﻿'+output.getvalue()).encode('utf-8')); mem.seek(0)
    return send_file(mem,mimetype='text/csv; charset=utf-8',as_attachment=True,download_name='zero_waste_report.csv')


@app.get('/api/export.xlsx')
@company_required
def export_xlsx():
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        return jsonify({'ok':False,'message':'Excel экспорты үшін openpyxl орнатыңыз: pip install openpyxl'}),500
    rows=record_data(); wb=Workbook(); ws=wb.active; ws.title='Waste report'
    headers=['Күні','Материал','Мөлшері','Өлшем бірлігі','Құны (₸)','Қалдық көзі','Ескерту']; ws.append(headers)
    for r in rows: ws.append([r['date'],r['material'],r['amount'],r['unit'],r['cost'],r['source'],r['note']])
    for cell in ws[1]: cell.font=Font(bold=True,color='FFFFFF'); cell.fill=PatternFill('solid',fgColor='00789B'); cell.alignment=Alignment(horizontal='center')
    for col,width in zip('ABCDEFG',[16,18,14,16,16,20,36]): ws.column_dimensions[col].width=width
    mem=io.BytesIO(); wb.save(mem); mem.seek(0)
    return send_file(mem,mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',as_attachment=True,download_name='zero_waste_report.xlsx')


# ---------------- 3.0: citizen reports ----------------
def compute_analysis(types, volume, description):
    ks = types or ['household']
    weights = [1/(1+i*.6) for i in range(len(ks))]; s = sum(weights)
    composition = [{'type': k, 'share': round(w/s*100)} for k, w in zip(ks, weights)]
    sev = VOLUMES.get(volume, 2)
    if any(k in HAZARD_TYPES for k in ks): sev += 1
    if re.search(r'түтін|жан|дым|гор|smoke|burn|fire|өрт', description or '', re.I): sev += 1
    return composition, max(1, min(5, sev))


def report_json(r, admin=False, events=None):
    d = {'id': r['id'], 'createdAt': int(datetime.fromisoformat(r['created_at']).timestamp()*1000), 'city': r['city'], 'address': r['address'],
         'lat': r['lat'], 'lng': r['lng'], 'description': r['description'], 'reporterName': r['reporter_name'],
         'status': r['status'], 'admin_comment': r['admin_comment'] or '',
         'thumb': url_for('static', filename='uploads/'+r['thumb']), 'photo_url': url_for('static', filename='uploads/'+r['photo']),
         'analysis': {'types': json.loads(r['types']), 'volume': r['volume'], 'severity': r['severity'], 'composition': json.loads(r['composition'])},
         'mine': bool(getattr(request, 'user', None)) and r['user_id'] == request.user['id']}
    if admin:
        d['user_id'] = r['user_id']; d['author_email'] = r['author_email'] if 'author_email' in r.keys() else ''
    if events is not None:
        d['events'] = events
    return d


@app.get('/api/reports/public')
def reports_public():
    # Public map feed: no personal data except the optional display name the author typed.
    with db() as con:
        rows = con.execute("SELECT * FROM reports WHERE status!='rejected' ORDER BY id DESC LIMIT 2000").fetchall()
    return jsonify([report_json(r) for r in rows])


@app.get('/api/points/public')
def points_public():
    with db() as con:
        rows = con.execute('SELECT id,name,material,address,lat,lng,phone,is_demo FROM recycling_points ORDER BY id DESC LIMIT 1000').fetchall()
    return jsonify([dict(r) for r in rows])


@app.get('/api/stats/public')
def stats_public():
    with db() as con:
        rows = con.execute('SELECT status, COUNT(*) c FROM reports GROUP BY status').fetchall()
    out = {s: 0 for s in STATUSES}
    for r in rows: out[r['status']] = r['c']
    out['total'] = sum(out.values())
    return jsonify(out)


@app.post('/api/reports')
@login_required
def create_report():
    uid = request.user['id']
    with db() as con:
        today = con.execute("SELECT COUNT(*) FROM reports WHERE user_id=? AND created_at>=?", (uid, (datetime.now()-timedelta(days=1)).isoformat(timespec='seconds'))).fetchone()[0]
    if today >= REPORTS_PER_DAY and request.user['role'] != 'admin':
        return api_error('limit_day', f'Бір тәулікте {REPORTS_PER_DAY} хабарламадан артық жіберуге болмайды.', 429)
    f = request.form
    try:
        lat = float(f.get('lat')); lng = float(f.get('lng'))
    except (TypeError, ValueError):
        return api_error('need_point', 'Картадан нүктені белгілеңіз.')
    if not (KZ_BOUNDS[0] <= lat <= KZ_BOUNDS[1] and KZ_BOUNDS[2] <= lng <= KZ_BOUNDS[3]):
        return api_error('out_of_kz', 'Нүкте Қазақстан аумағында болуы керек.')
    try:
        types = [t for t in json.loads(f.get('types') or '[]') if t in REPORT_TYPES][:6]
    except ValueError:
        types = []
    volume = f.get('volume') if f.get('volume') in VOLUMES else 'few'
    city = f.get('city','').strip()
    if city and city not in CITIES:
        return api_error('err_city', 'Тізімдегі қаланы таңдаңыз.')
    address = ' '.join(f.get('address','').split())[:160]
    description = f.get('description','').strip()[:800]
    reporter_name = ' '.join(f.get('reporter_name','').split())[:60]
    if re.search(r'\+?\d[\d \-()]{8,}\d', description):
        return api_error('no_phone_in_desc', 'Сипаттамаға телефон нөмірін жазбаңыз: ол картада барлығына көрінеді.')
    photo = request.files.get('photo')
    if not photo or not photo.filename:
        return api_error('need_photo', 'Алдымен суретті таңдаңыз.')
    try:
        photo_name, thumb_name = save_clean_image(photo, REPORT_DIR, f'r{uid}', 1600, thumb=240)
    except ValueError as e:
        return api_error(str(e) if str(e) in ('too_big',) else 'only_image', 'PNG, JPG немесе WEBP суретін таңдаңыз (8 MB дейін).')
    composition, severity = compute_analysis(types, volume, description)
    now = datetime.now().isoformat(timespec='seconds')
    with db() as con:
        cur = con.execute('INSERT INTO reports(user_id,created_at,city,address,lat,lng,types,volume,severity,composition,description,reporter_name,photo,thumb,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (uid, now, city, address, lat, lng, json.dumps(types or ['household']), volume, severity, json.dumps(composition), description, reporter_name, photo_name, thumb_name, 'new', now))
        con.execute('INSERT INTO report_events(report_id,admin_id,at,status,comment) VALUES(?,?,?,?,?)', (cur.lastrowid, None, now, 'new', ''))
        r = con.execute('SELECT * FROM reports WHERE id=?', (cur.lastrowid,)).fetchone()
    return jsonify({'ok': True, 'report': report_json(r)})


def _events_for(con, ids):
    out = defaultdict(list)
    if ids:
        q = 'SELECT report_id,at,status,comment FROM report_events WHERE report_id IN (%s) ORDER BY id' % ','.join('?'*len(ids))
        for e in con.execute(q, ids).fetchall():
            out[e['report_id']].append({'at': e['at'], 'status': e['status'], 'comment': e['comment']})
    return out


@app.get('/api/reports/mine')
@login_required
def reports_mine():
    with db() as con:
        rows = con.execute('SELECT * FROM reports WHERE user_id=? ORDER BY id DESC', (request.user['id'],)).fetchall()
        ev = _events_for(con, [r['id'] for r in rows])
    return jsonify([report_json(r, events=ev[r['id']]) for r in rows])


@app.delete('/api/reports/<int:rid>')
@login_required
def delete_own_report(rid):
    # Authors may withdraw a report only while nobody has started working on it.
    with db() as con:
        r = con.execute('SELECT * FROM reports WHERE id=?', (rid,)).fetchone()
        if not r or r['user_id'] != request.user['id']:
            return api_error('not_found', 'Табылмады.', 404)
        if r['status'] != 'new':
            return api_error('not_new', 'Қаралып жатқан хабарламаны өшіруге болмайды.', 409)
        con.execute('DELETE FROM reports WHERE id=?', (rid,)); con.execute('DELETE FROM report_events WHERE report_id=?', (rid,))
    _remove_files(r)
    return jsonify({'ok': True})


def _remove_files(r):
    for name in {r['photo'], r['thumb']}:
        try: (UPLOAD_DIR / name).unlink(missing_ok=True)
        except OSError: pass


def _csv_response(rows, header, name):
    out = io.StringIO(); w = csv.writer(out); w.writerow(header)
    for row in rows: w.writerow(row)
    mem = io.BytesIO(('﻿'+out.getvalue()).encode('utf-8')); mem.seek(0)
    return send_file(mem, mimetype='text/csv; charset=utf-8', as_attachment=True, download_name=name)


REPORT_HEADER = ['ID','Created','City','Address','Lat','Lng','Types','Volume','Severity','Status','Admin comment','Description','Reporter']


def _report_row(r):
    return [r['id'], r['created_at'], r['city'], r['address'], r['lat'], r['lng'], ';'.join(json.loads(r['types'])), r['volume'], r['severity'], r['status'], r['admin_comment'], r['description'], r['reporter_name']]


@app.get('/api/reports/mine.csv')
@login_required
def reports_mine_csv():
    with db() as con:
        rows = con.execute('SELECT * FROM reports WHERE user_id=? ORDER BY id DESC', (request.user['id'],)).fetchall()
    return _csv_response([_report_row(r) for r in rows], REPORT_HEADER, 'my_reports.csv')


# ---------------- 3.0: profile ----------------
@app.get('/api/me')
def me():
    return jsonify({'user': user_public(request.user)})


@app.post('/api/profile')
@login_required
def update_profile():
    d = request.get_json(silent=True) or {}
    name = ' '.join(str(d.get('name','')).split()); company = ' '.join(str(d.get('company','')).split())
    city = str(d.get('city','')).strip(); phone = str(d.get('phone','')).strip()
    account_type = d.get('account_type') if d.get('account_type') in ('citizen', 'company') else request.user['account_type']
    if not (2 <= len(name) <= 60) or not NAME_RE.match(name): return api_error('err_name', 'Атыңызды дұрыс жазыңыз.')
    if account_type == 'company' and not (2 <= len(company) <= 80): return api_error('err_company', 'Компания атауы 2–80 таңба.')
    if city and city not in CITIES: return api_error('err_city', 'Тізімдегі қаланы таңдаңыз.')
    if phone and not PHONE_RE.match(phone): return api_error('err_phone', 'Телефон нөмірі дұрыс емес.')
    with db() as con:
        con.execute('UPDATE users SET name=?, company=?, city=?, phone=?, account_type=? WHERE id=?',
            (name, company if account_type == 'company' else request.user['company'], city, phone, account_type, request.user['id']))
        u = con.execute('SELECT * FROM users WHERE id=?', (request.user['id'],)).fetchone()
    session.update(name=u['name'], company=u['company'])
    return jsonify({'ok': True, 'user': user_public(u)})


@app.post('/api/profile/password')
@login_required
def change_password():
    d = request.get_json(silent=True) or {}
    key = f'pwd:{request.user["id"]}'
    if rate_limited(key, 5, 15*60): return api_error('too_many', 'Тым көп әрекет. 15 минуттан кейін көріңіз.', 429)
    if not check_password_hash(request.user['password'], str(d.get('current',''))):
        hit(key); return api_error('err_current', 'Қазіргі құпиясөз қате.')
    new = str(d.get('new','')); email = request.user['email']
    if not (8 <= len(new) <= 64) or not re.search(r'\D', new) or not re.search(r'\d', new): return api_error('err_password', 'Құпиясөз 8–64 таңба, әріп пен цифр болуы керек.')
    if email.split('@')[0] in new.lower(): return api_error('err_password_email', 'Құпиясөзде email бөлігі болмауы керек.')
    if new != str(d.get('new2','')): return api_error('err_password2', 'Құпиясөздер сәйкес емес.')
    with db() as con:
        con.execute('UPDATE users SET password=? WHERE id=?', (generate_password_hash(new), request.user['id']))
    return jsonify({'ok': True})


# ---------------- 3.0: admin ----------------
@app.get('/api/admin/reports')
@admin_required
def admin_reports():
    with db() as con:
        rows = con.execute('SELECT r.*, u.email AS author_email FROM reports r LEFT JOIN users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 5000').fetchall()
    return jsonify([report_json(r, admin=True) for r in rows])


@app.patch('/api/admin/reports/<int:rid>')
@admin_required
def admin_update_report(rid):
    d = request.get_json(silent=True) or {}
    with db() as con:
        r = con.execute('SELECT * FROM reports WHERE id=?', (rid,)).fetchone()
        if not r: return api_error('not_found', 'Табылмады.', 404)
        status = d.get('status', r['status']); comment = str(d.get('comment', r['admin_comment'] or '')).strip()[:500]
        if status not in STATUSES: return api_error('check_data', 'Мәртебе дұрыс емес.')
        if status == 'rejected' and not comment: return api_error('need_reason', 'Қабылдамау себебін түсініктемеге жазыңыз.')
        now = datetime.now().isoformat(timespec='seconds')
        con.execute('UPDATE reports SET status=?, admin_comment=?, updated_at=? WHERE id=?', (status, comment, now, rid))
        if status != r['status'] or comment != (r['admin_comment'] or ''):
            con.execute('INSERT INTO report_events(report_id,admin_id,at,status,comment) VALUES(?,?,?,?,?)', (rid, request.user['id'], now, status, comment))
    return jsonify({'ok': True})


@app.delete('/api/admin/reports/<int:rid>')
@admin_required
def admin_delete_report(rid):
    with db() as con:
        r = con.execute('SELECT * FROM reports WHERE id=?', (rid,)).fetchone()
        if not r: return api_error('not_found', 'Табылмады.', 404)
        con.execute('DELETE FROM reports WHERE id=?', (rid,)); con.execute('DELETE FROM report_events WHERE report_id=?', (rid,))
    _remove_files(r)
    return jsonify({'ok': True})


@app.get('/api/admin/reports.csv')
@admin_required
def admin_reports_csv():
    with db() as con:
        rows = con.execute('SELECT * FROM reports ORDER BY id DESC').fetchall()
    return _csv_response([_report_row(r) for r in rows], REPORT_HEADER, 'zero_waste_reports.csv')


@app.get('/api/admin/users')
@admin_required
def admin_users():
    with db() as con:
        rows = con.execute('SELECT u.*, (SELECT COUNT(*) FROM reports r WHERE r.user_id=u.id) AS reports FROM users u ORDER BY u.id DESC').fetchall()
    return jsonify([dict(user_public(r), is_blocked=bool(r['is_blocked']), last_login=r['last_login'], reports=r['reports']) for r in rows])


@app.patch('/api/admin/users/<int:uid>')
@admin_required
def admin_update_user(uid):
    d = request.get_json(silent=True) or {}
    if uid == request.user['id']:
        return api_error('self_change', 'Өз рөліңізді немесе бұғатыңызды өзгерте алмайсыз.')
    with db() as con:
        u = con.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
        if not u: return api_error('not_found', 'Табылмады.', 404)
        role = d.get('role', u['role']); blocked = 1 if d.get('is_blocked', bool(u['is_blocked'])) else 0
        if role not in ('user', 'admin'): return api_error('check_data', 'Рөл дұрыс емес.')
        con.execute('UPDATE users SET role=?, is_blocked=? WHERE id=?', (role, blocked, uid))
    return jsonify({'ok': True})


@app.errorhandler(413)
def too_large(_error):
    if request.path.startswith('/api/'): return jsonify({'ok':False,'code':'too_big','message':'Сурет көлемі 8 MB-тан аспауы керек.'}),413
    return 'Файл көлемі тым үлкен (8 MB максимум).',413


init_db()

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'make-admin':
        with db() as con:
            n = con.execute("UPDATE users SET role='admin' WHERE email=?", (sys.argv[2].strip().lower(),)).rowcount
        print('OK: admin role granted' if n else 'User not found: register first, then run this command again')
        sys.exit(0)
    app.run(host=os.environ.get('HOST', '127.0.0.1'), port=int(os.environ.get('PORT', 5000)), debug=os.environ.get('FLASK_DEBUG') == '1')
