// src/controllers/dataPortability.controller.js
import memorydb from "../models/memorydb.js";
import { Parser as Json2csvParser } from "json2csv";

// Helper: get all personal info for a user
function getPersonalData(userId) {
  // For demo: games where user is a player
  const games = memorydb
    .findAll("games")
    .filter((g) => g.players.includes(userId));
  // You can add more collections here (e.g., user profile, settings)
  return { userId, games };
}

// GET /api/data-portability?format=json|csv
export function exportUserData(req, res) {
  const userId = req.user?.id || "demo-user";
  const format = (req.query.format || "json").toLowerCase();
  const data = getPersonalData(userId);

  if (format === "csv") {
    // Flatten games for CSV
    const games = data.games.map((g) => ({
      id: g.id,
      players: g.players.join(";"),
      status: g.status,
      winner: g.winner,
      moves: JSON.stringify(g.moves),
      board: JSON.stringify(g.board),
    }));
    const parser = new Json2csvParser({ header: true });
    const csv = parser.parse(games);
    res.header("Content-Type", "text/csv");
    res.attachment(`gomoku-data-${userId}.csv`);
    return res.send(csv);
  }
  // Default: JSON
  res.header("Content-Type", "application/json");
  res.attachment(`gomoku-data-${userId}.json`);
  return res.send(JSON.stringify(data, null, 2));
}
