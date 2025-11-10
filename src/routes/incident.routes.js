/**
 * Incident Management Routes
 * GDPR Articles 33 & 34 - Data Breach Notification
 */

import express from "express";
import {
  registerIncident,
  getAllIncidents,
  getIncidentById,
  updateIncident,
  notifyUsers,
  notifyAuthority,
  getIncidentStats,
} from "../controllers/incident.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { auditSensitiveOperation } from "../middleware/security.js";

const router = express.Router();

/**
 * All incident routes require authentication
 * Admin-only access should be enforced by additional middleware
 */

/**
 * @route   POST /api/incidents
 * @desc    Register a new security incident
 * @access  Private (Admin)
 */
router.post(
  "/",
  authenticateToken,
  auditSensitiveOperation("incident_register"),
  registerIncident
);

/**
 * @route   GET /api/incidents
 * @desc    Get all security incidents with optional filters
 * @access  Private (Admin)
 */
router.get(
  "/",
  authenticateToken,
  auditSensitiveOperation("incident_list"),
  getAllIncidents
);

/**
 * @route   GET /api/incidents/stats
 * @desc    Get incident statistics
 * @access  Private (Admin)
 */
router.get(
  "/stats",
  authenticateToken,
  auditSensitiveOperation("incident_stats"),
  getIncidentStats
);

/**
 * @route   GET /api/incidents/:id
 * @desc    Get incident by ID
 * @access  Private (Admin)
 */
router.get(
  "/:id",
  authenticateToken,
  auditSensitiveOperation("incident_view"),
  getIncidentById
);

/**
 * @route   PATCH /api/incidents/:id
 * @desc    Update incident status and resolution
 * @access  Private (Admin)
 */
router.patch(
  "/:id",
  authenticateToken,
  auditSensitiveOperation("incident_update"),
  updateIncident
);

/**
 * @route   POST /api/incidents/:id/notify-users
 * @desc    Notify affected users about the incident
 * @access  Private (Admin)
 */
router.post(
  "/:id/notify-users",
  authenticateToken,
  auditSensitiveOperation("incident_notify_users"),
  notifyUsers
);

/**
 * @route   POST /api/incidents/:id/notify-authority
 * @desc    Notify data protection authority
 * @access  Private (Admin)
 */
router.post(
  "/:id/notify-authority",
  authenticateToken,
  auditSensitiveOperation("incident_notify_authority"),
  notifyAuthority
);

export default router;
