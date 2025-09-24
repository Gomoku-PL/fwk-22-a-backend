import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import { setupSocket } from "./socket/socketHandler.js";
import gamesRoutes from "./routes/games.routes.js"; // <-- add this import

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/games", gamesRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));


setupSocket(io);

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
