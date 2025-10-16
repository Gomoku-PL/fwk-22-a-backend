import express from "express";
import { body } from "express-validator";
import {
  getConsent,
  updateConsent,
  withdrawAllConsent,
  getConsentHistory,
  checkConsentForPurpose,
  getConsentStats,
  clearConsentData,
} from "../controllers/consent.controller.js";

const router = express.Router();

// Validation rules for consent updates
const consentValidation = [
  body("purposes").isObject().withMessage("Purposes must be an object"),
  body("purposes.marketing")
    .optional()
    .isBoolean()
    .withMessage("Marketing consent must be boolean"),
  body("purposes.analytics")
    .optional()
    .isBoolean()
    .withMessage("Analytics consent must be boolean"),
  body("purposes.personalization")
    .optional()
    .isBoolean()
    .withMessage("Personalization consent must be boolean"),
  body("purposes.thirdParty")
    .optional()
    .isBoolean()
    .withMessage("Third party consent must be boolean"),
];

// Routes
router.get("/", getConsent);
router.put("/", consentValidation, updateConsent);
router.delete("/", withdrawAllConsent);
router.get("/history", getConsentHistory);
router.get("/check/:purpose", checkConsentForPurpose);
router.get("/admin/stats", getConsentStats);
router.delete("/admin/clear", clearConsentData);

export default router;
