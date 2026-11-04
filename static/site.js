/* ---------- basics ---------- */
const $=id=>document.getElementById(id);
const LANGS=['kk','ru','en'];
let lang='kk';try{const s=localStorage.getItem('zw_lang');if(LANGS.includes(s))lang=s}catch(e){}
const li=()=>LANGS.indexOf(lang);
const t=k=>{const v=I[k]||I2[k]||I3[k];return v?v[li()]:k};
const L3=a=>Array.isArray(a)?a[li()]:a;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=1)=>new Intl.NumberFormat(lang==='en'?'en-GB':'ru-RU',{maximumFractionDigits:d}).format(n||0);
const money=n=>fmt(n,0)+' ₸';
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const uidGen=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const MON=[['қаң.','ақп.','нау.','сәу.','мам.','мау.','шіл.','там.','қыр.','қаз.','қар.','жел.'],['янв.','фев.','мар.','апр.','мая','июн.','июл.','авг.','сен.','окт.','нояб.','дек.'],['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']];
const dstr=ms=>{const d=new Date(ms);return d.getDate()+' '+MON[li()][d.getMonth()]+' '+d.getFullYear()};
function toast(m){const e=$('toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('show'),2800)}
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}};
async function copyText(txt,el){try{await navigator.clipboard.writeText(txt);toast(t('copied'))}catch(e){if(el){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}toast(t('copy_manual'))}}

/* ---------- catalogs ---------- */
const TYPES={
 household:{l:['Тұрмыстық қоқыс','Бытовой мусор','Household waste'],c:'--info',y:50,
  cz:['Қоқысты өзіңіз өртемеңіз: түтін улы. Жақын контейнер алаңына шығаруды әкімдіктен сұраңыз.','Не сжигайте мусор сами: дым токсичен. Попросите акимат вывезти его на ближайшую площадку.','Do not burn the waste: the smoke is toxic. Ask the akimat to haul it to the nearest bin site.'],
  ct:['Аумаққа контейнер алаңын орнату немесе шығару кестесін жиілету.','Установить контейнерную площадку или чаще вывозить мусор.','Install a bin site or collect more often.']},
 plastic:{l:['Пластик','Пластик','Plastic'],c:'--sky',y:450,
  cz:['Таза пластик бөтелкелерді жинап, қайта өңдеу пунктіне тапсыруға болады.','Чистые пластиковые бутылки можно собрать и сдать в пункт переработки.','Clean plastic bottles can be collected and taken to a recycling point.'],
  ct:['Бөлек жинауға арналған сары контейнер қою.','Поставить отдельный контейнер для пластика.','Place a separate container for plastic.']},
 construction:{l:['Құрылыс қалдықтары','Строительный мусор','Construction debris'],c:'--warn',y:1000,
  cz:['Құрылыс қалдығы жөндеу жүргізген адамның жауапкершілігінде. Жақын үйлердегі жөндеуді хабарламада атап өтіңіз.','За строительный мусор отвечает тот, кто вёл ремонт. Укажите в обращении, если рядом идёт ремонт.','Construction waste is the responsibility of whoever did the work. Mention nearby renovations in the appeal.'],
  ct:['Арнайы техникамен шығару және тастаған адамды анықтап, айыппұл салу.','Вывезти спецтехникой, найти нарушителя и оштрафовать.','Remove with heavy equipment and fine the offender once identified.']},
 hazardous:{l:['Қауіпті қалдықтар','Опасные отходы','Hazardous waste'],c:'--bad',y:100,hz:1,
  cz:['Батарея, сынап шамдары, химия мен майға қолмен тиіспеңіз. Балаларды жақындатпаңыз.','Не трогайте батарейки, ртутные лампы, химию и масла руками. Не подпускайте детей.','Do not touch batteries, mercury lamps, chemicals or oils. Keep children away.'],
  ct:['Лицензиясы бар мамандандырылған ұйымға шұғыл шығарту.','Срочно вывезти через лицензированную организацию.','Urgent removal by a licensed hazardous waste contractor.']},
 organic:{l:['Органикалық қалдықтар','Органические отходы','Organic waste'],c:'--ok',y:.15,
  cz:['Тамақ қалдығы иіс пен кеміргіштер тартады. Шығаруды тездетуді сұраңыз.','Пищевые отходы привлекают грызунов и пахнут. Попросите ускорить вывоз.','Food waste attracts rodents and smells. Ask for faster collection.'],
  ct:['Органиканы компостқа бағыттау және дезинфекция жасау.','Направить органику на компост и провести дезинфекцию.','Send organics to composting and disinfect the area.']},
 tires:{l:['Шиналар','Шины','Tyres'],c:'--ink',y:120,hz:1,
  cz:['Шиналар оңай жанады және ұзақ түтіндейді. Шиналарды қабылдайтын пункттер бар.','Шины легко горят и долго дымят. Есть пункты приёма шин.','Tyres catch fire easily and smoulder for long. Tyre collection points exist.'],
  ct:['Шиналарды қайта өңдеу кәсіпорнына беру.','Передать шины на переработку.','Send tyres to a recycling plant.']},
 metal:{l:['Металл','Металл','Metal'],c:'--muted',y:100,
  cz:['Металл сынықтарын металл қабылдау пунктіне тапсыруға болады.','Металлолом можно сдать в пункт приёма металла.','Scrap metal can go to a scrap collection point.'],
  ct:['Металл сынықтарын қабылдау пунктімен келісіп шығару.','Вывезти металлолом через пункт приёма.','Remove scrap via a scrap metal collector.']},
 electronics:{l:['Электроника','Электроника','Electronics'],c:'--sun',y:1000,hz:1,
  cz:['Ескі техникада қауіпті заттар бар. Оны сындырмаңыз, электроника қабылдау акцияларына тапсырыңыз.','В старой технике есть опасные вещества. Не разбирайте, сдайте на акцию приёма электроники.','Old devices contain hazardous parts. Do not break them; use e-waste drop-offs.'],
  ct:['Электрондық қалдықтарды бөлек жинау күнін ұйымдастыру.','Организовать день сбора электронных отходов.','Organise an e-waste collection day.']},
 paper:{l:['Қағаз, картон','Бумага, картон','Paper and cardboard'],c:'--sun',y:.4,
  cz:['Құрғақ картонды макулатура пунктіне тапсыруға болады.','Сухой картон можно сдать в пункт макулатуры.','Dry cardboard can go to a paper recycling point.'],
  ct:['Картонға арналған контейнер орнату.','Установить контейнер для картона.','Install a cardboard container.']},
 glass:{l:['Шыны','Стекло','Glass'],c:'--info',y:1000,
  cz:['Сынған шыныдан сақ болыңыз, оны тығыз қапқа салыңыз.','Осторожно с битым стеклом, собирайте в плотный мешок.','Be careful with broken glass; bag it in a thick sack.'],
  ct:['Шыныға арналған жеке контейнер қою.','Поставить контейнер для стекла.','Place a glass container.']}
};
const VOLUMES={bag:{l:['Бір-екі қап','Один-два мешка','One or two bags'],m3:.1,s:1},few:{l:['Бірнеше қап','Несколько мешков','Several bags'],m3:.5,s:2},container:{l:['Бір контейнерге жуық','Около контейнера','About one bin'],m3:1.5,s:3},heap:{l:['Үлкен үйінді','Большая куча','Large heap'],m3:5,s:4},truck:{l:['Жүк көлігінен көп','Больше грузовика','More than a truckload'],m3:12,s:5}};
const CITIES=[['Астана',51.1694,71.4491],['Алматы',43.2389,76.8897],['Шымкент',42.3417,69.5901],['Қарағанды',49.8047,73.1094],['Ақтөбе',50.2839,57.167],['Тараз',42.9,71.3667],['Павлодар',52.2873,76.9674],['Өскемен',49.9483,82.6279],['Семей',50.4111,80.2275],['Атырау',47.1167,51.8833],['Қостанай',53.2144,63.6246],['Қызылорда',44.8528,65.5092],['Орал',51.2333,51.3667],['Петропавл',54.8667,69.15],['Ақтау',43.65,51.15],['Түркістан',43.2973,68.2517],['Көкшетау',53.2833,69.3833],['Талдықорған',45.0156,78.3739],['Жезқазған',47.78,67.71],['Екібастұз',51.72,75.32],['Қонаев',43.87,77.07]];
const STATUSES={new:['Жаңа','Новое','New'],progress:['Қаралуда','В работе','In progress'],resolved:['Шешілді','Решено','Resolved'],rejected:['Қабылданбады','Отклонено','Rejected']};
const MATS={Plastic:['Пластик','Пластик','Plastic'],Metal:['Металл','Металл','Metal'],Organic:['Органикалық','Органика','Organic'],Paper:['Қағаз','Бумага','Paper'],Glass:['Шыны','Стекло','Glass'],Other:['Басқа','Другое','Other']};
const SOURCES={Packaging:['Қаптама','Упаковка','Packaging'],Cutting:['Кесу','Резка','Cutting'],Processing:['Өңдеу','Переработка','Processing'],Storage:['Сақтау','Хранение','Storage'],Other:['Басқа','Другое','Other']};
const matL=m=>L3(MATS[m]||[m,m,m]);const srcL=s=>L3(SOURCES[s]||[s,s,s]);const typeL=k=>L3(TYPES[k]?.l||[k,k,k]);const stL=s=>L3(STATUSES[s]||STATUSES.new);
const KZ=[[46.6,48.5],[47,49.2],[46.8,49.9],[47.4,50.4],[48.3,50.6],[49.4,51.1],[50.6,51.6],[52.3,51.8],[53.4,51.5],[54.6,51],[55.7,50.6],[56.6,51.1],[58.3,51.1],[59.4,50.6],[60.3,50.7],[61.4,50.8],[61.6,51.3],[60,52],[60.8,52.2],[61.1,52.9],[62.1,53],[61.2,53.3],[61,53.9],[61.4,54.1],[62.6,54],[63.8,54.2],[65.2,54.4],[65.6,54.7],[67,54.9],[68.2,55],[68.8,55.4],[69.9,55.3],[70.8,55.3],[71.2,54.7],[71,54.2],[72.2,54.4],[72.6,54.1],[73.4,53.9],[73.3,53.5],[74.4,53.6],[75.4,54],[76.2,54.3],[76.5,53.9],[77.9,53.3],[80,51],[81,51],[81.9,50.8],[83.4,51],[84.3,50.3],[85.1,50.1],[85.6,49.6],[86.8,49.8],[87.3,49.2],[86.8,48.6],[85.8,48.4],[85.5,47.1],[84.4,47],[83.1,47.2],[82.3,45.5],[81.9,45.3],[80,45],[80.5,44.1],[80.4,43],[80.2,42.2],[79.2,42.8],[77.6,42.9],[75.9,42.9],[74.6,43.1],[73.5,42.5],[72.8,42.6],[71.8,42.8],[71.1,42.4],[70.6,42],[70,41.5],[69,41.5],[68.4,41],[67.9,41.1],[66.7,41.2],[66.5,42],[66,42.9],[65.8,43.3],[64.9,43.7],[63.2,43.6],[62,43.5],[61,44.4],[60,44.8],[58.6,45.6],[56,45],[56,41.3],[55.4,41.3],[54.7,42],[53.9,42.3],[52.8,41.8],[52.6,42.4],[52,42.8],[51.3,43.2],[51,43.9],[51,44.4],[50.3,44.6],[51.3,45.2],[52.9,45.3],[53.2,46],[53,46.8],[51.2,47.1],[49.9,46.6],[49.2,46.4],[48.6,47.4],[47.4,47.9]];
const DEMO_POINTS=[{id:'d1',name:['Үлгі нүкте, Сарыарқа','Пример пункта, Сарыарка','Example point, Saryarka'],material:'Plastic',address:'Астана',lat:51.1694,lng:71.4491,demo:1},{id:'d2',name:['Үлгі нүкте, Есіл','Пример пункта, Есиль','Example point, Esil'],material:'Paper',address:'Астана',lat:51.1282,lng:71.4304,demo:1},{id:'d3',name:['Үлгі нүкте, Алматы ауданы','Пример пункта, район Алматы','Example point, Almaty district'],material:'Metal',address:'Астана',lat:51.15,lng:71.47,demo:1}];

