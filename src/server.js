import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

import gamesRoutes from "./routes/games.routes.js";
import healthRoutes from "./routes/health.routes.js";
import consentRoutes from "./routes/consent.routes.js";
import consentAuditRoutes from "./routes/consentAudit.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dataRetentionRoutes from "./routes/dataRetention.routes.js";
import { setupSocket } from "./socket/socketHandler.js";
import { connectMongoDB } from "./config/database.js";
import dataRetentionService from "./services/dataRetention.service.js";
import thirdPartyRouter from "./routes/thirdParty.routes.js";

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
app.use(cookieParser()); // For secure refresh token cookies

// Initialize database connection
await connectMongoDB();

// Routes
app.use("/api", thirdPartyRouter);
app.use("/api/games", gamesRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/consent/audit", consentAuditRoutes);
app.use("/api/auth", authRoutes);
app.use("/admin/retention", dataRetentionRoutes);
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

// Initialize data retention service
await dataRetentionService.initialize();

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("CORS allowed origins:", allowedOrigins.join(", "));
  console.log("Authentication system enabled with GDPR Article 32 compliance");
  console.log(
    "Data retention service active - GDPR Articles 5 & 17 compliance"
  );
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop data retention service
  await dataRetentionService.stop();

  // Close server
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force close after timeout
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
