import http from "http";
import https from "https";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { xssProtection } from "./middleware/xss.middleware.js";

import gamesRoutes from "./routes/games.routes.js";
import healthRoutes from "./routes/health.routes.js";
import consentRoutes from "./routes/consent.routes.js";
import consentAuditRoutes from "./routes/consentAudit.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dataRetentionRoutes from "./routes/dataRetention.routes.js";
import updateComplianceRoutes from "./routes/updateCompliance.routes.js";
import { setupSocket } from "./socket/socketHandler.js";
import { connectMongoDB } from "./config/database.js";
import dataRetentionService from "./services/dataRetention.service.js";
import updateComplianceService from "./services/updateCompliance.service.js";
import thirdPartyRouter from "./routes/thirdParty.routes.js";

const app = express();
// Optional HTTPS for local dev
let server;
if (process.env.BACKEND_HTTPS === "1") {
  const keyPath = process.env.HTTPS_KEY;
  const certPath = process.env.HTTPS_CERT;
  if (!keyPath || !certPath) {
    throw new Error(
      "BACKEND_HTTPS=1 set but HTTPS_KEY/HTTPS_CERT not provided in env"
    );
  }
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

// ---- CORS allow list
const allowedOrigins = [
  "http://localhost:5173", // Vite dev (HTTP)
  "https://localhost:5173", // Vite dev (HTTPS)
  "https://gomoku-pl.github.io", // GitHub Pages
];

// Apply CORS BEFORE routes
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser()); // For secure refresh token cookies

// XSS Protection middleware
app.use(
  xssProtection({
    sanitizeBody: true,
    sanitizeQuery: true,
    sanitizeParams: true,
    setHeaders: true,
  }),
);

// Initialize database connection
await connectMongoDB();

// Routes
app.use("/api", thirdPartyRouter);
app.use("/api/games", gamesRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/consent/audit", consentAuditRoutes);
app.use("/api/auth", authRoutes);
app.use("/admin/retention", dataRetentionRoutes);
app.use("/api/admin/compliance", updateComplianceRoutes);
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

// Initialize compliance update service
await updateComplianceService.initialize();

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  const scheme = process.env.BACKEND_HTTPS === "1" ? "https" : "http";
  console.log(`Server running on ${scheme}://localhost:${PORT}`);
  console.log("CORS allowed origins:", allowedOrigins.join(", "));
  console.log("Authentication system enabled with GDPR Article 32 compliance");
  console.log(
    "Data retention service active - GDPR Articles 5 & 17 compliance",
  );
  console.log("Compliance update service active - GDPR Article 24 compliance");
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop data retention service
  await dataRetentionService.stop();

  // Stop compliance update service
  await updateComplianceService.stop();

  // Close server
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force close after timeout
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