/* ---------- state (server edition) ---------- */
const ZW=window.ZW_BOOT||{view:'home',me:null,csrf:''};
const S={me:ZW.me,isAdmin:ZW.me?.role==='admin',isCompany:!!ZW.me&&(ZW.me.account_type==='company'||ZW.me.role==='admin'),
 remote:[],mine:[],admin:[],users:[],points:[],ws:{records:[],scans:[],points:[]},synced:false,charts:{},draft:null};
const statusOf=r=>r.status||'new';
const allReports=()=>S.remote;
const findReport=id=>[...S.admin,...S.mine,...S.remote].find(r=>String(r.id)===String(id));

async function api(url,o={}){
 const headers={'X-CSRF-Token':ZW.csrf,...(o.body&&!(o.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...(o.headers||{})};
 const res=await fetch(url,{credentials:'same-origin',...o,headers,body:o.body&&!(o.body instanceof FormData)&&typeof o.body!=='string'?JSON.stringify(o.body):o.body});
 let d={};try{d=await res.json()}catch(e){}
 if(res.status===401){toast(t('auth'));setTimeout(()=>location.href='/login?next='+encodeURIComponent(location.pathname),900)}
 if(!res.ok||d.ok===false){const m=(d.code&&t(d.code)!==d.code)?t(d.code):(d.message||t('check_data'));const e=new Error(m);e.code=d.code;throw e}
 return d;
}

/* ---------- i18n ---------- */
function applyLang(){
 document.documentElement.lang=lang;$('lang').value=lang;
 document.querySelectorAll('[data-t]').forEach(e=>{e.textContent=t(e.dataset.t)});
 document.querySelectorAll('[data-th]').forEach(e=>{e.innerHTML=t(e.dataset.th)});
 document.querySelectorAll('[data-tp]').forEach(e=>{e.placeholder=t(e.dataset.tp)});
 fillSelects();renderAll();
}
function opts(sel,list,keep){if(!sel)return;const v=sel.value;sel.innerHTML=list.map(([k,l])=>`<option value="${esc(k)}">${esc(l)}</option>`).join('');if(keep&&[...sel.options].some(o=>o.value===v))sel.value=v}
function fillSelects(){
 opts($('repVolume'),Object.entries(VOLUMES).map(([k,v])=>[k,L3(v.l)]),1);
 opts($('repCity'),[['',t('choose_city')],...CITIES.map(c=>[c[0],c[0]])],1);
 if(!$('repCity').value&&S.me?.city)$('repCity').value=S.me.city;
 opts($('mfCity'),[['all',t('all_cities')],...CITIES.map(c=>[c[0],c[0]])],1);
 opts($('mfStatus'),[['all',t('all_status')],...['new','progress','resolved'].map(k=>[k,stL(k)])],1);
 opts($('mfType'),[['all',t('all_types')],...Object.keys(TYPES).map(k=>[k,typeL(k)])],1);
 opts($('afStatus'),[['all',t('all_status')],...Object.keys(STATUSES).map(k=>[k,stL(k)])],1);
 opts($('afCity'),[['all',t('all_cities')],...CITIES.map(c=>[c[0],c[0]])],1);
 opts($('afSev'),[['all',t('all_sev')],['high',t('sev_high')],['mid',t('sev_mid')],['low',t('sev_low')]],1);
 const m=Object.keys(MATS).map(k=>[k,matL(k)]);
 ['scMat','moMat','ptMat'].forEach(id=>opts($(id),m,1));opts($('anMat'),m.filter(x=>x[0]!=='Other'),1);
 opts($('moSrc'),Object.keys(SOURCES).map(k=>[k,srcL(k)]),1);
 renderChips();
}

/* ---------- views ---------- */
const VIEWS=['home','report','map','user','admin'];
function route(){
 const v=VIEWS.includes(ZW.view)?ZW.view:'home';
 document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
 const path={home:'/',report:'/report',map:'/map',user:'/cabinet',admin:'/admin'}[v];
 document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')===path&&!a.classList.contains('cta')));
 if(v==='report')setTimeout(()=>{initPicker();pick.map&&pick.map.invalidateSize()},60);
 if(v==='map')setTimeout(()=>{initBigMap();big.map&&big.map.invalidateSize();renderMap()},60);
 if(v==='user'){const h=location.hash.slice(1);if(h&&document.getElementById('t-'+h))showTab(h);else renderCabinet()}
 if(v==='admin')loadAdmin();
}

/* ---------- maps (OpenStreetMap tiles) ---------- */
function baseMap(el,o={}){
 const m=L.map(el,{zoomControl:true,minZoom:4,maxZoom:19,maxBounds:[[36,40],[60,95]],...o});
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(m);
 m.fitBounds([[40.6,46.5],[55.4,87.3]]);
 return m;
}
const pick={map:null,marker:null};
function initPicker(){
 if(pick.map||typeof L==='undefined'||!$('pickMap'))return;
 pick.map=baseMap('pickMap');
 const c=CITIES.find(x=>x[0]===S.me?.city);if(c)pick.map.setView([c[1],c[2]],11);
 pick.map.on('click',e=>setPoint(e.latlng.lat,e.latlng.lng,true));
}
function setPoint(lat,lng,fromMap){
 $('repLat').value=(+lat).toFixed(5);$('repLng').value=(+lng).toFixed(5);
 if(!pick.map)return;
 const icon=L.divIcon({className:'',html:'<div class="picker-pin"></div>',iconSize:[24,24],iconAnchor:[12,24]});
 if(pick.marker)pick.marker.setLatLng([lat,lng]);else pick.marker=L.marker([lat,lng],{icon,draggable:true}).addTo(pick.map).on('dragend',e=>{const p=e.target.getLatLng();setPoint(p.lat,p.lng,true)});
 if(!fromMap)pick.map.setView([lat,lng],Math.max(pick.map.getZoom(),15));
 if(fromMap&&!$('repCity').value){const c=nearestCity(lat,lng);if(c)$('repCity').value=c}
}
function nearestCity(lat,lng){let best=null,d=1e9;CITIES.forEach(c=>{const dd=(c[1]-lat)**2+((c[2]-lng)*.65)**2;if(dd<d){d=dd;best=c[0]}});return d<1.2?best:null}
if($('repLat'))['repLat','repLng'].forEach(id=>$(id).addEventListener('change',()=>{const a=+$('repLat').value,b=+$('repLng').value;if(a&&b)setPoint(a,b)}));
if($('repCity'))$('repCity').addEventListener('change',e=>{const c=CITIES.find(x=>x[0]===e.target.value);if(c&&pick.map){pick.map.setView([c[1],c[2]],12);if(!$('repLat').value)setPoint(c[1],c[2],true)}});

function heroMap(){
 if(!$('heroMap'))return;
 const X=x=>(x-46)*0.66*14,Y=y=>(56-y)*14;
 const path='M'+KZ.map(([x,y])=>X(x).toFixed(1)+' '+Y(y).toFixed(1)).join('L')+'Z';
 const col={new:'var(--info)',progress:'var(--warn)',resolved:'var(--ok)',rejected:'var(--muted)'};
 $('heroMap').innerHTML=`<svg viewBox="-6 -6 392 224" role="img" aria-label="${esc(t('live_title'))}"><path d="${path}" fill="var(--land)" stroke="var(--land-line)" stroke-width="1.2"/>${CITIES.slice(0,12).map(c=>`<circle cx="${X(c[2])}" cy="${Y(c[1])}" r="2" fill="var(--muted)"/><text x="${X(c[2])+4}" y="${Y(c[1])+3}" font-size="8" fill="var(--muted)" font-family="var(--body)">${esc(c[0])}</text>`).join('')}${S.remote.slice(0,400).map(r=>`<circle cx="${X(r.lng)}" cy="${Y(r.lat)}" r="5" fill="${col[statusOf(r)]}" fill-opacity=".85" stroke="var(--surface)" stroke-width="1.5"><title>${esc(r.city||'')} ${esc(r.address||'')}</title></circle>`).join('')}</svg>`;
}

/* ---------- data loading ---------- */
async function loadPublic(){
 try{S.remote=await api('/api/reports/public');S.synced=true;$('mapSync')&&($('mapSync').textContent='')}catch(e){$('mapSync')&&($('mapSync').textContent=t('sync_err'))}
 try{S.points=await api('/api/points/public')}catch(e){}
 if(S.me){try{S.mine=await api('/api/reports/mine')}catch(e){}}
 renderAll();
}
async function loadWorkspace(){
 if(!S.isCompany)return;
 try{const [records,scans,points]=await Promise.all([api('/api/records'),api('/api/scans'),api('/api/map/points')]);S.ws={records,scans,points}}catch(e){toast(e.message)}
 renderWorkspace();
}

/* ---------- report form ---------- */
let photoFile=null;const selTypes=new Set();
function renderChips(){if(!$('typeChips'))return;$('typeChips').innerHTML=Object.keys(TYPES).map(k=>`<button type="button" class="chip${selTypes.has(k)?' on':''}" data-k="${k}" aria-pressed="${selTypes.has(k)}">${esc(typeL(k))}</button>`).join('')}
const drop=$('drop');
if(drop){
 $('typeChips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const k=b.dataset.k;selTypes.has(k)?selTypes.delete(k):selTypes.add(k);renderChips()});
 ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
 ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
 drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)takePhoto(f)});
 $('repPhoto').addEventListener('change',e=>{const f=e.target.files[0];if(f)takePhoto(f)});
 $('repClear').addEventListener('click',clearPhoto);
}
function clearPhoto(){photoFile=null;$('repPhoto').value='';$('repPrevWrap').classList.add('hidden');drop.classList.remove('hidden');$('exifNote').textContent=''}
async function takePhoto(f){
 if(!/^image\/(jpeg|png|webp)$/.test(f.type)){toast(t('only_image'));return}
 if(f.size>8*1024*1024){toast(t('too_big'));return}
 photoFile=f;$('repPrev').src=URL.createObjectURL(f);$('repPrevWrap').classList.remove('hidden');drop.classList.add('hidden');
 $('exifNote').textContent='';
 try{const g=await readGps(f);if(g){initPicker();setPoint(g.lat,g.lng);const c=nearestCity(g.lat,g.lng);if(c)$('repCity').value=c;$('exifNote').textContent=t('exif_found')}}catch(e){}
}
async function readGps(file){
 const buf=await file.slice(0,262144).arrayBuffer();const v=new DataView(buf);
 if(v.getUint16(0)!==0xFFD8)return null;let o=2;
 while(o<v.byteLength-4){const mk=v.getUint16(o);const len=v.getUint16(o+2);if(mk===0xFFE1&&v.getUint32(o+4)===0x45786966){return parseExif(v,o+10)}o+=2+len}
 return null;
}
function parseExif(v,s){
 const le=v.getUint16(s)===0x4949;const u16=p=>v.getUint16(p,le),u32=p=>v.getUint32(p,le);
 const ifd0=s+u32(s+4);const n=u16(ifd0);let gps=0;
 for(let i=0;i<n;i++){const e=ifd0+2+i*12;if(u16(e)===0x8825)gps=s+u32(e+8)}
 if(!gps)return null;const m=u16(gps);const tags={};
 for(let i=0;i<m;i++){const e=gps+2+i*12;const tag=u16(e);const off=s+u32(e+8);
  if(tag===1||tag===3)tags[tag]=String.fromCharCode(v.getUint8(e+8));
  if(tag===2||tag===4){const r=k=>u32(off+k*8)/u32(off+k*8+4);tags[tag]=r(0)+r(1)/60+r(2)/3600}}
 if(tags[2]==null||tags[4]==null)return null;
 const lat=tags[2]*(tags[1]==='S'?-1:1),lng=tags[4]*(tags[3]==='W'?-1:1);
 if(lat<40||lat>56||lng<46||lng>88)return null;return {lat,lng};
}
const BURN=/түтін|жан|дым|гор|smoke|burn|fire|өрт/i;
function ruleAnalysis(types,volume,desc){
 const ks=types.length?types:['household'];
 const w=ks.map((k,i)=>1/(1+i*.6));const sum=w.reduce((a,b)=>a+b,0);
 const composition=ks.map((k,i)=>({type:k,share:Math.round(w[i]/sum*100)}));
 let sev=VOLUMES[volume]?.s||2;if(ks.some(k=>TYPES[k].hz))sev+=1;if(BURN.test(desc||''))sev+=1;sev=Math.max(1,Math.min(5,sev));
 return {types:ks,composition,severity:sev,volume};
}
function completeAnalysis(a0,desc){
 const a={...a0,types:(a0.types||['household']).filter(k=>TYPES[k])};if(!a.types.length)a.types=['household'];
 if(!a.composition?.length)a.composition=ruleAnalysis(a.types,a.volume,desc).composition;
 const gen=k=>a.types.map(x=>L3(TYPES[x][k]));
 a.solutions_citizen=[...gen('cz'),t('gen_cz1'),t('gen_cz2')];
 a.solutions_city=[...gen('ct'),t('gen_ct1'),t('gen_ct2')];
 a.hazards=[a.types.some(k=>TYPES[k].hz)?t('hz_toxic'):t('hz_general'),...(a.types.includes('organic')||a.types.includes('household')?[t('hz_rodents')]:[])];
 a.summary=t('sum_tpl').replace('{types}',a.types.map(typeL).join(', ').toLowerCase()).replace('{vol}',L3(VOLUMES[a.volume]?.l||VOLUMES.few.l).toLowerCase()).replace('{sev}',a.severity);
 a.contacts=['109','eotinish',...(a.severity>=4?['1414']:[]),...(BURN.test(desc||'')||a.types.includes('tires')?['112']:[])];
 if(!VOLUMES[a.volume])a.volume='few';
 return a;
}
function appealText(r,a){
 const place=[r.city,r.address].filter(Boolean).join(', ')||t('no_address');
 return t('appeal_tpl').replace('{city}',r.city||t('city_generic')).replace('{date}',dstr(r.createdAt)).replace('{place}',place).replace('{coords}',`${(+r.lat).toFixed(5)}, ${(+r.lng).toFixed(5)}`).replace('{types}',a.types.map(typeL).join(', ').toLowerCase()).replace('{vol}',L3(VOLUMES[a.volume].l).toLowerCase()).replace('{m3}',VOLUMES[a.volume].m3).replace('{sev}',a.severity).replace('{desc}',r.description?`\n${t('appeal_desc')}: ${r.description}`:'').replace('{haz}',a.hazards.join(' ')).replace('{name}',r.reporterName||S.me?.name||'');
}
function callScript(r,a){
 const place=[r.city,r.address].filter(Boolean).join(', ')||t('no_address');
 return t('call_tpl').replace('{place}',place).replace('{coords}',`${(+r.lat).toFixed(5)}, ${(+r.lng).toFixed(5)}`).replace('{types}',a.types.map(typeL).join(', ').toLowerCase()).replace('{vol}',L3(VOLUMES[a.volume].l).toLowerCase());
}
if($('repForm'))$('repForm').addEventListener('submit',e=>{
 e.preventDefault();
 if(!photoFile){toast(t('need_photo'));return}
 const lat=+$('repLat').value,lng=+$('repLng').value;
 if(!lat||!lng){toast(t('need_point'));return}
 if(lat<40||lat>56||lng<46||lng>88){toast(t('out_of_kz'));return}
 const desc=$('repDesc').value.trim();
 if(/\+?\d[\d \-()]{8,}\d/.test(desc)){toast(t('no_phone_in_desc'));return}
 const base={id:null,createdAt:Date.now(),city:$('repCity').value,address:$('repAddress').value.trim(),lat,lng,description:desc,reporterName:$('repName').value.trim()};
 const a=ruleAnalysis([...selTypes],$('repVolume').value,desc);
 S.draft={...base,full:$('repPrev').src,analysis:a};
 renderResult(S.draft,{draft:true});
 $('repResult').scrollIntoView({behavior:'smooth',block:'start'});
});
const CONTACTS={'109':{n:'109',d:'c109'},'1414':{n:'1414',d:'c1414'},'112':{n:'112',d:'c112'},eotinish:{n:'eotinish.kz',d:'cot',href:'https://eotinish.kz'}};
function renderResult(r,{draft=false,box='repResult',pre='rc'}={}){
 const a=completeAnalysis(r.analysis,r.description);const el=$(box);const st=statusOf(r);
 const sevName=a.severity>=4?t('sev_high'):a.severity===3?t('sev_mid'):t('sev_low');
 const ev=(r.events||[]).filter(x=>x.status);
 el.innerHTML=`
 <div class="row between"><span class="pill sev">${esc(t('src_rules'))}</span>${draft?'':`<span class="pill st-${st}">${esc(stL(st))}</span>`}</div>
 <div class="preview" style="margin-top:14px"><img src="${esc(r.full||r.photo_url||r.thumb)}" alt="${esc(t('f_photo'))}"></div>
 ${r.admin_comment?`<p class="note info" style="margin-top:14px"><b>${esc(t('adm_answer'))}:</b> ${esc(r.admin_comment)}</p>`:''}
 <div class="result-sec"><h4>${esc(t('r_summary'))}</h4><p>${esc(a.summary)}</p>${r.description?`<p class="muted" style="margin-top:8px">${esc(r.description)}</p>`:''}</div>
 <div class="result-sec"><div class="row between"><h4 style="margin:0">${esc(t('r_sev'))}: ${a.severity} / 5, ${esc(sevName.toLowerCase())}</h4><span class="muted small">${esc(t('r_vol'))}: ${esc(L3(VOLUMES[a.volume].l).toLowerCase())}, ~${VOLUMES[a.volume].m3} m³</span></div><div class="sev-meter">${[1,2,3,4,5].map(i=>`<i class="${i<=a.severity?'f'+a.severity:''}"></i>`).join('')}</div></div>
 <div class="result-sec"><div class="charts2"><div class="chart-box"><b class="small">${esc(t('r_comp'))}</b><div class="cv" style="height:230px"><canvas id="${pre}Comp"></canvas></div></div><div class="chart-box"><b class="small">${esc(t('r_decomp'))}</b><div class="cv" style="height:230px"><canvas id="${pre}Dec"></canvas></div></div></div><p class="tiny muted" style="margin-top:8px">${esc(t('decomp_note'))}</p></div>
 <div class="result-sec"><h4>${esc(t('r_hazards'))}</h4><ul class="list">${a.hazards.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
 <div class="result-sec"><h4>${esc(t('r_citizen'))}</h4><ul class="list">${a.solutions_citizen.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
 <div class="result-sec"><h4>${esc(t('r_city'))}</h4><ul class="list">${a.solutions_city.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
 <div class="result-sec"><h4>${esc(t('r_call'))}</h4><div class="phones">${a.contacts.map(k=>{const c=CONTACTS[k];return `<div>${c.href?`<a href="${c.href}" target="_blank" rel="noopener"><b>${esc(c.n)}</b></a>`:`<a href="tel:${c.n}"><b>${esc(c.n)}</b></a>`}<span>${esc(t(c.d))}</span></div>`}).join('')}</div>
  <p class="small" style="margin:14px 0 8px"><b>${esc(t('r_script'))}</b></p><div class="appeal" id="${pre}Call">${esc(callScript(r,a))}</div><div class="row" style="margin-top:10px"><button class="btn sm soft" type="button" data-copy="${pre}Call">${esc(t('copy'))}</button></div></div>
 <div class="result-sec"><h4>${esc(t('r_appeal'))}</h4><p class="small muted" style="margin-bottom:10px">${esc(t('r_appeal_d'))}</p><div class="appeal" id="${pre}Appeal">${esc(appealText(r,a))}</div><div class="row" style="margin-top:10px"><button class="btn sm soft" type="button" data-copy="${pre}Appeal">${esc(t('copy'))}</button><a class="btn sm ghost" href="https://eotinish.kz" target="_blank" rel="noopener">eOtinish</a><a class="btn sm ghost" href="https://2gis.kz/geo/${r.lng},${r.lat}" target="_blank" rel="noopener">2GIS</a></div></div>
 ${ev.length?`<div class="result-sec"><h4>${esc(t('history'))}</h4><ul class="list">${ev.map(x=>`<li><b>${esc(stL(x.status))}</b>, ${esc(dstr(Date.parse(x.at)))}${x.comment?`: ${esc(x.comment)}`:''}</li>`).join('')}</ul></div>`:''}
 ${draft?`<div class="result-sec"><button class="btn sun full" type="button" id="publishBtn">${esc(t('publish'))}</button><p class="tiny muted" style="margin-top:8px">${esc(t('publish_d'))}</p></div>`:''}`;
 drawResultCharts(a,pre);
 if(draft)$('publishBtn').onclick=publishDraft;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(b){const el=$(b.dataset.copy);copyText(el.textContent,el)}});
