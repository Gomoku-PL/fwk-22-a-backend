import express from "express";
import cors from "cors";

// Routes
import gamesRoutes from "./routes/games.routes.js";
import healthRoutes from "./routes/health.routes.js";
import dataAccessRoutes from "./routes/dataAccess.routes.js";
import dataPortabilityRoutes from "./routes/dataPortability.routes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount routers
app.use("/api/data-access", dataAccessRoutes); // Your new data access endpoint
app.use("/api/data-portability", dataPortabilityRoutes); // Data portability endpoint
app.use("/api/games", gamesRoutes); // Game endpoints
app.use(healthRoutes); // Health check routes

// Simple health check (redundant if you already have /health in healthRoutes)
app.get("/health", (_req, res) => res.json({ ok: true }));

export default app;
