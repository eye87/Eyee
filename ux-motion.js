/* Meaningful motion: canvas transitions, a reading rhythm and optional video.
   No scroll interception, animation library, or autoplay media downloads. */
(() => {
  const root = document.documentElement;
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => systemMotion.matches || root.hasAttribute('data-a11y-motion');
  const main = document.querySelector('#ux-main');
  const hero = document.querySelector('.hero-portrait');
  const process = document.querySelector('.ux-process');
  const sections = [...main.querySelectorAll(':scope > section')];
  const projectStory=document.querySelector('.ux-project-story');
  const serviceChapters=[...document.querySelectorAll('[data-service-step]')];
  let frame = 0;
  const palette = sections.map(section=>section.matches('.hero,.client-strip,.ux-work,.ux-people')?[0,13,73]:section.matches('.ux-faq,.ux-services')?[241,244,255]:[255,255,255]);
  function paint() {
    frame = 0;
    if(projectStory){
      let active=0;
      serviceChapters.forEach((chapter,index)=>{if(chapter.getBoundingClientRect().top<innerHeight*.55)active=index;});
      projectStory.dataset.activeStep=String(active);
      // The compact copy no longer supplies three distinct reading screens.
      // Spread the zoom across the whole visual's passage through the viewport.
      const rect=projectStory.getBoundingClientRect();
      const progress=reduced()?0:Math.max(0,Math.min(1,(innerHeight*.8-rect.top)/(innerHeight*.63)));
      const easedZoom=progress*progress*(3-2*progress);
      projectStory.style.setProperty('--ux-project-zoom',String(1.02+easedZoom*.63));
      projectStory.style.setProperty('--ux-project-origin',`${50+easedZoom*50}% 50%`);
    }
    const line = innerHeight * .9;
    let current = 0;
    sections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=line)current=index;});
    const box = sections[current].getBoundingClientRect();
    // Follow the team heading, not the section's generous top padding.
    const extraSpace=sections[current].matches('.ux-people')
      ? Math.max(0,document.querySelector('#ux-people-title').getBoundingClientRect().top-box.top)+innerHeight*.08
      : sections[current].matches('.ux-work')?180:0;
    const blend = reduced() ? 1 : Math.max(0,Math.min(1,(line-box.top-extraSpace)/(innerHeight*.65)));
    const eased = blend*blend*(3-2*blend);
    const previous = palette[Math.max(0,current-1)];
    const next = palette[current];
    const rgb = previous.map((value,index)=>Math.round(value+(next[index]-value)*eased));
    main.style.setProperty('--ux-canvas',`rgb(${rgb.join(',')})`);
    // One canvas for every section: no opaque bands remain over the transition.
    const channels=rgb.map(value=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
    const light=channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.179;
    main.style.setProperty('--ux-ink',light?'#000d49':'#ffffff');
    main.style.setProperty('--ux-accent',light?'#3558fd':'#a8bcff');
    document.body.style.setProperty('--page-fg',light?'#000d49':'#ffffff');
    document.body.style.setProperty('--page-bg',`rgb(${rgb.join(',')})`);
    process.style.setProperty('--ux-process-ink',light?'#000d49':'#ffffff');
    const edge = sections.findIndex(section=>{const rect=section.getBoundingClientRect();return rect.top<=0&&rect.bottom>0;});
    if(edge>=0) root.style.setProperty('--browser-bg',`rgb(${rgb.join(',')})`);
    // Same footer entry transition as the homepage.
    const footer=document.querySelector('.footer[data-scroll-bg]');
    if(footer){
      const footerTop=footer.getBoundingClientRect().top;
      const start=innerHeight*1.14;
      const maxScroll=Math.max(0,document.documentElement.scrollHeight-innerHeight);
      const end=Math.max(innerHeight*.66,footerTop-(maxScroll-scrollY));
      const progress=Math.max(0,Math.min(1,(start-footerTop)/Math.max(1,start-end)));
      const mix=reduced()?(progress>0?1:0):progress*progress*(3-2*progress);
      const channel=(from,to)=>Math.round(from+(to-from)*mix);
      footer.style.setProperty('--footer-art-opacity',mix);
      footer.style.setProperty('--footer-bg',`rgb(${channel(255,0)},${channel(255,13)},${channel(255,73)})`);
      footer.style.setProperty('--footer-fg',`rgb(${channel(27,255)},${channel(28,255)},${channel(36,255)})`);
      footer.style.setProperty('--footer-accent',`rgb(${channel(53,168)},${channel(88,188)},${channel(253,255)})`);
      if(footerTop<=0)root.style.setProperty('--browser-bg',footer.style.getPropertyValue('--footer-bg'));
    }
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  const targets = [...document.querySelectorAll('.ux-challenges article,.ux-cases article,.ux-scan,.ux-portraits figure,.ux-people blockquote')];
  const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}
  }),{threshold:.08,rootMargin:'0px 0px -20px 0px'});
  if(!reduced()) targets.forEach(target=>{
    // Never hide content already visible, focused, or needed for an anchor.
    if(target.getBoundingClientRect().top>innerHeight){target.classList.add('ux-reveal-ready');observer.observe(target);}
  });
  const illustrations=[...document.querySelectorAll('.ux-process-art,.ux-scan-mark')];
  const artObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){
      if(!reduced())entry.target.classList.add('ux-art-arrive');
      artObserver.unobserve(entry.target);
    }
  }),{threshold:.5});
  illustrations.forEach((art,index)=>{
    art.style.setProperty('--art-delay',`${index%4*90}ms`);
    art.addEventListener('animationend',()=>art.classList.remove('ux-art-arrive'));
    artObserver.observe(art);
  });
  const video = document.querySelector('#hero-video');
  const mobileVideo=matchMedia('(max-width:650px)');
  let inView=true;
  function syncVideo(){
    if(inView&&!document.hidden&&!reduced()&&!navigator.connection?.saveData){
      if(!video.hasAttribute('src'))video.src=mobileVideo.matches?'assets/eyee-showreel-20261015-v4-hero-mobile.mp4':'assets/eyee-showreel-20261015-v4-hero-desktop.mp4';
      video.muted=true;video.play().catch(()=>{});
    }else video.pause();
  }
  video.addEventListener('playing',()=>hero.classList.add('has-video-frame'));
  video.addEventListener('error',()=>hero.classList.remove('has-video-frame'));
  mobileVideo.addEventListener('change',()=>{video.pause();video.removeAttribute('src');video.load();hero.classList.remove('has-video-frame');syncVideo();});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncVideo();},{threshold:.05}).observe(hero);
  document.addEventListener('visibilitychange',syncVideo);
  function motionChanged(){
    if(reduced()){
      observer.disconnect();
      illustrations.forEach(art=>art.classList.remove('ux-art-arrive'));
      targets.forEach(target=>target.classList.add('is-revealed'));
      hero.style.removeProperty('--ux-hero-angle');
      video.pause();
    }
    syncVideo();
    schedule();
  }
  systemMotion.addEventListener('change',motionChanged);
  document.addEventListener('eyeeaccessibilitychange',motionChanged);
  document.addEventListener('focusin',event=>event.target.closest('.ux-reveal-ready')?.classList.add('is-revealed'));
  const demo=document.querySelector('.ux-scan-demo');
  const demoTabs=[...(demo?.querySelectorAll('[role="tab"]') || [])];
  function selectDemo(tab){
    demo.dataset.scanView=tab.dataset.scanTab;
    demoTabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;});
  }
  demoTabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectDemo(tab));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=(index+1)%demoTabs.length;
      if(event.key==='ArrowLeft')next=(index+demoTabs.length-1)%demoTabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=demoTabs.length-1;
      if(next!==undefined){event.preventDefault();selectDemo(demoTabs[next]);demoTabs[next].focus();}
    });
  });
  schedule();
})();
