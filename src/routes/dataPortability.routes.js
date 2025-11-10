// src/routes/dataPortability.routes.js
import express from "express";
import { exportUserData } from "../controllers/dataPortability.controller.js";
import { authenticate } from "../middleware/auth.js";
import { dataPortabilityValidation } from "../middleware/validation.js";

const router = express.Router();

// GET /api/data-portability?format=json|csv
router.get("/", authenticate, dataPortabilityValidation.export, exportUserData);

export default router;
