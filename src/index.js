const canvas = document.getElementById('canvas');
if (!canvas) {
  document.body.innerHTML = '<p class="error-msg">Canvas element not found.</p>';
  throw new Error('Canvas element not found');
}
const ctx = canvas.getContext('2d');
if (!ctx) {
  document.body.innerHTML = '<p class="error-msg">2D canvas context not supported.</p>';
  throw new Error('Could not get 2D context');
}

// ── Audio ──────────────────────────────────────────────
let _audioCtx;

function getAudioCtx() {
  if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') return null;
  if (!_audioCtx || _audioCtx.state === 'closed') {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      _audioCtx = null;
    }
  }
  return _audioCtx;
}

function playClick() {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(AUDIO_FREQ_HIGH, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(AUDIO_FREQ_LOW, audioCtx.currentTime + AUDIO_DUR);
    gain.gain.setValueAtTime(AUDIO_VOL, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + AUDIO_DUR);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + AUDIO_DUR);
    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch (_) {}
    }, 100);
  } catch (_) { /* audio unavailable — game continues silently */ }
}

function playWinSound() {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    // Ascending major chord arpeggio: C5 → E5 → G5
    const oscs = [];
    const gains = [];
    [WIN_FREQ_1, WIN_FREQ_2, WIN_FREQ_3].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      const start = now + i * 0.08;
      const dur = WIN_DUR - i * 0.08;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(WIN_VOL, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
      oscs.push(osc);
      gains.push(gain);
    });
    setTimeout(() => {
      try { for (const o of oscs) o.disconnect(); } catch (_) {}
      try { for (const g of gains) g.disconnect(); } catch (_) {}
    }, Math.round(WIN_DUR * 1000) + 100);
  } catch (_) { /* audio unavailable — game continues silently */ }
}

function playLoseSound() {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(LOSE_FREQ_HIGH, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(LOSE_FREQ_LOW, audioCtx.currentTime + LOSE_DUR);
    gain.gain.setValueAtTime(LOSE_VOL, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + LOSE_DUR);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + LOSE_DUR);
    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch (_) {}
    }, Math.round(LOSE_DUR * 1000) + 100);
  } catch (_) { /* audio unavailable — game continues silently */ }
}

function playDrawSound() {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    // Brief ascending tone — neutral "game over" signal
    const oscs = [];
    const gains = [];
    [DRAW_FREQ_1, DRAW_FREQ_2].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      const start = now + i * 0.1;
      const dur = DRAW_DUR - i * 0.1;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(DRAW_VOL, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
      oscs.push(osc);
      gains.push(gain);
    });
    setTimeout(() => {
      try { for (const o of oscs) o.disconnect(); } catch (_) {}
      try { for (const g of gains) g.disconnect(); } catch (_) {}
    }, Math.round(DRAW_DUR * 1000) + 100);
  } catch (_) { /* audio unavailable — game continues silently */ }
}

// ── Constants ──────────────────────────────────────────
const GRID = 3;

// Layout variables (computed per resize)
let TOP_MARGIN, BOTTOM_PAD, SIDE_MARGIN, GRID_W, GRID_H, CELL_W, CELL_H, LINE_W;

// Visual constants (named for clarity)
const BG_DECOR_ALPHA = 0.08;
const GLASS_PAD = 15;
const GLASS_RADIUS = 16;
const GLASS_SHADOW_BLUR = 30;
const GLASS_SHADOW_OFFSET = 8;
const GLASS_BORDER_W = 1.5;
const PIECE_SHADOW_BLUR = 12;
const PIECE_LINE_W = 6;
const PIECE_HALF_FRAC = 0.35;
const PIECE_SIZE_FRAC = 0.8;

// Audio constants
const AUDIO_FREQ_HIGH = 800;
const AUDIO_FREQ_LOW = 400;
const AUDIO_DUR = 0.08;
const AUDIO_VOL = 0.15;

