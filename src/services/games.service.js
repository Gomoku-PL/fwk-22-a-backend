// Simple in-memory store
const games = new Map();
let nextGameId = 1;

// Simple engine function to check for a win
function checkWin(board, lastMove) {
  // board = 2D array of "B", "W", null
  // lastMove = { x, y, player }
  const { x, y, player } = lastMove;
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ]; // horizontal, vertical, diagonal, anti-diagonal
  const size = board.length;

  for (const [dx, dy] of directions) {
    let count = 1;
    // check forward
    for (let step = 1; step < size; step++) {
      const nx = x + dx * step;
      const ny = y + dy * step;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) break;
      if (board[nx][ny] === player) count++;
      else break;
    }
    // check backward
    for (let step = 1; step < size; step++) {
      const nx = x - dx * step;
      const ny = y - dy * step;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) break;
      if (board[nx][ny] === player) count++;
      else break;
    }
    if (count >= 5) return true; // win detected
  }
  return false;
}

// Create a new game
export function createGame({ size = 15, firstPlayer = "B" } = {}) {
  const gameId = (nextGameId++).toString();
  const board = Array.from({ length: size }, () => Array(size).fill(null));
  const game = {
    gameId,
    board,
    nextPlayer: firstPlayer,
    status: "ongoing",
    winner: null,
    moves: [],
    updatedAt: Date.now(),
  };
  games.set(gameId, game);
  return game;
}

// Get a game by ID
export function getGame(id) {
  const game = games.get(id);
  if (!game) throw { code: "NOT_FOUND", message: "Game not found" };
  return game;
}

// Add a move to a game
export function addMove(id, { x, y }) {
  const game = getGame(id);
  if (game.status !== "ongoing") throw { code: "INVALID_STATE", message: "Game already finished" };
  if (x < 0 || y < 0 || x >= game.board.length || y >= game.board.length)
    throw { code: "OUT_OF_BOUNDS", message: "Move out of bounds" };
  if (game.board[x][y] !== null)
    throw { code: "OCCUPIED", message: "Cell already occupied" };

  const player = game.nextPlayer;
  game.board[x][y] = player;
  const move = { x, y, player, index: game.moves.length + 1, ts: Date.now() };
  game.moves.push(move);

  // Check for win
  if (checkWin(game.board, move)) {
    game.status = "won";
    game.winner = player;
  } else if (game.moves.length === game.board.length ** 2) {
    game.status = "draw";
    game.winner = null;
  } else {
    // Switch player
    game.nextPlayer = player === "B" ? "W" : "B";
  }

  game.updatedAt = Date.now();
  return game;
}
