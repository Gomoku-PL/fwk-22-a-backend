import { randomUUID } from "node:crypto";

// ===== In-memory state =====
const games = new Map();

// ===== Engine helpers =====
const createEmptyBoard = (size) =>
  Array.from({ length: size }, () => Array(size).fill(null));

const cloneBoard = (b) => b.map((row) => row.slice());

const isBoardFull = (board) => board.every((r) => r.every((c) => c !== null));

const placeStone = (board, { x, y, player }) => {
  const b = cloneBoard(board);
  if (b[y][x] !== null) throw new Error("OCCUPIED");
  b[y][x] = player;
  return b;
};

function countDir(board, x, y, dx, dy, player) {
  let n = 0;
  let cx = x + dx,
    cy = y + dy;
  while (
    cy >= 0 &&
    cy < board.length &&
    cx >= 0 &&
    cx < board.length &&
    board[cy][cx] === player
  ) {
    n++;
    cx += dx;
    cy += dy;
  }
  return n;
}

function checkWin(board, { x, y, player, winLength, allowOverlines }) {
  const dirs = [
    [1, 0], // horizontal
    [0, 1], // vertical
    [1, 1], // diag ↘
    [1, -1], // diag ↗
  ];
  for (const [dx, dy] of dirs) {
    const total =
      1 +
      countDir(board, x, y, dx, dy, player) +
      countDir(board, x, y, -dx, -dy, player);
    if (allowOverlines ? total >= winLength : total === winLength) {
      // Build a simple winning line (not critical; optional)
      return { winner: player, line: null };
    }
  }
  return { winner: null, line: null };
}

const next = (p) => (p === "B" ? "W" : "B");

// ===== DTO & helpers =====
function toDTO(game) {
  return {
    gameId: game.id,
    size: game.size,
    board: game.board,
    nextPlayer: game.nextPlayer,
    status: game.status,
    winner: game.winner || null,
    winningLine: game.winningLine || null,
    moves: game.moves,
    config: game.config,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
  };
}

function requireGame(gameId) {
  const game = games.get(gameId);
  if (!game) {
    const e = new Error("Game not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  return game;
}

// ===== Service API =====
function getGameDTO(gameId) {
  return toDTO(requireGame(gameId));
}

async function createGame({ size, firstPlayer, winLength, allowOverlines }) {
  const id = randomUUID();
  const now = Date.now();

  const game = {
    id,
    size,
    board: createEmptyBoard(size),
    nextPlayer: firstPlayer,
    status: "ongoing",
    winner: null,
    winningLine: null,
    moves: [],
    config: { winLength, allowOverlines },
    createdAt: now,
    updatedAt: now,
  };

  games.set(id, game);
  return toDTO(game);
}

async function applyMove({ gameId, x, y }) {
  const game = requireGame(gameId);

  if (game.status !== "ongoing") {
    const e = new Error(`Game is ${game.status}`);
    e.code = "INVALID_STATE";
    throw e;
  }
  if (x < 0 || y < 0 || x >= game.size || y >= game.size) {
    const e = new Error("Move out of bounds");
    e.code = "OUT_OF_BOUNDS";
    throw e;
  }
  if (game.board[y][x] !== null) {
    const e = new Error("Cell already occupied");
    e.code = "OCCUPIED";
    throw e;
  }

  const player = game.nextPlayer;
  const board = placeStone(game.board, { x, y, player });

  const { winLength, allowOverlines } = game.config;
  const result = checkWin(board, { x, y, player, winLength, allowOverlines });

  const ts = Date.now();
  game.board = board;
  game.moves.push({ x, y, player, index: game.moves.length, ts });
  game.updatedAt = ts;

  if (result.winner) {
    game.status = "won";
    game.winner = result.winner;
    game.winningLine = result.line || null;
    game.nextPlayer = null;
  } else if (isBoardFull(board)) {
    game.status = "draw";
    game.winner = null;
    game.winningLine = null;
    game.nextPlayer = null;
  } else {
    game.status = "ongoing";
    game.winner = null;
    game.winningLine = null;
    game.nextPlayer = next(player);
  }

  return toDTO(game);
}

async function undo({ gameId, steps = 1 }) {
  const game = requireGame(gameId);

  if (steps < 1) {
    const e = new Error("steps must be >= 1");
    e.code = "BAD_REQUEST";
    throw e;
  }
  if (game.moves.length === 0) {
    const e = new Error("No moves to undo");
    e.code = "NOTHING_TO_UNDO";
    throw e;
  }

  const toUndo = Math.min(steps, game.moves.length);

  // Rebuild from scratch
  const fresh = createEmptyBoard(game.size);
  const replay = game.moves.slice(0, game.moves.length - toUndo);

  let board = fresh;
  for (const m of replay) {
    board = placeStone(board, { x: m.x, y: m.y, player: m.player });
  }

  game.board = board;
  game.moves = replay;
  game.status = "ongoing";
  game.winner = null;
  game.winningLine = null;
  game.nextPlayer =
    replay.length === 0 ? "B" : next(replay[replay.length - 1].player);
  game.updatedAt = Date.now();

  return { ...toDTO(game), undone: toUndo };
}

export { getGameDTO, createGame, applyMove, undo };
