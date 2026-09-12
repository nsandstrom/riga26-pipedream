(() => {
  'use strict';

  // ---------- Config ----------
  const COLS = 12, ROWS = 8, CELL = 56;
  const QUEUE_LEN = 5;

  const DIR = {
    N: { x: 0, y: -1 },
    E: { x: 1, y: 0 },
    S: { x: 0, y: 1 },
    W: { x: -1, y: 0 },
  };
  const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };

  // Piece connection pairs. Each piece connects one or more {a,b} direction pairs.
  const PIECES = {
    STRAIGHT_H: { pairs: [['W', 'E']], weight: 15 },
    STRAIGHT_V: { pairs: [['N', 'S']], weight: 15 },
    CURVE_NE: { pairs: [['N', 'E']], weight: 15 },
    CURVE_ES: { pairs: [['E', 'S']], weight: 15 },
    CURVE_SW: { pairs: [['S', 'W']], weight: 15 },
    CURVE_WN: { pairs: [['W', 'N']], weight: 15 },
    CROSS: { pairs: [['N', 'S'], ['E', 'W']], weight: 10 },
  };
  const PIECE_TABLE = (() => {
    const out = [];
    for (const [type, def] of Object.entries(PIECES)) {
      for (let i = 0; i < def.weight; i++) out.push(type);
    }
    return out;
  })();

  function randomPieceType() {
    return PIECE_TABLE[(Math.random() * PIECE_TABLE.length) | 0];
  }

  function findOutgoing(type, incomingSide) {
    const def = PIECES[type];
    for (const pair of def.pairs) {
      if (pair[0] === incomingSide) return pair[1];
      if (pair[1] === incomingSide) return pair[0];
    }
    return null;
  }

  // ---------- Audio (tiny synth, no assets) ----------
  const Audio_ = (() => {
    let ctx = null;
    let muted = false;
    function ensure() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      return ctx;
    }
    function beep(freq, dur, type = 'sine', gain = 0.08, delay = 0) {
      if (muted) return;
      try {
        const c = ensure();
        const t0 = c.currentTime + delay;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur);
      } catch (e) { /* audio not available */ }
    }
    return {
      place: () => beep(520, 0.08, 'square', 0.05),
      tick: () => beep(880, 0.03, 'sine', 0.03),
      burst: () => { beep(140, 0.4, 'sawtooth', 0.12); beep(90, 0.5, 'sawtooth', 0.1, 0.05); },
      levelUp: () => { beep(660, 0.12, 'sine', 0.08); beep(880, 0.14, 'sine', 0.08, 0.12); beep(1100, 0.2, 'sine', 0.08, 0.24); },
      toggleMute: () => { muted = !muted; return muted; },
      isMuted: () => muted,
    };
  })();

  // ---------- Game State ----------
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;

  const el = {
    score: document.getElementById('score'),
    highscore: document.getElementById('highscore'),
    level: document.getElementById('level'),
    timeBar: document.getElementById('timeBar'),
    lenBar: document.getElementById('lenBar'),
    lenLabel: document.getElementById('lenLabel'),
    queue: document.getElementById('queue'),
    banner: document.getElementById('phaseBanner'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayText: document.getElementById('overlayText'),
    overlayBtn: document.getElementById('overlayBtn'),
    helpOverlay: document.getElementById('helpOverlay'),
    helpBtn: document.getElementById('helpBtn'),
    helpCloseBtn: document.getElementById('helpCloseBtn'),
    muteBtn: document.getElementById('muteBtn'),
  };

  const HS_KEY = 'pipe-rush-highscore';
  let highScore = parseInt(localStorage.getItem(HS_KEY) || '0', 10);
  el.highscore.textContent = highScore;

  let state = null; // reset in newGame()

  function emptyGrid() {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) row.push({ kind: 'empty' });
      g.push(row);
    }
    return g;
  }

  function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }

  function setupLevel(level) {
    const grid = emptyGrid();

    // Start valve: pick a direction and a position with room to flow into the board.
    const dirNames = ['N', 'E', 'S', 'W'];
    const dir = dirNames[(Math.random() * dirNames.length) | 0];
    let row, col;
    if (dir === 'E') { col = (Math.random() * (COLS - 3)) | 0; row = (Math.random() * ROWS) | 0; }
    else if (dir === 'W') { col = COLS - 1 - ((Math.random() * (COLS - 3)) | 0); row = (Math.random() * ROWS) | 0; }
    else if (dir === 'S') { row = (Math.random() * (ROWS - 3)) | 0; col = (Math.random() * COLS) | 0; }
    else { row = ROWS - 1 - ((Math.random() * (ROWS - 3)) | 0); col = (Math.random() * COLS) | 0; }

    grid[row][col] = { kind: 'start', dir, filled: true };

    // Blocked rocks, scaled with level, never on the start cell.
    const rockCount = Math.min(18, 5 + level * 2);
    let placed = 0, guard = 0;
    while (placed < rockCount && guard < 500) {
      guard++;
      const r = (Math.random() * ROWS) | 0;
      const c = (Math.random() * COLS) | 0;
      if (grid[r][c].kind === 'empty' && !(r === row && c === col)) {
        grid[r][c] = { kind: 'rock' };
        placed++;
      }
    }

    const queue = [];
    for (let i = 0; i < QUEUE_LEN; i++) queue.push(randomPieceType());

    const buildDuration = Math.max(8000, 20000 - (level - 1) * 1200);
    const flowSpeed = Math.max(140, 640 - (level - 1) * 35);
    const targetLength = 14 + (level - 1) * 6;

    return {
      level,
      grid,
      queue,
      start: { row, col, dir },
      phase: 'build', // build | flowing | levelcomplete | gameover
      buildDuration,
      buildRemaining: buildDuration,
      flowSpeed,
      targetLength,
      currentLength: 0,
      flow: { row, col, outDir: dir, elapsed: 0 },
      score: state ? state.score : 0,
    };
  }

  function newGame() {
    state = setupLevel(1);
    updateHud();
    renderQueue();
    hideOverlay();
    showBanner('BUILD!');
  }

  function nextLevel() {
    const carryScore = state.score;
    state = setupLevel(state.level + 1);
    state.score = carryScore;
    updateHud();
    renderQueue();
    hideOverlay();
    showBanner('BUILD!');
  }

  // ---------- Rendering (flat VGA-style palette, no glow) ----------
  const COLOR_DRY = '#c0c0c0';
  const COLOR_DRY_EDGE = '#000000';
  const COLOR_WET = '#00aa00';
  const COLOR_WET_EDGE = '#003300';
  const COLOR_ROCK = '#808000';
  const COLOR_ROCK_EDGE = '#000000';
  const COLOR_START = '#ff0000';
  const COLOR_BOARD_BG = '#000000';
  const COLOR_GRID = '#404040';

  function cellCenter(r, c) { return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }; }

  // Draws a straight pipe segment as a rectangle from the cell center toward one side.
  function drawSegmentToward(cx, cy, side, wet) {
    const w = CELL * 0.34;
    ctx.save();
    ctx.fillStyle = wet ? COLOR_WET : COLOR_DRY;
    let rx, ry, rw, rh;
    if (side === 'N') { rx = cx - w / 2; ry = cy - CELL / 2 - 1; rw = w; rh = CELL / 2 - CELL * 0.16 + 1; }
    if (side === 'S') { rx = cx - w / 2; ry = cy + CELL * 0.16; rw = w; rh = CELL / 2 - CELL * 0.16 + 1; }
    if (side === 'E') { rx = cx + CELL * 0.16; ry = cy - w / 2; rw = CELL / 2 - CELL * 0.16 + 1; rh = w; }
    if (side === 'W') { rx = cx - CELL / 2 - 1; ry = cy - w / 2; rw = CELL / 2 - CELL * 0.16 + 1; rh = w; }
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = wet ? COLOR_WET_EDGE : COLOR_DRY_EDGE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  function drawHub(cx, cy, wet) {
    ctx.save();
    ctx.fillStyle = wet ? COLOR_WET : COLOR_DRY;
    const s = CELL * 0.34;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    ctx.strokeStyle = wet ? COLOR_WET_EDGE : COLOR_DRY_EDGE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - s / 2, cy - s / 2, s, s);
    ctx.restore();
  }

  function drawPiece(r, c, cell) {
    const { x: cx, y: cy } = cellCenter(r, c);
    if (cell.kind === 'CROSS') {
      const wetH = !!cell.filledH;
      const wetV = !!cell.filledV;
      // vertical bar drawn first (as underpass), then horizontal on top with a visual gap
      drawSegmentToward(cx, cy, 'N', wetV);
      drawSegmentToward(cx, cy, 'S', wetV);
      drawSegmentToward(cx, cy, 'W', wetH);
      drawSegmentToward(cx, cy, 'E', wetH);
      drawHub(cx, cy, wetH || wetV);
      return;
    }
    const def = PIECES[cell.kind];
    if (!def) return;
    const wet = !!cell.filled;
    for (const pair of def.pairs) {
      drawSegmentToward(cx, cy, pair[0], wet);
      drawSegmentToward(cx, cy, pair[1], wet);
    }
    drawHub(cx, cy, wet);
  }

  function drawStart(r, c, dir) {
    const { x: cx, y: cy } = cellCenter(r, c);
    ctx.save();
    ctx.fillStyle = COLOR_START;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    // outgoing stub
    drawSegmentToward(cx, cy, dir, true);
    // direction arrow
    ctx.fillStyle = '#000000';
    ctx.save();
    ctx.translate(cx, cy);
    const rot = { N: -90, S: 90, E: 0, W: 180 }[dir];
    ctx.rotate((rot * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -6);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawRock(r, c) {
    const x = c * CELL, y = r * CELL;
    ctx.save();
    ctx.fillStyle = COLOR_ROCK;
    ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
    ctx.strokeStyle = COLOR_ROCK_EDGE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6);
    // crosshatch texture, classic rock/gravel tile look
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + CELL - 3, y + CELL - 3);
    ctx.moveTo(x + CELL - 3, y + 3);
    ctx.lineTo(x + 3, y + CELL - 3);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = COLOR_BOARD_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // background grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.strokeStyle = COLOR_GRID;
        ctx.lineWidth = 1;
        ctx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1);
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = state.grid[r][c];
        if (cell.kind === 'rock') drawRock(r, c);
        else if (cell.kind === 'start') drawStart(r, c, cell.dir);
        else if (cell.kind !== 'empty') drawPiece(r, c, cell);
      }
    }

    // animated flow head
    if (state.phase === 'flowing') {
      const { row, col, outDir, elapsed } = state.flow;
      const progress = Math.min(1, elapsed / state.flowSpeed);
      const from = cellCenter(row, col);
      const v = DIR[outDir];
      const hx = from.x + v.x * CELL * progress;
      const hy = from.y + v.y * CELL * progress;
      ctx.save();
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(hx - CELL * 0.16, hy - CELL * 0.16, CELL * 0.32, CELL * 0.32);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hx - CELL * 0.16, hy - CELL * 0.16, CELL * 0.32, CELL * 0.32);
      ctx.restore();
    }
  }

  // ---------- Queue UI ----------
  function miniCanvasForPiece(type) {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const g = c.getContext('2d');
    g.fillStyle = '#000000';
    g.fillRect(0, 0, 40, 40);
    const cx = 20, cy = 20;
    function seg(side) {
      const w = 12;
      g.fillStyle = COLOR_DRY;
      let rx, ry, rw, rh;
      if (side === 'N') { rx = cx - w / 2; ry = 2; rw = w; rh = 14; }
      if (side === 'S') { rx = cx - w / 2; ry = 24; rw = w; rh = 14; }
      if (side === 'E') { rx = 24; ry = cy - w / 2; rw = 14; rh = w; }
      if (side === 'W') { rx = 2; ry = cy - w / 2; rw = 14; rh = w; }
      g.fillRect(rx, ry, rw, rh);
      g.strokeStyle = COLOR_DRY_EDGE;
      g.lineWidth = 1;
      g.strokeRect(rx, ry, rw, rh);
    }
    if (type === 'CROSS') {
      seg('N'); seg('S'); seg('E'); seg('W');
    } else {
      for (const pair of PIECES[type].pairs) { seg(pair[0]); seg(pair[1]); }
    }
    g.fillStyle = COLOR_DRY;
    g.fillRect(cx - 6, cy - 6, 12, 12);
    g.strokeStyle = COLOR_DRY_EDGE;
    g.strokeRect(cx - 6, cy - 6, 12, 12);
    return c;
  }

  function renderQueue() {
    el.queue.innerHTML = '';
    state.queue.forEach((type, i) => {
      const item = document.createElement('div');
      item.className = 'qitem' + (i === 0 ? ' current' : '');
      const mini = miniCanvasForPiece(type);
      item.appendChild(mini);
      const label = document.createElement('span');
      label.className = 'qlabel';
      label.textContent = i === 0 ? 'NEXT' : '';
      item.appendChild(label);
      el.queue.appendChild(item);
    });
  }

  // ---------- Interaction ----------
  canvas.addEventListener('click', (ev) => {
    if (!state || state.phase === 'gameover' || state.phase === 'levelcomplete') return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);
    if (!inBounds(r, c)) return;
    const cell = state.grid[r][c];
    if (cell.kind !== 'empty') return;

    const type = state.queue.shift();
    state.queue.push(randomPieceType());
    if (type === 'CROSS') {
      state.grid[r][c] = { kind: 'CROSS', filledH: false, filledV: false };
    } else {
      state.grid[r][c] = { kind: type, filled: false };
    }
    Audio_.place();
    renderQueue();
  });

  // ---------- Flow simulation ----------
  function advanceFlow() {
    const { row, col, outDir } = state.flow;
    const v = DIR[outDir];
    const nr = row + v.y, nc = col + v.x;

    if (!inBounds(nr, nc)) return burst();

    const cell = state.grid[nr][nc];
    if (cell.kind === 'empty' || cell.kind === 'rock') return burst();

    const incoming = OPPOSITE[outDir];

    if (cell.kind === 'CROSS') {
      let out;
      if (incoming === 'N' || incoming === 'S') { out = findOutgoing('STRAIGHT_V', incoming); cell.filledV = true; }
      else { out = findOutgoing('STRAIGHT_H', incoming); cell.filledH = true; }
      state.flow = { row: nr, col: nc, outDir: out, elapsed: 0 };
    } else {
      const out = findOutgoing(cell.kind, incoming);
      if (!out) return burst();
      cell.filled = true;
      state.flow = { row: nr, col: nc, outDir: out, elapsed: 0 };
    }

    state.currentLength++;
    state.score++;
    updateHud();

    if (state.currentLength >= state.targetLength) {
      levelComplete();
    }
  }

  function burst() {
    state.phase = 'gameover';
    if (state.score > highScore) {
      highScore = state.score;
      localStorage.setItem(HS_KEY, String(highScore));
      el.highscore.textContent = highScore;
    }
    Audio_.burst();
    showOverlay('Burst!', `The flooz burst after flowing ${state.currentLength} tiles this level.<br>Final score: <b>${state.score}</b>`, 'Try Again', () => {
      state = null;
      newGame();
    });
  }

  function levelComplete() {
    state.phase = 'levelcomplete';
    state.score += 25;
    Audio_.levelUp();
    showOverlay('Level Complete!', `Level ${state.level} cleared with ${state.currentLength} tiles of flow.<br>Score: <b>${state.score}</b>`, 'Next Level', () => {
      nextLevel();
    });
  }

  // ---------- HUD ----------
  function updateHud() {
    el.score.textContent = state.score;
    el.level.textContent = state.level;
    el.lenLabel.textContent = `${state.currentLength} / ${state.targetLength}`;
    el.lenBar.style.width = `${Math.min(100, (state.currentLength / state.targetLength) * 100)}%`;
    el.timeBar.style.width = `${Math.max(0, (state.buildRemaining / state.buildDuration) * 100)}%`;
  }

  function showBanner(text) {
    el.banner.textContent = text;
    el.banner.classList.add('show');
    setTimeout(() => el.banner.classList.remove('show'), 900);
  }

  function showOverlay(title, text, btnLabel, onClick) {
    el.overlayTitle.textContent = title;
    el.overlayText.innerHTML = text;
    el.overlayBtn.textContent = btnLabel;
    el.overlayBtn.onclick = onClick;
    el.overlay.classList.remove('hidden');
  }
  function hideOverlay() { el.overlay.classList.add('hidden'); }

  // The help dialog's × just closes it; the main dialog's × repeats its primary action
  // (Start / Try Again / Next Level) since the game can't be left in limbo.
  el.helpOverlay.querySelector('[data-dismiss]').addEventListener('click', () => el.helpOverlay.classList.add('hidden'));
  el.overlay.querySelector('[data-dismiss]').addEventListener('click', () => el.overlayBtn.click());

  el.helpBtn.addEventListener('click', () => el.helpOverlay.classList.remove('hidden'));
  el.helpCloseBtn.addEventListener('click', () => el.helpOverlay.classList.add('hidden'));
  el.muteBtn.addEventListener('click', () => {
    const m = Audio_.toggleMute();
    el.muteBtn.textContent = m ? 'Mute' : 'Snd';
  });

  // ---------- Main loop ----------
  let lastTs = null;
  function tick(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;

    if (state && state.phase === 'build') {
      state.buildRemaining -= dt;
      if (state.buildRemaining <= 0) {
        state.buildRemaining = 0;
        state.phase = 'flowing';
        showBanner('FLOOZ!');
      }
      updateHud();
    } else if (state && state.phase === 'flowing') {
      state.flow.elapsed += dt;
      let guard = 0;
      while (state.phase === 'flowing' && state.flow.elapsed >= state.flowSpeed && guard < 20) {
        state.flow.elapsed -= state.flowSpeed;
        advanceFlow();
        guard++;
      }
    }

    if (state) draw();
    requestAnimationFrame(tick);
  }

  // ---------- Boot ----------
  showOverlay('Pipe Dream', 'A remake of the classic pipe-connecting arcade game. Place pipes from the queue, connect the flooz from the start valve, and keep it flowing as long as you can before the timer runs out or you place a piece that leads it into a dead end.', 'Start Game', () => {
    newGame();
  });
  requestAnimationFrame(tick);
})();