function chartBase(){if(typeof Chart==='undefined')return false;Chart.defaults.color=cssv('--muted');Chart.defaults.font.family=cssv('--body');Chart.defaults.font.size=13;Chart.defaults.borderColor=cssv('--line');return true}
function mkChart(id,cfg){if(!chartBase()||!$(id))return;if(S.charts[id])S.charts[id].destroy();S.charts[id]=new Chart($(id),cfg)}
const typeColor=k=>cssv(TYPES[k]?.c||'--muted');
function drawResultCharts(a,pre){
 mkChart(pre+'Comp',{type:'doughnut',data:{labels:a.composition.map(c=>typeL(c.type)),datasets:[{data:a.composition.map(c=>c.share),backgroundColor:a.composition.map(c=>typeColor(c.type)),borderColor:cssv('--surface'),borderWidth:3}]},options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{boxWidth:12}},tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}%`}}}}});
 const ks=a.composition.map(c=>c.type);
 mkChart(pre+'Dec',{type:'bar',data:{labels:ks.map(typeL),datasets:[{data:ks.map(k=>TYPES[k].y),backgroundColor:ks.map(typeColor),borderRadius:6,maxBarThickness:34}]},options:{maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+yearsL(c.raw)}}},scales:{x:{type:'logarithmic',min:.1,max:2000,ticks:{callback:v=>[.1,1,10,100,1000].includes(v)?yearsL(v):''}},y:{grid:{display:false}}}}});
}
function yearsL(y){if(y<1)return Math.round(y*12)+' '+t('months');return (y>=1000?'1000+':fmt(y,0))+' '+t('years')}
async function publishDraft(){
 const d=S.draft;if(!d||!photoFile)return;const btn=$('publishBtn');btn.disabled=true;btn.textContent=t('publishing');
 const fd=new FormData();fd.append('photo',photoFile);fd.append('types',JSON.stringify(d.analysis.types));fd.append('volume',d.analysis.volume);
 ['city','address','lat','lng','description'].forEach(k=>fd.append(k,d[k]));fd.append('reporter_name',d.reporterName);
 try{const res=await api('/api/reports',{method:'POST',body:fd});
  S.draft=null;S.mine.unshift(res.report);S.remote.unshift(res.report);
  $('repResult').insertAdjacentHTML('afterbegin',`<p class="note ok" style="margin-bottom:14px">${esc(t('pub_ok'))} <a href="/map">${esc(t('see_on_map'))}</a> · <a href="/cabinet">${esc(t('t_my'))}</a></p>`);
  btn.remove();resetForm();renderAll();toast(t('pub_ok'));
 }catch(err){btn.disabled=false;btn.textContent=t('publish');toast(err.message)}
}
function resetForm(){$('repForm').reset();clearPhoto();selTypes.clear();renderChips();if(pick.marker){pick.marker.remove();pick.marker=null}fillSelects()}

/* ---------- big map ---------- */
const big={map:null,layer:null,pts:null,markers:{}};
function initBigMap(){if(big.map||typeof L==='undefined'||!$('bigMap'))return;big.map=baseMap('bigMap');big.layer=L.layerGroup().addTo(big.map);big.pts=L.layerGroup().addTo(big.map);renderMap()}
function filteredReports(){
 const c=$('mfCity').value,s=$('mfStatus').value,ty=$('mfType').value;
 return S.remote.filter(r=>(c==='all'||r.city===c)&&(s==='all'||statusOf(r)===s)&&(ty==='all'||(r.analysis?.types||[]).includes(ty)));
}
function popupHtml(r){
 const a=r.analysis||{types:[]};const st=statusOf(r);
 return `<img src="${esc(r.thumb)}" alt=""><b>${esc([r.city,r.address].filter(Boolean).join(', ')||t('no_address'))}</b><br><span class="pill st-${st}" style="margin:6px 0">${esc(stL(st))}</span><br>${esc(a.types.map(typeL).join(', '))}<br>${esc(t('r_sev'))}: ${a.severity||'-'} / 5<br><span class="muted">${esc(dstr(r.createdAt))}</span>${r.description?`<p style="margin-top:6px">${esc(r.description)}</p>`:''}${r.admin_comment?`<p style="margin-top:6px"><b>${esc(t('adm_answer'))}:</b> ${esc(r.admin_comment)}</p>`:''}<p style="margin-top:8px"><a href="#" data-open="${r.id}">${esc(t('open_details'))}</a> · <a href="https://2gis.kz/geo/${r.lng},${r.lat}" target="_blank" rel="noopener">2GIS</a></p>`;
}
function renderMap(){
 if(!$('mapList'))return;
 const list=filteredReports();
 $('mapCount').textContent=t('shown')+': '+list.length;
 $('mapList').innerHTML=list.length?list.map(r=>`<button class="rcard" data-id="${r.id}"><img src="${esc(r.thumb)}" alt=""><span class="min0"><b>${esc([r.city,r.address].filter(Boolean).join(', ')||t('no_address'))}</b><span class="meta">${esc((r.analysis?.types||[]).map(typeL).join(', '))}</span><br><span class="pill st-${statusOf(r)}" style="margin-top:6px">${esc(stL(statusOf(r)))}</span> <span class="meta">${esc(dstr(r.createdAt))}</span></span></button>`).join(''):`<div class="empty">${esc(S.synced?t('map_empty'):t('loading'))}<br><a href="/report">${esc(t('cta_report'))}</a></div>`;
 if(!big.map)return;
 big.layer.clearLayers();big.markers={};
 list.forEach(r=>{const icon=L.divIcon({className:'',html:`<div class="pin st-${statusOf(r)}" style="background-image:url('${esc(r.thumb)}')"></div>`,iconSize:[46,46],iconAnchor:[23,23],popupAnchor:[0,-20]});
  big.markers[r.id]=L.marker([r.lat,r.lng],{icon}).bindPopup(popupHtml(r),{maxWidth:280}).addTo(big.layer)});
 big.pts.clearLayers();
 if($('mfPoints').checked)S.points.forEach(p=>{const icon=L.divIcon({className:'',html:'<div class="rpin"></div>',iconSize:[22,22],iconAnchor:[11,11]});
  L.marker([p.lat,p.lng],{icon}).bindPopup(`<b>${esc(p.name)}</b><br>${esc(matL(p.material))}<br>${esc(p.address)}${p.phone?'<br>'+esc(p.phone):''}${p.is_demo?`<br><span class="muted">${esc(t('demo_point'))}</span>`:''}`).addTo(big.pts)});
}
if($('mfCity'))['mfCity','mfStatus','mfType','mfPoints'].forEach(id=>$(id).addEventListener('change',()=>{renderMap();const c=CITIES.find(x=>x[0]===$('mfCity').value);if(c&&big.map)big.map.setView([c[1],c[2]],12)}));
if($('mapList'))$('mapList').addEventListener('click',e=>{const b=e.target.closest('.rcard');if(!b)return;const m=big.markers[b.dataset.id];if(m){big.map.setView(m.getLatLng(),16);m.openPopup()}});
document.addEventListener('click',e=>{const a=e.target.closest('[data-open]');if(!a)return;e.preventDefault();openDetails(a.dataset.open)});
function openDetails(id){const r=findReport(id);if(!r)return;const dlg=$('detail');renderResult(r,{box:'detailBody',pre:'dt'});if(!dlg.open)dlg.showModal()}
$('detailClose').onclick=()=>$('detail').close();
$('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close()});

/* ---------- cabinet ---------- */
document.querySelectorAll('#uSide button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)showTab(g.dataset.go)});
let curTab='my';
const WS_TABS=['dash','scanner','analyzer','monitor','pred','recs','assistant','eco','points','analytics','calc','reports'];
function showTab(k){
 if(WS_TABS.includes(k)&&!S.isCompany){k='profile';toast(t('ws_locked'))}
 curTab=k;document.querySelectorAll('#uSide button').forEach(b=>b.classList.toggle('on',b.dataset.tab===k));document.querySelectorAll('#v-user .tab').forEach(x=>x.classList.toggle('on',x.id==='t-'+k));
 if(ZW.view==='user')history.replaceState(null,'','#'+k);renderCabinet();
}
function renderCabinet(){
 if(!$('myList')||!S.me)return;
 $('uName').textContent=S.me.name;$('uAvatar').textContent=S.me.name.slice(0,1).toUpperCase();
 $('uRole').textContent=[S.isAdmin?t('role_admin_s'):t('role_user_s'),S.me.account_type==='company'?(t('rg_company_t')+(S.me.company?', '+S.me.company:'')):t('rg_citizen'),S.me.email].join(' · ');
 $('pfRole').textContent=S.isAdmin?t('role_admin_s'):t('role_user_s');
 const mine=S.mine;
 $('myTotal').textContent=mine.length;$('myNew').textContent=mine.filter(r=>statusOf(r)==='new').length;$('myProg').textContent=mine.filter(r=>statusOf(r)==='progress').length;$('myDone').textContent=mine.filter(r=>statusOf(r)==='resolved').length;
 const order=['new','progress','resolved'];
 $('myList').innerHTML=mine.length?mine.map(r=>{const st=statusOf(r);const idx=st==='rejected'?-1:order.indexOf(st);
  return `<article class="myrep"><img src="${esc(r.thumb)}" alt=""><div class="min0"><div class="row between"><b>${esc([r.city,r.address].filter(Boolean).join(', ')||t('no_address'))}</b><span class="pill st-${st}">${esc(stL(st))}</span></div><p class="muted small" style="margin-top:4px">№${r.id} · ${esc(dstr(r.createdAt))} · ${esc((r.analysis?.types||[]).map(typeL).join(', '))} · ${esc(t('r_sev'))} ${r.analysis?.severity||'-'}/5</p>
  <div class="timeline">${order.map((s,i)=>`<span class="${st==='rejected'?'':i<idx||(i===idx&&s==='resolved')?'done':i===idx?'cur':''}"></span>`).join('')}</div><p class="tiny muted" style="margin-top:4px">${esc(order.map(stL).join(' · '))}</p>
  ${r.admin_comment?`<p class="note ${st==='rejected'?'bad':'info'} small" style="margin-top:10px"><b>${esc(t('adm_answer'))}:</b> ${esc(r.admin_comment)}</p>`:''}
  <div class="row" style="margin-top:12px"><button class="btn sm soft" type="button" data-open="${r.id}">${esc(t('open_details'))}</button>${st==='new'?`<span class="confirm" data-wd="${r.id}"><button class="btn sm ghost" type="button" data-wd1>${esc(t('withdraw'))}</button></span>`:''}</div></div></article>`}).join(''):`<div class="panel empty"><h3>${esc(t('my_empty'))}</h3><p style="margin:8px 0 16px">${esc(t('my_empty_d'))}</p><a class="btn primary" href="/report">${esc(t('cta_report'))}</a></div>`;
 renderWorkspace();
}
if($('myList'))$('myList').addEventListener('click',async e=>{const w=e.target.closest('[data-wd]');if(!w)return;
 if(e.target.matches('[data-wd1]'))w.innerHTML=`<button class="btn sm danger" type="button" data-wd2>${esc(t('confirm_del'))}</button><button class="btn sm ghost" type="button" data-wd0>${esc(t('cancel'))}</button>`;
 if(e.target.matches('[data-wd0]'))renderCabinet();
 if(e.target.matches('[data-wd2]')){try{await api('/api/reports/'+w.dataset.wd,{method:'DELETE'});S.mine=S.mine.filter(r=>String(r.id)!==w.dataset.wd);S.remote=S.remote.filter(r=>String(r.id)!==w.dataset.wd);renderAll();toast(t('withdrawn'))}catch(err){toast(err.message)}}});
// profile
function pfTypeToggle(){if($('pfType'))$('pfCompanyWrap').classList.toggle('hidden',$('pfType').value!=='company')}
if($('pfType')){$('pfType').addEventListener('change',pfTypeToggle);pfTypeToggle()}
if($('pfForm'))$('pfForm').addEventListener('submit',async e=>{e.preventDefault();
 try{const d=await api('/api/profile',{method:'POST',body:{name:$('pfName').value,company:$('pfCompany').value,city:$('pfCity').value,phone:$('pfPhone').value,account_type:$('pfType').value}});
  const typeChanged=d.user.account_type!==S.me.account_type;S.me=d.user;toast(t('saved'));if(typeChanged)setTimeout(()=>location.reload(),600);else renderCabinet()}catch(err){toast(err.message)}});
if($('pwForm'))$('pwForm').addEventListener('submit',async e=>{e.preventDefault();
 if($('pwNew').value!==$('pwNew2').value){toast(t('err_password2'));return}
 try{await api('/api/profile/password',{method:'POST',body:{current:$('pwCur').value,new:$('pwNew').value,new2:$('pwNew2').value}});e.target.reset();toast(t('pw_changed'))}catch(err){toast(err.message)}});

/* ---------- workspace (server data, client calculations) ---------- */
const recs=()=>S.ws.records||[];
function summary(){const rows=recs();const total=rows.reduce((a,r)=>a+r.amount,0),cost=rows.reduce((a,r)=>a+r.cost,0);const materials={},monthly={},sources={};rows.forEach(r=>{materials[r.material]=(materials[r.material]||0)+r.amount;const m=r.date.slice(0,7);monthly[m]=(monthly[m]||0)+r.amount;sources[r.source]=(sources[r.source]||0)+r.amount});const ms=Object.entries(monthly).sort().slice(-6);return {total,cost,records:rows.length,materials,sources,months:{labels:ms.map(x=>x[0]),values:ms.map(x=>+x[1].toFixed(1))},recycled:total*.62,landfill:total*.38}}
function forecast(){
 const rows=recs();if(!rows.length)return {next:0,next30:0,confidence:0,trend:'none',daily:0};
 const iso=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
 const last14=rows.filter(r=>r.date>=iso(14));const base=last14.length?last14:rows;const ud=Math.max(1,new Set(base.map(r=>r.date)).size);const daily=base.reduce((a,r)=>a+r.amount,0)/Math.min(14,ud);
 const cut=iso(7);const older=rows.filter(r=>r.date<cut),newer=rows.filter(r=>r.date>=cut);const oa=older.reduce((a,r)=>a+r.amount,0)/Math.max(1,older.length),na=newer.reduce((a,r)=>a+r.amount,0)/Math.max(1,newer.length);
 const trend=newer.length&&older.length&&na>oa*1.1?'up':newer.length&&older.length&&na<oa*.9?'down':'flat';
 return {next:daily*7,next30:daily*30,confidence:Math.min(90,50+rows.length*2),trend,daily};
}
const trendL=k=>t('tr_'+k);
function ecoscore(){const rows=recs();const by=new Set(rows.map(r=>r.material));const rs=Math.min(100,rows.length*8),ds=Math.min(100,by.size*18),cs=Math.min(100,new Set(rows.map(r=>r.date)).size*7);const score=rows.length?Math.round(rs*.35+ds*.25+cs*.4):0;return {score,grade:score>=80?t('gr_great'):score>=60?t('gr_good'):t('gr_start'),comps:[[t('ec_c1'),rs,35],[t('ec_c2'),ds,25],[t('ec_c3'),cs,40]]}}
function renderWorkspace(){
 if(!S.isCompany||!$('dTotal'))return;const s=summary(),f=forecast();
 $('wsBadge').textContent=S.me.company||t('own_data');
 $('dTotal').textContent=fmt(s.total);$('dRec').textContent=fmt(s.recycled);$('dCost').textContent=fmt(s.cost,0);$('dCount').textContent=s.records;
 $('dFc').innerHTML=fmt(f.next)+'<small>kg</small>';$('dFcTrend').textContent=trendL(f.trend);
 $('recentRows').innerHTML=recs().slice(0,5).map(r=>`<tr><td class="num">${r.date}</td><td>${esc(matL(r.material))}</td><td>${esc(srcL(r.source))}</td><td class="num">${fmt(r.amount)} ${esc(r.unit)}</td></tr>`).join('')||`<tr><td colspan="4" class="empty">${esc(t('no_records'))}</td></tr>`;
 const matE=Object.entries(s.materials);const mc=k=>cssv({Plastic:'--sky',Metal:'--muted',Organic:'--ok',Paper:'--sun',Glass:'--info',Other:'--warn'}[k]||'--muted');
 const lineCfg=(id,type)=>mkChart(id,{type,data:{labels:s.months.labels,datasets:[{data:s.months.values,borderColor:cssv('--sky'),backgroundColor:type==='bar'?cssv('--sky'):cssv('--sky-soft'),fill:true,tension:.35,borderWidth:2.5,pointRadius:3,borderRadius:6,maxBarThickness:40}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true}}}});
 if(curTab==='dash'){lineCfg('cTrend','line');mkChart('cMat',{type:'doughnut',data:{labels:matE.map(x=>matL(x[0])),datasets:[{data:matE.map(x=>x[1]),backgroundColor:matE.map(x=>mc(x[0])),borderColor:cssv('--surface'),borderWidth:3}]},options:{maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'bottom',labels:{boxWidth:12}}}}})}
 if(curTab==='analytics'){lineCfg('aTrend','bar');mkChart('aMat',{type:'bar',data:{labels:matE.map(x=>matL(x[0])),datasets:[{data:matE.map(x=>x[1]),backgroundColor:matE.map(x=>mc(x[0])),borderRadius:6}]},options:{maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}}}});const se=Object.entries(s.sources);mkChart('aSrc',{type:'bar',data:{labels:se.map(x=>srcL(x[0])),datasets:[{data:se.map(x=>x[1]),backgroundColor:cssv('--sun'),borderRadius:6,maxBarThickness:44}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}}}});mkChart('aSplit',{type:'doughnut',data:{labels:[t('recycled'),t('landfill')],datasets:[{data:[s.recycled,s.landfill],backgroundColor:[cssv('--ok'),cssv('--muted')],borderColor:cssv('--surface'),borderWidth:3}]},options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'}}}})}
 const q=($('moSearch').value||'').toLowerCase();
 $('moRows').innerHTML=recs().filter(r=>(matL(r.material)+' '+srcL(r.source)+' '+r.note).toLowerCase().includes(q)).map(r=>`<tr><td class="num">${r.date}</td><td>${esc(matL(r.material))}</td><td>${esc(srcL(r.source))}</td><td class="num">${fmt(r.amount)} ${esc(r.unit)}</td><td class="num">${money(r.cost)}</td><td><span class="confirm" data-del="${r.id}"><button class="btn sm danger" type="button" data-del1>${esc(t('delete'))}</button></span></td></tr>`).join('')||`<tr><td colspan="6" class="empty">${esc(t('no_records'))}</td></tr>`;
 $('pNext').textContent=fmt(f.next);$('pNext30').textContent=fmt(f.next30);$('pConf').textContent=f.confidence;$('pTrend').textContent=trendL(f.trend);
 const top1=[...matE].sort((a,b)=>b[1]-a[1])[0];
 $('recList').innerHTML=top1?[[t('rc1').replace('{m}',matL(top1[0]).toLowerCase()),t('tip_'+(top1[0] in MATS?top1[0]:'Other')),t('impact_high')],[t('rc2'),t('rc2d'),t('impact_mid')],[t('rc3'),t('rc3d'),t('impact_mid')]].map(([h,p,i])=>`<article class="card"><span class="tag">${esc(i)}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join(''):`<p class="muted">${esc(t('no_records'))}</p>`;
 const e=ecoscore();$('ecoVal').textContent=e.score;$('ecoGrade').textContent=e.grade;$('ecoRing').style.setProperty('--deg',e.score*3.6+'deg');$('ecoTotal').textContent=fmt(s.total)+' kg';$('ecoRecs').textContent=s.records;
 $('ecoComps').innerHTML=e.comps.map(([n,sc,w])=>`<div class="comp"><div class="row"><b>${esc(n)}</b><span class="num muted">${sc}/100 · ${w}%</span></div><div class="meter"><span style="width:${sc}%"></span></div></div>`).join('');
 $('scHist').innerHTML=S.ws.scans.length?S.ws.scans.map(x=>`<div class="scan-item"><img src="${esc(x.image_url)}" alt=""><div><b>${esc(matL(x.material))}</b><br><span class="muted">${esc(x.created_at.slice(0,10))}</span>${x.note?`<br>${esc(x.note)}`:''}</div></div>`).join(''):`<p class="muted">${esc(t('sc_none'))}</p>`;
 $('ptList').innerHTML=S.ws.points.map(p=>`<div class="kv"><span><b>${esc(p.name)}</b><br><span class="small muted">${esc(matL(p.material))} · ${esc(p.address)}</span></span>${p.is_demo?`<span class="pill sev">${esc(t('example'))}</span>`:''}</div>`).join('')||`<p class="muted">${esc(t('no_records'))}</p>`;
 $('asMode').textContent=t('as_rules');
}
if($('moOpen')){
$('moOpen').onclick=()=>{$('moFormPanel').classList.remove('hidden');$('moDate').value=new Date().toISOString().slice(0,10)};
$('moClose').onclick=()=>$('moFormPanel').classList.add('hidden');
$('moSearch').addEventListener('input',renderWorkspace);
$('moForm').addEventListener('submit',async e=>{e.preventDefault();const amount=+$('moAmount').value,cost=+$('moCost').value;if(!(amount>0)||cost<0){toast(t('check_data'));return}
 try{await api('/api/records',{method:'POST',body:{date:$('moDate').value,material:$('moMat').value,amount,unit:$('moUnit').value,cost,source:$('moSrc').value,note:$('moNote').value.trim()}});
  S.ws.records=await api('/api/records');e.target.reset();$('moFormPanel').classList.add('hidden');renderWorkspace();toast(t('saved'))}catch(err){toast(err.message)}});
$('moRows').addEventListener('click',async e=>{const w=e.target.closest('[data-del]');if(!w)return;
 if(e.target.matches('[data-del1]'))w.innerHTML=`<button class="btn sm danger" type="button" data-del2>${esc(t('confirm_del'))}</button><button class="btn sm ghost" type="button" data-del0>${esc(t('cancel'))}</button>`;
 else if(e.target.matches('[data-del0]'))renderWorkspace();
 else if(e.target.matches('[data-del2]')){try{await api('/api/records/'+w.dataset.del,{method:'DELETE'});S.ws.records=S.ws.records.filter(r=>String(r.id)!==w.dataset.del);renderWorkspace();toast(t('deleted'))}catch(err){toast(err.message)}}});
const THRESH={Plastic:4,Metal:3,Organic:6,Paper:5,Glass:2.5};
$('anForm').addEventListener('submit',e=>{e.preventDefault();const p=+$('anProd').value,w=+$('anWaste').value,m=$('anMat').value;
 if(!(p>0)||w<0||w>p){$('anResult').innerHTML=`<p class="note bad">${esc(t('an_err'))}</p>`;return}
 const rate=w/p*100,tg=THRESH[m]||4;const lv=rate<=tg?'low':rate<=tg*1.5?'medium':'high';const pot=Math.max(0,w-p*tg/100);
 $('anResult').innerHTML=`<span class="status-big lv-${lv}">${esc(t('lv_'+lv))}</span><div class="big-num">${fmt(rate,2)}<small>% ${esc(t('waste_word'))}</small></div><div class="meter"><span style="width:${Math.min(100,rate*5)}%;background:var(--${lv==='low'?'ok':lv==='medium'?'warn':'bad'})"></span></div><div class="kv"><span>${esc(t('an_thr'))}</span><b class="num">${tg}%</b></div><div class="kv"><span>${esc(t('an_over'))}</span><b class="num">${fmt(pot,2)} kg</b></div><div class="advice"><b>${esc(t('advice'))}</b><p>${esc(t('adv_'+lv))}</p></div>`});
let scFile=null;
$('scPhoto').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith('image/')){toast(t('only_image'));return}scFile=f;$('scPrev').src=URL.createObjectURL(f);$('scPrevWrap').classList.remove('hidden')});
$('scForm').addEventListener('submit',async e=>{e.preventDefault();if(!scFile){toast(t('need_photo'));return}const btn=$('scBtn');btn.disabled=true;
 const fd=new FormData();fd.append('image',scFile);fd.append('material',$('scMat').value);fd.append('note',$('scNote').value.trim());
 try{const d=await api('/api/scanner',{method:'POST',body:fd});
  $('scResult').innerHTML=`<img src="${esc(d.image_url)}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px"><span class="status-big lv-low" style="margin-top:14px">${esc(matL(d.material))}</span><div class="kv"><span>${esc(t('sc_score'))}</span><b class="num">${d.confidence}%</b></div><div class="advice"><b>${esc(t('sc_guide'))}</b><p>${esc(t('g_'+d.material))}</p></div><p class="small muted" style="margin-top:12px">${esc(t('sc_expl'))}</p>`;
  S.ws.scans=await api('/api/scans');renderWorkspace();toast(t('saved'))}catch(err){toast(err.message)}finally{btn.disabled=false}});
