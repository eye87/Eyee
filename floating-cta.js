/* Content configuration: add page paths or set data-floating-cta on <body>.
   Set data-floating-cta="off" to disable. Destinations can differ per language. */
window.eyeeFloatingCTAContent = {
  ux: {
    nl: {title:'Een duidelijker digitaal product?', text:'Vertel ons waar je gebruikers tegenaan lopen.', button:'Bespreek je plannen', href:'https://eye-entertainment.nl/contact/'},
    en: {title:'A clearer digital experience?', text:'Tell us where your users get stuck.', button:'Let’s talk', href:'https://eye-entertainment.nl/contact/'}
  },
  home: {
    nl: {title:'Nieuwe plannen?', text:'Wij denken graag met je mee.', button:'Plan een videocall', href:'#videocall', action:'videocall'},
    en: {title:'New plans?', text:'We’d love to think along with you.', button:'Book a video call', href:'#videocall', action:'videocall'}
  },
  webshop: {
    nl: {title:'Plannen voor een nieuwe webshop?', text:'Van eerste idee tot een webshop die prettig werkt.', button:'Bespreek je plannen', href:'https://eye-entertainment.nl/contact/'},
    en: {title:'Planning a new webshop?', text:'From your first idea to a webshop people enjoy using.', button:'Let’s talk', href:'https://eye-entertainment.nl/contact/'}
  },
  website: {
    nl: {title:'Toe aan een betere website?', text:'Vertel ons wat je wilt bereiken. We denken graag mee.', button:'Bespreek je plannen', href:'https://eye-entertainment.nl/contact/'},
    en: {title:'Ready for a better website?', text:'Tell us what you want to achieve. We’d love to help.', button:'Let’s talk', href:'https://eye-entertainment.nl/contact/'}
  }
};

