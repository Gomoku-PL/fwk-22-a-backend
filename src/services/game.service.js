const { randomUUID } = require("node:crypto");
const engine = require("./engine");
const stateStore = require("./stateStore");

const next = (p) => (p === "B" ? "W" : "B");

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

function getGameDTO(gameId) {
  const game = stateStore.getGame(gameId);
  if (!game) {
    const e = new Error("Game not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  return toDTO(game);
}

async function createGame({ size, firstPlayer, winLength, allowOverlines }) {
  const id = randomUUID();
  const board = engine.createEmptyBoard(size);
  const now = Date.now();

  const game = {
    id,
    size,
    board,
    nextPlayer: firstPlayer,
    status: "ongoing",
    winner: null,
    winningLine: null,
    moves: [],
    config: { winLength, allowOverlines },
    createdAt: now,
    updatedAt: now,
  };

  stateStore.saveGame(game);
  return toDTO(game);
}

async function applyMove({ gameId, x, y }) {
  const game = stateStore.getGame(gameId);
  if (!game) {
    const e = new Error("Game not found");
    e.code = "NOT_FOUND";
    throw e;
  }
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
  let board;
  try {
    board = engine.placeStone(game.board, { x, y, player }); // returns NEW board
  } catch {
    const e = new Error("Bad request");
    e.code = "BAD_REQUEST";
    throw e;
  }

  const { winLength, allowOverlines } = game.config;
  const result = engine.checkWin(board, {
    x,
    y,
    player,
    winLength,
    allowOverlines,
  });

  const ts = Date.now();
  game.board = board;
  game.moves.push({ x, y, player, index: game.moves.length, ts });
  game.updatedAt = ts;

  if (result.winner) {
    game.status = "won";
    game.winner = result.winner;
    game.winningLine = result.line || null;
    game.nextPlayer = null;
  } else if (engine.isBoardFull(board)) {
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

  stateStore.saveGame(game);
  return toDTO(game);
}

async function undo({ gameId, steps = 1 }) {
  const game = stateStore.getGame(gameId);
  if (!game) {
    const e = new Error("Game not found");
    e.code = "NOT_FOUND";
    throw e;
  }
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

  const fresh = engine.createEmptyBoard(game.size);
  const replay = game.moves.slice(0, game.moves.length - toUndo);

  let board = fresh;
  for (const m of replay) {
    board = engine.placeStone(board, { x: m.x, y: m.y, player: m.player });
  }

  game.board = board;
  game.moves = replay;
  game.status = "ongoing";
  game.winner = null;
  game.winningLine = null;
  game.nextPlayer =
    replay.length === 0
      ? "B"
      : replay[replay.length - 1].player === "B"
      ? "W"
      : "B";
  game.updatedAt = Date.now();

  stateStore.saveGame(game);
  return { ...toDTO(game), undone: toUndo };
}

module.exports = { getGameDTO, createGame, applyMove, undo };
