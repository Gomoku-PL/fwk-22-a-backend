import {
  getGameDTO,
  createGame,
  applyMove,
  undo,
} from "../services/game.service.js";

const isInt = (n) => Number.isInteger(n);

// GET /api/games/:id
export async function getGame(req, res) {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ error: "MISSING_ID", message: "game id required" });
    const dto = await getGameDTO(id);
    return res.status(200).json(dto);
  } catch (err) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.code, message: err.message });
    }
    console.error("getGame error:", err);
    return res
      .status(500)
      .json({ error: "INTERNAL", message: "Failed to fetch game" });
  }
}

// POST /api/games
export async function newGame(req, res) {
  try {
    const {
      size = 15,
      firstPlayer = "B",
      winLength = 5,
      allowOverlines = true,
    } = req.body || {};

    if (!isInt(size) || size < 5 || size > 25)
      return res
        .status(400)
        .json({ error: "INVALID_SIZE", message: "size 5–25" });
    if (!["B", "W"].includes(firstPlayer))
      return res
        .status(400)
        .json({ error: "INVALID_FIRST_PLAYER", message: "must be 'B' or 'W'" });
    if (!isInt(winLength) || winLength < 3 || winLength > size)
      return res
        .status(400)
        .json({ error: "INVALID_WIN_LENGTH", message: "3..size" });
    if (typeof allowOverlines !== "boolean")
      return res
        .status(400)
        .json({ error: "INVALID_OVERLINES", message: "boolean" });

    const dto = await createGame({
      size,
      firstPlayer,
      winLength,
      allowOverlines,
    });
    return res.status(201).json(dto);
  } catch (err) {
    console.error("newGame error:", err);
    return res
      .status(500)
      .json({ error: "INTERNAL", message: "Failed to create game" });
  }
}

// POST /api/games/:id/move
export async function makeMove(req, res) {
  try {
    const { id } = req.params;
    const { x, y } = req.body || {};
    if (!id)
      return res
        .status(400)
        .json({ error: "MISSING_ID", message: "game id required" });
    if (!isInt(x) || !isInt(y))
      return res
        .status(400)
        .json({ error: "INVALID_COORDS", message: "x,y integers" });

    const dto = await applyMove({ gameId: id, x, y });
    return res.status(200).json(dto);
  } catch (err) {
    switch (err.code) {
      case "NOT_FOUND":
        return res.status(404).json({ error: err.code, message: err.message });
      case "OUT_OF_BOUNDS":
      case "OCCUPIED":
      case "INVALID_STATE":
        return res.status(409).json({ error: err.code, message: err.message });
      case "BAD_REQUEST":
        return res.status(400).json({ error: err.code, message: err.message });
      default:
        console.error("makeMove error:", err);
        return res
          .status(500)
          .json({ error: "INTERNAL", message: "Failed to make move" });
    }
  }
}

// POST /api/games/:id/undo
export async function undoMove(req, res) {
  try {
    const { id } = req.params;
    const { steps = 1 } = req.body || {};
    if (!id)
      return res
        .status(400)
        .json({ error: "MISSING_ID", message: "game id required" });
    if (!isInt(steps) || steps < 1)
      return res
        .status(400)
        .json({ error: "INVALID_STEPS", message: "steps >= 1" });

    const dto = await undo({ gameId: id, steps });
    return res.status(200).json(dto);
  } catch (err) {
    switch (err.code) {
      case "NOT_FOUND":
        return res.status(404).json({ error: err.code, message: err.message });
      case "NOTHING_TO_UNDO":
        return res.status(409).json({ error: err.code, message: err.message });
      case "BAD_REQUEST":
        return res.status(400).json({ error: err.code, message: err.message });
      default:
        console.error("undoMove error:", err);
        return res
          .status(500)
          .json({ error: "INTERNAL", message: "Failed to undo move" });
    }
  }
}
