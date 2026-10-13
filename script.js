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
const footerConversation = document.querySelector('.footer');
const footerEye = document.querySelector('.footer-brand-mark');
const eyePointer = matchMedia('(hover: hover) and (pointer: fine)');
if (footerConversation && footerEye) {
  const eyeArea = footerEye.parentElement;
  const eyeTracking = document.createElement('span');
  eyeTracking.className = 'footer-eye-tracking';
  eyeArea.append(eyeTracking);
  eyeTracking.append(footerEye);
  let eyeHovered = false;
  let eyeAngle = 0;
  let eyeTargetAngle = 0;
  let eyeFrame = 0;
  let eyeLastTime = 0;
  const angleDifference = (target, current) => ((target - current + 540) % 360 + 360) % 360 - 180;
  const renderEye = (time) => {
    eyeFrame = 0;
    const elapsed = eyeLastTime ? Math.min(64, time - eyeLastTime) : 16;
    eyeLastTime = time;
    const difference = angleDifference(eyeTargetAngle, eyeAngle);
    eyeAngle += difference * (1 - Math.exp(-elapsed / 85));
    eyeTracking.style.transform = `rotate(${eyeAngle}deg)`;
    if (Math.abs(difference) > 0.05 && !eyeHovered) {
      eyeFrame = requestAnimationFrame(renderEye);
    } else {
      eyeLastTime = 0;
    }
  };
  const scheduleEye = () => {
    if (!eyeFrame && !eyeHovered) eyeFrame = requestAnimationFrame(renderEye);
  };
  const resetEye = () => {
    eyeTargetAngle = 0;
    if (reduced.matches || !eyePointer.matches) {
      cancelAnimationFrame(eyeFrame);
      eyeFrame = 0;
      eyeLastTime = 0;
      eyeAngle = 0;
      eyeTracking.style.transform = 'rotate(0deg)';
    } else {
      scheduleEye();
    }
  };
  footerConversation.addEventListener('pointermove', (event) => {
    if (reduced.matches || !eyePointer.matches || eyeHovered) return;
    const bounds = eyeArea.getBoundingClientRect();
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    eyeTargetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    scheduleEye();
  }, { passive: true });
  const eyeHoverTargets = [eyeArea, footerConversation.querySelector('.footer-start')].filter(Boolean);
  eyeHoverTargets.forEach((target) => {
    target.addEventListener('pointerenter', () => {
      eyeHovered = true;
      cancelAnimationFrame(eyeFrame);
      eyeFrame = 0;
      eyeLastTime = 0;
      eyeArea.classList.add('is-eye-hovered');
    });
    target.addEventListener('pointerleave', () => {
      eyeHovered = false;
      eyeArea.classList.remove('is-eye-hovered');
      scheduleEye();
    });
  });
  footerConversation.addEventListener('pointerleave', resetEye);
  reduced.addEventListener('change', resetEye);
  eyePointer.addEventListener('change', resetEye);
}
let manualPause = false;
function videoState(){const paused=video.paused;videoButton.innerHTML=paused?'Afspelen <span>▶</span>':'Pauzeren <span>Ⅱ</span>';videoButton.setAttribute('aria-label',paused?'Projectvideo afspelen':'Projectvideo pauzeren');}
video.addEventListener('play',videoState); video.addEventListener('pause',videoState);
videoButton.addEventListener('click',()=>{if(video.paused){manualPause=false;video.play().catch(()=>videoState());}else{manualPause=true;video.pause();}});
new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!reduced.matches&&!manualPause){video.play().catch(()=>videoState());}else{video.pause();}},{threshold:.15}).observe(video);
const track=document.querySelector('.reel-track');const frame=document.querySelector('.reel-frame');let scheduled=false;
function updateReel(){
  scheduled=false;
  if(reduced.matches){frame.style.width='100%';frame.style.setProperty('--reel-radius','0px');return;}
  const rect=track.getBoundingClientRect();
  const progress=Math.max(0,Math.min(1,(innerHeight*.62-rect.top)/Math.max(280,innerHeight*.75)));
  const small=innerWidth<=650;
  const start=small?70:46;
  const end=100;
  frame.style.width=`${start+(end-start)*progress}%`;
  frame.style.setProperty('--reel-radius',`${18*(1-progress)}px`);
}
addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateReel);}},{passive:true});addEventListener('resize',updateReel);reduced.addEventListener('change',()=>{if(reduced.matches)video.pause();updateReel();});updateReel();

