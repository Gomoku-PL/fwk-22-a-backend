import express from "express";
import {
  getConsent,
  updateConsent,
  withdrawAllConsent,
  getConsentHistory,
  checkConsentForPurpose,
  getConsentStats,
  clearConsentData,
} from "../controllers/consent.controller.js";
import { consentValidation } from "../middleware/validation.js";

const router = express.Router();

// Routes
router.get("/", getConsent);
router.put("/", consentValidation.update, updateConsent);
router.delete("/", withdrawAllConsent);
router.get("/history", getConsentHistory);
router.get("/check/:purpose", checkConsentForPurpose);
router.get("/admin/stats", getConsentStats);
router.delete("/admin/clear", clearConsentData);

export default router;
