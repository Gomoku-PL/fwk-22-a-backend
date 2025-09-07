let rooms = {};

export function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Ny spelare ansluten:", socket.id);

    socket.on("join", (roomId) => {
      socket.join(roomId);
      console.log(`${socket.id} gick med i rum ${roomId}`);

      if (!rooms[roomId]) {
        rooms[roomId] = {
          players: [socket.id],
        };
      } else {
        rooms[roomId].players.push(socket.id);
      }

      io.to(roomId).emit("roomData", rooms[roomId].players);

      if (rooms[roomId].players.length === 2) {
        io.to(roomId).emit("startGame");
      }
    });

    socket.on("attack", ({ roomId, damage, attacker }) => {
      socket.to(roomId).emit("attacked", { damage, attacker });
    });

    socket.on("disconnect", () => {
      console.log(" Spelare kopplade från:", socket.id);
      for (const roomId in rooms) {
        rooms[roomId].players = rooms[roomId].players.filter((p) => p !== socket.id);
        io.to(roomId).emit("roomData", rooms[roomId].players);
      }
    });
  });
}
