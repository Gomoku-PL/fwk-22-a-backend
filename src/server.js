import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import gamesRoutes from "./routes/games.routes.js";
import healthRoutes from "./routes/health.routes.js";
import consentRoutes from "./routes/consent.routes.js";
import consentAuditRoutes from "./routes/consentAudit.routes.js";
import { setupSocket } from "./socket/socketHandler.js";
import { connectMongoDB } from "./config/database.js";

const app = express();
const server = http.createServer(app);

// ---- CORS allow list
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

// Initialize database connection
await connectMongoDB();

// Routes
app.use("/api/games", gamesRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/consent/audit", consentAuditRoutes);
app.use(healthRoutes);

// Socket.IO with matching CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Wire sockets
setupSocket(io);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("CORS allowed origins:", allowedOrigins.join(", "));
});