const floatingHeader = document.querySelector('.header');
let headerTicking = false;
function wiggleHeaderMark(){
  if(reduced.matches)return;
  const compact=floatingHeader.classList.contains('is-compact');
  const mark=floatingHeader.querySelector(compact?'.brand-symbol':'.brand-eye>path');
  if(!mark || !mark.animate)return;
  if(floatingHeader.markWiggle)floatingHeader.markWiggle.cancel();
  floatingHeader.markWiggle=mark.animate([
    {transform:'translateY(0) rotate(0) scale(1)',offset:0},
    {transform:'translateY(-2px) rotate(-10deg) scale(1.035,.975)',offset:.2},
    {transform:'translateY(-1px) rotate(8deg) scale(.985,1.025)',offset:.43},
    {transform:'translateY(0) rotate(-4deg) scale(1.01,.995)',offset:.65},
    {transform:'translateY(0) rotate(2deg) scale(1)',offset:.82},
    {transform:'translateY(0) rotate(0) scale(1)',offset:1}
  ],{duration:680,easing:'cubic-bezier(.37,0,.25,1)'});
}

function updateHeader(){
  headerTicking = false;
  const compact = floatingHeader.classList.contains('is-compact');
  if (!compact && scrollY > 90) {
    floatingHeader.classList.add('is-compact');
    wiggleHeaderMark();
  } else if (compact && scrollY < 35) {
    floatingHeader.classList.remove('is-compact');
    wiggleHeaderMark();
  }
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
  // Start the footer transition on entry, rather than near the top of the viewport.
  const footer=document.querySelector('.footer[data-scroll-bg]');
  if(footer){
    const footerTop=footer.getBoundingClientRect().top;
    const footerFadeStart=innerHeight*.72;
    // Finish by mid-viewport, or by the maximum reachable scroll position.
    const maxScroll=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    const footerTopAtEnd=footerTop-(maxScroll-scrollY);
    const footerFadeEnd=Math.max(innerHeight*.3,footerTopAtEnd);
    const progress=Math.max(0,Math.min(1,(footerFadeStart-footerTop)/Math.max(1,footerFadeStart-footerFadeEnd)));
    const blend=reduced.matches?(progress>0?1:0):progress*progress*(3-2*progress);
    const channel=(from,to)=>Math.round(from+(to-from)*blend);
    footer.style.setProperty('--footer-art-opacity',blend);
    footer.style.setProperty('--footer-bg',`rgb(${channel(255,0)},${channel(255,13)},${channel(255,73)})`);
    footer.style.setProperty('--footer-fg',`rgb(${channel(27,255)},${channel(28,255)},${channel(36,255)})`);
    footer.style.setProperty('--footer-accent',`rgb(${channel(53,168)},${channel(88,188)},${channel(253,255)})`);
    if(progress>0)active=footer;
  }
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

// Reveal client logos once, staggered within each visible batch.
const clientLogos=[...document.querySelectorAll('.client-grid img')];
if(!reduced.matches && 'IntersectionObserver' in window){
  const logoObserver=new IntersectionObserver(entries=>{
    entries.filter(entry=>entry.isIntersecting).forEach((entry,index)=>{
      const logo=entry.target;
      logo.style.setProperty('--logo-delay',`${index*90}ms`);
      logo.classList.remove('logo-awaiting');
      logo.classList.add('logo-arriving');
      logo.addEventListener('animationend',()=>logo.classList.remove('logo-arriving'),{once:true});
      logoObserver.unobserve(logo);
    });
  },{threshold:.2});
  clientLogos.forEach(logo=>{logo.classList.add('logo-awaiting');logoObserver.observe(logo);});
  reduced.addEventListener('change',()=>{
    if(reduced.matches){logoObserver.disconnect();clientLogos.forEach(logo=>logo.classList.remove('logo-awaiting','logo-arriving'));}
  });
}

// Reader-controlled testimonials: full text, no automatic rotation.
const reviewSection=document.querySelector('.testimonials');
if(reviewSection){
 const slides=[...reviewSection.querySelectorAll('.testimonial-slide')];
 const controls=reviewSection.querySelector('.testimonial-controls');
 const reviewStage=reviewSection.querySelector('.testimonial-stage');
 function positionReviewControls(){
  reviewStage.append(controls);
 }
 let currentReview=0;
 slides.forEach(slide=>{
  const person=slide.querySelector('.testimonial-person');
  const company=person.querySelector('.testimonial-author span');
  const heading=document.createElement('h3');
  heading.className='review-company';
  const author=person.querySelector('.testimonial-author');
  const fullName=Array.from(author.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join(' ').trim();
  const firstName=document.createElement('span');
  firstName.className='review-first-name';
  firstName.textContent=fullName.split(/\s+/)[0];
  const companyName=document.createElement('span');
  companyName.className='review-company-name';
  companyName.textContent=company.textContent.trim();
  heading.append(firstName,document.createTextNode(' van '),companyName);
  slide.querySelector('h2').replaceWith(heading);
  company.hidden=true;
  const identity=document.createElement('div');
  identity.className='review-identity';
  identity.append(person.querySelector('.testimonial-photo'));
  const quote=slide.querySelector('blockquote');
  quote.textContent=quote.textContent.trim().replace(/^[“"]|[”"]$/g,'');
  slide.prepend(identity);
  person.remove();
 });

 function showReview(index){
  currentReview=(index+slides.length)%slides.length;
  controls.querySelector('.review-count').textContent=`${String(currentReview+1).padStart(2,'0')} / ${slides.length}`;
  slides.forEach((slide,i)=>{slide.hidden=i!==currentReview;});
  positionReviewControls();
 }
 if(slides.length>1){
  reviewSection.classList.add('is-interactive');controls.hidden=false;
  controls.querySelector('[data-review-prev]').addEventListener('click',()=>showReview(currentReview-1));
  controls.querySelector('[data-review-next]').addEventListener('click',()=>showReview(currentReview+1));
  showReview(0);
 }
}

// Bring each team portrait into view once, with a gentle stagger.
const teamPortraitCards=[...document.querySelectorAll('.team-grid>a')];
if(!reduced.matches && 'IntersectionObserver' in window){
 const teamObserver=new IntersectionObserver(entries=>{
  entries.filter(entry=>entry.isIntersecting).forEach((entry,index)=>{
   const card=entry.target;
   card.style.setProperty('--portrait-delay',`${index*120}ms`);
   card.classList.remove('portrait-awaiting');
   card.classList.add('portrait-entering');
   card.addEventListener('animationend',()=>card.classList.remove('portrait-entering'),{once:true});
   teamObserver.unobserve(card);
  });
 },{threshold:.12,rootMargin:'0px 0px -5%'});
 teamPortraitCards.forEach(card=>{card.classList.add('portrait-awaiting');teamObserver.observe(card);});
 reduced.addEventListener('change',()=>{
  if(reduced.matches){teamObserver.disconnect();teamPortraitCards.forEach(card=>card.classList.remove('portrait-awaiting','portrait-entering'));}
 });
}

// Clicking the logo refreshes the current page.
document.querySelector('.header .brand').addEventListener('click',event=>{
 if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
 event.preventDefault();
 window.location.reload();
});
// Match the mobile reading order to its stacked hero composition.
const heroPortrait=document.querySelector('.hero-portrait');
const mobileHero=matchMedia('(max-width: 650px)');
function positionHeroPortrait(){
 if(mobileHero.matches){
  document.querySelector('.hero-bottom').insertBefore(heroPortrait,document.querySelector('.hero-actions'));
 }else{
  document.querySelector('.hero-copy').insertBefore(heroPortrait,document.querySelector('.hero h1'));
 }
}
positionHeroPortrait();
mobileHero.addEventListener('change',positionHeroPortrait);
// Give each logo row its own loop, preserving inaccessible duplicates.
const logoSlider=document.querySelector('.eyee-logoslider-wrapper');
if(logoSlider){
 logoSlider.querySelectorAll('.marquee__group[aria-hidden]').forEach(group=>{
  group.removeAttribute('inert');
  group.querySelectorAll('a').forEach(link=>link.setAttribute('tabindex','-1'));
 });
 const secondMarquee=document.createElement('div');
 secondMarquee.className='marquee marquee-reverse';
 logoSlider.querySelectorAll('.marquee__group').forEach(group=>{
  const secondGroup=document.createElement('div');
  secondGroup.className='marquee__group';
  if(group.hasAttribute('aria-hidden')){
   secondGroup.setAttribute('aria-hidden','true');
  }
  secondGroup.append(group.querySelector('.r2'));
  secondMarquee.append(secondGroup);
 });
 logoSlider.append(secondMarquee);
}
