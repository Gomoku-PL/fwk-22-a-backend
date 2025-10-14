import ThirdPartyService from '../services/thirdParty.service.js';
import consentLogsService from '../services/consentLogs.service.js';

/**
 * Middleware for GDPR Article 46 compliance
 * Checks data transfers to third-party processors
 */
export const checkDataTransfer = (processorId) => {
  return async (req, res, next) => {
    try {
      const transferEvaluation = ThirdPartyService.evaluateTransfer(processorId, req.body);
      
      if (!transferEvaluation.allowed) {
        // Log the blocked transfer
        await consentLogsService.logConsentEvent({
          userId: req.user?.email || 'anonymous',
          eventType: 'consent_viewed',
          purposes: { data_transfer_blocked: true },
          consentMethod: 'system_check',
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent') || 'System',
          processingPurpose: `Data transfer blocked to processor ${processorId}: ${transferEvaluation.reason}`
        });

        // Use anonymized data instead
        req.body = transferEvaluation.data;
        req.dataTransferStatus = {
          allowed: false,
          reason: transferEvaluation.reason,
          anonymized: true
        };
      } else {
        req.dataTransferStatus = {
          allowed: true,
          reason: transferEvaluation.reason,
          anonymized: false
        };
      }
      
      next();
    } catch (error) {
      console.error('Data transfer check failed:', error);
      next();
    }
  };
};

export default { checkDataTransfer };