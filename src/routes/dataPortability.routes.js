// src/routes/dataPortability.routes.js
import express from "express";
import { exportUserData } from "../controllers/dataPortability.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET /api/data-portability?format=json|csv
router.get("/", authenticate, exportUserData);

export default router;
