(() => {
 const toggle=document.getElementById('mobileNavToggle');
 if(toggle)toggle.addEventListener('click',()=>document.querySelector('.public-links').classList.toggle('mobile-open'));
 const links=document.querySelectorAll('.public-links a');links.forEach(a=>a.addEventListener('click',()=>document.querySelector('.public-links').classList.remove('mobile-open')));
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});
 document.querySelectorAll('.reveal,.problem-card,.feature-card,.solution-copy,.solution-visual,.section-heading').forEach(el=>observer.observe(el));
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'})}}));
})();
