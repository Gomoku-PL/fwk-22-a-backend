
const express = require("express");
const {
  newGame,
  makeMove,
  undoMove,
} = require("../controllers/games.controller");

const router = express.Router();

// Create a new game
// POST /api/games
router.post("/", newGame);

// Make a move
// POST /api/games/:id/moves
router.post("/:id/moves", makeMove);

// Undo last move(s)
// POST /api/games/:id/undo
router.post("/:id/undo", undoMove);

module.exports = router;
