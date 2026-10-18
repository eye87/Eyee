(() => {
  const brand = document.querySelector('.header .brand');
  const mark = brand?.querySelector('.brand-eye');
  const header = document.querySelector('.header');
  if (!brand || !mark || !header) return;

  const desktop = matchMedia('(min-width: 1024px) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let bloom, wash, gameCssLink, gameScript, gamePromise, game;
  let opening = false, gameActive = false, charge = 0, openFrame = 0;
  let eyeArmedUntil = 0;
  let pointerX = -1, pointerY = -1;
  const blockWheel = event => event.preventDefault();
  const stopBlockingWheel = () => window.removeEventListener('wheel', blockWheel, true);

  function atPageTop() {
    return desktop.matches && scrollY < 30 && !header.classList.contains('is-compact') &&
      !document.querySelector('#menu')?.open;
  }
  function canActivate() { return atPageTop() && !opening && !gameActive; }
  function overEye(x, y) {
    const r = mark.getBoundingClientRect();
    return x >= r.left - 9 && x <= r.right + 9 &&
      y >= r.top - 9 && y <= r.bottom + 9;
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
    if (!gameCssLink) {
      gameCssLink = document.createElement('link');
      gameCssLink.rel = 'stylesheet';
      gameCssLink.href = 'eye-game.css?v=20261017-94';
      document.head.appendChild(gameCssLink);
    }
    // A classic script also works when the concept is opened as a local file.
    // The CSS link's load event is unreliable in Safari, so it must not gate
    // the game: both resources start together after the eye gesture.
    gamePromise = new Promise((resolve, reject) => {
      if (window.EyeeGame?.createEyeGame) { resolve(window.EyeeGame); return; }
      gameScript = document.createElement('script');
      gameScript.src = 'eye-game-play.js?v=20261017-95';
      const timeout = setTimeout(() => reject(new Error('Could not load game code')), 8000);
      gameScript.onload = () => {
        clearTimeout(timeout);
        if (window.EyeeGame?.createEyeGame) resolve(window.EyeeGame);
        else reject(new Error('Game code is unavailable'));
      };
      gameScript.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Could not load game code'));
      };
      document.head.appendChild(gameScript);
    });
    return gamePromise;
  }
  const invitedCode = new URL(location.href).searchParams.get('spel');
  if (invitedCode === '1' || /^[a-f0-9]{12}$/.test(invitedCode || '')) {
    void loadGame().then(module => {
      if (gameActive || opening) return;
      game ||= module.createEyeGame(() => {
        gameActive = false;
        clearEffects();
        const url = new URL(location.href);
        url.searchParams.delete('spel');
        history.replaceState(history.state, '', url.href);
        brand.focus({ preventScroll: true });
      });
      gameActive = true;
      game.open(invitedCode === '1' ? null : invitedCode);
    }).catch(error => console.error('The invitation could not open the game:', error));
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
        const url = new URL(location.href);
        url.searchParams.delete('spel');
        history.replaceState(history.state, '', url.href);
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
      gameCssLink = null;
      gameScript?.remove();
      gameScript = null;
      clearEffects();
      console.error('The Eyee game could not open:', error);
    }
  }
  function startOpening(fromScroll = false) {
    if (opening || gameActive || (!fromScroll && !canActivate()) || !desktop.matches) return;
    createEffects();
    opening = true;
    window.addEventListener('wheel', blockWheel, { passive: false, capture: true });
    window.removeEventListener('wheel', onEyeWheel, true);
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

  function onEyeWheel(event) {
    const x = event.clientX || pointerX;
    const y = event.clientY || pointerY;
    if (event.deltaY <= 0 || !canActivate() || !overEye(x, y)) return;
    event.preventDefault();
    startOpening();
  }
  // Listen for wheel only while the pointer is on the logo. Safari sometimes
  // targets the SVG differently, so a listener on the SVG/anchor can miss it.
  brand.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (overEye(pointerX, pointerY) && canActivate()) eyeArmedUntil = Infinity;
    window.addEventListener('wheel', onEyeWheel, { passive: false, capture: true });
  });
  brand.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    eyeArmedUntil = overEye(pointerX, pointerY) && canActivate() ? Infinity : 0;
  }, { passive: true });
  brand.addEventListener('pointerleave', () => {
    if (eyeArmedUntil === Infinity) eyeArmedUntil = performance.now() + 180;
    window.removeEventListener('wheel', onEyeWheel, true);
  });
  window.addEventListener('scroll', () => {
    if (!eyeArmedUntil || opening || gameActive) return;
    if (desktop.matches && eyeArmedUntil > performance.now() && scrollY > 0 && scrollY < innerHeight * 1.5) {
      startOpening(true);
      scrollTo(0, 0);
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
