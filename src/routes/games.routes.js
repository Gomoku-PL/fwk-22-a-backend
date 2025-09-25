import { Router } from "express";
import {
  getGame,
  newGame,
  makeMove,
  undoMove,
} from "../controllers/games.controller.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

// Create a new game: POST /api/games
router.post("/", newGame);

// Get a game: GET /api/games/:id
router.get("/:id", getGame);

// Make a move: POST /api/games/:id/move
router.post("/:id/move", makeMove);

// Undo move(s): POST /api/games/:id/undo
router.post("/:id/undo", undoMove);

export default router;
