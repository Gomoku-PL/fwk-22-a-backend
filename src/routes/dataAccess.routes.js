// src/routes/dataAccess.routes.js
import express from "express";
import { getUserData } from "../controllers/dataAccess.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET /api/data-access
router.get("/", authenticate, getUserData);

export default router;