// Win/Lose audio constants
const WIN_FREQ_1 = 523.25;  // C5
const WIN_FREQ_2 = 659.25;  // E5
const WIN_FREQ_3 = 783.99;  // G5
const WIN_DUR = 0.45;
const WIN_VOL = 0.12;
const LOSE_FREQ_HIGH = 400;
const LOSE_FREQ_LOW = 120;
const LOSE_DUR = 1.2;
const LOSE_VOL = 0.12;
const DRAW_FREQ_1 = 587.33; // D5
const DRAW_FREQ_2 = 698.46; // F5
const DRAW_DUR = 0.3;
const DRAW_VOL = 0.1;
const UI_TEXT_PAD = 40;
const UI_BTN_PAD = 35;
const UI_BTN_RADIUS = 8;
const UI_FONT_FRAC = 0.14;
const BTN_FONT_FRAC = 0.08;
const BTN_MAX_W = 120;
const MODE_PAD_X = 14;
const MODE_RADIUS = 6;
const MODE_FONT_FRAC = 0.07;
const AI_DELAY = 300;

// ── Layout computation ─────────────────────────────────
const AI_MODES = ['doofus', 'bringit', 'terminator'];

function cycleAiMode() {
  const idx = AI_MODES.indexOf(aiMode);
  aiMode = AI_MODES[(idx + 1) % AI_MODES.length];
}

function computeLayout() {
  const rect = canvas.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;
  if (cw <= 0 || ch <= 0) return;
  canvas.width = Math.round(cw);
  canvas.height = Math.round(ch);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const sidePad = cw * 0.05;
  const topPad = ch * 0.07;
  const bottomPad = ch * 0.17;
  BOTTOM_PAD = bottomPad;
  SIDE_MARGIN = sidePad;
  TOP_MARGIN = topPad;
  GRID_W = cw - 2 * sidePad;
  GRID_H = ch - topPad - bottomPad;
  CELL_W = GRID_W / GRID;
  CELL_H = GRID_H / GRID;
  LINE_W = Math.max(3, Math.min(CELL_W, CELL_H) * 0.04);
}

// ── Colors ─────────────────────────────────────────────
const COLORS = {
  bg1: '#1a1a2e',
  bg2: '#16213e',
  bg3: '#0f3460',
  glass: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassShadow: 'rgba(0, 0, 0, 0.4)',
  grid: 'rgba(255, 255, 255, 0.15)',
  x: '#ff6b8a',
  o: '#7ef0d5',
  text: 'rgba(255, 255, 255, 0.85)',
  highlight: 'rgba(255, 215, 0, 0.15)',
  highlightBorder: 'rgba(255, 215, 0, 0.5)',
  btnBg: 'rgba(255, 255, 255, 0.08)',
  btnBorder: 'rgba(255, 255, 255, 0.15)',
  btnText: 'rgba(255, 255, 255, 0.9)',
};

// ── Game State ─────────────────────────────────────────
let board = Array(9).fill('');
let currentPlayer = 'X';
let status = 'playing';
let winner = null;
let winCells = [];
let aiThinking = false;
let aiMode = AI_MODES[0]; // 'doofus' | 'bringit' | 'terminator'

// Keyboard cursor (null = no cell focused)
let focusedCell = null;

// Module-level UI state
const state = {
  btn: null,
  handler: null,
  draw: null,
  modeBtn: null,
  keyHandler: null,
  _touchHandler: null,
};

// ── Accessibility: announce game state to screen readers ──
function announce(msg) {
  const el = document.getElementById('game-status');
  if (el) el.textContent = msg;
}

// ── Shared utilities ───────────────────────────────────
const _LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function getEmptyCells(board) {
  return board.map((_, i) => board[i] === '' ? i : -1).filter(i => i >= 0);
}

function checkWin(board) {
  for (const [a, bIdx, cIdx] of _LINES) {
    if (board[a] && board[a] === board[bIdx] && board[a] === board[cIdx]) {
      return { winner: board[a], cells: [a, bIdx, cIdx] };
    }
  }
  return null;
}

// Minimax with depth-aware scoring (prefers faster wins, slower losses)
function minimax(board, isMaximizing, depth = 0) {
  const result = checkWin(board);
  if (result) return result.winner === 'O' ? 10 - depth : depth - 10;
  const empty = getEmptyCells(board);
  if (empty.length === 0) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of empty) {
      board[i] = 'O';
      best = Math.max(best, minimax(board, false, depth + 1));
      board[i] = '';
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      board[i] = 'X';
      best = Math.min(best, minimax(board, true, depth + 1));
      board[i] = '';
    }
    return best;
  }
}

