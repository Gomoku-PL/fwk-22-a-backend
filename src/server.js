import http from "http";
import { Server } from "socket.io";

import gamesRoutes from "./routes/games.routes.js";
import healthRoutes from "./routes/health.routes.js";
import { setupSocket } from "./socket/socketHandler.js";
import { connectMongoDB } from "./config/database.js";

const allowedOrigins = [
  "http://localhost:5173", // Vite dev
  "https://gomoku-pl.github.io", // GitHub Pages
];

// Apply CORS BEFORE routes
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);


app.use(express.json());

// Routes
app.use("/api/games", gamesRoutes);
app.use(healthRoutes); // expects this router to define e.g. GET /health

// Socket.IO with matching CORS
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
