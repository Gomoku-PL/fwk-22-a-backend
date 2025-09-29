
let rooms = {};

// Import validateMove
const validateMove = require("../utils/validateMove.js").default || require("../utils/validateMove.js");

// In-memory board state for demo (reset on server restart)
let boards = {};

export function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Player connected:", socket.id);

    socket.on("join", (roomId) => {
      socket.join(roomId);
      if (!rooms[roomId]) {
        rooms[roomId] = { players: [socket.id] };
        boards[roomId] = Array.from({ length: 15 }, () => Array(15).fill(null));
      } else {
        rooms[roomId].players.push(socket.id);
      }
      io.to(roomId).emit("roomData", rooms[roomId].players);
    });

    // Gomoku move handler
    socket.on("move", (move) => {
      const { roomId, row, col, player } = move;
      if (!roomId || typeof row !== "number" || typeof col !== "number") {
        socket.emit("moveResult", { valid: false, reason: "Invalid move data" });
        return;
      }
      // Initialize board if missing
      if (!boards[roomId]) {
        boards[roomId] = Array.from({ length: 15 }, () => Array(15).fill(null));
      }
      const board = boards[roomId];
      // Determine current/last player (simple demo logic)
      const flat = board.flat();
      const lastPlayer = flat.filter(Boolean).length % 2 === 0 ? "W" : "B";
      const currentPlayer = lastPlayer === "B" ? "W" : "B";
      // For demo, treat socket.id as player, but you may want to map to "B"/"W"
      // Here, alternate by join order
      const playerIndex = rooms[roomId]?.players?.indexOf(player);
      const playerColor = playerIndex === 0 ? "B" : "W";
      const result = validateMove({
        board,
        move: { row, col, player: playerColor },
        currentPlayer,
        lastPlayer,
      });
      socket.emit("moveResult", result);
      if (result.valid) {
        board[row][col] = playerColor;
        // Broadcast move to others
        socket.to(roomId).emit("move", { row, col, by: playerColor });
      }
    });

    socket.on("attack", ({ roomId, damage, attacker }) => {
      socket.to(roomId).emit("attacked", { damage, attacker });
    });

    socket.on("disconnect", () => {
      console.log("🔌 Player disconnected:", socket.id);
      for (const roomId in rooms) {
        rooms[roomId].players = rooms[roomId].players.filter((p) => p !== socket.id);
        io.to(roomId).emit("roomData", rooms[roomId].players);
      }
    });
  });
}
