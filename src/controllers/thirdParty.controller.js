import ThirdPartyService from "../services/thirdParty.service.js";

export const listThirdParties = (req, res) => {
  const items = ThirdPartyService.listProcessors();
  return res.status(200).json({ 
    success: true, 
    processors: items,
    meta: {
      total: items.length,
      timestamp: new Date().toISOString(),
      gdprCompliance: "Articles 28 & 46"
    }
  });
};

export const getProcessorDetails = (req, res) => {
  const { processorId } = req.params;
  const processor = ThirdPartyService.getProcessorDetails(processorId);
  
  if (!processor) {
    return res.status(404).json({
      success: false,
      message: "Processor not found"
    });
  }

  return res.status(200).json({
    success: true,
    processor,
    complianceStatus: {
      gdprCompliant: processor.compliant,
      regionSafe: ThirdPartyService.isCountrySafe(processor.country, processor.safeguards),
      transferAllowed: processor.compliant && ThirdPartyService.isCountrySafe(processor.country, processor.safeguards)
    }
  });
};

export const getProcessorsByPurpose = (req, res) => {
  const { purpose } = req.params;
  const processors = ThirdPartyService.getProcessorsByPurpose(purpose);
  
  return res.status(200).json({
    success: true,
    purpose,
    processors,
    count: processors.length
  });
};

export const getComplianceReport = (req, res) => {
  const report = ThirdPartyService.getComplianceReport();
  
  return res.status(200).json({
    success: true,
    report,
    generatedAt: new Date().toISOString(),
    gdprArticles: ["Article 28 - Data processor obligations", "Article 46 - International transfers"]
  });
};

export const evaluateDataTransfer = (req, res) => {
  const { processorId } = req.params;
  const payload = req.body;
  
  const evaluation = ThirdPartyService.evaluateTransfer(processorId, payload);
  
  return res.status(200).json({
    success: true,
    evaluation,
    processorId,
    timestamp: new Date().toISOString()
  });
};
