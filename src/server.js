import http from "http";
import { Server } from "socket.io";
import app from "./app.js"; // ✅ this already includes express + routes
import { setupSocket } from "./socket/socketHandler.js";

const allowedOrigins = [
  "http://localhost:5173", // Vite dev
  "https://gomoku-pl.github.io", // GitHub Pages
];

const server = http.createServer(app);

// ✅ Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ✅ Wire sockets
setupSocket(io);

// ✅ Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log("CORS allowed origins:", allowedOrigins.join(", "));
});
