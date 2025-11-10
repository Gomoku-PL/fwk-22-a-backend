import { Router } from "express";
import {
  getGame,
  newGame,
  makeMove,
  undoMove,
} from "../controllers/games.controller.js";
import { gameValidation } from "../middleware/validation.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));
router.post("/", gameValidation.create, newGame); // POST /games
router.get("/:id", gameValidation.getById, getGame); // GET  /games/:id
router.post("/:id/moves", gameValidation.makeMove, makeMove); // POST /games/:id/moves
// optional tool for you while testing
router.post("/:id/undo", undoMove);

export default router;
