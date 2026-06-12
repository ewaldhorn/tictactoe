const canvas = document.getElementById('canvas');
if (!canvas) {
  document.body.innerHTML = '<p style="color:#fff;text-align:center;padding:40px;">Canvas element not found.</p>';
  throw new Error('Canvas element not found');
}
const ctx = canvas.getContext('2d');
if (!ctx) {
  document.body.innerHTML = '<p style="color:#fff;text-align:center;padding:40px;">2D canvas context not supported.</p>';
  throw new Error('Could not get 2D context');
}

// ── Audio ──────────────────────────────────────────────
let _audioCtx;

function getAudioCtx() {
  if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') return null;
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      _audioCtx = null;
      return null;
    }
  }
  return _audioCtx;
}

function playClick() {
  try {
    const audioCtx = getAudioCtx();
    if (!audioCtx) return;
    // Resume suspended context (browsers suspend until user gesture)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueTime(400, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.08);
    // Disconnect nodes to prevent garbage accumulation
    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch (_) {}
    }, 100);
  } catch (_) { /* audio blocked or unavailable — game continues silently */ }
}

// ── Constants ──────────────────────────────────────────
const W = 1000;
const H = 700;
const GRID = 3;

// Internal layout (computed from canvas size)
let TOP_MARGIN, BOTTOM_PAD, SIDE_MARGIN, GRID_W, GRID_H, CELL_W, CELL_H, LINE_W;

function computeLayout() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const cw = rect.width;
  const ch = rect.height;
  // Guard: skip layout if canvas has no visible size (e.g., display:none)
  if (cw <= 0 || ch <= 0) return;
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  ctx.scale(dpr, dpr);

  // margins scale with canvas
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
let aiMode = 'doofus'; // 'doofus' | 'terminator'

// ── Layout-dependent helpers (recalculated on resize) ──
let _cellCenter, _cellFromPoint, _drawBackground, _drawGlassPanel, _drawGrid;
let _drawX, _drawO, _drawBoard, _minimax, _aiMove;
let _checkWin, _updateStatus;
let _clickHandler;
let _aiTimer = null;

// Module-level state (replaces hacky draw._btn, canvas._handler, window._tictactoeDraw)
const state = {
  btn: null,
  handler: null,
  draw: null,
};

// ── Shared utilities ───────────────────────────────────
const _LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function getEmptyCells(b) {
  return b.map((v, i) => (v === '' ? i : -1)).filter((i) => i >= 0);
}

function checkWin(b) {
  for (const [a, c, d] of _LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return { winner: b[a], cells: [a, c, d] };
    }
  }
  return null;
}

// Minimax with depth-aware scoring (prefers faster wins, slower losses)
function minimax(b, isMaximizing, depth = 0) {
  const result = checkWin(b);
  if (result) return result.winner === 'O' ? 10 - depth : depth - 10;
  if (getEmptyCells(b).length === 0) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of getEmptyCells(b)) {
      b[i] = 'O';
      best = Math.max(best, minimax(b, false, depth + 1));
      b[i] = '';
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of getEmptyCells(b)) {
      b[i] = 'X';
      best = Math.min(best, minimax(b, true, depth + 1));
      b[i] = '';
    }
    return best;
  }
}

