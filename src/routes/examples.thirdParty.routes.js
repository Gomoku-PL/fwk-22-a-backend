// Example usage of third-party data transfer middleware

import { Router } from "express";
import { checkDataTransfer } from "../middleware/dataTransfer.middleware.js";

const router = Router();

// Example: Analytics data that goes to Acme Analytics (Sweden - safe)
router.post("/analytics/track", 
  checkDataTransfer("analytics-01"), 
  (req, res) => {
    // req.dataTransferStatus contains transfer evaluation
    console.log("Transfer status:", req.dataTransferStatus);
    
    if (req.dataTransferStatus.anonymized) {
      console.log("Data was anonymized for transfer");
    }
    
    res.json({ 
      success: true, 
      message: "Analytics data processed",
      transferStatus: req.dataTransferStatus
    });
  }
);

// Example: Email service that goes to MailMagic (US - safe with SCC)
router.post("/email/send", 
  checkDataTransfer("email-01"), 
  (req, res) => {
    res.json({ 
      success: true, 
      message: "Email queued for sending",
      transferStatus: req.dataTransferStatus
    });
  }
);

// Example: Storage that goes to CloudBox (Russia - unsafe, will be anonymized)
router.post("/storage/backup", 
  checkDataTransfer("storage-01"), 
  (req, res) => {
    res.json({ 
      success: true, 
      message: "Data backed up (anonymized for compliance)",
      transferStatus: req.dataTransferStatus
    });
  }
);

export default router;