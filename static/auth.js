(()=>{
 const LANGS=['kk','ru','en'];let lang='kk';try{const s=localStorage.getItem('zw_lang');if(LANGS.includes(s))lang=s}catch(e){}
 const t=k=>{const v=I[k]||I2[k]||I3[k];return v?v[LANGS.indexOf(lang)]:null};
 function apply(){document.documentElement.lang=lang;document.getElementById('lang').value=lang;
  document.querySelectorAll('[data-t]').forEach(e=>{const v=t(e.dataset.t);if(v!=null)e.textContent=v});}
 document.getElementById('lang').addEventListener('change',e=>{lang=e.target.value;try{localStorage.setItem('zw_lang',lang)}catch(_){}apply();score()});
 document.querySelectorAll('.pass-toggle').forEach(b=>b.addEventListener('click',()=>{const i=document.getElementById(b.dataset.for);const show=i.type==='password';i.type=show?'text':'password';b.textContent=t(show?'hide':'show')}));
 // registration helpers
 const form=document.getElementById('regForm');
 function companyToggle(){if(!form)return;const c=form.querySelector('input[name=account_type]:checked')?.value==='company';document.getElementById('companyField').classList.toggle('hidden',!c);form.company.required=c}
 function score(){const pw=document.getElementById('pw');const bar=document.getElementById('pwBar');if(!pw||!bar)return;const v=pw.value;let s=0;if(v.length>=8)s++;if(v.length>=12)s++;if(/\d/.test(v)&&/\D/.test(v))s++;if(/[^A-Za-z0-9]/.test(v)&&/[A-ZА-ЯӘҒҚҢӨҰҮҺІ]/.test(v))s++;
  bar.style.width=(v?Math.max(12,s*25):0)+'%';bar.dataset.s=s;const h=document.getElementById('pwHint');if(h&&v)h.textContent=t(['pw_weak','pw_weak','pw_ok','pw_good','pw_strong'][s]);}
 if(form){
  form.querySelectorAll('input[name=account_type]').forEach(r=>r.addEventListener('change',companyToggle));companyToggle();
document.getElementById('pw').addEventListener('input',score);
  const p2=document.getElementById('pw2');p2.addEventListener('input',()=>document.getElementById('pw2Err').classList.toggle('hidden',!p2.value||p2.value===document.getElementById('pw').value));
  form.addEventListener('submit',e=>{const pw=document.getElementById('pw').value;if(pw!==p2.value){e.preventDefault();document.getElementById('pw2Err').classList.remove('hidden');p2.focus()}});
 }
 apply();
})();
