import express from "express";
import { body, query } from "express-validator";
import {
  getRetentionStatus,
  triggerManualCleanup,
  updateRetentionConfig,
  generateRetentionReport,
  getRetentionLogs,
  testRetentionFunctionality,
} from "../controllers/dataRetention.controller.js";

const router = express.Router();

// Validation middleware
const retentionConfigValidation = [
  body("userData.inactive")
    .optional()
    .isInt({ min: 1, max: 3650 })
    .withMessage("Inactive user retention must be between 1 and 3650 days"),

  body("userData.deleted")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Deleted user retention must be between 1 and 365 days"),

  body("consentData.withdrawn")
    .optional()
    .isInt({ min: 365, max: 3650 })
    .withMessage(
      "Withdrawn consent retention must be between 365 and 3650 days",
    ),

  body("consentData.logs")
    .optional()
    .isInt({ min: 365, max: 3650 })
    .withMessage("Consent logs retention must be between 365 and 3650 days"),

  body("securityEvents.general")
    .optional()
    .isInt({ min: 90, max: 3650 })
    .withMessage("Security events retention must be between 90 and 3650 days"),

  body("securityEvents.breach")
    .optional()
    .isInt({ min: 365, max: 3650 })
    .withMessage("Security breach retention must be between 365 and 3650 days"),
];

const manualCleanupValidation = [
  body("targetTypes")
    .optional()
    .isArray()
    .withMessage("Target types must be an array"),

  body("targetTypes.*")
    .optional()
    .isIn(["all", "users", "consent", "logs", "security", "games"])
    .withMessage("Invalid target type specified"),
];

const reportValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (
        req.query.startDate &&
        new Date(value) <= new Date(req.query.startDate)
      ) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  query("includeDetails")
    .optional()
    .isBoolean()
    .withMessage("Include details must be a boolean value"),
];

const logsValidation = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000"),

  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer"),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
];

const testValidation = [
  body("testType")
    .optional()
    .isIn(["dry-run", "config-validation"])
    .withMessage("Invalid test type specified"),
];

router.get("/status", getRetentionStatus);
router.post("/cleanup", manualCleanupValidation, triggerManualCleanup);
router.put("/config", retentionConfigValidation, updateRetentionConfig);
router.get("/report", reportValidation, generateRetentionReport);
router.get("/logs", logsValidation, getRetentionLogs);
router.post("/test", testValidation, testRetentionFunctionality);

export default router;