// ── Initialization ──────────────────────────────────────
function init() {
  computeLayout();

  _cellCenter = function (idx) {
    const col = idx % GRID;
    const row = Math.floor(idx / GRID);
    return {
      x: SIDE_MARGIN + col * CELL_W + CELL_W / 2,
      y: TOP_MARGIN + row * CELL_H + CELL_H / 2,
    };
  };

  _cellFromPoint = function (px, py) {
    const col = Math.floor((px - SIDE_MARGIN) / CELL_W);
    const row = Math.floor((py - TOP_MARGIN) / CELL_H);
    const idx = row * GRID + col;
    if (idx >= 0 && idx < 9) return idx;
    return -1;
  };

  _drawBackground = function () {
    const cw = canvas.width;
    const ch = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, COLORS.bg1);
    grad.addColorStop(0.5, COLORS.bg2);
    grad.addColorStop(1, COLORS.bg3);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.arc(cw * 0.2, ch * 0.3, cw * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ef0d5';
    ctx.beginPath();
    ctx.arc(cw * 0.8, ch * 0.7, cw * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(cw * 0.5, ch * 0.15, cw * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  _drawGlassPanel = function () {
    const x = SIDE_MARGIN - 15;
    const y = TOP_MARGIN - 15;
    const w = GRID_W + 30;
    const h = GRID_H + 30;
    const r = 16;

    ctx.save();
    ctx.shadowColor = COLORS.glassShadow;
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;

    ctx.fillStyle = COLORS.glass;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = COLORS.glassBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  };

  _drawGrid = function () {
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
  };

  _drawX = function (cx, cy, size) {
    ctx.save();
    ctx.shadowColor = COLORS.x;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = COLORS.x;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const half = size * 0.35;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy - half);
    ctx.lineTo(cx + half, cy + half);
    ctx.moveTo(cx + half, cy - half);
    ctx.lineTo(cx - half, cy + half);
    ctx.stroke();
    ctx.restore();
  };

  _drawO = function (cx, cy, size) {
    ctx.save();
    ctx.shadowColor = COLORS.o;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = COLORS.o;
    ctx.lineWidth = 6;
    const r = size * 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  _drawBoard = function () {
    const cw = canvas.width;
    const ch = canvas.height;

    _drawBackground();
    _drawGlassPanel();
    _drawGrid();

    for (let i = 0; i < 9; i++) {
      if (board[i] === '') continue;
      const { x, y } = _cellCenter(i);
      const size = Math.min(CELL_W, CELL_H) * 0.8;

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

      if (board[i] === 'X') _drawX(x, y, size);
      else _drawO(x, y, size);
    }

    const uiY = TOP_MARGIN + GRID_H + 40;
    const fontSize = Math.max(18, Math.min(28, CELL_W * 0.14));
    const btnFontSize = Math.max(13, Math.min(16, CELL_W * 0.08));

    ctx.fillStyle = COLORS.text;
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';

    let msg;
    if (status === 'won') {
      msg = `Player ${winner} Wins!`;
    } else if (status === 'draw') {
      msg = "It's a Draw!";
    } else if (currentPlayer === 'O') {
      msg = "AI is thinking...";
    } else {
      msg = "Your Turn (X)";
    }

    ctx.fillText(msg, cw / 2, uiY);

    const BTN_Y = uiY + 35;
    const BTN_W = Math.min(120, cw * 0.15);
    const BTN_H = Math.max(30, ch * 0.05);
    const BTN_X = cw / 2 - BTN_W / 2;
    const btnR = 8;

    ctx.save();
    ctx.fillStyle = COLORS.btnBg;
    ctx.strokeStyle = COLORS.btnBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BTN_X + btnR, BTN_Y);
    ctx.arcTo(BTN_X + BTN_W, BTN_Y, BTN_X + BTN_W, BTN_Y + BTN_H, btnR);
    ctx.arcTo(BTN_X + BTN_W, BTN_Y + BTN_H, BTN_X, BTN_Y + BTN_H, btnR);
    ctx.arcTo(BTN_X, BTN_Y + BTN_H, BTN_X, BTN_Y, btnR);
    ctx.arcTo(BTN_X, BTN_Y, BTN_X + BTN_W, BTN_Y, btnR);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = COLORS.btnText;
    ctx.font = `${btnFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('Reset', cw / 2, BTN_Y + BTN_H * 0.65);

    state.btn = { x: BTN_X, y: BTN_Y, w: BTN_W, h: BTN_H };

    // ── AI Mode Selector (bottom-right) ──────────────────
    const modeLabel = aiMode === 'terminator' ? 'Terminator' : 'Doofus';
    const modeText = 'AI MODE: ' + modeLabel;
    const modeFontSize = Math.max(11, Math.min(14, CELL_W * 0.07));
    const modePadX = 14;
    const modePadY = 8;
    const modeTextW = ctx.measureText(modeText).width;
    const modeW = modeTextW + modePadX * 2;
    const modeH = Math.max(26, ch * 0.04);

    const modeX = cw - SIDE_MARGIN - modeW;
    const modeY = ch - BOTTOM_PAD + 20;
    const modeR = 6;

    ctx.save();
    ctx.fillStyle = COLORS.btnBg;
    ctx.strokeStyle = COLORS.btnBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(modeX + modeR, modeY);
    ctx.arcTo(modeX + modeW, modeY, modeX + modeW, modeY + modeH, modeR);
    ctx.arcTo(modeX + modeW, modeY + modeH, modeX, modeY + modeH, modeR);
    ctx.arcTo(modeX, modeY + modeH, modeX, modeY, modeR);
    ctx.arcTo(modeX, modeY, modeX + modeW, modeY, modeR);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = COLORS.btnText;
    ctx.font = `${modeFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(modeText, modeX + modeW / 2, modeY + modeH * 0.65);

    state.modeBtn = { x: modeX, y: modeY, w: modeW, h: modeH };
  };

  _minimax = function (b, isMaximizing) {
    return minimax(b, isMaximizing);
  };

  _aiMove = function () {
    if (status !== 'playing') return;
    const empty = getEmptyCells(board);
    if (empty.length === 0) return;

    let bestMove;
    if (aiMode === 'doofus') {
      // Random move — sometimes blunders, sometimes lucky
      bestMove = empty[Math.floor(Math.random() * empty.length)];
    } else {
      // Terminator: perfect minimax
      let bestScore = -Infinity;
      for (const i of empty) {
        board[i] = 'O';
        const score = _minimax(board, false);
        board[i] = '';
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    board[bestMove] = 'O';
    playClick();
    _updateStatus();
    currentPlayer = 'X';
    aiThinking = false;
    _drawBoard();
  };

  _checkWin = function () {
    return checkWin(board);
  };

  _updateStatus = function () {
    const result = _checkWin();
    if (result) {
      status = 'won';
      winner = result.winner;
      winCells = result.cells;
    } else if (board.every((c) => c !== '')) {
      status = 'draw';
    }
  };

  _clickHandler = function (e) {
    try {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const btn = state.btn;
      if (btn && px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        clearTimeout(_aiTimer);
        _aiTimer = null;
        board = Array(9).fill('');
        currentPlayer = 'X';
        status = 'playing';
        winner = null;
        winCells = [];
        aiThinking = false;
        _drawBoard();
        return;
      }

      // P0: Block clicks during AI thinking
      if (aiThinking) return;

      // Handle mode selector click (only if no moves have been made)
      const modeBtn = state.modeBtn;
      if (modeBtn && px >= modeBtn.x && px <= modeBtn.x + modeBtn.w && py >= modeBtn.y && py <= modeBtn.y + modeBtn.h) {
        if (board.every(c => c === '')) {
          aiMode = aiMode === 'terminator' ? 'doofus' : 'terminator';
          _drawBoard();
        }
        return;
      }

      if (status !== 'playing') return;

      const idx = _cellFromPoint(px, py);
      if (idx < 0 || board[idx] !== '') return;

      board[idx] = currentPlayer;
      playClick();
      _updateStatus();
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      _drawBoard();

      if (status === 'playing' && currentPlayer === 'O') {
        aiThinking = true;
        _drawBoard();
        _aiTimer = setTimeout(() => {
          _aiMove();
        }, 300);
      }
    } catch (_) { /* click handler failure — game continues */ }
  };

  state.draw = _drawBoard;

  // Clean up previous handler before adding new one
  if (state.handler) {
    canvas.removeEventListener('click', state.handler);
  }
  state.handler = _clickHandler;
  canvas.addEventListener('click', _clickHandler);

  // ── Context loss recovery ──────────────────────────────
  canvas.addEventListener('webglcontextrestored', () => {
    _audioCtx = null;
    init();
  });

  _drawBoard();
}

// ── Resize handling ────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    try {
      computeLayout();
      if (state.draw) state.draw();
    } catch (_) { /* layout failure — game continues with last known layout */ }
  }, 100);
});

// ── Touch support ──────────────────────────────────────
const _touchHandler = (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  if (!touch || !state.handler) return;
  state.handler({ clientX: touch.clientX, clientY: touch.clientY });
};
canvas.addEventListener('touchend', _touchHandler, { passive: false });

// ── Entry ──────────────────────────────────────────────
init();
