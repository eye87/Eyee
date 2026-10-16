/* Disclosure navigation: regular links and Tab order, with hover as an extra. */
(() => {
  const group = document.querySelector('.expertise-nav');
  const trigger = group?.querySelector('.expertise-trigger');
  const panel = document.querySelector('#expertise-panel');
  const scrim = document.querySelector('.expertise-scrim');
  if (!trigger || !panel || !scrim) return;
  const desktop = matchMedia('(min-width: 901px)');
  const hover = matchMedia('(hover: hover)');
  let openTimer, closeTimer;
  function sizePanel() {
    const bottom = document.querySelector('.header').getBoundingClientRect().bottom;
    panel.style.setProperty('--expertise-max-height', `${Math.max(180, innerHeight-bottom-38)}px`);
  }
  function clearTimers() {clearTimeout(openTimer); clearTimeout(closeTimer);}
  function open() {
    clearTimers();
    if (!desktop.matches || getComputedStyle(trigger.closest('nav')).display === 'none') return;
    sizePanel();
    panel.hidden = false;
    scrim.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('expertise-open');
  }
  function close(restoreFocus = false) {
    clearTimers();
    panel.hidden = true;
    scrim.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('expertise-open');
    if (restoreFocus) trigger.focus({preventScroll:true});
  }
  trigger.addEventListener('click', () => panel.hidden ? open() : close());
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {event.preventDefault(); open(); panel.querySelector('a')?.focus();}
  });
  group.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || !hover.matches) return;
    clearTimers();
    if (panel.hidden) openTimer = setTimeout(open, 100);
  });
  group.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    clearTimers();
    closeTimer = setTimeout(() => {if (!group.contains(document.activeElement)) close();}, 220);
  });
  group.addEventListener('focusout', event => {if (!group.contains(event.relatedTarget)) close();});
  document.addEventListener('keydown', event => {if (event.key === 'Escape' && !panel.hidden) {event.preventDefault(); close(true);}});
  document.addEventListener('pointerdown', event => {if (!panel.hidden && !group.contains(event.target)) close();});
  panel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
  desktop.addEventListener('change', () => close());
  document.addEventListener('eyeeaccessibilitychange', () => {if (getComputedStyle(trigger.closest('nav')).display === 'none') close(); else sizePanel();});
  addEventListener('resize', () => {if (!panel.hidden) sizePanel();});
  let scrollFrame = 0;
  addEventListener('scroll', () => {
    if (panel.hidden || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {scrollFrame = 0; sizePanel();});
  }, {passive:true});
})();
