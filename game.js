/* Bleeding3 — an infinite-board take on tic-tac-toe.
 *
 * Pieces live on an infinite integer grid (logical coords r,c). The only
 * constraint is that every placed piece must fit inside some 3x3 window.
 * A 5x5 display window auto-centers on the pieces so there is always one
 * ring of room to grow/slide the "imaginary" 3x3 board around. */

const OWNERS = ["white", "black"]; // white = bone, black = wood
const LABEL = { white: "Bone", black: "Wood" };
const PIECES_PER_PLAYER = 3;
const STORE_KEY = "bleeding3-scores";

let state;
let nextId = 0;
const els = {}; // id -> piece DOM element

/* ---------- DOM refs ---------- */
const $ = (id) => document.getElementById(id);
const grid = $("grid");
const piecesLayer = $("pieces");
const statusEl = $("status");

/* ---------- Rules helpers ---------- */

function bbox(list) {
  if (!list.length) return null;
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const p of list) {
    minR = Math.min(minR, p.r); maxR = Math.max(maxR, p.r);
    minC = Math.min(minC, p.c); maxC = Math.max(maxC, p.c);
  }
  return { minR, maxR, minC, maxC };
}

// All pieces must fit within a 3x3 window.
function fits3x3(list) {
  const b = bbox(list);
  if (!b) return true;
  return (b.maxR - b.minR) <= 2 && (b.maxC - b.minC) <= 2;
}

function pieceAt(r, c) {
  return state.pieces.find((p) => p.r === r && p.c === c);
}

// 3 pieces win when they are adjacent and collinear (row, column or diagonal).
function isLine(pts) {
  if (pts.length < PIECES_PER_PLAYER) return false;
  const s = [...pts].sort((a, b) => a.r - b.r || a.c - b.c);
  const dr = s[1].r - s[0].r, dc = s[1].c - s[0].c;
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) return false;
  return s[2].r - s[1].r === dr && s[2].c - s[1].c === dc;
}

function piecesOf(owner) {
  return state.pieces.filter((p) => p.owner === owner);
}

// Display delta so the bounding box is centered on the 5x5 grid (cell 2,2).
function centerDelta() {
  const b = bbox(state.pieces);
  if (!b) return { r: 2, c: 2 };
  return {
    r: Math.round(2 - (b.minR + b.maxR) / 2),
    c: Math.round(2 - (b.minC + b.maxC) / 2),
  };
}

/* ---------- Move validity ---------- */

// During placement: a cell is valid if empty and keeps everyone within 3x3.
function canPlace(r, c) {
  if (pieceAt(r, c)) return false;
  return fits3x3([...state.pieces, { r, c }]);
}

// During move: target empty, different cell, others+target fit 3x3.
function canMoveTo(piece, r, c) {
  if (pieceAt(r, c)) return false;
  if (piece.r === r && piece.c === c) return false;
  const others = state.pieces.filter((p) => p !== piece);
  return fits3x3([...others, { r, c }]);
}

/* ---------- Game flow ---------- */

function newGame() {
  state = {
    pieces: [],
    turn: "white",
    pending: { white: PIECES_PER_PLAYER, black: PIECES_PER_PLAYER },
    selectedId: null,
    moves: 0,
    winner: null,
  };
  nextId = 0;
  delta = { r: 2, c: 2 };
  for (const k of Object.keys(els)) delete els[k];
  piecesLayer.innerHTML = "";
  render();
}

function inPlacePhase() {
  return state.pending.white > 0 || state.pending.black > 0;
}

function other(owner) {
  return owner === "white" ? "black" : "white";
}

function afterTurn() {
  state.moves++;
  // Win check for the player who just acted.
  if (isLine(piecesOf(state.turn))) {
    state.winner = state.turn;
    render();
    showWin();
    return;
  }
  state.selectedId = null;
  state.turn = other(state.turn);
  render();
}

function handleCellClick(r, c) {
  if (state.winner) return;

  if (inPlacePhase()) {
    if (state.pending[state.turn] <= 0) return; // safety
    if (!canPlace(r, c)) return;
    state.pieces.push({ id: nextId++, owner: state.turn, r, c });
    state.pending[state.turn]--;
    afterTurn();
    return;
  }

  // Move phase.
  const here = pieceAt(r, c);
  if (here && here.owner === state.turn) {
    state.selectedId = state.selectedId === here.id ? null : here.id;
    render();
    return;
  }
  if (state.selectedId == null) return;
  const sel = state.pieces.find((p) => p.id === state.selectedId);
  if (!sel || !canMoveTo(sel, r, c)) return;
  sel.r = r;
  sel.c = c;
  afterTurn();
}

/* ---------- Rendering ---------- */

