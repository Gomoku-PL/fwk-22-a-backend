// Demo script for MemoryDB Gomoku usage
const memorydb = require('./memorydb');

// --- Gomoku (Five in a Row) Example ---
// Define a new game
const newGame = memorydb.create('games', {
	players: ['Alice', 'Bob'],
	board: Array(15).fill(null).map(() => Array(15).fill(null)), // 15x15 empty board
	moves: [],
	status: 'in_progress',
	winner: null
});
console.log('Created Gomoku game:', newGame);

// Make a move (Alice places at [7,7])
newGame.board[7][7] = 'Alice';
newGame.moves.push({ player: 'Alice', x: 7, y: 7 });
memorydb.update('games', newGame.id, { board: newGame.board, moves: newGame.moves });
console.log('Game after Alice move:', memorydb.findById('games', newGame.id));

// Make a move (Bob places at [7,8])
newGame.board[7][8] = 'Bob';
newGame.moves.push({ player: 'Bob', x: 7, y: 8 });
memorydb.update('games', newGame.id, { board: newGame.board, moves: newGame.moves });
console.log('Game after Bob move:', memorydb.findById('games', newGame.id));

// End the game (Alice wins)
memorydb.update('games', newGame.id, { status: 'finished', winner: 'Alice' });
console.log('Game after finish:', memorydb.findById('games', newGame.id));

// List all games
console.log('All games:', memorydb.findAll('games'));