function bubble(txt,who){const d=document.createElement('div');d.className='bubble '+who;d.textContent=txt;$('chat').appendChild(d);$('chat').scrollTop=1e6;return d}
function ruleAnswer(q){const rows=recs();const s=summary(),f=forecast();const by=Object.entries(s.materials).sort((a,b)=>b[1]-a[1])[0];q=q.toLowerCase();
 if(/көп|неге|қай материал|which|most|больше|какой/.test(q))return by?t('ans_most').replace('{m}',matL(by[0])).replace('{a}',fmt(by[1])).replace('{t}',fmt(s.total)):t('ans_none');
 if(/болж|келесі|forecast|прогноз|30/.test(q))return t('ans_fc').replace('{a}',fmt(f.next)).replace('{b}',fmt(f.next30));
 if(/үнем|ақша|құн|cost|save|эконом|деньг/.test(q))return t('ans_save');
 if(/сұрып|қайта өңде|recycl|sort|сорт|перераб/.test(q))return t('ans_sort');
 return t('ans_default').replace('{n}',rows.length).replace('{t}',fmt(s.total));}
function ask(q){if(!q.trim())return;bubble(q,'me');setTimeout(()=>bubble(ruleAnswer(q),'bot'),250)}
$('asForm').addEventListener('submit',e=>{e.preventDefault();const v=$('asInput').value;$('asInput').value='';ask(v)});
document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>ask(t(b.dataset.q))));
function calc(){const o=+$('caOut').value,r=+$('caRate').value,u=+$('caCost').value,red=+$('caRed').value;if(!(o>0)||u<0||r<0||r>100||red<0||red>100){toast(t('check_data'));return}
 const cur=o*r/100*u,sav=cur*red/100;$('caSave').textContent=money(sav);$('caCur').textContent=money(cur);$('caYear').textContent=money(sav*12);$('caNew').textContent=fmt(r*(1-red/100),2)+'%';
 mkChart('caChart',{type:'bar',data:{labels:[t('ca_now'),t('ca_after')],datasets:[{data:[cur,cur-sav],backgroundColor:[cssv('--muted'),cssv('--ok')],borderRadius:6,maxBarThickness:60}]},options:{maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}})}
