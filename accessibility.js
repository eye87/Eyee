/* Optional reading preferences; native browser zoom and keyboard controls stay available. */
(() => {
  const root = document.documentElement;
  // Keep iOS controls inside the stable small viewport, even with bars hidden.
  // Never track document scroll with absolute-positioned floating controls.
  const stableIOSViewport = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  root.toggleAttribute('data-ios-floating', stableIOSViewport);
  const viewportProbe = document.createElement('span');
  viewportProbe.setAttribute('aria-hidden', 'true');
  viewportProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none;';
  if (stableIOSViewport) document.body.append(viewportProbe);
  const key = 'eyee-accessibility';
  const hiddenSessionKey = 'eyee-accessibility-hidden';
  const defaults = {size: 100, contrast: false, dark: false, reading: false, motion: false, hidden: false};
  let preferences = {...defaults};
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === 'object') {
      for (const name of ['contrast', 'dark', 'reading', 'motion']) preferences[name] = saved[name] === true;
      if (Number.isFinite(saved.size)) preferences.size = Math.max(100, Math.min(200, Math.round(saved.size / 10) * 10));
    }
  } catch { /* Preferences also work without storage. */ }
  // Ignore the old persistent hidden flag; only the current tab session counts.
  // Explicit reload resets the preview; ordinary page navigation preserves it.
  const reloaded = performance.getEntriesByType('navigation')[0]?.type === 'reload';
  try {
    if (reloaded) sessionStorage.removeItem(hiddenSessionKey);
    preferences.hidden = sessionStorage.getItem(hiddenSessionKey) === '1';
  }
  catch { /* Keep the button visible when session storage is unavailable. */ }
  const person = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="m4 8 8 2 8-2M12 10v5m0 0-4 6m4-6 4 6"/></svg>';
  const launch = document.createElement('button');
  launch.className = 'accessibility-launch';
  launch.type = 'button';
  launch.setAttribute('aria-haspopup', 'dialog');
  launch.setAttribute('aria-controls', 'accessibility-panel');
  launch.innerHTML = person;
  const hideLaunch = document.createElement('button');
  hideLaunch.className = 'accessibility-hide';
  hideLaunch.type = 'button';
  hideLaunch.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const panel = document.createElement('dialog');
  panel.id = 'accessibility-panel';
  panel.className = 'accessibility-panel';
  panel.setAttribute('aria-labelledby', 'accessibility-title');
  panel.innerHTML = `<div class="accessibility-heading"><h2 id="accessibility-title" tabindex="-1"></h2><button type="button" class="accessibility-close" data-close>×</button></div>
    <div class="accessibility-size"><span data-copy="size"></span><div><button type="button" data-size="-10">A−</button><output aria-live="polite"></output><button type="button" data-size="10">A+</button></div></div>
    <div class="accessibility-options"></div>
    <div class="accessibility-actions"><button type="button" data-reset></button></div>
    <button type="button" class="accessibility-hide-option" data-hide-launch data-copy="hide"></button>
    <p class="accessibility-note" data-copy="note"></p>
    <p class="accessibility-status" role="status"></p>`;
  document.body.append(launch, hideLaunch, panel);
  const hoverPointer = matchMedia('(hover:hover) and (pointer:fine)');
  let hoverFrame = 0, pointerX = -100, pointerY = -100;
  function updateProximity() {
    hoverFrame = 0;
    const rect = launch.getBoundingClientRect();
    const closeRect = hideLaunch.getBoundingClientRect();
    const inside = (box, margin) => pointerX >= box.left-margin && pointerX <= box.right+margin && pointerY >= box.top-margin && pointerY <= box.bottom+margin;
    launch.classList.toggle('is-near', hoverPointer.matches && !launch.hidden && !panel.open && (inside(rect,20) || inside(closeRect,0)));
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !hoverPointer.matches) return;
    pointerX = event.clientX; pointerY = event.clientY;
    if (!hoverFrame) hoverFrame = requestAnimationFrame(updateProximity);
  }, {passive:true});
  document.addEventListener('pointerleave', () => launch.classList.remove('is-near'));
  hoverPointer.addEventListener('change', updateProximity);
  const footerBar = document.querySelector('.footer-legal');
  const footerLanguage = document.querySelector('.footer-language');
  let placementFrame = 0;
  function positionLauncher() {
    placementFrame = 0;
    // Follow Safari's visible area when its browser bars expand or collapse.
    const viewport = window.visualViewport;
    const visibleBottom = stableIOSViewport ? viewportProbe.getBoundingClientRect().height : viewport ? viewport.offsetTop + viewport.height : innerHeight;
    if (!stableIOSViewport) launch.style.setProperty('--accessibility-viewport-bottom', `${visibleBottom}px`);
    if (!footerBar || !footerLanguage) return;
    const button = launch.getBoundingClientRect();
    const language = footerLanguage.getBoundingClientRect();
    const needsRoom = button.left < language.right + 20 && button.right > language.left - 20;
    const offset = needsRoom ? Math.max(0, visibleBottom - footerBar.getBoundingClientRect().top) : 0;
    launch.style.setProperty('--accessibility-footer-offset', `${offset}px`);
    const positioned = launch.getBoundingClientRect();
    hideLaunch.style.top = `${positioned.top - 30}px`;
    hideLaunch.style.right = `${innerWidth - positioned.right - 20}px`;
    updateProximity();
  }
  function scheduleLauncherPlacement() {
    if (!placementFrame) placementFrame = requestAnimationFrame(positionLauncher);
  }
  addEventListener('scroll', scheduleLauncherPlacement, {passive:true});
  addEventListener('resize', scheduleLauncherPlacement, {passive:true});
  window.visualViewport?.addEventListener('resize', scheduleLauncherPlacement, {passive:true});
  window.visualViewport?.addEventListener('scroll', scheduleLauncherPlacement, {passive:true});
  addEventListener('pageshow', scheduleLauncherPlacement);
  if (footerBar && 'ResizeObserver' in window) {
    const footerObserver = new ResizeObserver(scheduleLauncherPlacement);
    footerObserver.observe(footerBar);
    footerObserver.observe(document.body);
  }
  scheduleLauncherPlacement();
  const labels = {
    nl: {title:'Toegankelijkheid', size:'Tekstgrootte', increase:'Tekst vergroten', decrease:'Tekst verkleinen', close:'Sluiten', reset:'Instellingen herstellen', hide:'Zwevende knop verbergen', note:'Je voorkeuren blijven op dit apparaat bewaard.', restored:'Instellingen hersteld.', contrast:['Hoog contrast',''], dark:['Donkere modus',''], reading:['Leesvriendelijke tekst','Eenvoudiger lettertype, meer letterruimte.'], motion:['Minder beweging','Pauzeert video’s en animaties.']},
    en: {title:'Accessibility', size:'Text size', increase:'Increase text size', decrease:'Decrease text size', close:'Close', reset:'Reset settings', hide:'Hide floating button', note:'Your preferences are saved on this device.', restored:'Settings reset.', contrast:['High contrast',''], dark:['Dark mode',''], reading:['Reading-friendly text','Simpler typeface, more letter spacing.'], motion:['Reduce motion','Pauses videos and animations.']},
  };
  const options = panel.querySelector('.accessibility-options');
  for (const name of ['contrast', 'dark', 'reading', 'motion']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.preference = name;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<span><strong></strong><small></small></span><span class="accessibility-switch" aria-hidden="true"></span>';
    options.append(button);
  }
  const copy = () => labels[root.lang === 'en' ? 'en' : 'nl'];
  function localize() {
    const text = copy();
    panel.querySelector('h2').textContent = text.title;
    launch.setAttribute('aria-label', text.title);
    hideLaunch.setAttribute('aria-label', text.hide);
    hideLaunch.title = text.hide;
    document.querySelectorAll('[data-accessibility-open]').forEach(button => {
      button.textContent = text.title;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', panel.id);
    });
    panel.querySelectorAll('[data-copy]').forEach(element => {element.textContent = text[element.dataset.copy];});
    panel.querySelector('[data-close]').setAttribute('aria-label', text.close);
    panel.querySelector('[data-reset]').textContent = text.reset;
    panel.querySelector('[data-size="10"]').setAttribute('aria-label', text.increase);
    panel.querySelector('[data-size="-10"]').setAttribute('aria-label', text.decrease);
    options.querySelectorAll('button').forEach(button => {
      const [title, description] = text[button.dataset.preference];
      button.querySelector('strong').textContent = title;
      const detail = button.querySelector('small');
      detail.textContent = description || '';
      detail.hidden = !description;
    });
  }
  let fontEntries = [];
  function restoreFonts() {
    for (const {element, original} of fontEntries) {
      for (const [name, value, priority] of original) {
        if (value) element.style.setProperty(name, value, priority);
        else element.style.removeProperty(name);
      }
    }
    fontEntries = [];
  }
  function scaleText() {
    restoreFonts();
    if (preferences.size === 100) return;
    const factor = preferences.size / 100;
    const elements = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,span,label,button,input,textarea,summary,address,strong,small')]
      .filter(element => !element.closest('.accessibility-panel,.accessibility-launch,svg') && !element.hidden);
    fontEntries = elements.map(element => {
      const computed = getComputedStyle(element);
      return {element, font: parseFloat(computed.fontSize), line: parseFloat(computed.lineHeight), original: ['font-size', 'line-height'].map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)])};
    });
    for (const {element, font, line} of fontEntries) {
      element.style.setProperty('font-size', `${font * factor}px`, 'important');
      if (Number.isFinite(line)) element.style.setProperty('line-height', `${line * factor}px`, 'important');
    }
  }
  function apply() {
    for (const name of ['contrast', 'dark', 'reading', 'motion']) root.toggleAttribute(`data-a11y-${name}`, preferences[name]);
    root.toggleAttribute('data-a11y-text', preferences.size > 100);
    launch.hidden = preferences.hidden;
    hideLaunch.hidden = preferences.hidden;
    panel.querySelector('output').value = `${preferences.size}%`;
    panel.querySelector('[data-size="-10"]').disabled = preferences.size <= 100;
    panel.querySelector('[data-size="10"]').disabled = preferences.size >= 200;
    options.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(preferences[button.dataset.preference])));
    scaleText();
    document.dispatchEvent(new CustomEvent('eyeeaccessibilitychange', {detail: {...preferences}}));
    const {hidden, ...savedPreferences} = preferences;
    try {localStorage.setItem(key, JSON.stringify(savedPreferences));} catch { /* Keep in-memory settings. */ }
    try {
      if (hidden) sessionStorage.setItem(hiddenSessionKey, '1');
      else sessionStorage.removeItem(hiddenSessionKey);
    } catch { /* Hiding still works until this page is reloaded. */ }
  }
  let opener;
  function open(event) {
    opener = event.currentTarget;
    if (opener.hasAttribute('data-accessibility-open')) {
      preferences.hidden = false;
      apply();
    }
    if (!panel.open) {
      panel.showModal();
      panel.querySelector('h2').focus({preventScroll:true});
    }
  }
  launch.addEventListener('click', open);
  function hideFloatingButton() {
    const keyboard = hideLaunch.matches(':focus-visible');
    preferences.hidden = true;
    launch.classList.remove('is-near');
    apply();
    if (panel.open) panel.close();
    if (keyboard) document.querySelector('[data-accessibility-open]')?.focus({preventScroll:true});
  }
  hideLaunch.addEventListener('click', hideFloatingButton);
  panel.querySelector('[data-hide-launch]').addEventListener('click', hideFloatingButton);
  document.querySelectorAll('[data-accessibility-open]').forEach(button => button.addEventListener('click', open));
  panel.querySelector('[data-close]').addEventListener('click', () => panel.close());
  panel.addEventListener('click', event => {if (event.target === panel) {const r=panel.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) panel.close();}});
  panel.addEventListener('close', () => {panel.querySelector('.accessibility-status').textContent=''; if (opener && !opener.hidden) opener.focus({preventScroll:true}); else document.querySelector('[data-accessibility-open]')?.focus({preventScroll:true});});
  panel.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => {preferences.size = Math.max(100, Math.min(200, preferences.size + Number(button.dataset.size))); apply();}));
  options.addEventListener('click', event => {const button = event.target.closest('[data-preference]'); if (!button) return; const name = button.dataset.preference; preferences[name] = !preferences[name]; apply();});
  panel.querySelector('[data-reset]').addEventListener('click', () => {preferences = {...defaults}; apply(); panel.querySelector('.accessibility-status').textContent = copy().restored;});
  let resizeTimer;
  addEventListener('resize', () => {clearTimeout(resizeTimer); resizeTimer=setTimeout(scaleText,150);});
  document.addEventListener('eyeelanguagechange', () => {localize(); if(preferences.size>100) scaleText();});
  document.addEventListener('eyeelanguagechange', scheduleLauncherPlacement);
  document.addEventListener('eyeeaccessibilitychange', scheduleLauncherPlacement);
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    try {preferences.hidden = sessionStorage.getItem(hiddenSessionKey) === '1';}
    catch { /* Keep the current in-memory choice. */ }
    apply();
  });
  localize();
  document.fonts.ready.then(apply);
})();
