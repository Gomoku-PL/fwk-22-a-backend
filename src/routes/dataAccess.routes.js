// src/routes/dataAccess.routes.js
import express from "express";
import { getUserData } from "../controllers/dataAccess.controller.js";
import { authenticate } from "../middleware/auth.js";
import { dataAccessValidation } from "../middleware/validation.js";

const router = express.Router();

// GET /api/data-access
router.get("/", authenticate, dataAccessValidation.get, getUserData);

export default router;
