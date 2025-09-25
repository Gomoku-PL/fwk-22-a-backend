import memorydb from "./memorydb.js";

const newGame = memorydb.create("games", {
  players: ["Alice", "Bob"],
  board: Array(15)
    .fill(null)
    .map(() => Array(15).fill(null)),
  moves: [],
  status: "in_progress",
  winner: null,
});
console.log("Created Gomoku game:", newGame);

newGame.board[7][7] = "Alice";
newGame.moves.push({ player: "Alice", x: 7, y: 7 });
memorydb.update("games", newGame.id, {
  board: newGame.board,
  moves: newGame.moves,
});
console.log("Game after Alice move:", memorydb.findById("games", newGame.id));
