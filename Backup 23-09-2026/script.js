const menu = document.querySelector('#menu');
const toggle = document.querySelector('.menu-toggle');
toggle.addEventListener('click', () => { menu.showModal(); document.body.classList.add('menu-open'); toggle.setAttribute('aria-expanded','true'); });
function closeMenu(){ menu.close(); }
document.querySelector('.menu-close').addEventListener('click', closeMenu);
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
menu.addEventListener('close',()=>{document.body.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});});
const video = document.querySelector('#reel');
const videoButton = document.querySelector('#video-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let manualPause = false;
function videoState(){const paused=video.paused;videoButton.innerHTML=paused?'Afspelen <span>▶</span>':'Pauzeren <span>Ⅱ</span>';videoButton.setAttribute('aria-label',paused?'Projectvideo afspelen':'Projectvideo pauzeren');}
video.addEventListener('play',videoState); video.addEventListener('pause',videoState);
videoButton.addEventListener('click',()=>{if(video.paused){manualPause=false;video.play().catch(()=>videoState());}else{manualPause=true;video.pause();}});
new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!reduced.matches&&!manualPause){video.play().catch(()=>videoState());}else{video.pause();}},{threshold:.15}).observe(video);
const track=document.querySelector('.reel-track');const frame=document.querySelector('.reel-frame');let scheduled=false;
function updateReel(){
  scheduled=false;
  if(reduced.matches){frame.style.width='';return;}
  const rect=track.getBoundingClientRect();
  const progress=Math.max(0,Math.min(1,(innerHeight*.62-rect.top)/Math.max(280,innerHeight*.75)));
  const small=innerWidth<=650;
  const start=small?70:46;
  const end=small?94:90;
  frame.style.width=`${start+(end-start)*progress}%`;
}
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateReel);}},{passive:true});addEventListener('resize',updateReel);reduced.addEventListener('change',()=>{if(reduced.matches)video.pause();updateReel();});updateReel();

const floatingHeader = document.querySelector('.header');
let headerTicking = false;
function updateHeader(){
  headerTicking = false;
  const compact = floatingHeader.classList.contains('is-compact');
  if (!compact && scrollY > 90) floatingHeader.classList.add('is-compact');
  else if (compact && scrollY < 35) floatingHeader.classList.remove('is-compact');
}
addEventListener('scroll',()=>{
  if(!headerTicking){headerTicking=true;requestAnimationFrame(updateHeader);}
},{passive:true});
addEventListener('pageshow',updateHeader);
updateHeader();

const colorSections=[...document.querySelectorAll('[data-scroll-bg]')];
let backgroundTicking=false;
function updatePageBackground(){
  backgroundTicking=false;
  const focusY=innerHeight*.18;
  let active=colorSections[0];
  let nearest=Infinity;
  colorSections.forEach(section=>{
    const rect=section.getBoundingClientRect();
    if(rect.top<=focusY&&rect.bottom>focusY){active=section;nearest=0;return;}
    if(nearest===0)return;
    const distance=Math.min(Math.abs(rect.top-focusY),Math.abs(rect.bottom-focusY));
    if(distance<nearest){nearest=distance;active=section;}
  });
  if(active){
    const background=active.dataset.scrollBg;
    document.body.style.setProperty('--page-bg',background);
    const value=background.slice(1);
    const red=parseInt(value.slice(0,2),16);
    const green=parseInt(value.slice(2,4),16);
    const blue=parseInt(value.slice(4,6),16);
    const luminance=(red*.299+green*.587+blue*.114)/255;
    document.body.style.setProperty('--page-fg',luminance>.58?'#1b1c24':'#ffffff');
  }
}
function schedulePageBackground(){
  if(!backgroundTicking){backgroundTicking=true;requestAnimationFrame(updatePageBackground);}
}
addEventListener('scroll',schedulePageBackground,{passive:true});
addEventListener('resize',schedulePageBackground);
addEventListener('pageshow',updatePageBackground);
updatePageBackground();

// Tijdelijke portretselectie: vervang de afbeeldingen in de HTML.
const portraits=[...document.querySelectorAll('.portrait-slide')];
let portraitIndex=0;
setInterval(()=>{
  if(reduced.matches || document.hidden || !portraits.length) return;
  portraits[portraitIndex].classList.remove('is-active');
  portraitIndex=(portraitIndex+1)%portraits.length;
  portraits[portraitIndex].classList.add('is-active');
},5500);

// Laat de cases trapsgewijs verschijnen zodra het projectoverzicht in beeld komt.
const casePosters=[...document.querySelectorAll('.case-poster')];
if(reduced.matches){
  casePosters.forEach(poster=>poster.classList.add('is-visible'));
}else{
  casePosters.forEach((poster,index)=>{
    poster.classList.add('reveal-case');
    poster.style.setProperty('--reveal-delay',`${index*110}ms`);
  });
  const caseObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('is-visible');
      caseObserver.unobserve(entry.target);
    });
  },{threshold:.14,rootMargin:'0px 0px -8%'});
  casePosters.forEach(poster=>caseObserver.observe(poster));
}
