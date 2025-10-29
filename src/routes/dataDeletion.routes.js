import express from "express";
import { deleteUserData } from "../controllers/dataDeletion.controller.js";

const router = express.Router();

// DELETE /api/data - Delete all user data
// TEMP: auth disabled for local testing. Re-enable authenticateToken when ready.
router.delete("/", deleteUserData);

export default router;
