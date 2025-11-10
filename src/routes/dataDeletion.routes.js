import express from "express";
import { deleteUserData } from "../controllers/dataDeletion.controller.js";
import { dataDeletionValidation } from "../middleware/validation.js";

const router = express.Router();

// DELETE /api/data - Delete all user data
// TEMP: auth disabled for local testing. Re-enable authenticateToken when ready.
router.delete("/", dataDeletionValidation.delete, deleteUserData);

export default router;
