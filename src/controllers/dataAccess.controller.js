// src/controllers/dataAccess.controller.js
import memorydb from "../models/memorydb.js";

export function getUserData(req, res) {
  const userId = req.user?.id || "demo-user"; // fallback for testing

  // For demo, assume each user has "games" collection
  const games = memorydb
    .findAll("games")
    .filter((game) => game.players.includes(userId));

  res.json({
    ok: true,
    userId,
    games, // returns all games the user is part of
  });
}
