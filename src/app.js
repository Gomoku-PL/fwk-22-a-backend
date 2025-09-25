import express from "express";
import cors from "cors";
import gamesRoutes from "./routes/games.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// mount your routes
app.use("/api/games", gamesRoutes);

// simple health
app.get("/health", (_req, res) => res.json({ ok: true }));

export default app;
