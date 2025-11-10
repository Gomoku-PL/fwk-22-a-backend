import { Router } from "express";
import {
  listThirdParties,
  getProcessorDetails,
  getProcessorsByPurpose,
  getComplianceReport,
  evaluateDataTransfer,
} from "../controllers/thirdParty.controller.js";
import { thirdPartyValidation } from "../middleware/validation.js";

const router = Router();

// Public endpoints for transparency
router.get("/third-parties", listThirdParties);
router.get("/third-parties/:processorId", getProcessorDetails);
router.get("/third-parties/purpose/:purpose", getProcessorsByPurpose);
router.get("/third-parties/compliance/report", getComplianceReport);

// Admin endpoint for testing data transfers
router.post("/third-parties/:processorId/evaluate", evaluateDataTransfer);

export default router;
