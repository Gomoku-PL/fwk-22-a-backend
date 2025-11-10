import { Router } from "express";
import { getConnectionStatus } from "../config/database.js";

const router = Router();

router.get("/health", (req, res) => {
  console.log("Health endpoint hit");
  
  const dbStatus = getConnectionStatus();
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    storage: {
      configured: dbStatus.configured,
      actual: dbStatus.actual,
      connected: dbStatus.connected,
      fallbackActive: dbStatus.configured === "mongodb" && dbStatus.actual === "memory",
    },
  };
  
  res.json(health);
});

export default router;
