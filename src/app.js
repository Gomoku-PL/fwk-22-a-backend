
const express = require("express");
const cors = require("cors");

const gamesRoutes = require("./routes/games.routes"); 

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/games", gamesRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

module.exports = app;
