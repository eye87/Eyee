export function createEyeGame(onClose) {
  const template = document.querySelector('#eye-game-template');
  if (!template) throw new Error('Eyee-speltemplate ontbreekt');
  const dialog = template.content.firstElementChild.cloneNode(true);
  document.body.appendChild(dialog);
  const canvas = dialog.querySelector('#eye-game-board');
  const closeButton = dialog.querySelector('.eye-game-close');
  const restartButton = dialog.querySelector('.eye-game-restart');
  const scoreNode = dialog.querySelector('#eye-game-score');
  const livesNode = dialog.querySelector('#eye-game-lives');
  const messageNode = dialog.querySelector('#eye-game-message');

  const size = 28, cols = 19, rows = 15;
  const ctx = canvas.getContext('2d');
  const walls = new Set();
  const key = (x, y) => `${x},${y}`;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) walls.add(key(x, y));
  }
  function wallLine(x1, y1, x2, y2) {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) walls.add(key(x, y));
  }
  wallLine(3, 3, 7, 3); wallLine(11, 3, 15, 3);
  wallLine(2, 7, 6, 7); wallLine(12, 7, 16, 7);
  wallLine(3, 11, 7, 11); wallLine(11, 11, 15, 11);
  wallLine(9, 2, 9, 5); wallLine(9, 9, 9, 12);
  wallLine(5, 5, 5, 6); wallLine(13, 8, 13, 9);
  const directions = [
    { x: 1, y: 0, angle: 0 }, { x: 0, y: 1, angle: Math.PI / 2 },
    { x: -1, y: 0, angle: Math.PI }, { x: 0, y: -1, angle: -Math.PI / 2 }
  ];
  let player, ghosts, dots, wanted, moving, score, lives, state, invulnerableUntil, ghostStartAt, hasInput, tick, timer;
  function passable(x, y) { return x > 0 && x < cols - 1 && y > 0 && y < rows - 1 && !walls.has(key(x, y)); }
  function updateStatus(message) {
    scoreNode.textContent = String(score).padStart(4, '0');
    livesNode.innerHTML = Array.from({ length: lives }, () => '<i class="eye-game-life"></i>').join('');
    livesNode.setAttribute('aria-label', `${lives} ${lives === 1 ? 'leven' : 'levens'}`);
    if (message) messageNode.textContent = message;
  }
  function newGame() {
    dots = new Set();
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      if (passable(x, y) && !(x === 1 && y === 1)) dots.add(key(x, y));
    }
    player = { x: 1, y: 1 };
    ghosts = [{ x: 17, y: 13, color: '#9fd9ff' }, { x: 17, y: 1, color: '#fff1b5' }];
    wanted = directions[0];
    moving = directions[0];
    score = 0; lives = 3; tick = 0; state = 'playing'; hasInput = false;
    invulnerableUntil = Date.now() + 4000;
    ghostStartAt = Date.now() + 1800;
    updateStatus('Het oog is onderweg. Neem het over!');
    draw();
  }
  function collision() {
    if (!hasInput || Date.now() < invulnerableUntil) return;
    if (!ghosts.some(ghost => ghost.x === player.x && ghost.y === player.y)) return;
    lives--;
    if (!lives) {
      state = 'lost';
      updateStatus('De spookjes wonnen. Nog een ronde?');
      return;
    }
    player = { x: 1, y: 1 };
    ghosts[0].x = 17; ghosts[0].y = 13;
    ghosts[1].x = 17; ghosts[1].y = 1;
    wanted = directions[0]; moving = directions[0];
    invulnerableUntil = Date.now() + 1300;
    updateStatus('Oeps! Je kunt nog door.');
  }
  function step() {
    if (!dialog.open || document.hidden || state !== 'playing') return;
    tick++;
    if (!hasInput) {
      const options = directions.filter(dir => passable(player.x + dir.x, player.y + dir.y));
      const fresh = options.filter(dir => dots.has(key(player.x + dir.x, player.y + dir.y)));
      const ahead = key(player.x + moving.x, player.y + moving.y);
      if (!options.includes(moving) || (!dots.has(ahead) && fresh.length)) {
        moving = fresh[0] || options.find(dir => dir.x !== -moving.x || dir.y !== -moving.y) || options[0] || moving;
      }
      wanted = moving;
    }
    if (passable(player.x + wanted.x, player.y + wanted.y)) moving = wanted;
    if (passable(player.x + moving.x, player.y + moving.y)) {
      player.x += moving.x; player.y += moving.y;
    }
    if (dots.delete(key(player.x, player.y))) {
      score += 10;
      updateStatus();
      if (!dots.size) { state = 'won'; updateStatus('Alles verzameld. Mooi gespeeld!'); }
    }
    collision();
    if (Date.now() >= ghostStartAt && tick % 4 === 0 && state === 'playing') {
      ghosts.forEach(ghost => {
        const options = directions.filter(dir => passable(ghost.x + dir.x, ghost.y + dir.y));
        options.sort((a, b) => {
          const da = Math.abs(ghost.x + a.x - player.x) + Math.abs(ghost.y + a.y - player.y);
          const db = Math.abs(ghost.x + b.x - player.x) + Math.abs(ghost.y + b.y - player.y);
          return da - db;
        });
        const dir = Math.random() < .65 ? options[0] : options[Math.floor(Math.random() * options.length)];
        if (dir) { ghost.x += dir.x; ghost.y += dir.y; }
      });
      collision();
    }
    draw();
  }
  function roundedRect(x, y, w, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000d49'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    walls.forEach(cell => {
      const [x, y] = cell.split(',').map(Number);
      ctx.fillStyle = '#284ba7';
      roundedRect(x * size + 2, y * size + 2, size - 4, size - 4, 6);
    });
    dots.forEach(cell => {
      const [x, y] = cell.split(',').map(Number);
      ctx.fillStyle = '#b8e9ff';
      ctx.beginPath(); ctx.arc(x * size + size / 2, y * size + size / 2, 2.6, 0, Math.PI * 2); ctx.fill();
    });
    ghosts.forEach(ghost => {
      const x = ghost.x * size + size / 2, y = ghost.y * size + size / 2;
      ctx.fillStyle = ghost.color;
      ctx.beginPath(); ctx.arc(x, y - 2, 10, Math.PI, 0); ctx.lineTo(x + 10, y + 9);
      ctx.lineTo(x + 5, y + 5); ctx.lineTo(x, y + 9); ctx.lineTo(x - 5, y + 5);
      ctx.lineTo(x - 10, y + 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#000d49';
      ctx.beginPath(); ctx.arc(x - 3, y - 2, 1.6, 0, Math.PI * 2); ctx.arc(x + 3, y - 2, 1.6, 0, Math.PI * 2); ctx.fill();
    });
    const px = player.x * size + size / 2, py = player.y * size + size / 2;
    ctx.fillStyle = '#3558fd';
    ctx.beginPath(); ctx.arc(px, py, 11.5, 0, Math.PI * 2); ctx.fill();
    // A circular bite matches Eyee's mark more closely than a triangular Pac-Man mouth.
    const bite = 8.5 + (tick % 2) * 1.5;
    ctx.fillStyle = '#000d49';
    ctx.beginPath(); ctx.arc(px + Math.cos(moving.angle) * 11, py + Math.sin(moving.angle) * 11, bite, 0, Math.PI * 2); ctx.fill();
  }
  function openGame() {
    if (dialog.open) return;
    dialog.showModal();
    document.body.classList.add('eye-game-open');
    newGame();
    clearInterval(timer);
    timer = setInterval(step, 145);
    requestAnimationFrame(() => dialog.classList.add('is-visible'));
    closeButton.focus({ preventScroll: true });
  }
  function closeGame() {
    clearInterval(timer);
    dialog.classList.remove('is-visible');
    dialog.close();
    document.body.classList.remove('eye-game-open');
    onClose?.();
  }
  closeButton.addEventListener('click', closeGame);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeGame(); });
  restartButton.addEventListener('click', newGame);
  document.addEventListener('keydown', event => {
    if (!dialog.open) return;
    const map = {
      ArrowRight: directions[0], d: directions[0], D: directions[0],
      ArrowDown: directions[1], s: directions[1], S: directions[1],
      ArrowLeft: directions[2], a: directions[2], A: directions[2],
      ArrowUp: directions[3], w: directions[3], W: directions[3]
    };
    if (map[event.key]) {
      event.preventDefault();
      wanted = map[event.key];
      if (!hasInput) {
        invulnerableUntil = Date.now() + 1400;
        updateStatus('Jij bent aan zet. Pak ze allemaal!');
      }
      hasInput = true;
    }
  });
  return { open: openGame };
}
