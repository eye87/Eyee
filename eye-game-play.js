function createEyeGame(onClose) {
  const dialog = document.querySelector('#eye-game-template').content.firstElementChild.cloneNode(true);
  document.body.appendChild(dialog);
  const $ = selector => dialog.querySelector(selector);
  const canvas = $('#eye-game-board'), ctx = canvas.getContext('2d');
  const boardWrap = $('.eye-game-board-wrap'), scoreNode = $('#eye-game-score'), livesNode = $('#eye-game-lives');
  const xpLevelNode = $('#eye-game-xp-level'), xpCountNode = $('#eye-game-xp-count'), xpTrackNode = $('#eye-game-xp-track'), xpFillNode = $('#eye-game-xp-fill');
  const levelNode = $('#eye-game-level'), multiplierNode = $('#eye-game-multiplier'), rageNode = $('#eye-game-rage-timer');
  const messageNode = $('#eye-game-message'), roomStatusNode = $('.eye-game-room-status');
  const scoresNode = $('#eye-game-leaderboard-list'), scoreForm = $('.eye-game-name-form'), scoreInput = $('#eye-game-name');
  const scoreNote = $('.eye-game-leaderboard-note'), upgradeNode = $('.eye-game-upgrade'), powerNode = $('#eye-game-power');
  const simulateButton = $('.eye-game-simulate'), inviteButton = $('.eye-game-invite'), testBossButton = $('.eye-game-test-boss'), victoryNode = $('.eye-game-victory');
  const inviteStatus = $('.eye-game-invite-status'), gameLayout = $('.eye-game-layout');
  const leaderboardNode = $('.eye-game-leaderboard'), cooldownNode = $('.eye-game-ghost-cooldown'), magnetNode = $('.eye-game-magnet-timer');
  const progressNode = $('#eye-game-progress-list');
  const directions = [{x:1,y:0,angle:0},{x:0,y:1,angle:Math.PI/2},{x:-1,y:0,angle:Math.PI},{x:0,y:-1,angle:-Math.PI/2}];
  const key = (x,y) => `${x},${y}`, size = 28, stepDuration = 128, bonusVisibleMs = 10000, finalLevel = 5, bossTransitionMs = 3200, bossEntryMs = 1300, bossSafetyMs = 2600, boardingMs = 1700, flightMs = 5200;
  let cols, rows, level, walls, dots, player, previousPlayer, ghosts, previousGhosts, wanted, moving;
  let score, earnedScore, lives, state, tick, hasInput, invulnerableUntil, ghostStartAt, ghostPausedUntil, magnetLevel, magnetUntil, blasterLevel, wallEaterLevel, wallEaterUntil, beamUntil, beamEnd;
  let nextUpgradeLevel, pendingLevel, upgradePending = false, upgradeOpenedAt = 0, magnetRemainingAtUpgrade = 0, wallEaterRemainingAtUpgrade = 0, rageRemainingAtUpgrade = 0, bonusRemainingAtUpgrade = 0, frame = 0, lastFrame = 0, elapsed = 0, levelTimer = 0, descentSnapshot = null, nextPeek = null, hitTimer = 0, hitAt = 0, hitPosition = null;
  let room = null, roomPoll = 0, roomBusy = false, roomRestart = false, roomAdvance = false, joiningRoom = false;
  let remotePlayer = null, remoteFrom = null, remoteUpdatedAt = 0, networkFailures = 0, simulating = false, unranked = false;
  let leaderboard = [], localScores = false, savedName = '', runId = '', scoreBusy = false;
  let bonus = null, nextBonusAt = 0, multiplier = 1, multiplierUntil = 0, pendingBonusClaim = null;
  let rageUntil = 0, nextRageAt = 0, bossRageWave = 0, bossRageWaveId = 0, bossRageVisual = 0;
  let phase = 'dots', boss = null, bossHp = 0, bossMaxHp = 0, bossBlaster = false, bossProjectiles = [], bossNextShotAt = 0, bossStartedAt = 0, droppedKey = null, hasKey = false, lastBossHit = 0, testingFinalBoss = false;
  let bossStage = 1, bossStage2StartedAt = 0, bossTransitionStartedAt = 0, bossTransitionX = 0, bossTransitionY = 0, bossFallStartedAt = 0, floorDamage = 0, floorBreakX = 0, floorImpacts = [], bossSlamHandled = -1, bossVisualX = null;
  const escapeHeight=180, escapeRows=21, escapeLayerHeight=escapeHeight/finalLevel;
  let escape=null;
  let pendingBossHits = [], pendingBlasterPickup = false, pendingKeyClaim = false, bossHitSequence = 0;
  const pendingEaten = new Set();
  const pendingBrokenWalls = new Set(), wallBreaks = [];
  const pendingGhostKills = new Set(), pendingPurchases = [], floaters = [], projectileBursts = [], ghostBursts = [];
  let ghostKillSequence = 0, purchaseSequence = 0;
  const heldGameKeys = new Set();
  const ghostColors=['#9fd9ff','#fff1b5','#ffb7c9','#cbb6ff','#aaf0d1'];
  const magnetDuration=level=>Math.max(5,9-level);
  const xpNeededForLevel=level=>{const steps=level-1;return 750+300*steps+75*steps*steps;};
  const dotPoints=count=>Math.round(count*10*multiplier*(Date.now()<rageUntil?1.2:1));
  function xpProgress(totalXp) {
    let level=1, earned=Math.max(0,Math.floor(totalXp||0)), needed=xpNeededForLevel(level);
    while(earned>=needed) {earned-=needed;level++;needed=xpNeededForLevel(level);}
    return {level,earned,needed};
  }
  function ghostSpawn(index,count) {
    if (index===0) return {x:cols-2,y:rows-2};
    if (index===1) return {x:cols-2,y:1};
    return {x:index%2?1:cols-2,y:Math.max(2,Math.min(rows-3,2+Math.floor((index-1)*(rows-5)/Math.max(2,count-1))))};
  }
  function makeGhost(index,count) {
    const spawn=ghostSpawn(index,count),large=index===2,maxHp=5+(level-1)+(large?3:0);
    return {...spawn,spawn,color:ghostColors[index%ghostColors.length],large,maxHp,hp:maxHp,dead:false,respawnAt:0,spawnedAt:0};
  }
  const passable = (x,y) => x > 0 && x < cols-1 && y > 0 && y < rows-1 && !walls.has(key(x,y));
  const wallEaterActive = () => wallEaterLevel===level && Date.now()<wallEaterUntil;
  const finalBossActive = () => level===finalLevel && phase==='boss' && !!boss;
  const bossShieldActive = () => finalBossActive() && bossStage===1 && Date.now()>=rageUntil && bossStartedAt>0 && (Date.now()-bossStartedAt+7000)%8000<2500;
  const bossOccupiesCell = (x,y) => boss && (boss.x===x && boss.y===y || finalBossActive() && Date.now()<rageUntil && Math.abs(boss.x-x)<=1 && Math.abs(boss.y-y)<=1);
  const canMove = (x,y) => x > 0 && x < cols-1 && y > 0 && y < rows-1 && (!walls.has(key(x,y)) || wallEaterActive());
  function breakWall(x,y) {
    const cell=key(x,y);
    if (!wallEaterActive() || x<=0 || x>=cols-1 || y<=0 || y>=rows-1 || !walls.delete(cell)) return;
    pendingBrokenWalls.add(cell);
    wallBreaks.push({x,y,start:performance.now()});
  }
  function buildWalls(columns,lines) {
    const result=new Set(),add=(x,y)=>result.add(key(x,y));
    for (let y=0;y<lines;y++) for (let x=0;x<columns;x++) {
      if (!x || !y || x===columns-1 || y===lines-1) add(x,y);
      else if (x>2 && x<columns-3 && y>2 && y<lines-3 && y%4===3 && x%8>=3 && x%8<=7) add(x,y);
      else if (x===Math.floor(columns/2) && y%8>=2 && y%8<=5) add(x,y);
    }
    for (let y=1;y<lines-1;y++) { result.delete(key(1,y)); result.delete(key(columns-2,y)); }
    return result;
  }
  function makeWalls() { walls=buildWalls(cols,rows); }
  const doorX = () => Math.floor(cols/2);
  const escapeBossTopY = lavaY => lavaY-5.9;
  function renderProgress() {
    const count=finalLevel;
    const layers=['The Surface','Shadow Zone','The Rift','Sea of Fire','The Core'];
    progressNode.replaceChildren();
    const trail=document.createElementNS('http://www.w3.org/2000/svg','svg');
    trail.setAttribute('class','eye-game-progress-trail');
    trail.setAttribute('viewBox',`0 0 440 ${count*100}`);
    trail.setAttribute('preserveAspectRatio','none');
    trail.setAttribute('aria-hidden','true');
    const trailPath=document.createElementNS('http://www.w3.org/2000/svg','path');
    let route='M 64 50';
    for(let n=1;n<count;n++) {
      const fromX=(n-1)%2?102:64, toX=n%2?102:64;
      const fromY=(n-1)*100+50, toY=n*100+50;
      route+=` C ${fromX} ${fromY+54}, ${toX} ${toY-54}, ${toX} ${toY}`;
    }
    trailPath.setAttribute('d',route);trail.append(trailPath);progressNode.append(trail);
    for(let n=1;n<=count;n++) {
      const item=document.createElement('li');
      const layer=layers[n-1] || 'Unknown Depths';
      const current=escape?Math.max(1,Math.min(finalLevel,Math.floor(player.y/escapeLayerHeight)+1)):level;
      const done=escape?.completed || (escape?n>current:n<current);
      item.className=`eye-game-progress-stratum layer-${Math.min(n,5)} ${done?'is-done':n===current?'is-current':''}`;
      item.setAttribute('aria-label',`Level ${n}, ${layer}${done?', completed':n===current?', current level':', coming up'}`);
      if(n===current && !done) item.setAttribute('aria-current','step');
      item.innerHTML=`<span class="eye-game-progress-node">${done?'✓':n}</span><span class="eye-game-progress-copy"><span class="eye-game-progress-layer">${layer}</span><span class="eye-game-progress-text">${done?escape?'Escaped':'Completed':n===current?escape?'Climbing out':'You are here':'Level '+n}</span></span>`;
      progressNode.append(item);
    }
  }
  function removeInnerWalls() {
    for(const cell of walls) {
      const [x,y]=cell.split(',').map(Number);
      if(x>0 && x<cols-1 && y>0 && y<rows-1) walls.delete(cell);
    }
  }
  const bossBlasterCell = () => ({x:3,y:rows-4});
  const canShoot = () => blasterLevel>0 || phase==='boss' && bossBlaster;
  const bossPickupAvailable = () => phase==='boss' && bossStage===1 && !bossBlaster && blasterLevel<5;
  function startBossPhase() {
    if(phase!=='dots') return;
    phase='boss';boss={x:doorX(),y:Math.max(3,Math.floor(rows/2)-2),dx:1};
    bossMaxHp=level===finalLevel?32:Math.max(5,level+4);bossHp=bossMaxHp;bossBlaster=false;bossProjectiles=[];bossStartedAt=Date.now();bossNextShotAt=bossStartedAt+bossSafetyMs;
    invulnerableUntil=Math.max(invulnerableUntil,bossStartedAt+bossSafetyMs);
    bossStage=1;bossStage2StartedAt=0;bossTransitionStartedAt=0;bossFallStartedAt=0;floorDamage=0;floorBreakX=doorX();floorImpacts=[];bossSlamHandled=-1;bossVisualX=null;
    boardWrap.classList.toggle('is-final-boss',level===finalLevel);
    projectileBursts.length=0;ghostBursts.length=0;
    droppedKey=null;hasKey=false;bonus=null;ghosts=[];previousGhosts=[];
    rageUntil=0;bossRageWave=0;bossRageWaveId=0;bossRageVisual=0;
    if(level===finalLevel && !room) nextRageAt=Date.now()+4500;
    updateRageStatus();removeInnerWalls();
    updateStatus(level===finalLevel?'Final boss! Its shots bounce off the walls. Fire when the shield drops.':blasterLevel>=5 ? 'Mini-boss! Fire your blaster and dodge its shots.' : blasterLevel ? 'Mini-boss! Grab the blaster upgrade and dodge its shots.' : 'Mini-boss! Pick up the blaster and dodge its shots.');
    renderProgress();
  }
  function startFinalBossSecondPhase() {
    if(!finalBossActive() || bossStage!==1) return;
    bossTransitionX=boss.x;bossTransitionY=boss.y;bossTransitionStartedAt=Date.now();bossStage=3;
    floorDamage=0;floorBreakX=doorX();floorImpacts=[];bossSlamHandled=-1;bossFallStartedAt=0;
    bossHp=0;bossProjectiles=[];ghosts=[];previousGhosts=[];rageUntil=0;nextRageAt=Infinity;updateRageStatus();
    boss.dx=0;bossVisualX=boss.x;
    if(testingFinalBoss) {testBossButton.textContent='Test escape';testBossButton.title='Jump to the lava escape (test run)';}
    updateStatus('The boss collapses... but something is stirring.');
  }
  function beginBossRagePhase(startedAt=Date.now()) {
    bossStage=2;bossStage2StartedAt=startedAt;boss.x=bossTransitionX;boss.y=2;boss.dx=0;bossVisualX=boss.x;
    if(testingFinalBoss) {testBossButton.textContent='Test escape';testBossButton.title='Jump to the lava escape (test run)';}
    floaters.push({x:boss.x,y:boss.y,text:'PHASE 2',color:'#ffd29a',subtle:false,start:performance.now()});
    updateStatus('Phase 2! The boss tracks you from above. Dodge the dive and let it break the floor.');
  }
  function startEscape(startedAt=Date.now(),award=true) {
    clearLevelDescent();
    if(award) {score+=500;earnedScore+=500;}
    boss=null;bossProjectiles=[];ghosts=[];previousGhosts=[];phase='escape';state=upgradePending?'upgrade':'playing';
    cols=27;rows=escapeRows;resizeBoard();canvas.setAttribute('aria-label','Escape through five rising levels. Avoid the lava and reach the rocket.');
    player=previousPlayer={x:doorX(),y:escapeHeight-5};moving=wanted=directions[3];hasInput=false;
    escape={startedAt,runAt:0,lavaY:escapeHeight+7,previousLavaY:escapeHeight+7,cameraY:escapeHeight-escapeRows,lastDrawAt:0,obstacles:buildEscapeObstacles(),ghosts:buildEscapeGhosts(),shots:[],shards:[],shotCount:0,lastShotAt:0,launchAt:0,launchX:null,launchY:null,lastStratum:5};
    invulnerableUntil=startedAt+3300;magnetUntil=0;updateMagnetTimer();boardWrap.classList.add('is-final-boss');victoryNode.hidden=true;
    if(testingFinalBoss) {testBossButton.hidden=false;testBossButton.textContent='Test rocket';testBossButton.title='Jump to the rocket finale (test run)';}
    updateStatus('The lava is bubbling... press ↑ or W (or swipe up) to start the climb!');renderProgress();checkUpgrade();
  }
  function finishEscape() {
    if(phase==='won') return;
    phase='won';state='won';if(escape) escape.completed=true;updateStatus('Through the clouds. To be continued.');
    victoryNode.hidden=false;victoryNode.querySelector('button').focus({preventScroll:true});renderProgress();
  }
  function buildEscapeObstacles() {
    const blocks=new Set();
    const rocketX=doorX();
    for(let x=rocketX-3;x<=rocketX+3;x++) blocks.add(key(x,4));
    for(let x=rocketX-1;x<=rocketX+1;x++) blocks.add(key(x,5));
    [4,3,2,1].forEach((layer,index)=>{
      const y=layer*escapeLayerHeight;
      const gap=[14,8,18,11][index];
      for(let x=1;x<cols-1;x++) if(Math.abs(x-gap)>2) blocks.add(key(x,y));
    });
    for(let y=9;y<escapeHeight-7;y+=8) {
      if(y%escapeLayerHeight===0) continue;
      const row=Math.floor((y-9)/8),start=3+(row*7)%(cols-10);
      for(let x=start;x<start+3+row%2;x++) blocks.add(key(x,y));
      if(row%3===1 && (y+3)%escapeLayerHeight!==0) {
        const second=3+(row*11+8)%(cols-7);
        for(let x=second;x<second+2;x++) blocks.add(key(x,y+3));
      }
    }
    return blocks;
  }
  function buildEscapeGhosts() {
    return Array.from({length:9},(_,index)=>{
      const x=5+(index*7)%17;
      return {x,previousX:x,y:escapeHeight-19-index*18,homeX:x,phase:index*1.7,color:ghostColors[index%ghostColors.length],dead:false};
    });
  }
  function defeatBoss() {
    if(phase!=='boss' || !boss) return;
    if(level===finalLevel) {if(room) return;startFinalBossSecondPhase();return;}
    droppedKey={x:boss.x,y:boss.y};
    score+=500;earnedScore+=500;floatScore(boss.x,boss.y,500,'#b8e9ff');
    boss=null;bossProjectiles=[];phase='key';
    updateStatus('Mini-boss defeated! +500 points. Grab the key and head for the green door.');
    checkUpgrade();
  }
  function collectBossBlaster() {
    if(!bossPickupAvailable()) return;
    const pickup=bossBlasterCell();
    if(player.x!==pickup.x || player.y!==pickup.y) return;
    bossBlaster=true;blasterLevel++;pendingBlasterPickup=!!room;
    floaters.push({x:player.x,y:player.y,text:`Blaster level ${blasterLevel}!`,color:'#ffcfc1',subtle:false,start:performance.now()});
    updateStatus(`Blaster level ${blasterLevel} found! It carries over to the next levels. Press Space to fire.`);
    if(room) void syncRoom();
  }
  function collectKey() {
    if(phase!=='key' || !droppedKey || player.x!==droppedKey.x || player.y!==droppedKey.y) return;
    hasKey=true;phase='door';droppedKey=null;pendingKeyClaim=!!room;
    updateStatus('The green door at the bottom is open.');renderProgress();showNextPeek();
    if(room) void syncRoom();
  }
  function resizeBoard() {
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(cols*size*density); canvas.height = Math.round(rows*size*density);
    ctx.setTransform(density,0,0,density,0,0);
    boardWrap.style.aspectRatio = `${cols} / ${rows}`;
    const visualWidth=Math.min(740,cols*size+28,Math.max(410,innerHeight*.57)+(level-1)*24);
    boardWrap.style.setProperty('--board-width',`${Math.round(visualWidth)}px`);
    $('.eye-game-stage').style.setProperty('--board-side',`${Math.round(visualWidth/2+30)}px`);
    dialog.classList.toggle('eye-game-large-level',level>=8);
  }
  function updateStatus(message) {
    scoreNode.textContent = String(score).padStart(4,'0');
    const xp=xpProgress(earnedScore);
    xpLevelNode.textContent=`XP level ${xp.level}`;
    xpCountNode.textContent=`${xp.earned.toLocaleString('en-US')} / ${xp.needed.toLocaleString('en-US')} XP`;
    xpTrackNode.setAttribute('aria-valuemax',String(xp.needed));
    xpTrackNode.setAttribute('aria-valuenow',String(xp.earned));
    xpTrackNode.setAttribute('aria-valuetext',`${xp.earned} of ${xp.needed} XP towards level ${xp.level+1}`);
    xpFillNode.style.width=`${xp.earned/xp.needed*100}%`;
    levelNode.textContent = escape?`Escape · Level ${Math.max(1,Math.min(finalLevel,Math.floor(player.y/escapeLayerHeight)+1))}`:`Level ${level}`;
    livesNode.innerHTML = Array.from({length:Math.max(0,lives)},()=>'<i class="eye-game-life"></i>').join('');
    livesNode.setAttribute('aria-label',`${lives} ${lives===1?'life':'lives'}`);
    if (message) messageNode.textContent = message;
    updateWallEaterTimer();
    updateMultiplierStatus();
  }
  function updateWallEaterTimer() {
    const remaining=state==='upgrade' && !room ? wallEaterRemainingAtUpgrade : wallEaterUntil-Date.now();
    const seconds=wallEaterLevel===level?Math.ceil(Math.max(0,remaining)/1000):0;
    const foundBossBlaster=bossBlaster && phase==='boss';
    powerNode.hidden=!blasterLevel && !foundBossBlaster && !seconds;
    const parts=[blasterLevel?`Blaster level ${blasterLevel} · Space to fire`:foundBossBlaster?'Blaster found · Space to fire':'',seconds?`Wall chomper · ${seconds} sec left`:''];
    const label=parts.filter(Boolean).join('  ·  ');
    if(powerNode.textContent!==label) powerNode.textContent=label;
  }
  function updateMultiplierStatus() {
    const seconds=Math.ceil((multiplierUntil-Date.now())/1000);
    multiplierNode.hidden=multiplier===1 || seconds<=0;
    if (!multiplierNode.hidden) {
      multiplierNode.querySelector('strong').textContent=`${multiplier}×`;
      multiplierNode.querySelector('span').textContent=`points · ${seconds} sec`;
      multiplierNode.setAttribute('aria-label',`${multiplier} times the points, ${seconds} seconds left`);
    }
  }
  function updateRageStatus() {
    const seconds=Math.ceil((rageUntil-Date.now())/1000);
    rageNode.hidden=seconds<=0;
    boardWrap.classList.toggle('is-rage',seconds>0);
    if (!rageNode.hidden) {
      const finalRage=finalBossActive();
      rageNode.querySelector('span').textContent=finalRage?`3 ghosts · ${seconds}s`:`+20% · ${seconds}s`;
      rageNode.setAttribute('aria-label',finalRage?`Final boss rage mode: three small ghosts, ${seconds} seconds left`:`Ghosts in rage mode, dots worth 20 percent more, ${seconds} seconds left`);
    }
  }
  function syncBossMinions(killed=[]) {
    if(!finalBossActive() || bossStage!==1 || Date.now()>=rageUntil) {
      if(ghosts.some(ghost=>ghost.minion)) {ghosts=[];previousGhosts=[];}
      return;
    }
    if(bossRageWaveId!==bossRageWave) {
      const positions=[{x:doorX()-5,y:boss.y+3},{x:doorX()+5,y:boss.y+3},{x:doorX(),y:boss.y-4}];
      ghosts=positions.map((spawn,index)=>({...spawn,spawn,color:['#ffbc75','#ff8e65','#ffd39d'][index],large:false,minion:true,maxHp:2,hp:2,dead:false,respawnAt:0,spawnedAt:Date.now()}));
      previousGhosts=ghosts.map(ghost=>({...ghost}));bossRageWaveId=bossRageWave;ghostStartAt=Date.now()+400;
      updateStatus('Final boss rage! Three small ghosts have entered the arena.');
    }
    killed.forEach(index=>{if(ghosts[index]) ghosts[index].dead=true;});
  }
  function maybeStartRage() {
    if (room || state!=='playing' || Date.now()<nextRageAt || phase!=='dots' && (!finalBossActive() || bossStage!==1)) return;
    rageUntil=Date.now()+(finalBossActive()?8000:5000);
    if(finalBossActive()) {bossRageWave++;nextRageAt=rageUntil+12000;syncBossMinions();}
    else {nextRageAt=rageUntil+30000+Math.random()*12000;updateStatus('Watch out! Ghosts are in rage mode for five seconds. Dots are worth 20% more.');}
    updateRageStatus();
  }
  function updateGhostCooldown() {
    const remaining=Math.max(0,ghostPausedUntil-Date.now());
    cooldownNode.hidden=!remaining;
    if (!remaining) return;
    cooldownNode.style.setProperty('--cooldown-progress',`${remaining/5000*100}%`);
    cooldownNode.querySelector('span').textContent=String(Math.ceil(remaining/1000));
    cooldownNode.setAttribute('aria-label',`Ghost freeze: ${Math.ceil(remaining/1000)} seconds left`);
  }
  function updateMagnetTimer() {
    const remaining=Math.max(0,magnetUntil-Date.now());
    magnetNode.hidden=!remaining;
    if (!remaining) return;
    const seconds=Math.ceil(remaining/1000);
    magnetNode.style.setProperty('--cooldown-progress',`${remaining/(magnetDuration(magnetLevel)*1000)*100}%`);
    magnetNode.querySelector('span').textContent=String(seconds);
    magnetNode.setAttribute('aria-label',`Dot magnet level ${magnetLevel}: ${seconds} seconds left`);
  }
  function floatScore(x,y,points,color='#fff',subtle=false,group='local') {
    const now=performance.now();
    if (subtle) {
      for(let i=floaters.length-1;i>=0;i--){
        const recent=floaters[i];
        if(recent.subtle && recent.group===group && now-recent.start<260){recent.points+=points;recent.text=`+${recent.points}`;recent.x=x;recent.y=y;recent.start=now;return;}
      }
    }
    floaters.push({x,y,points,text:`+${points}`,color,subtle,group,start:now});
    if (floaters.length>9) floaters.shift();
  }
  function floatDamage(x,y,damage) {
    floaters.push({x,y,text:`−${damage} HP`,color:'#ffc29e',damage:true,start:performance.now()});
    if (floaters.length>9) floaters.shift();
  }
  function scheduleBonus(initial=false) { nextBonusAt=Date.now()+(initial?5000+Math.random()*2000:12000+Math.random()*6000); }
  function spawnLocalBonus() {
    if (room || state!=='playing') return;
    const now=Date.now();
    if (multiplier>1 && now>=multiplierUntil) {multiplier=1;multiplierUntil=0;updateMultiplierStatus();}
    if (bonus && now>=bonus.expiresAt) {bonus=null;scheduleBonus();}
    if (bonus || now<nextBonusAt || multiplier>1) return;
    let options=[...dots].filter(cell=>{
      const [x,y]=cell.split(',').map(Number);
      const distance=Math.abs(x-player.x)+Math.abs(y-player.y);
      return x>2 && x<cols-3 && y>2 && y<rows-3 && distance>=2 && distance<=6;
    });
    if (!options.length) options=[...dots].filter(cell=>{
      const [x,y]=cell.split(',').map(Number);
      return x>1 && x<cols-2 && y>1 && y<rows-2 && Math.abs(x-player.x)+Math.abs(y-player.y)>=2;
    });
    if (!options.length) {scheduleBonus();return;}
    const cell=options[Math.floor(Math.random()*options.length)];
    const [x,y]=cell.split(',').map(Number);
    bonus={x,y,multiplier:Math.random()<.28?3:2,expiresAt:now+bonusVisibleMs};
  }
  function collectBonus(cell) {
    if (!bonus || Date.now()>=bonus.expiresAt || cell!==key(bonus.x,bonus.y)) return;
    multiplier=bonus.multiplier;multiplierUntil=Date.now()+7000;
    if (room) {pendingBonusClaim=cell;void syncRoom();} else scheduleBonus();
    bonus=null;updateStatus(`${multiplier}× points for seven seconds!`);
  }
  function showRoomStatus(message) { roomStatusNode.hidden = !message; roomStatusNode.textContent = message; }
  function clearNextPeek() {
    nextPeek?.remove();nextPeek=null;
    boardWrap.classList.remove('has-next-peek');
  }
  function showNextPeek() {
    if(nextPeek || !hasKey || phase!=='door') return;
    const nextLevel=level+1, previewCols=nextLevel===1?17:17+2*nextLevel, previewRows=nextLevel===1?13:13+2*nextLevel;
    const previewWalls=buildWalls(previewCols,previewRows);
    const peek=document.createElement('div'), preview=document.createElement('canvas');
    peek.className='eye-game-next-peek';peek.setAttribute('aria-hidden','true');
    preview.width=previewCols*size;preview.height=previewRows*size;
    const previewCtx=preview.getContext('2d');
    previewCtx.fillStyle='#000d49';previewCtx.fillRect(0,0,preview.width,preview.height);
    previewWalls.forEach(cell=>{
      const [x,y]=cell.split(',').map(Number);
      previewCtx.fillStyle='#284ba7';previewCtx.beginPath();
      if(previewCtx.roundRect) previewCtx.roundRect(x*size+2,y*size+2,size-4,size-4,6);
      else previewCtx.rect(x*size+2,y*size+2,size-4,size-4);
      previewCtx.fill();
    });
    previewCtx.fillStyle='#f5fbff';
    for(let y=1;y<previewRows-1;y++) for(let x=1;x<previewCols-1;x++) {
      if(previewWalls.has(key(x,y)) || x===1 && y===1) continue;
      previewCtx.beginPath();previewCtx.arc(x*size+size/2,y*size+size/2,3.2,0,Math.PI*2);previewCtx.fill();
    }
    previewCtx.fillStyle='#F86B00';previewCtx.beginPath();previewCtx.arc(size*1.5,size*1.5,11,0,Math.PI*2);previewCtx.fill();
    peek.append(preview);boardWrap.append(peek);nextPeek=peek;
    boardWrap.classList.add('has-next-peek');
    requestAnimationFrame(()=>{if(nextPeek===peek) peek.classList.add('is-visible');});
  }
  function clearLevelDescent() {
    clearTimeout(levelTimer);
    boardWrap.classList.remove('is-descending','is-descending-active');
    boardWrap.style.width='';boardWrap.style.height='';
    descentSnapshot?.remove();descentSnapshot=null;
    clearNextPeek();
  }
  function beginLevel(number, incomingScore = score, descending = false) {
    if(!descending) clearLevelDescent();
    clearTimeout(hitTimer); boardWrap.classList.remove('is-hit');
    pendingLevel = false; pendingEaten.clear(); pendingBrokenWalls.clear(); pendingGhostKills.clear(); ghostKillSequence=0; floaters.length=0;wallBreaks.length=0;projectileBursts.length=0;ghostBursts.length=0; hitAt=0;
    escape=null;level = number; cols = level===1?17:17+2*level; rows = level===1?13:13+2*level; makeWalls(); resizeBoard();canvas.setAttribute('aria-label','Game board with the Eyee eye, dots, and ghosts');
    phase='dots';boss=null;bossHp=0;bossMaxHp=0;bossBlaster=false;bossProjectiles=[];bossNextShotAt=0;bossStartedAt=0;droppedKey=null;hasKey=false;lastBossHit=0;pendingBossHits=[];pendingBlasterPickup=false;pendingKeyClaim=false;bossHitSequence=0;bossStage=1;bossStage2StartedAt=0;bossTransitionStartedAt=0;bossFallStartedAt=0;floorDamage=0;floorBreakX=doorX();floorImpacts=[];bossSlamHandled=-1;bossVisualX=null;boardWrap.classList.remove('is-final-boss');renderProgress();
    wallEaterLevel=0;wallEaterUntil=0;
    dots = new Set();
    for (let y=1;y<rows-1;y++) for (let x=1;x<cols-1;x++) if (passable(x,y) && (x!==1 || y!==1)) dots.add(key(x,y));
    player = {x:1,y:room?.slot===2?rows-2:1}; previousPlayer = {...player};
    ghosts = Array.from({length:Math.max(2,level)},(_,i)=>makeGhost(i,Math.max(2,level)));
    previousGhosts = ghosts.map(g=>({...g}));
    if (simulating) { remotePlayer = remoteFrom = {x:1,y:rows-2}; remoteUpdatedAt = performance.now(); }
    wanted = moving = directions[0]; tick=0; state='playing'; hasInput=false; score=incomingScore;
    bonus=null;multiplier=1;multiplierUntil=0;pendingBonusClaim=null;
    rageUntil=0;nextRageAt=Date.now()+18000+Math.random()*8000;bossRageWave=0;bossRageWaveId=0;updateRageStatus();
    nextBonusAt=Date.now()+5000+Math.random()*2000;
    invulnerableUntil=Date.now()+2600; ghostStartAt=Date.now()+1600; ghostPausedUntil=0;updateGhostCooldown();updateMagnetTimer();
    lastFrame=0; elapsed=0; if (upgradePending) state='upgrade'; updateStatus(level>=3?`Level ${level}. Watch out for the big ghost!`:`Level ${level}. Here comes the eye!`); draw(1);
  }
  function descendToLevel(number,incomingScore) {
    const livesEarned=Math.max(0,number-level);
    lives+=livesEarned;
    const announceLife=()=>{if(livesEarned) updateStatus(`Level ${number}! +${livesEarned} ${livesEarned===1?'life':'lives'} earned.`);};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches || !canvas.width) {beginLevel(number,incomingScore);announceLife();checkUpgrade();return;}
    const previous=boardWrap.getBoundingClientRect();
    const oldImage=canvas.toDataURL('image/png');
    beginLevel(number,incomingScore,true);
    announceLife();
    const next=boardWrap.getBoundingClientRect();
    boardWrap.style.width=`${previous.width}px`;boardWrap.style.height=`${previous.height}px`;
    const makeFrame=(image,className)=>{
      const frame=document.createElement('div'),picture=document.createElement('img');
      frame.className=`eye-game-descent-frame ${className}`;
      frame.setAttribute('aria-hidden','true');picture.alt='';picture.src=image;
      frame.append(picture);return frame;
    };
    const frames=document.createElement('div');
    frames.className='eye-game-descent-frames';frames.setAttribute('aria-hidden','true');
    frames.append(makeFrame(oldImage,'is-old'),makeFrame(canvas.toDataURL('image/png'),'is-next'));
    boardWrap.append(frames);descentSnapshot=frames;
    boardWrap.classList.add('is-descending');state='transition';
    void boardWrap.offsetWidth;
    requestAnimationFrame(()=>{
      if(!descentSnapshot || !dialog.open) return;
      boardWrap.classList.add('is-descending-active');
      boardWrap.style.width=`${next.width}px`;boardWrap.style.height=`${next.height}px`;
    });
    levelTimer=setTimeout(()=>{clearLevelDescent();if(state==='transition') {state=upgradePending?'upgrade':'playing';invulnerableUntil=Date.now()+1800;if(!upgradePending) checkUpgrade();}},1150);
  }
  function newGame() {
    roomRestart=false; roomAdvance=false; savedName=''; unranked=simulating; runId=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    score=0;earnedScore=0; lives=3; nextUpgradeLevel=2; blasterLevel=0;magnetLevel=0;wallEaterLevel=0;wallEaterUntil=0; beamUntil=0;magnetUntil=0;purchaseSequence=0;pendingPurchases.length=0;escape=null;
    leaderboardNode.hidden=true;victoryNode.hidden=true;testingFinalBoss=false;testBossButton.hidden=false;testBossButton.textContent='Test final boss';testBossButton.title='Jump to the final boss (test run)';dialog.classList.remove('is-game-over');$('.eye-game-stage').classList.remove('is-game-over');scoreInput.value='';
    upgradePending=false;upgradeOpenedAt=0;magnetRemainingAtUpgrade=0;rageRemainingAtUpgrade=0;bonusRemainingAtUpgrade=0; upgradeNode.hidden=true; gameLayout.inert=false; beginLevel(1,0);
  }
  async function roomRequest(payload, keepalive=false) {
    const response=await fetch('eye-game-room.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',keepalive});
    if (!response.ok) { const error=Error(`Game room: ${response.status}`); error.status=response.status; throw error; }
    return response.json();
  }
  function applyRoomState(data) {
    if (!room || !dialog.open) return;
    if (room.run !== null && data.run !== room.run) {
      newGame();
      if (room.slot===2) player=previousPlayer={x:1,y:rows-2};
    } else if (data.level !== level) {
      descendToLevel(data.level,data.score);
      void saveExistingScore();
    }
    room.run=data.run; room.generation=data.generation;
    bonus=data.bonus?{...data.bonus,expiresAt:Date.now()+Math.max(0,Number(data.bonus.remainingMs)||0)}:null;
    multiplier=data.multiplier||1;
    multiplierUntil=multiplier>1?Date.now()+Math.max(0,Number(data.multiplierRemainingMs)||0):0;
    rageUntil=Date.now()+Math.max(0,Number(data.rageRemainingMs)||0);
    nextRageAt=Date.now()+Math.max(0,Number(data.rageNextMs)||0);
    bossRageWave=Number(data.bossRageWave)||0;
    data.eaten.forEach(cell=>dots.delete(cell));
    (data.removedWalls||[]).forEach(cell=>walls.delete(cell));
    score=data.score;
    earnedScore=Number(data.earnedScore??data.score);
    const self=data.players.find(member=>member.self);
    if((data.phase==='escape'||data.phase==='launch'||data.phase==='won') && !escape) startEscape(Date.now()-Math.max(0,Number(data.escapeElapsedMs)||0),false);
    if(escape && data.phase==='launch') {
      if(phase!=='launch') {escape.launchX=player.x;escape.launchY=player.y;}
      phase='launch';escape.launchAt=Date.now()-Math.max(0,Number(data.launchElapsedMs)||0);
    }
    if(escape && data.phase==='won' && phase!=='won') finishEscape();
    if (self?.blasterLevel!=null) blasterLevel=Number(self.blasterLevel)+pendingPurchases.filter(purchase=>purchase.type==='blaster').length;
    if (self?.magnetLevel!=null) magnetLevel=Math.min(4,Number(self.magnetLevel)+pendingPurchases.filter(purchase=>purchase.type==='magnet').length);
    if (self?.bossBlaster!=null) bossBlaster=!!self.bossBlaster || pendingBlasterPickup;
    const wallEaterPending=pendingPurchases.some(purchase=>purchase.type==='wallEater');
    wallEaterLevel=self?.wallEaterLevel===level || wallEaterPending ? level : 0;
    if(self?.wallEaterLevel===level) wallEaterUntil=Date.now()+Math.max(0,Number(self.wallEaterRemainingMs)||0);
    else if(!wallEaterPending) wallEaterUntil=0;
    updateStatus();checkUpgrade();
    const partner=data.players.find(member=>!member.self);
    if (partner) {
      remoteFrom=remotePlayer?{...remotePlayer}:{x:partner.x,y:partner.y};
      remotePlayer=escape?{x:partner.escapeX??partner.x,y:partner.escapeY??partner.y}:{x:partner.x,y:partner.y}; remoteUpdatedAt=performance.now();
      showRoomStatus('Playing together: you are the orange chomper.');
    } else { remotePlayer=remoteFrom=null; showRoomStatus('Playing solo for now. Another visitor can join.'); }
    if(Number(data.bossStage)===3 && bossStage===1 && phase==='boss' && boss) startFinalBossSecondPhase();
    if(Number(data.bossStage)===2 && bossStage!==2 && phase==='boss' && boss) beginBossRagePhase();
    if (data.phase && data.phase!==phase && !escape) {
      if(data.phase==='boss' && phase==='dots') startBossPhase();
      phase=data.phase;
      if(phase==='key') {bossProjectiles=[];updateStatus('Mini-boss defeated! +500 points. Grab the key.');}
      if(phase==='door') updateStatus('The green door at the bottom is open.');
      if(phase==='won') {
        if(Number(data.bossStage)===2) {bossStage=2;floorDamage=Number(data.floorDamage)||0;floorBreakX=Number(data.floorBreakX)||doorX();floorImpacts=Array.isArray(data.floorImpacts)?data.floorImpacts:floorImpacts;}
        boss=null;bossProjectiles=[];dots.clear();removeInnerWalls();boardWrap.classList.add('is-final-boss');state='won';victoryNode.hidden=false;
        updateStatus('The floor gives way! The final boss falls into the lava. You reached the core.');
      }
    }
    if(phase==='boss' || phase==='key' || phase==='door') {
      removeInnerWalls();
      if(phase!=='boss' || level!==finalLevel) {ghosts=[];previousGhosts=[];}
      bossHp=Number(data.bossHp??bossHp);
      bossMaxHp=Number(data.bossMaxHp??bossMaxHp);
      if(phase==='boss' && Number.isFinite(Number(data.bossElapsedMs))) {
        bossStartedAt=Date.now()-Number(data.bossElapsedMs);
        bossNextShotAt=Math.max(bossNextShotAt,bossStartedAt+bossSafetyMs);
        invulnerableUntil=Math.max(invulnerableUntil,bossStartedAt+bossSafetyMs);
      }
      if(bossStage===3) {
        bossTransitionStartedAt=Date.now()-Math.max(0,Number(data.bossTransitionElapsedMs)||0);
        bossTransitionX=Number(data.bossTransitionX??bossTransitionX);
        bossTransitionY=Number(data.bossTransitionY??bossTransitionY);
      }
      if(bossStage===2) {
        bossStage2StartedAt=Date.now()-Math.max(0,Number(data.bossStage2ElapsedMs)||0);
        if(Number(data.floorDamage)>floorDamage) registerBossSlam(Number(data.floorDamage),Number(data.floorBreakX)||doorX());
        if(Array.isArray(data.floorImpacts)) floorImpacts=data.floorImpacts;
        if(data.bossFalling && !bossFallStartedAt) updateStatus('The floor gives way! The boss is falling into the lava.');
        bossFallStartedAt=data.bossFalling?Date.now()-Math.max(0,Number(data.bossFallElapsedMs)||0):0;
      }
      hasKey=!!data.hasKey;
      boss=data.boss || null;
      droppedKey=data.droppedKey || null;
      if(phase==='door') droppedKey=null;
      renderProgress();
      if(phase==='door' && hasKey) showNextPeek();
    }
    syncBossMinions(data.bossMinionKills||[]);updateRageStatus();
    if (dots.size===0 && state==='playing' && phase==='dots' && !room) startBossPhase();
  }
  async function syncRoom() {
    if (!room || roomBusy || !dialog.open) return;
    roomBusy=true; const active=room, eaten=[...pendingEaten], brokenWalls=[...pendingBrokenWalls], ghostKills=[...pendingGhostKills], purchases=pendingPurchases.slice(), restart=roomRestart, advance=roomAdvance, claimBonus=pendingBonusClaim, bossHits=pendingBossHits.slice(), pickupBlaster=pendingBlasterPickup, claimKey=pendingKeyClaim;
    pendingEaten.clear(); pendingBrokenWalls.clear(); pendingGhostKills.clear(); pendingBossHits=[];pendingBlasterPickup=false;pendingKeyClaim=false;roomRestart=false; roomAdvance=false; pendingBonusClaim=null;
    try {
      const data=await roomRequest({action:'sync',room:active.id,token:active.token,generation:active.generation,x:player.x,y:player.y,escapeX:escape?player.x:null,escapeY:escape?player.y:null,escapeWin:phase==='launch',eaten,brokenWalls,ghostKills,purchases,restart,advance,claimBonus,bossHits,pickupBlaster,claimKey});
      if (room!==active) return;
      for (const purchase of purchases) {
        const index=pendingPurchases.findIndex(item=>item.id===purchase.id);
        if (index<0) continue;
        if (data.purchaseResults?.[purchase.id]===true) pendingPurchases.splice(index,1);
        else if (data.purchaseResults?.[purchase.id]===false) {
          pendingPurchases.splice(index,1);
          if (purchase.type==='life') lives=Math.max(0,lives-1);
          else if (purchase.type==='blaster') blasterLevel=Math.max(0,blasterLevel-1);
          else if (purchase.type==='pause') ghostPausedUntil=purchase.previousUntil||0;
          else if (purchase.type==='magnet') {magnetLevel=Math.max(0,magnetLevel-1);magnetUntil=purchase.previousUntil||0;}
          else if (purchase.type==='wallEater') {wallEaterLevel=0;wallEaterUntil=0;pendingBrokenWalls.clear();makeWalls();}
          updateGhostCooldown();updateMagnetTimer();
          updateStatus('That upgrade was unavailable. Choose another on your next XP level.');
        }
      }
      networkFailures=0; applyRoomState(data);
      if(advance && data.level===level && state==='level-complete') {
        pendingLevel=false;state='playing';updateStatus('Go through the green door at the bottom to continue.');
      }
    } catch (_) {
      eaten.forEach(cell=>pendingEaten.add(cell));brokenWalls.forEach(cell=>pendingBrokenWalls.add(cell));ghostKills.forEach(kill=>pendingGhostKills.add(kill));pendingBossHits.push(...bossHits);if(pickupBlaster) pendingBlasterPickup=true;if(claimKey) pendingKeyClaim=true; if (restart) roomRestart=true; if (advance) roomAdvance=true; if (claimBonus) pendingBonusClaim=claimBonus;
      if (++networkFailures>=3 && room===active) {
        clearInterval(roomPoll); room=null; remotePlayer=remoteFrom=null;
        showRoomStatus('Connection lost. You can keep playing solo.'); simulateButton.hidden=false;
      }
    } finally { roomBusy=false; }
  }
  async function joinRoom(invitedRoom=null) {
    if (joiningRoom || room) return;
    joiningRoom=true;
    try {
      const joined=await roomRequest({action:'join',...(invitedRoom?{room:invitedRoom}:{})});
      if (!dialog.open || testingFinalBoss) { void roomRequest({action:'leave',room:joined.room,token:joined.token},true).catch(()=>{}); return; }
      room={id:joined.room,token:joined.token,slot:joined.slot,generation:null,run:null};
      inviteButton.disabled=false;
      simulateButton.hidden=true;
      if (joined.slot===2) player=previousPlayer={x:1,y:rows-2};
      roomPoll=setInterval(syncRoom,250); void syncRoom();
    } catch (error) {
      if(testingFinalBoss) return;
      if (dialog.open && invitedRoom && (error.status===404 || error.status===409)) {
        showRoomStatus(error.status===409?'This game room is full. Opening a new room for you.':'This invitation has expired. Opening a new room for you.');
        try {
          const joined=await roomRequest({action:'join',newRoom:true});
          if (!dialog.open || testingFinalBoss) { void roomRequest({action:'leave',room:joined.room,token:joined.token},true).catch(()=>{}); return; }
          room={id:joined.room,token:joined.token,slot:joined.slot,generation:null,run:null};
          inviteButton.disabled=false;simulateButton.hidden=true;
          roomPoll=setInterval(syncRoom,250);void syncRoom();
        } catch (_) { simulateButton.hidden=false;inviteButton.disabled=false; }
      } else if (dialog.open) { showRoomStatus('Local preview: the Top 5 is saved on this device.');simulateButton.hidden=false;inviteButton.disabled=false; }
    } finally { joiningRoom=false; }
  }
  function onScoreChanged(points=0) { earnedScore+=points;updateStatus(); if (!room) checkUpgrade(); if (!dots.size && state==='playing' && phase==='dots') startBossPhase(); }
  function refreshUpgradeChoices() {
    const buttons=[...upgradeNode.querySelectorAll('[data-upgrade]')];
    const pool=buttons.filter(button=>(button.dataset.upgrade!=='wallEater'||wallEaterLevel!==level) && (button.dataset.upgrade!=='blaster'||blasterLevel<5));
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    pool.forEach((button,index)=>{button.style.order=String(index);button.dataset.displaySlot=index<3?String(index+1):'';});
    const shown=new Set(pool.slice(0,3));
    buttons.forEach(button=>{
      const type=button.dataset.upgrade;
      button.hidden=!shown.has(button);
      button.disabled=false;
      const action=button.querySelector('.eye-game-upgrade-action');
      action.textContent='Choose upgrade';
      if (type==='blaster') {
        button.querySelector('.eye-game-upgrade-name').textContent=`Blaster level ${blasterLevel+1}`;
        button.querySelector('.eye-game-upgrade-description').textContent=`${blasterLevel+1} damage per shot. Press Space to fire.`;
      } else if (type==='magnet') {
        const nextLevel=Math.min(4,magnetLevel+1),duration=magnetDuration(nextLevel);
        button.querySelector('.eye-game-upgrade-name').textContent=magnetLevel===4?'Recharge dot magnet':'Dot magnet level '+nextLevel;
        button.querySelector('.eye-game-upgrade-description').textContent=`Pull dots within ${nextLevel} ${nextLevel===1?'tile':'tiles'} for ${duration} seconds.`;
      }
    });
  }
  function availableUpgradeButtons() {
    const cards=[...upgradeNode.querySelectorAll('[data-upgrade]:not([hidden]):not(:disabled)')]
      .sort((a,b)=>Number(a.style.order)-Number(b.style.order));
    return [...cards,upgradeNode.querySelector('.eye-game-upgrade-skip')];
  }
  function selectUpgradeButton(button) {
    upgradeNode.querySelectorAll('.is-keyboard-selected').forEach(item=>item.classList.remove('is-keyboard-selected'));
    button.classList.add('is-keyboard-selected');
    button.focus({preventScroll:true});
  }
  function checkUpgrade() {
    if (state!=='playing' || xpProgress(earnedScore).level<nextUpgradeLevel) return;
    const reachedLevel=nextUpgradeLevel++;
    upgradePending=true; upgradeOpenedAt=Date.now();magnetRemainingAtUpgrade=Math.max(0,magnetUntil-upgradeOpenedAt);wallEaterRemainingAtUpgrade=Math.max(0,wallEaterUntil-upgradeOpenedAt);rageRemainingAtUpgrade=Math.max(0,rageUntil-upgradeOpenedAt);bonusRemainingAtUpgrade=bonus?Math.max(0,bonus.expiresAt-upgradeOpenedAt):0;state='upgrade'; upgradeNode.hidden=false; gameLayout.inert=true;
    upgradeNode.querySelector('#eye-game-upgrade-title').textContent=`XP level ${reachedLevel}! Choose an upgrade`;
    refreshUpgradeChoices();
    selectUpgradeButton(availableUpgradeButtons()[0]);
  }
  function finishUpgradeChoice(type='') {
    if (type!=='magnet' && magnetRemainingAtUpgrade>0) magnetUntil=Date.now()+magnetRemainingAtUpgrade;
    if (!room && upgradeOpenedAt) {
      nextRageAt+=Date.now()-upgradeOpenedAt;
      if (rageRemainingAtUpgrade>0) rageUntil=Date.now()+rageRemainingAtUpgrade;
      if (type!=='wallEater' && wallEaterRemainingAtUpgrade>0) wallEaterUntil=Date.now()+wallEaterRemainingAtUpgrade;
      if (bonus && bonusRemainingAtUpgrade>0) bonus.expiresAt=Date.now()+bonusRemainingAtUpgrade;
    }
    upgradeOpenedAt=0;magnetRemainingAtUpgrade=0;wallEaterRemainingAtUpgrade=0;rageRemainingAtUpgrade=0;bonusRemainingAtUpgrade=0;updateMagnetTimer();updateRageStatus();updateWallEaterTimer();
    upgradePending=false; upgradeNode.hidden=true; gameLayout.inert=false; state='playing';
    if (!dots.size && phase==='dots' && !room) startBossPhase();
    checkUpgrade();
    if (state==='playing') canvas.focus?.({preventScroll:true});
  }
  function chooseUpgrade(type) {
    if (state!=='upgrade') return;
    if (!['life','pause','blaster','magnet','wallEater'].includes(type) || type==='blaster' && blasterLevel>=5 || type==='wallEater' && wallEaterLevel===level) return;
    if (room) pendingPurchases.push({id:String(++purchaseSequence),type,previousUntil:type==='magnet'?magnetUntil:type==='pause'?ghostPausedUntil:0});
    if (type==='life') { lives++; updateStatus('Extra life unlocked!'); }
    if (type==='pause') { ghostPausedUntil=Date.now()+5000;updateGhostCooldown(); updateStatus('Ghost freeze unlocked: five seconds of peace!'); }
    if (type==='blaster') { blasterLevel++; updateStatus(`Blaster level ${blasterLevel} unlocked!`); }
    if (type==='magnet') { magnetLevel=Math.min(4,magnetLevel+1);const duration=magnetDuration(magnetLevel);magnetUntil=Date.now()+duration*1000;updateMagnetTimer();updateStatus(`Dot magnet level ${magnetLevel}: pull in dots for ${duration} seconds!`); }
    if (type==='wallEater') { wallEaterLevel=level;wallEaterUntil=Date.now()+20000;updateStatus('Wall chomper active: bite through walls and ghosts for 20 seconds!'); }
    finishUpgradeChoice(type);
    if (room) void syncRoom();
  }
  function finishLevel() {
    if (pendingLevel || state!=='playing' || phase!=='door' || !hasKey) return;
    pendingLevel=true; state='level-complete'; updateStatus(`Level ${level} complete! On to level ${level+1}.`);
    if (room) { roomAdvance=true; void syncRoom(); }
    else { void saveExistingScore(); levelTimer=setTimeout(()=>descendToLevel(level+1,score),350); }
  }
  function loseLife(projectileHit=false) {
    if (state!=='playing' || Date.now()<invulnerableUntil || !projectileHit && (Date.now()<ghostPausedUntil || !(ghosts.some(g=>!g.dead && g.x===player.x && g.y===player.y) || phase==='boss' && boss?.x===player.x && boss?.y===player.y))) return;
    lives--;state='hit';hitAt=performance.now();hitPosition={...player};
    if(escape) {escape.previousLavaY=escape.lavaY;escape.frozenBossRise=Math.min(1,Math.max(0,(Date.now()-escape.startedAt-800)/2300));}
    bossProjectiles=[];
    boardWrap.classList.remove('is-hit');void boardWrap.offsetWidth;boardWrap.classList.add('is-hit');
    updateStatus(lives?phase==='escape'?'The heat caught you. Get moving!':'Ouch! You still have another chance.':phase==='escape'?'The lava caught you. Try again?':phase==='boss'?`${level===finalLevel?'The final boss':'The mini-boss'} won. Try again?`:'The ghosts won. Try again?');
    clearTimeout(hitTimer);
    hitTimer=setTimeout(()=>{
      boardWrap.classList.remove('is-hit');hitAt=0;
      if (!lives) {
        state='lost';leaderboardNode.hidden=false;dialog.classList.add('is-game-over');$('.eye-game-stage').classList.add('is-game-over');renderLeaderboard();
        $('.eye-game-restart').focus({preventScroll:true});return;
      }
      if(escape) {
        const y=Math.max(3,Math.min(escapeHeight-5,Math.floor(escape.lavaY)-6));
        let x=doorX();while(escape.obstacles.has(key(x,y)) && x<cols-2) x++;
        player=previousPlayer={x,y};escape.lavaY=Math.max(escape.lavaY,y+9);escape.previousLavaY=escape.lavaY;escape.frozenBossRise=null;wanted=moving=directions[3];
      }
      else player=previousPlayer={x:1,y:room?.slot===2?rows-2:1};
      ghosts.forEach(g=>{if(g.minion && g.dead) return;g.x=g.spawn.x;g.y=g.spawn.y;g.hp=g.maxHp;g.dead=false;g.respawnAt=0;g.spawnedAt=0;});
      previousGhosts=ghosts.map(g=>({...g}));if(!escape) wanted=moving=directions[0];
      invulnerableUntil=Date.now()+1400;state='playing';checkUpgrade();
    },650);
  }
  function stepSimulatedPlayer() {
    if (!simulating || !remotePlayer || tick%2 || phase!=='dots') return;
    const queue=[{...remotePlayer,first:null}], seen=new Set([key(remotePlayer.x,remotePlayer.y)]);
    let next=null;
    for (let i=0;i<queue.length && !next;i++) for (const direction of directions) {
      const x=queue[i].x+direction.x,y=queue[i].y+direction.y,cell=key(x,y);
      if (!passable(x,y) || seen.has(cell)) continue; seen.add(cell);
      const first=queue[i].first||{x,y};
      if (dots.has(cell)) {next=first;break;} queue.push({x,y,first});
    }
    if (!next) return;
    remoteFrom={...remotePlayer};remotePlayer=next;remoteUpdatedAt=performance.now();
    const cell=key(next.x,next.y);collectBonus(cell);
    if (dots.delete(cell)) {const points=dotPoints(1);score+=points;floatScore(next.x,next.y,points,'#b8e9ff',true,'partner');onScoreChanged(points);}
  }
  function collectMagnetDots() {
    if (state!=='playing' || Date.now()>=magnetUntil) return;
    const queue=[{x:player.x,y:player.y,depth:0}],seen=new Set([key(player.x,player.y)]);
    let collected=0;
    for(let i=0;i<queue.length;i++) {
      const current=queue[i],cell=key(current.x,current.y);
      if (dots.delete(cell)) {pendingEaten.add(cell);collected++;}
      if (current.depth===magnetLevel) continue;
      for(const direction of directions) {
        const x=current.x+direction.x,y=current.y+direction.y,next=key(x,y);
        if (!passable(x,y)||seen.has(next)) continue;
        seen.add(next);queue.push({x,y,depth:current.depth+1});
      }
    }
    if (!collected) return;
    const points=dotPoints(collected);
    score+=points;floatScore(player.x,player.y,points,'#b8e9ff',true);onScoreChanged(points);
  }
  function burstBossProjectile(x,y) {
    const count=9;
    if(projectileBursts.length>=8) projectileBursts.shift();
    projectileBursts.push({x,y,start:performance.now(),pieces:Array.from({length:count},(_,index)=>({angle:index*Math.PI*2/count+(Math.random()-.5)*.28,distance:12+Math.random()*12,radius:1.5+Math.random()*1.7}))});
  }
  function burstGhost(ghost) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const count=ghost.large?18:13;
    if(ghostBursts.length>=8) ghostBursts.shift();
    ghostBursts.push({x:ghost.x,y:ghost.y,color:Date.now()<rageUntil?'#ff4e68':ghost.color,large:ghost.large,start:performance.now(),pieces:Array.from({length:count},(_,index)=>({angle:index*Math.PI*2/count+(Math.random()-.5)*.38,distance:(ghost.large?26:19)+Math.random()*(ghost.large?19:15),radius:1.5+Math.random()*2.5,spin:(Math.random()-.5)*3}))});
  }
  function defeatGhost(ghost) {
    if (ghost.dead) return;
    const points=ghost.minion?100:ghost.large?500:level*100;
    ghost.hp=0;
    burstGhost(ghost);
    ghost.dead=true;ghost.respawnAt=Date.now()+8500;score+=points;floatScore(ghost.x,ghost.y,points,'#b8e9ff');
    if (room) pendingGhostKills.add(`${level}:${ghosts.indexOf(ghost)}:${++ghostKillSequence}`);
    onScoreChanged(points);updateStatus(`${ghost.large?'Big ghost':'Ghost'} defeated! +${points} points`);
  }
  function defeatTouchingGhosts() {
    if (!wallEaterActive() || state!=='playing' || phase!=='dots' && !finalBossActive()) return;
    ghosts.filter(ghost=>!ghost.dead && ghost.x===player.x && ghost.y===player.y).forEach(defeatGhost);
  }
  function shoot() {
    if (!canShoot() || state!=='playing') return;
    let x=player.x,y=player.y; beamEnd={x,y};
    if(escape) {
      for(let distance=0;distance<20;distance++) {
        const nextX=x+moving.x,nextY=y+moving.y;
        if(nextX<=0 || nextX>=cols-1 || nextY<=0 || nextY>=escapeHeight-1 || escape.obstacles.has(key(nextX,nextY))) break;
        x=nextX;y=nextY;beamEnd={x,y};
        const ghost=escape.ghosts.find(g=>!g.dead && g.y===y && Math.abs(g.x-x)<.85);
        if(ghost) {ghost.dead=true;escape.shards.push({x:ghost.x,y:ghost.y,start:performance.now()});break;}
      }
      beamUntil=performance.now()+150;
      return;
    }
    while (passable(x+moving.x,y+moving.y)) {
      const fromX=x,fromY=y;
      x+=moving.x;y+=moving.y;beamEnd={x,y};
      if(phase==='boss' && bossProjectiles.length) {
        const progress=Math.min(1,elapsed/stepDuration);
        let hitIndex=-1,closest=Infinity,hitX=0,hitY=0;
        bossProjectiles.forEach((shot,index)=>{
          const shotX=shot.fromX+(shot.x-shot.fromX)*progress,shotY=shot.fromY+(shot.y-shot.fromY)*progress;
          const along=Math.max(0,Math.min(1,(shotX-fromX)*moving.x+(shotY-fromY)*moving.y));
          const distance=Math.hypot(shotX-fromX-along*moving.x,shotY-fromY-along*moving.y);
          if(distance<.46 && along<closest) {hitIndex=index;closest=along;hitX=shotX;hitY=shotY;}
        });
        if(hitIndex!==-1) {
          bossProjectiles.splice(hitIndex,1);
          beamEnd={x:hitX,y:hitY};
          burstBossProjectile(hitX,hitY);
          break;
        }
      }
      if(phase==='boss' && bossStage===1 && bossOccupiesCell(x,y)) {
        if(Date.now()-lastBossHit>=250) {
          if(bossShieldActive()) {
            lastBossHit=Date.now();
            floaters.push({x:boss.x,y:boss.y,text:'SHIELD',color:'#ffe4b9',subtle:false,start:performance.now()});
            updateStatus('Force shield is up. Wait for it to drop!');
            break;
          }
          const damage=Math.min(bossHp,Math.max(1,blasterLevel));
          lastBossHit=Date.now();bossHp-=damage;floatDamage(boss.x,boss.y,damage);
          if(room) {pendingBossHits.push(String(++bossHitSequence));void syncRoom();}
          else if(!bossHp) defeatBoss();
          else updateStatus(`${level===finalLevel?'Final boss':'Mini-boss'}: ${bossHp} HP left.`);
        }
        break;
      }
      const target=ghosts.find(g=>!g.dead && g.x===x && g.y===y);
      if (target) {
        const damage=Math.min(target.hp,Math.max(1,blasterLevel));
        target.hp-=damage;floatDamage(target.x,target.y,damage);
        if (!target.hp) defeatGhost(target);
        break;
      }
    }
    beamUntil=performance.now()+150;
  }
  const floorHitsAt = x => floorImpacts.reduce((hits,impact)=>hits+(Math.abs(x-impact.x)<=2?1:0),0);
  const floorOpenAt = x => floorHitsAt(x)>=3;
  const bossOverOpenFloor = x => [x-2,x-1,x,x+1,x+2].every(floorOpenAt);
  function registerBossSlam(number,x) {
    if(number<=floorDamage) return;
    floorDamage=number;floorBreakX=Math.max(3,Math.min(cols-4,Math.round(x)));
    floorImpacts.push({x:floorBreakX,level:number});
    boardWrap.classList.remove('is-slam');void boardWrap.offsetWidth;boardWrap.classList.add('is-slam');
    setTimeout(()=>boardWrap.classList.remove('is-slam'),420);
    for(let offset=-2;offset<=2;offset++) wallBreaks.push({x:floorBreakX+offset,y:rows-1,start:performance.now()});
    const falling=!room && bossOverOpenFloor(floorBreakX);
    if(falling) bossFallStartedAt=Date.now();
    floaters.push({x:floorBreakX,y:rows-3,text:falling?'FLOOR BREAKS!':'CRACK!',color:'#ffbf75',subtle:false,start:performance.now()});
    updateStatus(falling?'The floor gives way! The boss is falling into the lava.':'The floor cracks. Lure the boss onto the same spot again!');
    if(player.y>=rows-5 && Math.abs(player.x-floorBreakX)<=2) loseLife(true);
  }
  function bossStage2Y(elapsed) {
    if(bossFallStartedAt) return rows-2+5*Math.min(1,(Date.now()-bossFallStartedAt)/1400);
    const within=elapsed%3600;
    if(within<1600) return 2;
    if(within<2200) return 2+(rows-4)*(within-1600)/600;
    return rows-2-(rows-4)*Math.min(1,(within-2200)/1400);
  }
  function stepFinalBossSecondPhase() {
    if(!finalBossActive() || bossStage!==2 || room) return;
    if(bossFallStartedAt) {if(Date.now()-bossFallStartedAt>=1400) startEscape();return;}
    const elapsed=Date.now()-bossStage2StartedAt,cycle=Math.floor(elapsed/3600),within=elapsed%3600;
    if(within<1600) {
      if(tick%2===0) boss.x=Math.max(3,Math.min(cols-4,boss.x+Math.sign(player.x-boss.x)));
    } else if(within>=2200) {
      if(bossSlamHandled<cycle) {bossSlamHandled=cycle;registerBossSlam(cycle+1,boss.x);}
    }
    boss.y=bossStage2Y(elapsed);
  }
  function stepEscape() {
    if(!escape) return;
    const now=Date.now(),age=now-escape.startedAt;
    if(phase==='launch') {
      if(now-escape.launchAt<boardingMs) {escape.previousLavaY=escape.lavaY;escape.lavaY=Math.max(5.5,escape.lavaY-.65);}
      if(!room && now-escape.launchAt>=boardingMs+flightMs) finishEscape();
      return;
    }
    if(age<2400 || !hasInput) return;
    if(!escape.runAt) {escape.runAt=now;escape.lastShotAt=now;updateStatus('Climb through all five levels. Reach the rocket before the lava!');}
    escape.previousLavaY=escape.lavaY;
    escape.lavaY=Math.max(5.5,Math.min(escape.lavaY-.42,player.y+10));
    previousPlayer={...player};tick++;
    const clear=(x,y)=>x>0 && x<cols-1 && y>0 && y<escapeHeight-1 && !escape.obstacles.has(key(x,y));
    if(clear(player.x+wanted.x,player.y+wanted.y)) moving=wanted;
    if(clear(player.x+moving.x,player.y+moving.y)) {player.x+=moving.x;player.y+=moving.y;}
    const stratum=Math.max(1,Math.min(finalLevel,Math.floor(player.y/escapeLayerHeight)+1));
    if(stratum!==escape.lastStratum) {escape.lastStratum=stratum;renderProgress();updateStatus(`Level ${stratum}. Keep climbing — the lava is still rising!`);}
    if(player.y<=3 && Math.abs(player.x-doorX())<=2) {
      phase='launch';escape.launchAt=now;escape.launchX=player.x;escape.launchY=player.y;
      updateStatus('Hop aboard! The rocket is getting ready to launch.');
      if(room) void syncRoom();return;
    }
    if(now-escape.lastShotAt>1450) {
      const offset=[5,-5,7,-7][escape.shotCount++%4];
      escape.shots.push({x:Math.max(2,Math.min(cols-3,player.x+offset)),y:escape.lavaY-2,previousY:escape.lavaY-2});escape.lastShotAt=now;
    }
    for(let i=escape.shots.length-1;i>=0;i--) {
      const shot=escape.shots[i];shot.previousY=shot.y;shot.y-=2.35;
      let blocked=false,hitPlayer=false;
      for(let y=Math.round(shot.previousY);y>=Math.round(shot.y);y--) {
        if(Math.abs(shot.x-player.x)<.8 && y===player.y) {hitPlayer=true;break;}
        const cell=key(shot.x,y);
        if(!escape.obstacles.has(cell)) continue;
        if(y>5) escape.obstacles.delete(cell);
        escape.shards.push({x:shot.x,y,start:performance.now()});escape.shots.splice(i,1);blocked=true;break;
      }
      if(hitPlayer) {escape.shots.splice(i,1);loseLife(true);break;}
      if(blocked) continue;
      if(shot.y<0) {escape.shards.push({x:shot.x,y:0,start:performance.now()});escape.shots.splice(i,1);}
    }
    for(const ghost of escape.ghosts) {
      if(ghost.dead) continue;
      if(now>=ghostPausedUntil) {
        ghost.previousX=ghost.x;
        ghost.x=Math.max(2,Math.min(cols-3,ghost.homeX+Math.sin(now/1050+ghost.phase)*3.2));
      }
      const touchesLava=ghost.y+.6>=escape.lavaY;
      const touchesBoss=Math.abs(ghost.x-doorX())<=6.8 && ghost.y+.5>=escapeBossTopY(escape.lavaY);
      if(touchesLava || touchesBoss) {
        ghost.dead=true;escape.shards.push({x:ghost.x,y:ghost.y,start:performance.now()});
        continue;
      }
      if(now>=ghostPausedUntil && Math.abs(ghost.x-player.x)<.8 && Math.abs(ghost.y-player.y)<.8) {
        if(wallEaterActive()) {ghost.dead=true;escape.shards.push({x:ghost.x,y:ghost.y,start:performance.now()});}
        else {loseLife(true);break;}
      }
    }
    if(Math.abs(player.x-doorX())<=6.8 && player.y+.5>=escapeBossTopY(escape.lavaY)) loseLife(true);
    else if(player.y+.6>=escape.lavaY) loseLife(true);
  }
  function stepBossProjectiles() {
    if(phase!=='boss' || !boss || bossStage!==1) return;
    const now=Date.now();
    if(now>=bossNextShotAt) {
      const dx=player.x-boss.x,dy=player.y-boss.y,length=Math.hypot(dx,dy)||1;
      const final=finalBossActive(),speed=final?7.2:5.4;
      bossProjectiles.push({x:boss.x,y:boss.y,fromX:boss.x,fromY:boss.y,vx:dx/length*speed,vy:dy/length*speed,bounces:0,expiresAt:now+(final?6000:2500)});
      bossNextShotAt=now+(final?750:Math.max(760,1450-level*75));
    }
    let hit=false;
    bossProjectiles=bossProjectiles.filter(shot=>{
      shot.fromX=shot.x;shot.fromY=shot.y;
      shot.x+=shot.vx*stepDuration/1000;shot.y+=shot.vy*stepDuration/1000;
      if(finalBossActive()) {
        if(shot.x<1 || shot.x>cols-2) {shot.x=shot.x<1?2-shot.x:2*(cols-2)-shot.x;shot.vx*=-1;shot.bounces++;}
        if(shot.y<1 || shot.y>rows-2) {shot.y=shot.y<1?2-shot.y:2*(rows-2)-shot.y;shot.vy*=-1;shot.bounces++;}
      }
      if(now>=shot.expiresAt || shot.bounces>4 || shot.x<1 || shot.x>cols-2 || shot.y<1 || shot.y>rows-2) return false;
      if(Math.hypot(shot.x-player.x,shot.y-player.y)<.53) {hit=true;return false;}
      return true;
    });
    if(hit) {bossProjectiles=[];loseLife(true);}
  }
  function step() {
    if (!dialog.open || document.hidden || state!=='playing') return;
    if(phase==='escape'||phase==='launch') {stepEscape();return;}
    maybeStartRage();
    syncBossMinions();
    if (!room) spawnLocalBonus();
    else if (multiplier>1 && Date.now()>=multiplierUntil) {multiplier=1;multiplierUntil=0;updateMultiplierStatus();}
    else updateMultiplierStatus();
    previousPlayer={...player};previousGhosts=ghosts.map(g=>({...g}));tick++;
    if(phase==='boss' && bossStage===1 && !room && boss && tick%(level===finalLevel?4:6)===0) {
      const next=boss.x+boss.dx;
      if(next<4 || next>cols-5) boss.dx*=-1;
      boss.x+=boss.dx;
    }
    if(bossStage===3 && !room && Date.now()-bossTransitionStartedAt>=bossTransitionMs) beginBossRagePhase(bossTransitionStartedAt+bossTransitionMs);
    stepFinalBossSecondPhase();
    if(escape) return;
    if(state!=='playing') return;
    stepBossProjectiles();
    if(state!=='playing') return;
    if(phase==='boss' && bossStage===1 && !hasInput && canShoot() && boss && player.x===boss.x && player.y>boss.y) {moving=wanted=directions[3];shoot();return;}
    if (!hasInput) {
      const options=directions.filter(d=>canMove(player.x+d.x,player.y+d.y));
      const fresh=options.filter(d=>dots.has(key(player.x+d.x,player.y+d.y)));
      const ahead=key(player.x+moving.x,player.y+moving.y);
      if(phase!=='dots') {
        const target=phase==='boss' ? bossStage===2?{x:Math.max(2,Math.min(cols-3,Math.round(boss.x)+4)),y:rows-4}:bossPickupAvailable()?bossBlasterCell():{x:boss.x,y:Math.min(rows-3,boss.y+3)} : phase==='key'?droppedKey:{x:doorX(),y:rows-2};
        if(phase==='door' && player.x===doorX() && player.y===rows-2) moving=directions[1];
        if(target) {
          const queue=[{x:player.x,y:player.y,first:null}],seen=new Set([key(player.x,player.y)]);
          for(let i=0;i<queue.length;i++) {
            const here=queue[i];if(here.x===target.x && here.y===target.y) {if(here.first) moving=here.first;break;}
            for(const direction of directions) {
              const x=here.x+direction.x,y=here.y+direction.y,cell=key(x,y);
              if(!passable(x,y)||seen.has(cell)) continue;
              seen.add(cell);queue.push({x,y,first:here.first||direction});
            }
          }
        }
      } else if (!options.includes(moving) || (!dots.has(ahead) && fresh.length)) moving=fresh[0]||options[0]||moving;
      wanted=moving;
    }
    if(phase==='door' && hasKey && player.x===doorX() && player.y===rows-2 && wanted.y===1) { finishLevel();return; }
    if (canMove(player.x+wanted.x,player.y+wanted.y)) moving=wanted;
    if (canMove(player.x+moving.x,player.y+moving.y)) {breakWall(player.x+moving.x,player.y+moving.y);player.x+=moving.x;player.y+=moving.y;}
    collectBossBlaster();
    collectKey();
    const cell=key(player.x,player.y);
    collectBonus(cell);
    if (dots.delete(cell)) {const points=dotPoints(1);pendingEaten.add(cell);score+=points;floatScore(player.x,player.y,points,'#b8e9ff',true);onScoreChanged(points);}
    if (state!=='playing') return;
    collectMagnetDots();
    if (state!=='playing') return;
    stepSimulatedPlayer();defeatTouchingGhosts();loseLife();
    if(phase!=='dots' && !finalBossActive()) return;
    if (Date.now()>=ghostPausedUntil && state==='playing') ghosts.forEach(g=>{
      if(g.minion) return;
      if (!g.dead || Date.now()<g.respawnAt) return;
      const nearLocal=Math.abs(player.x-g.spawn.x)+Math.abs(player.y-g.spawn.y)<4;
      const nearPartner=remotePlayer && Math.abs(remotePlayer.x-g.spawn.x)+Math.abs(remotePlayer.y-g.spawn.y)<4;
      if (nearLocal || nearPartner) {g.respawnAt=Date.now()+1000;return;}
      g.x=g.spawn.x;g.y=g.spawn.y;g.hp=g.maxHp;g.dead=false;g.respawnAt=0;g.spawnedAt=Date.now();
      previousGhosts[ghosts.indexOf(g)]={...g};
    });
    const raging=Date.now()<rageUntil;
    if (Date.now()>=ghostStartAt && Date.now()>=ghostPausedUntil && tick%(raging?2:3)===0 && state==='playing') {
      ghosts.forEach(g=>{
        if (g.dead) return;
        const options=directions.filter(d=>passable(g.x+d.x,g.y+d.y));
        const target=raging && remotePlayer && Math.abs(g.x-remotePlayer.x)+Math.abs(g.y-remotePlayer.y)<Math.abs(g.x-player.x)+Math.abs(g.y-player.y)?remotePlayer:player;
        options.sort((a,b)=>(Math.abs(g.x+a.x-target.x)+Math.abs(g.y+a.y-target.y))-(Math.abs(g.x+b.x-target.x)+Math.abs(g.y+b.y-target.y)));
        const d=Math.random()<(raging ? .94 : .65)?options[0]:options[Math.floor(Math.random()*options.length)];
        if (d) {g.x+=d.x;g.y+=d.y;}
      });defeatTouchingGhosts();loseLife();
    }
  }
  function roundedRect(x,y,w,h,r) {ctx.beginPath();if (ctx.roundRect) ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fill();}
  function drawBossBody(finalArena,eyesClosed=false) {
    ctx.fillStyle=finalArena?'#ba302c':'#703ac5';ctx.beginPath();ctx.arc(0,-4,21,Math.PI,0);ctx.lineTo(21,16);ctx.lineTo(12,11);ctx.lineTo(5,18);ctx.lineTo(-2,11);ctx.lineTo(-10,18);ctx.lineTo(-16,10);ctx.lineTo(-21,16);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle=finalArena?'#ffb978':'#e7c7ff';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=finalArena?'#ff913f':'#b586f2';ctx.beginPath();ctx.moveTo(-17,-17);ctx.lineTo(-20,-27);ctx.lineTo(-7,-21);ctx.moveTo(17,-17);ctx.lineTo(20,-27);ctx.lineTo(7,-21);ctx.fill();
    if(eyesClosed) {
      ctx.strokeStyle='#2e135f';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,-5);ctx.quadraticCurveTo(-8,-1,-3,-5);ctx.moveTo(3,-5);ctx.quadraticCurveTo(8,-1,13,-5);ctx.stroke();
    } else {
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-8,-5,5,6,0,0,Math.PI*2);ctx.ellipse(8,-5,5,6,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000d49';ctx.beginPath();ctx.arc(-6,-4,2.5,0,Math.PI*2);ctx.arc(6,-4,2.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#2e135f';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-15,-12);ctx.lineTo(-4,-9);ctx.moveTo(15,-12);ctx.lineTo(4,-9);ctx.stroke();
    }
    ctx.fillStyle=finalArena?'#5c1121':'#341568';roundedRect(-7,7,14,5,3);
  }
  const eyeMarkPath=new Path2D('M9.51439 10.8486C13.2551 7.12958 17.5127 5.4933 22.5822 6.22587C26.7355 6.82609 30.0108 8.91113 32.4223 12.3533C32.749 12.8196 32.5829 13.227 31.9892 13.418C30.5887 13.8686 29.6257 14.8354 28.8642 16.0403C27.8134 17.7027 27.5132 19.5148 28.0193 21.4101C28.6881 23.9138 30.2279 25.6642 32.778 26.4289C33.4064 26.6173 33.5839 26.9881 33.2454 27.5502C31.8733 29.8279 30.118 31.7046 27.7534 33.0201C24.336 34.9211 20.72 35.3688 16.9498 34.4121C13.9233 33.6442 11.3914 32.0325 9.37889 29.5688C6.7812 26.3884 5.79259 22.7843 6.13658 18.7898C6.32133 16.6434 7.01391 14.6473 8.17219 12.8304C8.64339 12.0914 9.15447 11.3779 9.51439 10.8486Z');
  function drawChomper(x,y,radius,angle,now,color='#F86B00') {
    const scale=radius/15;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);ctx.translate(-20,-20);
    ctx.fillStyle=color;ctx.fill(eyeMarkPath);ctx.restore();
  }
  function drawRocket(x,y,scale,now,thrust=0,occupied=false) {
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.shadowColor='#b8e9ff';ctx.shadowBlur=16;
    ctx.fillStyle='#eef8ff';ctx.beginPath();ctx.moveTo(0,-37);ctx.quadraticCurveTo(26,-18,19,20);ctx.lineTo(-19,20);ctx.quadraticCurveTo(-26,-18,0,-37);ctx.fill();
    ctx.shadowBlur=0;ctx.strokeStyle='#b8e9ff';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#F86B00';ctx.beginPath();ctx.moveTo(-19,8);ctx.lineTo(-31,27);ctx.lineTo(-16,21);ctx.moveTo(19,8);ctx.lineTo(31,27);ctx.lineTo(16,21);ctx.fill();
    ctx.fillStyle='#183983';ctx.beginPath();ctx.arc(0,-7,11,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b8e9ff';ctx.lineWidth=2;ctx.stroke();
    if(occupied) drawChomper(0,-7,6.5,0,now);
    if(thrust>0) {ctx.fillStyle='#ffad4d';ctx.beginPath();ctx.moveTo(-8,20);ctx.lineTo(0,20+thrust*(17+Math.sin(now/90)*6));ctx.lineTo(8,20);ctx.fill();}
    ctx.restore();
  }
  function drawCloud(x,y,scale,alpha) {
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#fff';ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.beginPath();ctx.ellipse(-25,6,31,14,0,0,Math.PI*2);ctx.ellipse(2,-4,27,21,0,0,Math.PI*2);ctx.ellipse(30,7,31,15,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawLaunchScene(width,height,now) {
    const elapsed=phase==='won'?flightMs:Math.max(0,Date.now()-escape.launchAt-boardingMs),t=Math.min(1,elapsed/flightMs);
    const sky=ctx.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,'#82b7e9');sky.addColorStop(.5,'#3979bb');sky.addColorStop(1,'#102c6c');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=`rgba(255,255,255,${.13*t})`;ctx.fillRect(0,0,width,height);
    for(let i=0;i<13;i++) {
      const x=(i*181+65)%width,y=((i*127+height*.3+t*height*2.5)%(height*1.65))-height*.35;
      drawCloud(x,y,.7+(i%4)*.28,.23+(i%3)*.12);
    }
    const lift=Math.min(1,t/.88),ease=1-(1-lift)*(1-lift);
    const rocketY=height*.79-ease*height*.82-Math.max(0,(t-.88)/.12)**2*height*.27;
    drawRocket(width/2+Math.sin(t*Math.PI)*width*.025,rocketY,2.15,now,1.35,true);
    for(let i=0;i<5;i++) {
      const x=(i*239+width*.13)%width,y=((i*173+height*.7+t*height*2.8)%(height*1.8))-height*.35;
      drawCloud(x,y,1.05+(i%3)*.36,.22+(i%2)*.1);
    }
    if(t<.12) {ctx.fillStyle=`rgba(244,250,255,${1-t/.12})`;ctx.fillRect(0,0,width,height);}
  }
  function drawEscape(progress=1) {
    const width=cols*size,height=rows*size,now=performance.now(),age=Date.now()-escape.startedAt;
    const boarding=phase==='launch' && Date.now()-escape.launchAt<boardingMs;
    const boardingProgress=boarding?Math.min(1,Math.max(0,(Date.now()-escape.launchAt)/boardingMs)):0;
    if(phase==='won'||phase==='launch'&&!boarding) {drawLaunchScene(width,height,now);return;}
    const motion=state==='playing'?progress:1;
    const playerY=previousPlayer.y+(player.y-previousPlayer.y)*motion;
    const target=Math.max(0,Math.min(escapeHeight-rows,playerY-rows*.35));
    const frameMs=Math.min(50,Math.max(0,now-(escape.lastDrawAt||now)));
    escape.lastDrawAt=now;
    escape.cameraY+=(target-escape.cameraY)*(1-Math.exp(-frameMs/145));
    const screenY=y=>(y-escape.cameraY)*size;
    ctx.clearRect(0,0,width,height);
    const colors=[['#071845','#172d6f'],['#101b50','#243574'],['#1d174c','#44306e'],['#381737','#713041'],['#4b1429','#9c332b']];
    for(let band=0;band<5;band++) {
      const top=screenY(band*escapeLayerHeight),bottom=screenY((band+1)*escapeLayerHeight);
      if(bottom<0||top>height) continue;
      const gradient=ctx.createLinearGradient(0,top,0,bottom);gradient.addColorStop(0,colors[band][0]);gradient.addColorStop(1,colors[band][1]);
      ctx.fillStyle=gradient;ctx.fillRect(0,top,width,bottom-top+1);
      ctx.fillStyle='rgba(184,233,255,.15)';ctx.font='800 15px Arial, sans-serif';ctx.textAlign='left';
      ctx.fillText(`0${band+1}  ${['THE SURFACE','SHADOW ZONE','THE RIFT','SEA OF FIRE','THE CORE'][band]}`,size,top+30);
      ctx.strokeStyle='rgba(184,233,255,.14)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,top);ctx.lineTo(width,top);ctx.stroke();
    }
    for(let side=0;side<2;side++) {
      ctx.fillStyle='#172966';ctx.fillRect(side?width-size:0,0,size,height);
      ctx.fillStyle='rgba(184,233,255,.12)';
      for(let y=Math.floor(escape.cameraY);y<escape.cameraY+rows+1;y+=2) {
        const py=screenY(y),reach=7+5*Math.sin(y*1.8);
        ctx.beginPath();ctx.arc(side?width-size+reach:size-reach,py,2.1,0,Math.PI*2);ctx.fill();
      }
    }
    escape.obstacles.forEach(cell=>{
      const [x,y]=cell.split(',').map(Number),py=screenY(y);
      if(py<-size||py>height) return;
      ctx.fillStyle=y%escapeLayerHeight===0?'#46639b':'#3d527e';roundedRect(x*size+1,py+1,size-2,size-2,5);
      ctx.fillStyle='rgba(184,233,255,.15)';ctx.fillRect(x*size+5,py+5,size-10,2);
    });
    if(escape.cameraY<7) {
      const rocketX=doorX()*size+size/2,rocketY=screenY(3);
      if(boardingProgress>.54) {
        const smoke=(boardingProgress-.54)/.46;
        ctx.save();ctx.fillStyle=`rgba(226,241,255,${.58-.16*smoke})`;
        for(let i=0;i<12;i++) {
          const offset=i-5.5;
          const puffX=rocketX+offset*(6+smoke*11)+Math.sin(now/240+i)*4;
          const puffY=rocketY+25+(i%3)*8+Math.abs(offset)*smoke*5+Math.sin(now/180+i*1.6)*3;
          ctx.beginPath();ctx.arc(puffX,puffY,9+smoke*(7+i%4*3),0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
      const lift=boardingProgress>.82?((boardingProgress-.82)/.18)**2*height*.48:0;
      drawRocket(rocketX,rocketY-lift,1,now,boardingProgress>.7?Math.min(1,(boardingProgress-.7)/.3):0,boardingProgress>=.72);
    }
    const lavaY=escape.previousLavaY+(escape.lavaY-escape.previousLavaY)*motion;
    const lavaTop=screenY(lavaY)+Math.sin(now/200)*3;
    const bossRise=escape.frozenBossRise??Math.min(1,Math.max(0,(age-800)/2300));
    if(bossRise>0) {
      const bossScale=7.5;
      const bossTopY=boarding?Math.max(6.5,escapeBossTopY(lavaY)):escapeBossTopY(lavaY);
      const by=screenY(bossTopY)+27*bossScale+(1-bossRise)*150;
      ctx.save();ctx.globalAlpha=bossRise;ctx.translate(width/2,by);ctx.scale(bossScale,bossScale);ctx.shadowColor='#ff5d32';ctx.shadowBlur=34;
      drawBossBody(true);
      ctx.restore();
    }
    const lava=ctx.createLinearGradient(0,lavaTop,0,height);lava.addColorStop(0,'#ffbd47');lava.addColorStop(.16,'#f36425');lava.addColorStop(1,'#8b1f28');
    ctx.fillStyle=lava;ctx.fillRect(0,lavaTop,width,height-lavaTop);
    ctx.save();ctx.strokeStyle='rgba(255,189,103,.9)';ctx.lineWidth=3;ctx.shadowColor='#ff7535';ctx.shadowBlur=11;
    ctx.beginPath();ctx.moveTo(0,lavaTop+2);
    for(let x=12;x<=width+12;x+=12) ctx.lineTo(x,lavaTop+2+Math.sin(x/28+now/250)*2);
    ctx.stroke();ctx.restore();
    ctx.fillStyle='#ffdc75';for(let i=0;i<19;i++) {
      const bx=(i*103+47)%width,by=lavaTop+6+Math.sin(now/370+i*2)*8;
      ctx.beginPath();ctx.arc(bx,by,2+(i%4),0,Math.PI*2);ctx.fill();
    }
    escape.shots.forEach(shot=>{
      const sy=screenY(shot.previousY+(shot.y-shot.previousY)*motion);ctx.save();ctx.shadowColor='#ff7b35';ctx.shadowBlur=22;
      ctx.fillStyle='#ffbd64';ctx.beginPath();ctx.arc(shot.x*size+size/2,sy,8,0,Math.PI*2);ctx.fill();ctx.restore();
    });
    if(Date.now()>=ghostPausedUntil) escape.ghosts.forEach(ghost=>{
      if(ghost.dead) return;
      const gy=screenY(ghost.y)+size/2;
      if(gy<-size || gy>Math.min(height+size,lavaTop-7)) return;
      const gx=(ghost.previousX+(ghost.x-ghost.previousX)*motion)*size+size/2;
      ctx.save();ctx.translate(gx,gy);ctx.shadowColor=ghost.color;ctx.shadowBlur=12;
      ctx.fillStyle=ghost.color;ctx.beginPath();ctx.arc(0,-2,11,Math.PI,0);ctx.lineTo(11,10);ctx.lineTo(6,6);ctx.lineTo(0,10);ctx.lineTo(-6,6);ctx.lineTo(-11,10);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle='#000d49';ctx.beginPath();ctx.arc(-3,-2,1.8,0,Math.PI*2);ctx.arc(3,-2,1.8,0,Math.PI*2);ctx.fill();ctx.restore();
    });
    for(let i=escape.shards.length-1;i>=0;i--) {
      const shard=escape.shards[i],t=(now-shard.start)/560;
      if(t>=1) {escape.shards.splice(i,1);continue;}
      const sx=shard.x*size+size/2,sy=screenY(shard.y)+size/2;
      ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#ffcb8d';ctx.lineWidth=2*(1-t)+.5;
      ctx.beginPath();ctx.arc(sx,sy,6+19*t,0,Math.PI*2);ctx.stroke();
      for(let n=0;n<8;n++) {const angle=n*Math.PI/4;ctx.fillStyle=n%2?'#b8e9ff':'#ffb46e';ctx.fillRect(sx+Math.cos(angle)*(8+20*t),sy+Math.sin(angle)*(8+20*t)+8*t*t,4*(1-t)+1,4*(1-t)+1);}
      ctx.restore();
    }
    if(room && remotePlayer) {
      const rx=remotePlayer.x*size+size/2,ry=screenY(remotePlayer.y)+size/2;
      if(ry>-size && ry<height+size) drawChomper(rx,ry,11,0,now,'#b8e9ff');
    }
    const hop=boarding?Math.min(1,boardingProgress/.72):0;
    const hopEase=hop*hop*(3-2*hop);
    const px=(boarding?(escape.launchX??player.x)*(1-hopEase)+doorX()*hopEase:previousPlayer.x+(player.x-previousPlayer.x)*motion)*size+size/2;
    const py=boarding?screenY((escape.launchY??player.y)*(1-hopEase)+2.75*hopEase-Math.sin(Math.PI*hop)*.9)+size/2:screenY(previousPlayer.y+(player.y-previousPlayer.y)*motion)+size/2;
    if(beamEnd && now<beamUntil) {
      ctx.save();ctx.strokeStyle='#b8e9ff';ctx.lineWidth=4;ctx.lineCap='round';ctx.shadowColor='#b8e9ff';ctx.shadowBlur=12;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(beamEnd.x*size+size/2,screenY(beamEnd.y)+size/2);ctx.stroke();ctx.restore();
    }
    if(!escape.completed && (!boarding||boardingProgress<.72)) {
      ctx.save();if(Date.now()<invulnerableUntil) ctx.globalAlpha=.55+.45*Math.sin(now/85)**2;
      drawChomper(px,py,12-5*hopEase,moving.angle,now);ctx.restore();
    }
    if(boardingProgress>.9) {ctx.fillStyle=`rgba(244,250,255,${(boardingProgress-.9)/.1})`;ctx.fillRect(0,0,width,height);}
  }
  function draw(progress=1) {
    if (!walls) return;
    if(escape) {drawEscape(progress);return;}
    const finalArena=level===finalLevel && (phase==='boss'||phase==='won'),secondArena=finalArena && bossStage===2,width=cols*size,height=rows*size;
    ctx.clearRect(0,0,width,height);
    if(finalArena) {
      const glow=ctx.createRadialGradient(width*.5,height*.9,10,width*.5,height*.9,height*.9);
      glow.addColorStop(0,'#96261f');glow.addColorStop(.55,'#4c1021');glow.addColorStop(1,'#210b20');
      ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
      const time=performance.now()/1000;
      for(let i=0;i<27;i++) {
        const x=(i+.5)*width/27,flame=9+7*Math.sin(time*3+i*1.9)+5*Math.sin(time*5+i*.7);
        ctx.fillStyle=i%3===0?'rgba(255,188,77,.24)':'rgba(255,80,38,.28)';
        ctx.beginPath();ctx.moveTo(x-11,height);ctx.quadraticCurveTo(x-8,height-flame*.55,x+Math.sin(time*2+i)*5,height-flame*1.6);
        ctx.quadraticCurveTo(x+11,height-flame*.55,x+12,height);ctx.closePath();ctx.fill();
      }
      for(let side of [0,1]) for(let i=0;i<14;i++) {
        const y=(i+.45)*height/14,reach=9+7*Math.sin(time*2.7+i*1.6+side);
        ctx.fillStyle=i%2?'rgba(255,136,44,.22)':'rgba(255,72,35,.32)';
        ctx.beginPath();
        if(side) {ctx.moveTo(width,y-13);ctx.quadraticCurveTo(width-reach*.6,y-6,width-reach*1.7,y+Math.sin(time*3+i)*4);ctx.quadraticCurveTo(width-reach*.5,y+9,width,y+14);}
        else {ctx.moveTo(0,y-13);ctx.quadraticCurveTo(reach*.6,y-6,reach*1.7,y+Math.sin(time*3+i)*4);ctx.quadraticCurveTo(reach*.5,y+9,0,y+14);}
        ctx.closePath();ctx.fill();
      }
      for(let i=0;i<14;i++) {
        const x=((i*73+31)%width),y=((i*119+performance.now()*.018)%height);
        ctx.fillStyle='rgba(255,162,95,.26)';ctx.beginPath();ctx.arc(x,height-y,1.1+(i%3)*.45,0,Math.PI*2);ctx.fill();
      }
    } else {ctx.fillStyle='#000d49';ctx.fillRect(0,0,width,height);}
    const raging=Date.now()<rageUntil;
    if (raging) {ctx.fillStyle=`rgba(255,45,67,${.07+Math.sin(performance.now()/380)*.035})`;ctx.fillRect(0,0,cols*size,rows*size);}
    if(secondArena) {
      const lava=ctx.createLinearGradient(0,(rows-1)*size,0,height);
      lava.addColorStop(0,'#e5481d');lava.addColorStop(.55,'#ff8d27');lava.addColorStop(1,'#ffcc57');
      ctx.fillStyle=lava;ctx.fillRect(0,(rows-1)*size,width,size);
      ctx.fillStyle='rgba(255,216,119,.42)';
      for(let x=0;x<cols;x+=2) ctx.beginPath(),ctx.arc(x*size+14,(rows-1)*size+10+Math.sin(performance.now()/280+x)*4,2.5,0,Math.PI*2),ctx.fill();
    }
    walls.forEach(cell=>{
      const [x,y]=cell.split(',').map(Number),floorTile=secondArena && y===rows-1;
      const floorHits=floorTile?floorHitsAt(x):0;
      if(floorTile && floorHits>=3) return;
      ctx.fillStyle=floorTile?(floorHits===2?'#51415e':'#34426f'):'#284ba7';roundedRect(x*size+2,y*size+2,size-4,size-4,6);
      if(floorHits===1) {
        ctx.strokeStyle='#f6a974';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.beginPath();
        ctx.moveTo(x*size+7,y*size+5);ctx.lineTo(x*size+14,y*size+12);ctx.lineTo(x*size+11,y*size+22);
        ctx.moveTo(x*size+14,y*size+12);ctx.lineTo(x*size+22,y*size+8);ctx.stroke();
      } else if(floorHits===2) {
        ctx.fillStyle='#e66b35';ctx.beginPath();ctx.moveTo(x*size+2,y*size+2);ctx.lineTo(x*size+10,y*size+2);ctx.lineTo(x*size+4,y*size+10);ctx.closePath();ctx.fill();
        ctx.fillStyle='#f08b47';ctx.beginPath();ctx.moveTo(x*size+size-2,y*size+size-3);ctx.lineTo(x*size+size-11,y*size+size-2);ctx.lineTo(x*size+size-3,y*size+size-12);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#ffc18a';ctx.lineWidth=2.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
        ctx.moveTo(x*size+5,y*size+5);ctx.lineTo(x*size+13,y*size+11);ctx.lineTo(x*size+9,y*size+size-5);
        ctx.moveTo(x*size+13,y*size+11);ctx.lineTo(x*size+size-5,y*size+6);
        ctx.moveTo(x*size+13,y*size+11);ctx.lineTo(x*size+size-6,y*size+size-5);ctx.stroke();
      }
    });
    if(phase!=='dots' && !secondArena) {
      const dx=doorX()*size+2,dy=(rows-1)*size+1;
      ctx.save();ctx.shadowColor=hasKey?'#72f4bc':'#83a4ff';ctx.shadowBlur=hasKey?22:6;
      ctx.fillStyle=hasKey?'#47d999':'#6f82b9';roundedRect(dx,dy,size-4,size-3,7);
      ctx.fillStyle='#000d49';ctx.beginPath();ctx.arc(dx+size/2-2,dy+11,2.5,0,Math.PI*2);ctx.fill();ctx.fillRect(dx+size/2-3,dy+12,2,6);ctx.restore();
    }
    for(let i=wallBreaks.length-1;i>=0;i--){const item=wallBreaks[i],t=(performance.now()-item.start)/430;if(t>=1){wallBreaks.splice(i,1);continue;}ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#F86B00';ctx.lineWidth=3*(1-t)+1;ctx.beginPath();ctx.arc(item.x*size+size/2,item.y*size+size/2,5+17*t,0,Math.PI*2);ctx.stroke();ctx.restore();}
    dots.forEach(cell=>{const [x,y]=cell.split(',').map(Number);ctx.fillStyle='#f5fbff';ctx.beginPath();ctx.arc(x*size+size/2,y*size+size/2,3.2,0,Math.PI*2);ctx.fill();});
    if (bonus && bonus.expiresAt>Date.now()) {
      const x=bonus.x*size+size/2,y=bonus.y*size+size/2;
      const remaining=bonus.expiresAt-Date.now(),pulse=1+Math.sin(performance.now()/180)*.06;
      ctx.save();ctx.translate(x,y);ctx.scale(pulse,pulse);
      if (remaining<1800) ctx.globalAlpha=.55+.45*Math.pow(Math.sin(performance.now()/110),2);
      ctx.fillStyle=bonus.multiplier===3?'#ffc29e':'#b8e9ff';
      ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000d49';ctx.font='800 13px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(`${bonus.multiplier}×`,0,1);
      ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.beginPath();ctx.arc(0,0,15,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,remaining/bonusVisibleMs));ctx.stroke();
      ctx.font='800 10px Arial, sans-serif';ctx.fillStyle='#fff';ctx.fillText(String(Math.ceil(remaining/1000)),0,-23);ctx.restore();
    }
    if(phase==='boss' && boss) {
      if(secondArena) bossVisualX=bossVisualX===null?boss.x:bossVisualX+(boss.x-bossVisualX)*.19;
      const transitionElapsed=bossStage===3?Math.max(0,Math.min(bossTransitionMs,Date.now()-bossTransitionStartedAt)):0;
      const rising=Math.max(0,Math.min(1,(transitionElapsed-1850)/1350));
      const riseEase=rising*rising*(3-2*rising);
      const transitionY=bossTransitionY+(2-bossTransitionY)*riseEase+(1-riseEase)*Math.sin(Math.min(1,transitionElapsed/620)*Math.PI)*.45;
      const entryProgress=bossStage===1?Math.max(0,Math.min(1,(Date.now()-bossStartedAt)/bossEntryMs)):1;
      const entryEase=1-(1-entryProgress)**3;
      const bx=(bossStage===3?bossTransitionX:secondArena?bossVisualX:boss.x)*size+size/2,by=(bossStage===3?transitionY:secondArena?bossStage2Y(Date.now()-bossStage2StartedAt):-2+(boss.y+2)*entryEase)*size+size/2;
      const rageTarget=finalArena && bossStage===1 && raging?1:0;
      bossRageVisual+=(rageTarget-bossRageVisual)*.18;
      if(Math.abs(rageTarget-bossRageVisual)<.005) bossRageVisual=rageTarget;
      if(secondArena) {
        const within=(Date.now()-bossStage2StartedAt)%3600;
        if(!bossFallStartedAt && within>=1100 && within<2200) {
          const warning=Math.min(1,(within-1100)/350);
          ctx.save();ctx.globalAlpha=(.1+.15*Math.sin(performance.now()/90)**2)*warning;ctx.fillStyle='#ff9151';
          roundedRect(bx-size*1.3,size*2,size*2.6,(rows-4)*size,18);ctx.restore();
        }
      }
      if(finalArena && bossStage===1 && raging) {
        ctx.save();ctx.strokeStyle='rgba(255,119,56,.6)';ctx.lineWidth=4;ctx.shadowColor='#ff462f';ctx.shadowBlur=24;
        ctx.beginPath();ctx.arc(bx,by,48+24*bossRageVisual+Math.sin(performance.now()/110)*3,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      let transitionScale=1.7,transitionOpacity=1;
      if(bossStage===3) {
        if(transitionElapsed<620) {const t=transitionElapsed/620;transitionScale=1.7-.85*(1-(1-t)**3);transitionOpacity=1-.38*t;}
        else if(transitionElapsed<1850) {const t=(transitionElapsed-620)/1230;transitionScale=.85+1.55*t+.13*Math.sin(t*Math.PI*9)*t;transitionOpacity=.62+.38*Math.abs(Math.sin(t*Math.PI*7));}
        else {transitionScale=2.4-.2*riseEase+.07*Math.sin(transitionElapsed/110)*(1-riseEase);}
        ctx.save();ctx.globalAlpha=.2+.22*Math.max(0,(transitionElapsed-620)/2580);ctx.strokeStyle='#ff9863';ctx.lineWidth=3;ctx.shadowColor='#ff653b';ctx.shadowBlur=20;
        ctx.beginPath();ctx.arc(bx,by,size*(.85+transitionScale*.62),0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      ctx.save();ctx.globalAlpha=transitionOpacity*entryEase;ctx.translate(bx,by+(bossStage===3?0:Math.sin(performance.now()/230)*2));const entryScale=.65+.35*entryEase;if(finalArena) {const scale=bossStage===3?transitionScale:bossStage===2?2.2:1.7*(1+.5*bossRageVisual)*entryScale;ctx.scale(scale,scale);}else ctx.scale(entryScale,entryScale);ctx.shadowColor=finalArena?'#ff5d32':'#b060ff';ctx.shadowBlur=finalArena?30:24;
      drawBossBody(finalArena,bossStage===3 && transitionElapsed<620);
      if(bossShieldActive()) {
        ctx.strokeStyle='#b8e9ff';ctx.lineWidth=3;ctx.shadowColor='#7be0ff';ctx.shadowBlur=20;
        ctx.beginPath();ctx.arc(0,0,30+Math.sin(performance.now()/150)*1.5,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
      if(bossStage===1) {
        const hpWidth=finalArena?76*(1+.3*bossRageVisual):50,hpY=by-(finalArena?53+26*bossRageVisual:35);
        ctx.fillStyle='rgba(255,255,255,.25)';roundedRect(bx-hpWidth/2,hpY,hpWidth,6,3);
        ctx.fillStyle=finalArena?'#ffad5d':'#8cf0bd';roundedRect(bx-hpWidth/2,hpY,hpWidth*Math.max(0,bossHp)/Math.max(1,bossMaxHp),6,3);
      }
      if(bossPickupAvailable()) {const pickup=bossBlasterCell();drawBlaster(pickup.x*size+size/2,pickup.y*size+size/2);}
    }
    if(phase==='boss') bossProjectiles.forEach(shot=>{
      const x=(shot.fromX+(shot.x-shot.fromX)*progress)*size+size/2,y=(shot.fromY+(shot.y-shot.fromY)*progress)*size+size/2;
      ctx.save();ctx.shadowColor=finalArena?'#ff921f':'#ff5b78';ctx.shadowBlur=18;ctx.fillStyle=finalArena?'#ff9a43':'#ff728b';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=finalArena?'#ffe7a5':'#ffd3dd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.stroke();ctx.restore();
    });
    for(let i=projectileBursts.length-1;i>=0;i--) {
      const burst=projectileBursts[i],t=(performance.now()-burst.start)/440;
      if(t>=1) {projectileBursts.splice(i,1);continue;}
      const x=burst.x*size+size/2,y=burst.y*size+size/2;
      ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#b8e9ff';ctx.lineWidth=2.5*(1-t)+.5;
      ctx.beginPath();ctx.arc(x,y,5+13*t,0,Math.PI*2);ctx.stroke();
      burst.pieces.forEach((piece,index)=>{
        const distance=piece.distance*t;
        ctx.fillStyle=index%3===0?'#fff':index%2===0?'#ff9ba9':'#b8e9ff';
        ctx.beginPath();ctx.arc(x+Math.cos(piece.angle)*distance,y+Math.sin(piece.angle)*distance,piece.radius*(1-.65*t),0,Math.PI*2);ctx.fill();
      });
      ctx.restore();
    }
    if(phase==='key' && droppedKey) drawKey(droppedKey.x*size+size/2,droppedKey.y*size+size/2);
    if (Date.now()>=ghostPausedUntil) ghosts.forEach((g,i)=>{
      if (g.dead) return;const before=previousGhosts[i],x=(before.x+(g.x-before.x)*progress)*size+size/2,y=(before.y+(g.y-before.y)*progress)*size+size/2;
      ctx.save();if(g.spawnedAt) ctx.globalAlpha=Math.min(1,(Date.now()-g.spawnedAt)/450);
      if(g.large){ctx.translate(x,y);ctx.scale(1.4,1.4);ctx.translate(-x,-y);}
      if(g.minion){ctx.translate(x,y);ctx.scale(1.2,1.2);ctx.translate(-x,-y);}
      ctx.fillStyle=g.minion?g.color:raging?'#ff4e68':g.color;if(raging){ctx.shadowColor=g.minion?g.color:'#ff294e';ctx.shadowBlur=g.minion?22:18;}ctx.beginPath();ctx.arc(x,y-2,10,Math.PI,0);ctx.lineTo(x+10,y+9);ctx.lineTo(x+5,y+5);ctx.lineTo(x,y+9);ctx.lineTo(x-5,y+5);ctx.lineTo(x-10,y+9);ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      ctx.fillStyle=raging?'#fff':'#000d49';ctx.beginPath();ctx.arc(x-3,y-2,1.6,0,Math.PI*2);ctx.arc(x+3,y-2,1.6,0,Math.PI*2);ctx.fill();
      if(raging){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x-6,y-6);ctx.lineTo(x-2,y-4);ctx.moveTo(x+6,y-6);ctx.lineTo(x+2,y-4);ctx.stroke();}
      if (g.hp<g.maxHp) {
        ctx.fillStyle='rgba(0,13,73,.75)';roundedRect(x-11,y+12,22,4,2);
        ctx.fillStyle='#ffc29e';roundedRect(x-10,y+13,20*g.hp/g.maxHp,2,1);
      }
      ctx.restore();
    });
    for(let i=ghostBursts.length-1;i>=0;i--) {
      const burst=ghostBursts[i],t=(performance.now()-burst.start)/560;
      if(t>=1) {ghostBursts.splice(i,1);continue;}
      const x=burst.x*size+size/2,y=burst.y*size+size/2,ease=1-(1-t)*(1-t);
      ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=burst.color;ctx.lineWidth=2.5*(1-t)+.5;
      ctx.beginPath();ctx.arc(x,y,(burst.large?10:7)+(burst.large?23:18)*ease,0,Math.PI*2);ctx.stroke();
      burst.pieces.forEach((piece,index)=>{
        ctx.save();ctx.translate(x+Math.cos(piece.angle)*piece.distance*ease,y+Math.sin(piece.angle)*piece.distance*ease+4*t*t);
        ctx.rotate(piece.angle+piece.spin*t);ctx.fillStyle=index%4===0?'#fff':index%3===0?'#b8e9ff':burst.color;
        const width=piece.radius*2*(1-.55*t),height=piece.radius*(1-.3*t);
        ctx.fillRect(-width/2,-height/2,width,height);ctx.restore();
      });
      ctx.restore();
    }
    if (remotePlayer && remoteFrom) {
      const t=Math.min(1,(performance.now()-remoteUpdatedAt)/250),x=(remoteFrom.x+(remotePlayer.x-remoteFrom.x)*t)*size+size/2,y=(remoteFrom.y+(remotePlayer.y-remoteFrom.y)*t)*size+size/2;
      drawChomper(x,y,11.5,0,performance.now(),'#b8e9ff');
    }
    const px=(previousPlayer.x+(player.x-previousPlayer.x)*progress)*size+size/2,py=(previousPlayer.y+(player.y-previousPlayer.y)*progress)*size+size/2;
    if (Date.now()<magnetUntil) {
      const pulse=magnetLevel+.12+Math.sin(performance.now()/180)*.08;
      ctx.save();ctx.strokeStyle='rgba(184,233,255,.72)';ctx.lineWidth=2;ctx.setLineDash([4,7]);ctx.lineDashOffset=-performance.now()/45;
      ctx.beginPath();ctx.arc(px,py,size*pulse,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    drawChomper(px,py,11.5,moving.angle,performance.now());
    if(phase==='boss' && Date.now()<invulnerableUntil && Date.now()-bossStartedAt<bossSafetyMs) {
      const remaining=(invulnerableUntil-Date.now())/bossSafetyMs;
      ctx.save();ctx.strokeStyle=`rgba(184,233,255,${.3+.55*Math.min(1,remaining)})`;ctx.lineWidth=2.5;ctx.setLineDash([3,5]);ctx.lineDashOffset=-performance.now()/35;
      ctx.beginPath();ctx.arc(px,py,20+Math.sin(performance.now()/160)*1.5,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if (beamEnd && performance.now()<beamUntil) {ctx.strokeStyle='#b8e9ff';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(beamEnd.x*size+size/2,beamEnd.y*size+size/2);ctx.stroke();}
    if (hitAt && hitPosition) {
      const t=Math.min(1,(performance.now()-hitAt)/650),hx=hitPosition.x*size+size/2,hy=hitPosition.y*size+size/2;
      ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#ffbd8a';ctx.lineWidth=3*(1-t)+1;
      ctx.beginPath();ctx.arc(hx,hy,11+39*t,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.3,r=18+27*t;ctx.beginPath();ctx.moveTo(hx+Math.cos(a)*r,hy+Math.sin(a)*r);ctx.lineTo(hx+Math.cos(a)*(r+8),hy+Math.sin(a)*(r+8));ctx.stroke();}
      ctx.restore();
    }
    const now=performance.now();
    for(let i=floaters.length-1;i>=0;i--){
      const item=floaters[i],duration=item.subtle?560:750,t=(now-item.start)/duration;
      if(t>=1){floaters.splice(i,1);continue;}
      ctx.save();ctx.globalAlpha=(item.subtle ? .7 : 1)*(1-t);ctx.fillStyle=item.color;
      if(!item.subtle){ctx.shadowColor='#000d49';ctx.shadowBlur=7;}
      ctx.font=item.damage?'800 14px Arial, sans-serif':item.subtle?'700 12px Arial, sans-serif':'800 17px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      const textY=item.damage?item.y*size+size/2+23+10*t:item.y*size-(item.subtle?11:8)-(item.subtle?14:27)*t;
      ctx.fillText(item.text,item.x*size+size/2,textY);ctx.restore();
    }
  }
  function drawKey(x,y) {
    ctx.save();ctx.strokeStyle='#ffd779';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#ffd779';ctx.shadowBlur=13;
    ctx.beginPath();ctx.arc(x-7,y-4,6,0,Math.PI*2);ctx.moveTo(x-1,y);ctx.lineTo(x+10,y+10);ctx.lineTo(x+13,y+7);ctx.moveTo(x+6,y+6);ctx.lineTo(x+9,y+3);ctx.stroke();ctx.restore();
  }
  function drawBlaster(x,y) {
    const pulse=1+Math.sin(performance.now()/180)*.07;
    ctx.save();ctx.translate(x,y);ctx.scale(pulse,pulse);ctx.shadowColor='#8fe6ff';ctx.shadowBlur=16;
    ctx.fillStyle='#b8e9ff';roundedRect(-13,-7,22,10,3);ctx.fillStyle='#fff';roundedRect(7,-5,8,6,2);
    ctx.fillStyle='#f86b00';ctx.beginPath();ctx.moveTo(-5,3);ctx.lineTo(3,3);ctx.lineTo(0,12);ctx.lineTo(-5,12);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function animate(now) {
    if (!dialog.open) return;
    if (document.hidden) {lastFrame=now;frame=requestAnimationFrame(animate);return;}
    if (!lastFrame) lastFrame=now;
    elapsed=Math.min(elapsed+now-lastFrame,stepDuration*2);lastFrame=now;
    while (elapsed>=stepDuration) {step();elapsed-=stepDuration;}
    updateGhostCooldown();updateMagnetTimer();updateWallEaterTimer();updateMultiplierStatus();updateRageStatus();draw(elapsed/stepDuration);frame=requestAnimationFrame(animate);
  }
  function qualifies() {return !unranked && score>0 && (leaderboard.length<5 || score>Number(leaderboard[4].score));}
  function renderLeaderboard() {
    scoresNode.replaceChildren();
    if (!leaderboard.length) {const li=document.createElement('li');li.textContent='Be the first on the board.';scoresNode.append(li);}
    leaderboard.forEach((entry,i)=>{const li=document.createElement('li'),name=document.createElement('span'),points=document.createElement('strong');name.textContent=`${i+1}. ${entry.name}`;points.textContent=Number(entry.score).toLocaleString('en-US');li.append(name,points);scoresNode.append(li);});
    scoreForm.hidden=state!=='lost' || !!savedName || !qualifies();
  }
  async function loadLeaderboard() {
    try {
      const response=await fetch('eye-game-scores.php?action=list',{cache:'no-store'});
      if (!response.ok) throw Error('no PHP');
      const data=await response.json(); leaderboard=data.scores||[];localScores=false;scoreNote.textContent='Top 5 across all players.';
    } catch (_) {
      localScores=true;
      try {leaderboard=JSON.parse(localStorage.getItem('eyee-game-highscores-v1')||'[]');}catch(_){leaderboard=[];}
      scoreNote.textContent='Local preview · Top 5 on this device.';
    }
    renderLeaderboard();
  }
  async function submitScore(name, silent=false) {
    if (scoreBusy || unranked || !score) return;
    scoreBusy=true;
    try {
      if (localScores) {
        const existing=leaderboard.find(e=>e.runId===runId);
        if (existing) {existing.score=Math.max(existing.score,score);existing.level=Math.max(existing.level,level);}
        else leaderboard.push({name,score,level,runId});
        leaderboard.sort((a,b)=>b.score-a.score);leaderboard=leaderboard.slice(0,5);
        localStorage.setItem('eyee-game-highscores-v1',JSON.stringify(leaderboard));
      } else {
        if (!room) throw Error('No active game room');
        await syncRoom();
        const response=await fetch('eye-game-scores.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,room:room.id,token:room.token,run:room.run}),cache:'no-store'});
        const data=await response.json();
        if (!response.ok) throw Error(data.error||'Could not save score');
        leaderboard=data.scores||[];
      }
      savedName=name;scoreNote.textContent=localScores?'Score saved on this device.':'Score saved to the shared Top 5.';renderLeaderboard();
    } catch (error) {if (!silent) scoreNote.textContent=error.message||'Could not save your score right now.';}
    finally {scoreBusy=false;}
  }
  function saveExistingScore() {if (savedName) return submitScore(savedName,true);return Promise.resolve();}
  function openGame(invitedRoom=null) {
    if (dialog.open) return;
    dialog.showModal();document.body.classList.add('eye-game-open');
    simulating=false;simulateButton.hidden=true;simulateButton.textContent='Simulate second player';showRoomStatus('');
    inviteButton.disabled=true;inviteButton.textContent='Invite a friend';inviteStatus.hidden=true;inviteStatus.textContent='';
    newGame();void loadLeaderboard();cancelAnimationFrame(frame);frame=requestAnimationFrame(animate);
    requestAnimationFrame(()=>dialog.classList.add('is-visible'));void joinRoom(invitedRoom);$('.eye-game-close').focus({preventScroll:true});
  }
  function testFinalBoss() {
    if(testingFinalBoss && phase==='escape') {
      phase='launch';escape.launchAt=Date.now();escape.launchX=doorX()-2;escape.launchY=3;
      player=previousPlayer={x:escape.launchX,y:escape.launchY};escape.cameraY=0;escape.lavaY=escape.previousLavaY=13;
      testBossButton.hidden=true;updateStatus('Hop aboard! The rocket is getting ready to launch.');canvas.focus?.({preventScroll:true});return;
    }
    if(testingFinalBoss && phase==='boss' && (bossStage===2||bossStage===3)) {startEscape();canvas.focus?.({preventScroll:true});return;}
    if(testingFinalBoss && phase==='boss' && bossStage===1) {startFinalBossSecondPhase();canvas.focus?.({preventScroll:true});return;}
    const activeRoom=room;
    clearInterval(roomPoll);room=null;roomPoll=0;
    if(activeRoom) void roomRequest({action:'leave',room:activeRoom.id,token:activeRoom.token},true).catch(()=>{});
    newGame();testingFinalBoss=true;unranked=true;simulating=false;remotePlayer=remoteFrom=null;
    inviteButton.disabled=true;simulateButton.hidden=true;
    beginLevel(finalLevel,0);blasterLevel=2;lives=8;startBossPhase();
    dots.clear();
    player=previousPlayer={x:doorX(),y:rows-4};moving=wanted=directions[0];hasInput=true;
    invulnerableUntil=Date.now()+3200;updateStatus('Final boss test · Arrow keys to steer, Space to fire.');
    testBossButton.textContent='Test phase 2';testBossButton.title='Jump to the second phase (test run)';
    showRoomStatus('Practice run · your score will not enter the Top 5.');
    renderLeaderboard();canvas.focus?.({preventScroll:true});
  }
  async function closeGame() {
    cancelAnimationFrame(frame);frame=0;clearInterval(roomPoll);clearTimeout(levelTimer);clearTimeout(hitTimer);
    clearLevelDescent();
    await saveExistingScore();
    if (room) void roomRequest({action:'leave',room:room.id,token:room.token},true).catch(()=>{});
    room=null;simulating=false;remotePlayer=remoteFrom=null;dialog.classList.remove('is-visible');dialog.close();document.body.classList.remove('eye-game-open');onClose?.();
  }
  $('.eye-game-close').addEventListener('click',closeGame);
  testBossButton.addEventListener('click',testFinalBoss);
  victoryNode.querySelector('button').addEventListener('click',()=>{newGame();if(room){roomRestart=true;void syncRoom();}});
  inviteButton.addEventListener('click',async()=>{
    if (inviteButton.disabled) return;
    inviteButton.disabled=true;
    try {
      if (room) {
        const reserved=await roomRequest({action:'reserve',room:room.id,token:room.token});
        if (reserved.players>=2) { inviteStatus.hidden=false;inviteStatus.textContent='Another player has already joined this room.';return; }
      }
      const link=new URL(location.href);link.hash='';link.searchParams.set('spel',room?.id||'1');
      try { await navigator.clipboard.writeText(link.href); }
      catch (_) {
        const input=document.createElement('textarea');input.value=link.href;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
        const copied=document.execCommand('copy');input.remove();if (!copied) throw Error('Could not copy link');
      }
      inviteStatus.hidden=false;
      inviteStatus.textContent=room?'Invite link copied. Send it to your teammate!':'Game link copied. Multiplayer will work once this site is on PHP hosting.';
      inviteButton.textContent='Link copied';
    } catch (_) { inviteStatus.hidden=false;inviteStatus.textContent='Could not copy the link. Please try again.'; }
    finally { inviteButton.disabled=false; }
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeGame();});
  $('.eye-game-restart').addEventListener('click',async()=>{await saveExistingScore();newGame();if(room){roomRestart=true;void syncRoom();}});
  simulateButton.addEventListener('click',()=>{
    simulating=!simulating;
    if (simulating) {unranked=true;remotePlayer=remoteFrom={x:1,y:rows-2};remoteUpdatedAt=performance.now();showRoomStatus('Simulation: the light-blue chomper collects dots too. Scores do not count.');}
    else {remotePlayer=remoteFrom=null;showRoomStatus('Local preview: try playing with a computer-controlled chomper.');}
    simulateButton.textContent=simulating?'Stop simulation':'Simulate second player';renderLeaderboard();draw(1);
  });
  upgradeNode.querySelectorAll('[data-upgrade]').forEach(button=>button.addEventListener('click',()=>chooseUpgrade(button.dataset.upgrade)));
  upgradeNode.querySelector('.eye-game-upgrade-skip').addEventListener('click',()=>{if(state==='upgrade') finishUpgradeChoice();});
  upgradeNode.querySelectorAll('button').forEach(button=>button.addEventListener('pointerenter',()=>{
    if(state==='upgrade' && !button.disabled && !button.hidden) {
      upgradeNode.querySelectorAll('.is-keyboard-selected').forEach(item=>item.classList.remove('is-keyboard-selected'));
      button.classList.add('is-keyboard-selected');
    }
  }));
  scoreForm.addEventListener('submit',event=>{event.preventDefault();const name=scoreInput.value.trim();if(name) void submitScore(name);});
  let swipeStart=null;
  canvas.addEventListener('pointerdown',event=>{
    if (event.pointerType!=='touch' || !dialog.open) return;
    swipeStart={x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointerup',event=>{
    if (!swipeStart || event.pointerType!=='touch') return;
    const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;
    if (Math.max(Math.abs(dx),Math.abs(dy))<18) {if(canShoot()) shoot();return;}
    wanted=Math.abs(dx)>Math.abs(dy)?(dx>0?directions[0]:directions[2]):(dy>0?directions[1]:directions[3]);
    if (!hasInput) {invulnerableUntil=Date.now()+1400;updateStatus(escape?'Climb through all five levels. Reach the rocket before the lava!':'Your turn. Catch them all!');}hasInput=true;
  });
  canvas.addEventListener('pointercancel',()=>{swipeStart=null;});
  document.addEventListener('keydown',event=>{
    if (!dialog.open || event.target===scoreInput) return;
    const wasHeld=heldGameKeys.has(event.code);
    heldGameKeys.add(event.code);
    if (state==='upgrade') {
      const navigation={ArrowLeft:-1,ArrowUp:-1,a:-1,A:-1,w:-1,W:-1,ArrowRight:1,ArrowDown:1,d:1,D:1,s:1,S:1};
      if (Object.prototype.hasOwnProperty.call(navigation,event.key)) {
        event.preventDefault();
        if(wasHeld || event.repeat) return;
        const buttons=availableUpgradeButtons();
        const selected=upgradeNode.querySelector('.is-keyboard-selected');
        const index=Math.max(0,buttons.indexOf(selected));
        selectUpgradeButton(buttons[(index+navigation[event.key]+buttons.length)%buttons.length]);
        return;
      }
      if (event.code==='Space' || event.key==='Enter') {
        event.preventDefault();
        if(!wasHeld && !event.repeat && Date.now()-upgradeOpenedAt>=400)
          (upgradeNode.querySelector('.is-keyboard-selected')||availableUpgradeButtons()[0]).click();
      }
      return;
    }
    if (event.code==='Space') {event.preventDefault();shoot();return;}
    const map={ArrowRight:directions[0],d:directions[0],D:directions[0],ArrowDown:directions[1],s:directions[1],S:directions[1],ArrowLeft:directions[2],a:directions[2],A:directions[2],ArrowUp:directions[3],w:directions[3],W:directions[3]};
    if (map[event.key]) {event.preventDefault();wanted=map[event.key];if(!hasInput){invulnerableUntil=Date.now()+1400;updateStatus(escape?'Climb through all five levels. Reach the rocket before the lava!':'Your turn. Catch them all!');}hasInput=true;}
  });
  document.addEventListener('keyup',event=>{
    heldGameKeys.delete(event.code);
    if(dialog.open && state==='upgrade' && (event.code==='Space' || event.key==='Enter')) event.preventDefault();
  });
  window.addEventListener('blur',()=>heldGameKeys.clear());
  return {open:openGame};
}
window.EyeeGame={createEyeGame};
