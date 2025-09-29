/**
 * Validates a move in Gomoku.
 * @param {Object} params
 * @param {Array<Array<string|null>>} params.board - 2D array representing the board
 * @param {Object} params.move - { row, col, player }
 * @param {string} params.currentPlayer - 'B' or 'W'
 * @param {string} params.lastPlayer - 'B' or 'W'
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateMove({ board, move, currentPlayer, lastPlayer }) {
	const size = board.length;
	const { row, col, player } = move;
	// Check bounds
	if (row < 0 || row >= size || col < 0 || col >= size) {
		return { valid: false, reason: 'Move out of bounds' };
	}
	// Check emptiness
	if (board[row][col] !== null) {
		return { valid: false, reason: 'Cell is already occupied' };
	}
	// Check turn
	if (player !== currentPlayer) {
		return { valid: false, reason: 'Not your turn' };
	}
	if (lastPlayer === player) {
		return { valid: false, reason: 'Cannot move twice in a row' };
	}
	return { valid: true };
}

export default validateMove;