(() => {
  // Temporary design-review mode: reload starts a fresh preview.
  // Set to true again when the CTA is ready for production.
  const oncePerSession = false;
  const key = 'eyee-floating-cta-shown';
  if (oncePerSession) {
    try { if (sessionStorage.getItem(key)) return; }
    catch { return; /* Fail closed if session persistence is unavailable. */ }
  }
  const path = location.pathname.toLowerCase();
  const context = document.body.dataset.floatingCta ||
    (/contact|privacy|voorwaarden/.test(path) ? 'off' :
      /webshop|magento|shopware/.test(path) ? 'webshop' : /websites?\//.test(path) ? 'website' : 'home');
  const content = window.eyeeFloatingCTAContent[context];
  const launch = document.querySelector('.accessibility-launch');
  if (!content || !launch) return;
  const mobile = matchMedia('(max-width: 900px)');
  const started = performance.now();
  let shown = false, dismissed = false, frame = 0, timer;
  const card = document.createElement('aside');
  card.className = 'floating-cta';
  card.hidden = true;
  card.setAttribute('aria-labelledby', 'floating-cta-title');
  card.innerHTML = '<button class="floating-cta-close" type="button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2 id="floating-cta-title"></h2><p></p><a class="floating-cta-link"></a>';
  document.body.append(card);
  const close = card.querySelector('button');
  const link = card.querySelector('a');
  link.innerHTML = '<span class="floating-cta-label"></span><span class="floating-cta-arrow" aria-hidden="true"><img src="assets/arrow-right-white.svg" width="18" height="12" alt=""></span>';
  // Replace the placeholder with the Google Calendar booking URL when available.
  const booking = document.createElement('dialog');
  booking.className = 'videocall-dialog';
  booking.setAttribute('aria-labelledby', 'videocall-title');
  booking.innerHTML = '<button type="button" class="videocall-close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2 id="videocall-title" tabindex="-1"></h2><p class="videocall-intro"></p><div class="videocall-placeholder"><span class="videocall-placeholder-label"></span><p></p></div><a class="videocall-contact" href="https://eye-entertainment.nl/contact/"></a>';
  document.body.append(booking);
  const bookingClose = booking.querySelector('button');
  bookingClose.addEventListener('click', () => booking.close());
  booking.addEventListener('click', event => {
    if (event.target !== booking) return;
    const rect = booking.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) booking.close();
  });
  booking.addEventListener('close', () => requestAnimationFrame(() => {
    update();
    if (!card.hidden) link.focus({preventScroll:true});
  }));
  link.addEventListener('click', event => {
    const copy = content[document.documentElement.lang === 'en' ? 'en' : 'nl'] || content.nl;
    if (copy.action !== 'videocall') return;
    event.preventDefault();
    booking.showModal();
    booking.querySelector('h2').focus({preventScroll:true});
  });
  function translate() {
    const english = document.documentElement.lang === 'en';
    const copy = content[english ? 'en' : 'nl'] || content.nl;
    card.querySelector('h2').textContent = copy.title;
    card.querySelector('p').textContent = copy.text;
    link.querySelector('.floating-cta-label').textContent = copy.button;
    link.href = copy.href;
    if (copy.action === 'videocall') link.setAttribute('aria-haspopup', 'dialog');
    else link.removeAttribute('aria-haspopup');
    booking.querySelector('h2').textContent = english ? 'Let’s talk about your plans' : 'Even sparren over je plannen';
    booking.querySelector('.videocall-intro').textContent = english ? 'A 15-minute introduction via Google Meet.' : 'Maak in 15 minuten kennis via Google Meet.';
    booking.querySelector('.videocall-placeholder-label').textContent = english ? 'Booking calendar coming soon' : 'Afsprakenplanner volgt';
    booking.querySelector('.videocall-placeholder p').textContent = english ? 'This is where you’ll choose a time. Booking is not available yet.' : 'Hier kies je straks een moment dat jou uitkomt. Inplannen is nu nog niet mogelijk.';
    booking.querySelector('.videocall-contact').textContent = english ? 'Contact us in the meantime' : 'Neem intussen contact op';
    bookingClose.setAttribute('aria-label', english ? 'Close' : 'Sluiten');
    close.setAttribute('aria-label', english ? 'Dismiss suggestion' : 'Suggestie sluiten');
    schedule();
  }
  function dismiss() {
    dismissed = true;
    card.hidden = true;
    clearTimeout(timer);
    if (card.contains(document.activeElement)) launch.focus({preventScroll:true});
  }
  close.addEventListener('click', dismiss);
  card.addEventListener('keydown', event => {
    if (event.key === 'Escape') {event.preventDefault(); dismiss();}
  });
  function update() {
    frame = 0;
    if (dismissed) return;
    const blocked = document.hidden || !!document.querySelector('dialog[open]') ||
      document.body.classList.contains('expertise-open');
    const threshold = mobile.matches ? 12000 : 8000;
    const viewport = window.visualViewport;
    const height = viewport?.height || innerHeight;
    const range = document.documentElement.scrollHeight - height;
    const progress = range > 0 ? scrollY / range : 0;
    if (!shown) {
      if (blocked || performance.now() - started < threshold || progress < (mobile.matches ? .4 : .3)) return;
      // Another page in this tab may already have displayed its CTA.
      if (oncePerSession) try {
        if (sessionStorage.getItem(key)) {dismissed = true; return;}
        sessionStorage.setItem(key, '1');
      } catch {dismissed = true; return;}
      shown = true;
    }
    card.hidden = blocked;
    if (blocked) return;
    const launcherStyle = launch.hidden ? getComputedStyle(launch) : null;
    const button = launch.hidden
      ? {left:innerWidth, bottom:parseFloat(launcherStyle.top) + parseFloat(launcherStyle.height)}
      : launch.getBoundingClientRect();
    const right = innerWidth - button.left + 20;
    card.style.right = `${right}px`;
    card.style.maxWidth = `${Math.max(0, button.left - 40)}px`;
    const top = Math.max((viewport?.offsetTop || 0) + 12, button.bottom - card.offsetHeight);
    card.style.top = `${top}px`;
  }
  function schedule() {if (!frame) frame = requestAnimationFrame(update);}
  function arm() {
    clearTimeout(timer);
    timer = setTimeout(schedule, Math.max(0, (mobile.matches ? 12000 : 8000) - (performance.now() - started)));
    schedule();
  }
  document.addEventListener('eyeelanguagechange', translate);
  document.addEventListener('visibilitychange', schedule);
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  addEventListener('pageshow', schedule);
  mobile.addEventListener('change', arm);
  viewportEvents();
  function viewportEvents() {
    window.visualViewport?.addEventListener('resize', schedule, {passive:true});
    window.visualViewport?.addEventListener('scroll', schedule, {passive:true});
  }
  new MutationObserver(schedule).observe(document.body, {attributes:true, attributeFilter:['class']});
  document.querySelectorAll('dialog').forEach(dialog => {
    new MutationObserver(schedule).observe(dialog, {attributes:true, attributeFilter:['open']});
  });
  new MutationObserver(schedule).observe(launch, {attributes:true, attributeFilter:['style','hidden']});
  translate();
  arm();
})();