// ── Pure layout helpers (no side effects) ──────────────
function cellCenter(idx) {
  if (SIDE_MARGIN === undefined) return { x: 0, y: 0 };
  const col = idx % GRID;
  const row = Math.floor(idx / GRID);
  return {
    x: SIDE_MARGIN + col * CELL_W + CELL_W / 2,
    y: TOP_MARGIN + row * CELL_H + CELL_H / 2,
  };
}

function cellFromPoint(px, py) {
  if (SIDE_MARGIN === undefined) return -1;
  const col = Math.floor((px - SIDE_MARGIN) / CELL_W);
  const row = Math.floor((py - TOP_MARGIN) / CELL_H);
  const idx = row * GRID + col;
  return (idx >= 0 && idx < 9) ? idx : -1;
}

// ── Rendering helpers (no side effects beyond canvas) ──
function drawBackground() {
  const cw = canvas.width;
  const ch = canvas.height;
  const grad = ctx.createLinearGradient(0, 0, cw, ch);
  grad.addColorStop(0, COLORS.bg1);
  grad.addColorStop(0.5, COLORS.bg2);
  grad.addColorStop(1, COLORS.bg3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  ctx.save();
  ctx.globalAlpha = BG_DECOR_ALPHA;
  ctx.fillStyle = COLORS.x;
  ctx.beginPath();
  ctx.arc(cw * 0.2, ch * 0.3, cw * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.o;
  ctx.beginPath();
  ctx.arc(cw * 0.8, ch * 0.7, cw * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a78bfa';
  ctx.beginPath();
  ctx.arc(cw * 0.5, ch * 0.15, cw * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlassPanel() {
  const x = SIDE_MARGIN - GLASS_PAD;
  const y = TOP_MARGIN - GLASS_PAD;
  const w = GRID_W + GLASS_PAD * 2;
  const h = GRID_H + GLASS_PAD * 2;

  ctx.save();
  ctx.shadowColor = COLORS.glassShadow;
  ctx.shadowBlur = GLASS_SHADOW_BLUR;
  ctx.shadowOffsetY = GLASS_SHADOW_OFFSET;

  ctx.fillStyle = COLORS.glass;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, GLASS_RADIUS);
  ctx.fill();

  ctx.strokeStyle = COLORS.glassBorder;
  ctx.lineWidth = GLASS_BORDER_W;
  ctx.stroke();
  ctx.restore();
}

function drawGrid() {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = LINE_W;
  ctx.lineCap = 'round';

  for (let i = 1; i < GRID; i++) {
    const xPos = SIDE_MARGIN + i * CELL_W;
    const yPos = TOP_MARGIN + i * CELL_H;
    ctx.beginPath();
    ctx.moveTo(xPos, TOP_MARGIN);
    ctx.lineTo(xPos, TOP_MARGIN + GRID_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(SIDE_MARGIN, yPos);
    ctx.lineTo(SIDE_MARGIN + GRID_W, yPos);
    ctx.stroke();
  }
}

function drawX(cx, cy, size) {
  ctx.save();
  ctx.shadowColor = COLORS.x;
  ctx.shadowBlur = PIECE_SHADOW_BLUR;
  ctx.strokeStyle = COLORS.x;
  ctx.lineWidth = PIECE_LINE_W;
  ctx.lineCap = 'round';
  const half = size * PIECE_HALF_FRAC;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy - half);
  ctx.lineTo(cx + half, cy + half);
  ctx.moveTo(cx + half, cy - half);
  ctx.lineTo(cx - half, cy + half);
  ctx.stroke();
  ctx.restore();
}

function drawO(cx, cy, size) {
  ctx.save();
  ctx.shadowColor = COLORS.o;
  ctx.shadowBlur = PIECE_SHADOW_BLUR;
  ctx.strokeStyle = COLORS.o;
  ctx.lineWidth = PIECE_LINE_W;
  const r = size * PIECE_HALF_FRAC;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ── UI rendering (sets state.btn / state.modeBtn) ─────
function drawUI() {
  const cw = canvas.width;
  const ch = canvas.height;
  const uiY = TOP_MARGIN + GRID_H + UI_TEXT_PAD + 5;
  const fontSize = Math.max(18, Math.min(28, CELL_W * UI_FONT_FRAC));
  const btnFontSize = Math.max(13, Math.min(16, CELL_W * BTN_FONT_FRAC));

  ctx.fillStyle = COLORS.text;
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';

  let msg;
  if (status === 'won') {
    msg = winner === 'X' ? 'You Win!' : 'I Win!';
  } else if (status === 'draw') {
    msg = "It's a Draw!";
  } else if (currentPlayer === 'O') {
    msg = "AI is thinking...";
  } else {
    msg = "Your Turn (X)";
  }

  ctx.fillText(msg, cw / 2, uiY);

  // ── Reset button ──
  const btnY = uiY + UI_BTN_PAD;
  const btnW = Math.min(BTN_MAX_W, cw * 0.15);
  const btnH = Math.max(30, ch * 0.05);
  const btnX = cw / 2 - btnW / 2;

  ctx.save();
  ctx.fillStyle = COLORS.btnBg;
  ctx.strokeStyle = COLORS.btnBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(btnX + UI_BTN_RADIUS, btnY);
  ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + btnH, UI_BTN_RADIUS);
  ctx.arcTo(btnX + btnW, btnY + btnH, btnX, btnY + btnH, UI_BTN_RADIUS);
  ctx.arcTo(btnX, btnY + btnH, btnX, btnY, UI_BTN_RADIUS);
  ctx.arcTo(btnX, btnY, btnX + btnW, btnY, UI_BTN_RADIUS);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = COLORS.btnText;
  ctx.font = `${btnFontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('Reset', cw / 2, btnY + btnH * 0.65);

  state.btn = { x: btnX, y: btnY, w: btnW, h: btnH };

  // ── AI Mode Selector (bottom-right) ──
  const modeEnabled = board.every(c => c === '');
  const modeLabel = aiMode === 'terminator' ? 'Terminator' : aiMode === 'bringit' ? 'Bring it on' : 'Doofus';
  const modeText = 'AI MODE: ' + modeLabel;
  const modeFontSize = Math.max(11, Math.min(14, CELL_W * MODE_FONT_FRAC));
  const modeTextW = ctx.measureText(modeText).width;
  const modeW = modeTextW + MODE_PAD_X * 2;
  const modeH = Math.max(26, ch * 0.04);

  const modeX = cw - SIDE_MARGIN - modeW;
  const modeY = ch - BOTTOM_PAD + modeH / 2 + 10;

  ctx.save();
  if (modeEnabled) {
    // Enabled: golden accent border, normal colors
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
  } else {
    // Disabled: muted dark background, no golden border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  }
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(modeX + MODE_RADIUS, modeY);
  ctx.arcTo(modeX + modeW, modeY, modeX + modeW, modeY + modeH, MODE_RADIUS);
  ctx.arcTo(modeX + modeW, modeY + modeH, modeX, modeY + modeH, MODE_RADIUS);
  ctx.arcTo(modeX, modeY + modeH, modeX, modeY, MODE_RADIUS);
  ctx.arcTo(modeX, modeY, modeX + modeW, modeY, MODE_RADIUS);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = modeEnabled ? COLORS.btnText : 'rgba(255, 255, 255, 0.3)';
  ctx.font = `${modeFontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(modeText, modeX + modeW / 2, modeY + modeH * 0.65);

  // Disabled flash: brief red "X" on top of the button
  if (!modeEnabled && modeBtnFlashUntil > Date.now()) {
    const flashAlpha = Math.min(1, (modeBtnFlashUntil - Date.now()) / 200);
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const cx = modeX + modeW / 2;
    const cy = modeY + modeH * 0.65;
    const s = Math.max(8, modeH * 0.3);
    ctx.beginPath();
    ctx.moveTo(cx - s, cy - s);
    ctx.lineTo(cx + s, cy + s);
    ctx.moveTo(cx + s, cy - s);
    ctx.lineTo(cx - s, cy + s);
    ctx.stroke();
    ctx.restore();
  }

  state.modeBtn = { x: modeX, y: modeY, w: modeW, h: modeH };
}

// ── Piece rendering ────────────────────────────────────
function drawPieces() {
  const size = Math.min(CELL_W, CELL_H) * PIECE_SIZE_FRAC;

  for (let i = 0; i < 9; i++) {
    if (board[i] === '') continue;
    const { x, y } = cellCenter(i);

    // Win cell highlight
    if (winCells.includes(i)) {
      const cellX = SIDE_MARGIN + (i % GRID) * CELL_W;
      const cellY = TOP_MARGIN + Math.floor(i / GRID) * CELL_H;
      ctx.save();
      ctx.fillStyle = COLORS.highlight;
      ctx.fillRect(cellX, cellY, CELL_W, CELL_H);
      ctx.strokeStyle = COLORS.highlightBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(cellX + 1, cellY + 1, CELL_W - 2, CELL_H - 2);
      ctx.restore();
    }

    // Keyboard cursor highlight (only when canvas has focus and no win)
    if (focusedCell !== null && focusedCell === i && winCells.length === 0 && board[i] === '') {
      const cellX = SIDE_MARGIN + (i % GRID) * CELL_W;
      const cellY = TOP_MARGIN + Math.floor(i / GRID) * CELL_H;
      ctx.save();
      ctx.strokeStyle = COLORS.highlightBorder;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(cellX + 2, cellY + 2, CELL_W - 4, CELL_H - 4);
      ctx.restore();
    }

    if (board[i] === 'X') drawX(x, y, size);
    else drawO(x, y, size);
  }
}

// ── Full board render (calls sub-drawers) ──────────────
function drawBoard() {
  drawBackground();
  drawGlassPanel();
  drawGrid();
  drawPieces();
  drawUI();
}

// ── Game logic ─────────────────────────────────────────
function updateStatus() {
  const result = checkWin(board);
  if (result) {
    status = 'won';
    winner = result.winner;
    winCells = result.cells;
    announce(`Game over. ${winner} wins!`);
    currentPlayer = null; // game has ended, no current player
    if (winner === 'X') playWinSound();
    else playLoseSound();
  } else if (board.every((c) => c !== '')) {
    status = 'draw';
    announce("Game over. It's a draw!");
    playDrawSound();
  } else {
    announce(`${currentPlayer === 'X' ? 'O' : 'X'} goes next`);
  }

  // Shared cleanup for any game-over condition
  if (result || board.every((c) => c !== '')) {
    focusedCell = null;
  }
}

function aiMove() {
  if (status !== 'playing') return;
  const empty = getEmptyCells(board);
  if (empty.length === 0) return;

  let bestMove = empty[0];
  if (aiMode === 'doofus') {
    bestMove = empty[Math.floor(Math.random() * empty.length)];
  } else if (aiMode === 'bringit') {
    // Uses minimax but 50% of the time picks a random move instead
    if (Math.random() < 0.5) {
      bestMove = empty[Math.floor(Math.random() * empty.length)];
    } else {
      let bestScore = -Infinity;
      for (const i of empty) {
        board[i] = 'O';
        const score = minimax(board, false);
        board[i] = '';
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
  } else {
    // Terminator: perfect minimax
    let bestScore = -Infinity;
    for (const i of empty) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = '';
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  board[bestMove] = 'O';
  playClick();
  updateStatus();
  if (status === 'playing') {
    currentPlayer = 'X';
  }
  aiThinking = false;
  drawBoard();
}

// ── Shared game-action helpers ─────────────────────────

function placePiece(idx) {
  board[idx] = currentPlayer;
  playClick();
  updateStatus();
  if (status !== 'won' && status !== 'draw') {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  }
  drawBoard();
}

function triggerAI() {
  if (status === 'playing' && currentPlayer === 'O') {
    aiThinking = true;
    _aiTimer = setTimeout(() => {
      aiMove();
    }, AI_DELAY);
  }
}

// ── Initialization ──────────────────────────────────────
const MODE_BTN_FLASH_MS = 500;

let _aiTimer = 0; // 0 = no timer pending
let modeBtnFlashUntil = 0; // timestamp until which to show disabled flash

// ── Resize handling ────────────────────────────────────
let resizeTimer = 0; // 0 is falsy — clearTimeout(0) is a no-op

function init() {
  try { canvas.focus(); } catch (_) {}

  clearTimeout(_aiTimer);
  computeLayout();

  // Full render (rebuilds state.btn, state.modeBtn)
  drawBoard();

  // Announce initial state
  announce("Tic Tac Toe. Your turn (X).");

  // Reset disabled-mode flash when game is reset
  modeBtnFlashUntil = 0;

  // ── Click handler ────────────────────────────────────
  const clickHandler = function (e) {
    try {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // Reset button
      const btn = state.btn;
      if (btn && px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        clearTimeout(_aiTimer);
        _aiTimer = 0;
        modeBtnFlashUntil = 0;
        board = Array(9).fill('');
        currentPlayer = 'X';
        status = 'playing';
        winner = null;
        winCells = [];
        aiThinking = false;
        focusedCell = null;
        drawBoard();
        return;
      }

      // Block clicks during AI thinking
      if (aiThinking) return;

      // Mode selector (only when board is empty)
      const modeBtn = state.modeBtn;
      if (modeBtn && px >= modeBtn.x && px <= modeBtn.x + modeBtn.w && py >= modeBtn.y && py <= modeBtn.y + modeBtn.h) {
        if (board.every(c => c === '')) {
          cycleAiMode();
          drawBoard();
        } else {
          // Button disabled — brief visual feedback
          modeBtnFlashUntil = Date.now() + MODE_BTN_FLASH_MS;
          drawBoard();
        }
        return;
      }

      if (status !== 'playing') return;

      const idx = cellFromPoint(px, py);
      if (idx < 0 || board[idx] !== '') return;

      placePiece(idx);
      triggerAI();
    } catch (_) { /* click handler failure — game continues */ }
  };

  // Clean up previous handler before adding new one
  if (state.handler) {
    canvas.removeEventListener('click', state.handler);
  }
  state.handler = clickHandler;
  canvas.addEventListener('click', clickHandler);

  // ── Touch support ──────────────────────────────────────
  if (state._touchHandler) {
    canvas.removeEventListener('touchend', state._touchHandler);
  }
  const touchHandler = (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch || !state.handler) return;
    state.handler({ clientX: touch.clientX, clientY: touch.clientY });
  };
  canvas.addEventListener('touchend', touchHandler, { passive: false });
  state._touchHandler = touchHandler;

  // ── Keyboard support ──────────────────────────────────
  const keyHandler = (e) => {
    try {
      switch (e.key) {
        // Number keys 1–9 place a piece (row-major: 1→cell 0, 9→cell 8)
        case '1': case '2': case '3':
        case '4': case '5': case '6':
        case '7': case '8': case '9': {
          const idx = parseInt(e.key, 10) - 1;
          if (status === 'playing' && !aiThinking && board[idx] === '') {
            placePiece(idx);
            triggerAI();
          }
          break;
        }
        // Arrow keys move the cursor
        case 'ArrowUp': case 'ArrowDown':
        case 'ArrowLeft': case 'ArrowRight': {
          e.preventDefault();
          if (focusedCell === null) {
            focusedCell = 0;
          } else {
            const row = Math.floor(focusedCell / GRID);
            const col = focusedCell % GRID;
            if (e.key === 'ArrowUp') focusedCell = (row > 0) ? focusedCell - GRID : focusedCell;
            else if (e.key === 'ArrowDown') focusedCell = (row < GRID - 1) ? focusedCell + GRID : focusedCell;
            else if (e.key === 'ArrowLeft') focusedCell = (col > 0) ? focusedCell - 1 : focusedCell;
            else if (e.key === 'ArrowRight') focusedCell = (col < GRID - 1) ? focusedCell + 1 : focusedCell;
          }
          drawBoard();
          break;
        }
        // Enter/Space places at focused cell
        case 'Enter': case ' ': {
          e.preventDefault();
          if (status === 'playing' && !aiThinking && focusedCell !== null && board[focusedCell] === '') {
            placePiece(focusedCell);
            triggerAI();
          }
          break;
        }
        // Escape or M toggles AI mode (only on empty board)
        case 'Escape': case 'm': case 'M': {
          if (board.every(c => c === '')) {
            cycleAiMode();
            drawBoard();
          }
          break;
        }
      }
    } catch (_) { /* keyboard handler failure — game continues */ }
  };

  if (state.keyHandler) {
    canvas.removeEventListener('keydown', state.keyHandler);
  }
  state.keyHandler = keyHandler;
  canvas.addEventListener('keydown', keyHandler);
}

window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    try {
      computeLayout();
      drawBoard();
    } catch (_) { /* layout failure — game continues with last known layout */ }
  }, 100);
});

// ── Entry ──────────────────────────────────────────────
init();