$('caForm').addEventListener('submit',e=>{e.preventDefault();calc();toast(t('calc_done'))});
$('ptForm').addEventListener('submit',async e=>{e.preventDefault();
 try{await api('/api/map/points',{method:'POST',body:{name:$('ptName').value.trim(),material:$('ptMat').value,address:$('ptAddr').value.trim(),lat:$('ptLat').value,lng:$('ptLng').value,phone:$('ptPhone').value.trim()}});
  e.target.reset();S.ws.points=await api('/api/map/points');S.points=await api('/api/points/public');renderWorkspace();renderMap();toast(t('saved'))}catch(err){toast(err.message)}});
}
const DL={csv:'/api/export.csv',xls:'/api/export.xlsx',myrep:'/api/reports/mine.csv'};
document.addEventListener('click',e=>{const b=e.target.closest('[data-dl]');if(b)location.href=DL[b.dataset.dl]});

/* ---------- admin ---------- */
async function loadAdmin(){
 if(!S.isAdmin||!$('admRows'))return;
 try{const [reports,users]=await Promise.all([api('/api/admin/reports'),api('/api/admin/users')]);S.admin=reports;S.users=users}catch(e){toast(e.message)}
 S.synced=true;renderAdmin();
}
function renderAdmin(){
 if(!S.isAdmin||!$('admRows')||ZW.view!=='admin')return;
 $('admLock').classList.add('hidden');$('admBody').classList.remove('hidden');
 const all=S.admin;const cnt=s=>all.filter(r=>statusOf(r)===s).length;
 $('aTotal').textContent=all.length;$('aNew').textContent=cnt('new');$('aProg').textContent=cnt('progress');$('aRate').textContent=(all.length?Math.round(cnt('resolved')/all.length*100):0)+'%';
 const days=[...Array(14)].map((_,i)=>new Date(Date.now()-(13-i)*864e5).toISOString().slice(0,10));
 mkChart('admDaily',{type:'bar',data:{labels:days.map(d=>d.slice(5)),datasets:[{data:days.map(d=>all.filter(r=>new Date(r.createdAt).toISOString().slice(0,10)===d).length),backgroundColor:cssv('--sky'),borderRadius:5,maxBarThickness:28}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0}}}}});
 const sk=Object.keys(STATUSES);mkChart('admStatus',{type:'doughnut',data:{labels:sk.map(stL),datasets:[{data:sk.map(cnt),backgroundColor:[cssv('--info'),cssv('--warn'),cssv('--ok'),cssv('--muted')],borderColor:cssv('--surface'),borderWidth:3}]},options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom'}}}});
 const tc={};all.forEach(r=>(r.analysis?.types||[]).forEach(k=>tc[k]=(tc[k]||0)+1));const te=Object.entries(tc).sort((a,b)=>b[1]-a[1]);
 mkChart('admTypes',{type:'bar',data:{labels:te.map(x=>typeL(x[0])),datasets:[{data:te.map(x=>x[1]),backgroundColor:te.map(x=>typeColor(x[0])),borderRadius:5}]},options:{maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}}}}});
 const cc={};all.forEach(r=>{const c=r.city||t('no_city');cc[c]=(cc[c]||0)+1});const ce=Object.entries(cc).sort((a,b)=>b[1]-a[1]).slice(0,10);
 mkChart('admCities',{type:'bar',data:{labels:ce.map(x=>x[0]),datasets:[{data:ce.map(x=>x[1]),backgroundColor:cssv('--sun'),borderRadius:5,maxBarThickness:36}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
 renderAdminRows();renderUsers();
}
function renderAdminRows(){
 const q=($('afSearch').value||'').toLowerCase(),fs=$('afStatus').value,fc=$('afCity').value,fv=$('afSev').value;
 const list=S.admin.filter(r=>{const sv=r.analysis?.severity||0;return (fs==='all'||statusOf(r)===fs)&&(fc==='all'||r.city===fc)&&(fv==='all'||(fv==='high'?sv>=4:fv==='mid'?sv===3:sv<=2))&&([r.city,r.address,r.description,r.reporterName,r.author_email].join(' ').toLowerCase().includes(q))});
 $('admRows').innerHTML=list.length?list.map(r=>{const st=statusOf(r);const sv=r.analysis?.severity||0;return `<tr data-id="${r.id}"><td><a href="#" data-open="${r.id}"><img class="thumb" src="${esc(r.thumb)}" alt=""></a></td><td style="min-width:180px"><b>${esc(r.city||t('no_city'))}</b><br><span class="small muted">${esc(r.address||'')}</span><br><span class="tiny muted">${esc(t('author'))}: ${esc(r.author_email||'')}</span></td><td class="small">${esc((r.analysis?.types||[]).map(typeL).join(', '))}</td><td><span class="pill sev-${sv}">${sv}/5</span></td><td class="small num" style="white-space:nowrap">№${r.id}<br>${esc(dstr(r.createdAt))}</td><td><select data-st>${Object.keys(STATUSES).map(k=>`<option value="${k}"${k===st?' selected':''}>${esc(stL(k))}</option>`).join('')}</select></td><td style="min-width:220px"><div class="row" style="flex-wrap:nowrap"><input data-cm value="${esc(r.admin_comment||'')}" maxlength="500" style="padding:7px 10px;font-size:.92rem"><button class="btn sm soft" type="button" data-save>${esc(t('save'))}</button></div></td><td><span class="confirm"><button class="btn sm danger" type="button" data-rm1>${esc(t('delete'))}</button></span></td></tr>`}).join(''):`<tr><td colspan="8" class="empty">${esc(t('adm_empty'))}</td></tr>`;
}
async function setMod(id,patch){
 try{await api('/api/admin/reports/'+id,{method:'PATCH',body:patch});const r=S.admin.find(x=>String(x.id)===String(id));Object.assign(r,patch.comment!==undefined?{admin_comment:patch.comment}:{},patch.status?{status:patch.status}:{});renderAdmin();toast(t('saved'))}
 catch(e){toast(e.message);renderAdminRows()}
}
if($('admRows')){
['afSearch','afStatus','afCity','afSev'].forEach(id=>$(id).addEventListener(id==='afSearch'?'input':'change',renderAdminRows));
$('admRows').addEventListener('change',e=>{if(!e.target.matches('[data-st]'))return;const tr=e.target.closest('tr');setMod(tr.dataset.id,{status:e.target.value,comment:tr.querySelector('[data-cm]').value.trim()})});
$('admRows').addEventListener('click',async e=>{const tr=e.target.closest('tr');if(!tr)return;const id=tr.dataset.id;
 if(e.target.matches('[data-save]'))setMod(id,{comment:tr.querySelector('[data-cm]').value.trim()});
 if(e.target.matches('[data-rm1]'))e.target.parentElement.innerHTML=`<button class="btn sm danger" type="button" data-rm2>${esc(t('confirm_del'))}</button><button class="btn sm ghost" type="button" data-rm0>${esc(t('cancel'))}</button>`;
 if(e.target.matches('[data-rm0]'))renderAdminRows();
 if(e.target.matches('[data-rm2]')){try{await api('/api/admin/reports/'+id,{method:'DELETE'});S.admin=S.admin.filter(x=>String(x.id)!==id);renderAdmin();toast(t('deleted'))}catch(err){toast(err.message)}}});
$('admExport').onclick=()=>location.href='/api/admin/reports.csv';
$('auSearch').addEventListener('input',renderUsers);
$('auRows').addEventListener('change',async e=>{const tr=e.target.closest('tr');if(!tr)return;const id=tr.dataset.uid;
 const body=e.target.matches('[data-role]')?{role:e.target.value}:e.target.matches('[data-block]')?{is_blocked:e.target.checked}:null;if(!body)return;
 try{await api('/api/admin/users/'+id,{method:'PATCH',body});const u=S.users.find(x=>String(x.id)===id);Object.assign(u,body);renderUsers();toast(t('saved'))}catch(err){toast(err.message);renderUsers()}});
}
function renderUsers(){
 const q=($('auSearch').value||'').toLowerCase();
 $('auRows').innerHTML=S.users.filter(u=>(u.name+' '+u.email+' '+(u.company||'')).toLowerCase().includes(q)).map(u=>{const self=u.id===S.me.id;return `<tr data-uid="${u.id}"><td><b>${esc(u.name)}</b>${u.company?`<br><span class="small muted">${esc(u.company)}</span>`:''}${self?` <span class="pill sev">${esc(t('you'))}</span>`:''}</td><td class="small">${esc(u.email)}</td><td class="small">${esc(u.account_type==='company'?t('rg_company_t'):t('rg_citizen'))}</td><td class="num">${u.reports}</td><td class="small num">${u.last_login?esc(u.last_login.slice(0,16).replace('T',' ')):esc(t('never'))}</td><td><select data-role ${self?'disabled':''}><option value="user"${u.role==='user'?' selected':''}>${esc(t('role_user_s'))}</option><option value="admin"${u.role==='admin'?' selected':''}>${esc(t('role_admin_s'))}</option></select></td><td><label class="check"><input type="checkbox" data-block ${u.is_blocked?'checked':''} ${self?'disabled':''}><span class="small">${esc(u.is_blocked?t('blocked_s'):t('active_s'))}</span></label></td></tr>`}).join('')||`<tr><td colspan="7" class="empty">${esc(t('no_records'))}</td></tr>`;
}

/* ---------- render all ---------- */
function renderAll(){
 const all=S.remote;const c=s=>all.filter(r=>statusOf(r)===s).length;
 ['hs','ms'].forEach(p=>{if(!$(p+'Total'))return;$(p+'Total').textContent=all.length;$(p+'New').textContent=c('new');$(p+'Prog').textContent=c('progress');$(p+'Done').textContent=c('resolved')});
 heroMap();renderMap();
 if(ZW.view==='user')renderCabinet();
 renderAdmin();
}

/* ---------- boot ---------- */
$('lang').addEventListener('change',e=>{lang=e.target.value;try{localStorage.setItem('zw_lang',lang)}catch(_){}applyLang();if(S.draft)renderResult(S.draft,{draft:true})});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>renderAll());
applyLang();route();
loadPublic().then(()=>{if(ZW.view==='user')loadWorkspace()});
setInterval(()=>{if(!document.hidden&&ZW.view!=='report')loadPublic()},30000);
