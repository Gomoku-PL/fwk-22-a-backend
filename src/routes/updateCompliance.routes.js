import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  getComplianceStatus,
  performManualCheck,
  checkUpdates,
  applyUpdates,
  generateAuditReport,
  updateConfiguration,
  getComplianceHistory,
} from "../controllers/updateCompliance.controller.js";
import { updateComplianceValidation } from "../middleware/validation.js";

const router = express.Router();

// All compliance update routes require authentication
router.use(authenticateToken);

/**
 * @route GET /api/admin/compliance/status
 * @desc Get current compliance status and configuration
 * @access Private (Admin)
 */
router.get("/status", getComplianceStatus);

/**
 * @route POST /api/admin/compliance/check
 * @desc Trigger manual compliance check
 * @access Private (Admin)
 */
router.post("/check", performManualCheck);

/**
 * @route GET /api/admin/compliance/updates
 * @desc Check for available compliance updates
 * @access Private (Admin)
 */
router.get("/updates", checkUpdates);

/**
 * @route POST /api/admin/compliance/apply
 * @desc Apply selected compliance updates
 * @access Private (Admin)
 */
router.post("/apply", applyUpdates);

/**
 * @route GET /api/admin/compliance/audit
 * @desc Generate compliance audit report
 * @access Private (Admin)
 */
router.get("/audit", generateAuditReport);

/**
 * @route PUT /api/admin/compliance/config
 * @desc Update compliance configuration
 * @access Private (Admin)
 */
router.put("/config", updateConfiguration);

/**
 * @route GET /api/admin/compliance/history
 * @desc Get compliance update history
 * @access Private (Admin)
 */
router.get("/history", getComplianceHistory);

export default router;
