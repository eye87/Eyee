(() => {
  const brand = document.querySelector('.header .brand');
  const mark = brand?.querySelector('.brand-eye');
  const header = document.querySelector('.header');
  if (!brand || !mark || !header) return;

  const desktop = matchMedia('(min-width: 1024px) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let bloom, wash, gameCssLink, gamePromise, game;
  let opening = false, gameActive = false, charge = 0, openFrame = 0;
  let eyeArmedUntil = 0;
  const blockWheel = event => event.preventDefault();
  const stopBlockingWheel = () => window.removeEventListener('wheel', blockWheel, true);

  function atPageTop() {
    return desktop.matches && scrollY < 30 && !header.classList.contains('is-compact') &&
      !document.querySelector('#menu')?.open;
  }
  function canActivate() { return atPageTop() && !opening && !gameActive; }
  function overEye(event) {
    if (mark.matches(':hover') || eyeArmedUntil > performance.now()) return true;
    const r = mark.getBoundingClientRect();
    return event.clientX >= r.left - 9 && event.clientX <= r.right + 9 &&
      event.clientY >= r.top - 9 && event.clientY <= r.bottom + 9;
  }
  function createEffects() {
    wash = document.createElement('div');
    wash.className = 'eye-egg-wash';
    wash.setAttribute('aria-hidden', 'true');
    bloom = document.createElement('div');
    bloom.className = 'eye-egg-bloom';
    bloom.setAttribute('aria-hidden', 'true');
    document.body.append(wash, bloom);
  }
  function clearEffects() {
    charge = 0;
    bloom?.remove();
    wash?.remove();
    bloom = wash = null;
  }
  function loadGame() {
    if (gamePromise) return gamePromise;
    const css = new Promise((resolve, reject) => {
      gameCssLink = document.createElement('link');
      gameCssLink.rel = 'stylesheet';
      gameCssLink.href = 'eye-game.css?v=20261016-4';
      gameCssLink.onload = resolve;
      gameCssLink.onerror = () => reject(new Error('Spelopmaak kon niet laden'));
      document.head.appendChild(gameCssLink);
    });
    gamePromise = Promise.all([css, import('./eye-game-play.js?v=20261016-1')])
      .then(([, module]) => module);
    return gamePromise;
  }
  function updateEffect() {
    const r = mark.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const scale = 1 + ((reach * 2 + 100) / 42 - 1) * charge * charge;
    bloom.style.setProperty('--eye-x', `${x}px`);
    bloom.style.setProperty('--eye-y', `${y}px`);
    bloom.style.setProperty('--eye-scale', scale.toFixed(3));
    const progress = Math.max(0, Math.min(1, (charge - .48) / .52));
    const eased = progress * progress * (3 - 2 * progress);
    wash.style.setProperty('--eye-x', `${x}px`);
    wash.style.setProperty('--eye-y', `${y}px`);
    wash.style.setProperty('--eye-radius', `${Math.ceil((reach + 48) * eased)}px`);
    bloom.style.setProperty('--eye-bloom-opacity', String(1 - Math.max(0, (charge - .68) / .32)));
    wash.classList.toggle('is-active', progress > 0);
    bloom.classList.add('is-active');
  }
  async function finishOpening() {
    if (!opening) return;
    if (!atPageTop()) { opening = false; stopBlockingWheel(); clearEffects(); return; }
    try {
      const module = await loadGame();
      if (!opening) return;
      game ||= module.createEyeGame(() => {
        gameActive = false;
        clearEffects();
        brand.focus({ preventScroll: true });
      });
      gameActive = true;
      opening = false;
      stopBlockingWheel();
      game.open();
    } catch (error) {
      opening = false;
      stopBlockingWheel();
      gameActive = false;
      gamePromise = null;
      gameCssLink?.remove();
      clearEffects();
      console.error('Het Eyee-spel kon niet openen:', error);
    }
  }
  function startOpening(fromScroll = false) {
    if (opening || gameActive || (!fromScroll && !canActivate()) || !desktop.matches) return;
    createEffects();
    opening = true;
    window.addEventListener('wheel', blockWheel, { passive: false, capture: true });
    eyeArmedUntil = 0;
    // The request starts with the animation; normal page visits fetch neither file.
    loadGame().catch(() => {});
    const duration = reduced.matches ? 0 : 900;
    const started = performance.now();
    const animate = now => {
      if (!opening) return;
      const t = duration ? Math.min(1, (now - started) / duration) : 1;
      charge = t < .5 ? 2 * t * t : 1 - Math.pow(2 - 2 * t, 2) / 2;
      updateEffect();
      if (t < 1) openFrame = requestAnimationFrame(animate);
      else void finishOpening();
    };
    updateEffect();
    openFrame = requestAnimationFrame(animate);
  }

  mark.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && canActivate()) eyeArmedUntil = Infinity;
  });
  mark.addEventListener('pointerleave', () => {
    if (eyeArmedUntil === Infinity) eyeArmedUntil = performance.now() + 180;
  });
  brand.addEventListener('wheel', event => {
    if (event.deltaY <= 0 || !canActivate() || !overEye(event)) return;
    event.preventDefault();
    startOpening();
  }, { passive: false, capture: true });
  window.addEventListener('scroll', () => {
    if (!eyeArmedUntil || opening || gameActive) return;
    if (desktop.matches && eyeArmedUntil > performance.now() && scrollY > 0 && scrollY < innerHeight * 1.5) {
      startOpening(true);
      scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else if (scrollY > 30) eyeArmedUntil = 0;
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (opening && !desktop.matches) {
      cancelAnimationFrame(openFrame);
      opening = false;
      stopBlockingWheel();
      clearEffects();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && opening) {
      cancelAnimationFrame(openFrame);
      opening = false;
      stopBlockingWheel();
      clearEffects();
    }
  });
  brand.addEventListener('keydown', event => {
    if (event.altKey && event.key === 'ArrowDown' && canActivate()) {
      event.preventDefault();
      startOpening();
    }
  });
})();