function buildGrid() {
  grid.innerHTML = "";
  for (let dr = 0; dr < 5; dr++) {
    for (let dc = 0; dc < 5; dc++) {
      const cell = document.createElement("div");
      const inner = dr >= 1 && dr <= 3 && dc >= 1 && dc <= 3;
      cell.className = "gcell" + (inner ? " inner" : "");
      cell.addEventListener("click", () => onGridClick(dr, dc));
      grid.appendChild(cell);
    }
  }
}

let delta = { r: 2, c: 2 };

function onGridClick(dr, dc) {
  handleCellClick(dr - delta.r, dc - delta.c);
}

// True while the current delta keeps every piece inside the visible inner 3x3.
function fitsInner(d) {
  return state.pieces.every((p) => {
    const dr = p.r + d.r, dc = p.c + d.c;
    return dr >= 1 && dr <= 3 && dc >= 1 && dc <= 3;
  });
}

function render() {
  // Only recenter when a piece has drifted out of the inner 3x3 — otherwise
  // leave the board put so it doesn't jump after every move.
  if (!fitsInner(delta)) delta = centerDelta();

  // Pieces (persistent elements -> smooth transitions).
  const live = new Set();
  for (const p of state.pieces) {
    live.add(p.id);
    let el = els[p.id];
    if (!el) {
      el = document.createElement("div");
      el.innerHTML = '<div class="face"></div>';
      piecesLayer.appendChild(el);
      els[p.id] = el;
    }
    el.className = "piece " + p.owner + (p.id === state.selectedId ? " selected" : "");
    el.style.setProperty("--dr", p.r + delta.r);
    el.style.setProperty("--dc", p.c + delta.c);
  }
  for (const id of Object.keys(els)) {
    if (!live.has(Number(id))) { els[id].remove(); delete els[id]; }
  }

  // Target highlights (move phase, when a piece is selected).
  const sel = state.selectedId != null
    ? state.pieces.find((p) => p.id === state.selectedId) : null;
  const cells = grid.children;
  for (let i = 0; i < cells.length; i++) {
    const dr = Math.floor(i / 5), dc = i % 5;
    const r = dr - delta.r, c = dc - delta.c;
    const ok = sel && !state.winner && canMoveTo(sel, r, c);
    cells[i].classList.toggle("target", !!ok);
  }

  renderTrays();
  renderStatus();
}

function renderTrays() {
  for (const owner of OWNERS) {
    const tray = $("tray-" + owner);
    tray.innerHTML = "";
    for (let i = 0; i < state.pending[owner]; i++) {
      const pip = document.createElement("div");
      pip.className = "pending " + owner;
      pip.innerHTML = '<div class="face"></div>';
      tray.appendChild(pip);
    }
    $("player-" + owner).classList.toggle(
      "active", !state.winner && state.turn === owner
    );
  }
}

function renderStatus() {
  if (state.winner) {
    statusEl.textContent = `${LABEL[state.winner]} wins!`;
    return;
  }
  const who = LABEL[state.turn];
  if (inPlacePhase()) {
    statusEl.textContent = `${who} to place (${state.pending[state.turn]} left)`;
  } else {
    statusEl.textContent = state.selectedId == null
      ? `${who} to move — select a piece`
      : `${who} — tap a highlighted cell`;
  }
}

/* ---------- Win dialog + scoreboard ---------- */

function showWin() {
  $("winTitle").textContent = `${LABEL[state.winner]} wins!`;
  $("winSub").innerHTML = `Won in <strong>${state.moves}</strong> placements.`;
  $("winnerName").value = LABEL[state.winner];
  $("winDialog").showModal();
}

function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}

function saveScore(name, placements) {
  const scores = loadScores();
  scores.push({ name: name || "—", placements, date: new Date().toISOString() });
  scores.sort((a, b) => a.placements - b.placements);
  localStorage.setItem(STORE_KEY, JSON.stringify(scores.slice(0, 50)));
}

function renderScores() {
  const list = $("scoreList");
  const scores = loadScores();
  list.innerHTML = "";
  if (!scores.length) {
    list.innerHTML = '<li class="empty">No games yet — go win one.</li>';
    return;
  }
  for (const s of scores) {
    const li = document.createElement("li");
    const when = new Date(s.date).toLocaleDateString();
    li.innerHTML = `${s.name} — <span class="pl">${s.placements}</span> <small>(${when})</small>`;
    list.appendChild(li);
  }
}

/* ---------- Wire up ---------- */

$("winForm").addEventListener("submit", () => {
  saveScore($("winnerName").value.trim(), state.moves);
  newGame();
});
$("newGameBtn").addEventListener("click", newGame);
$("scoresBtn").addEventListener("click", () => {
  renderScores();
  $("scoresDialog").showModal();
});
$("closeScores").addEventListener("click", () => $("scoresDialog").close());
$("clearScores").addEventListener("click", () => {
  localStorage.removeItem(STORE_KEY);
  renderScores();
});

buildGrid();
newGame();
