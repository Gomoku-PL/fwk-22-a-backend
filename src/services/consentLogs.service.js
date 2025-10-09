import ConsentLogsModel from '../models/consentLogs.model.js';
import consentLogsDb from '../models/consentLogsdb.js';
import { isUsingMongoDB } from '../config/database.js';

/**
 * Unified Consent Logs Service
 * GDPR Article 30 compliance - audit logging
 */
class ConsentLogsService {
  /**
   * Log consent event
   */
  async logConsentEvent(eventData) {
    try {
      const logData = {
        userId: eventData.userId,
        eventType: eventData.eventType,
        purposes: eventData.purposes || {},
        previousPurposes: eventData.previousPurposes || {},
        legalBasis: eventData.legalBasis || 'consent',
        consentMethod: eventData.consentMethod || 'api_call',
        ipAddress: eventData.ipAddress || 'unknown',
        userAgent: eventData.userAgent || 'unknown',
        sessionId: eventData.sessionId || null,
        processingPurpose: eventData.processingPurpose || 'User consent management',
        dataCategories: eventData.dataCategories || ['personal_data']
      };

      if (isUsingMongoDB()) {
        // Generate audit ID for MongoDB
        logData.auditId = this.generateAuditId();
        
        const log = new ConsentLogsModel(logData);
        await log.save();
        return log.toObject();
      } else {
        return consentLogsDb.addLog(logData);
      }
    } catch (error) {
      console.error('Error logging consent event:', error);
      throw error;
    }
  }

  /**
   * Get audit trail with filters
   */
  async getAuditTrail(filters = {}) {
    try {
      if (isUsingMongoDB()) {
        return await ConsentLogsModel.getAuditTrail(filters);
      } else {
        return consentLogsDb.getAuditTrail(filters);
      }
    } catch (error) {
      console.error('Error retrieving audit trail:', error);
      return [];
    }
  }

  /**
   * Get logs for specific user
   */
  async getUserAuditTrail(userId) {
    try {
      if (isUsingMongoDB()) {
        return await ConsentLogsModel.find({ userId }).sort({ createdAt: -1 });
      } else {
        return consentLogsDb.getUserLogs(userId);
      }
    } catch (error) {
      console.error('Error retrieving user audit trail:', error);
      return [];
    }
  }

  /**
   * Get compliance report for date range
   */
  async getComplianceReport(startDate, endDate) {
    try {
      if (isUsingMongoDB()) {
        return await ConsentLogsModel.getComplianceReport(startDate, endDate);
      } else {
        return consentLogsDb.getComplianceReport(startDate, endDate);
      }
    } catch (error) {
      console.error('Error generating compliance report:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats() {
    try {
      if (isUsingMongoDB()) {
        const totalLogs = await ConsentLogsModel.countDocuments();
        const uniqueUsers = await ConsentLogsModel.distinct('userId');
        const eventTypes = await ConsentLogsModel.aggregate([
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $project: { eventType: '$_id', count: 1, _id: 0 } }
        ]);

        return {
          totalLogs,
          uniqueUsers: uniqueUsers.length,
          eventTypes: eventTypes.reduce((acc, item) => {
            acc[item.eventType] = item.count;
            return acc;
          }, {}),
          storageType: 'mongodb'
        };
      } else {
        return consentLogsDb.getStats();
      }
    } catch (error) {
      console.error('Error retrieving audit stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate audit ID
   */
  generateAuditId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `AUDIT_${timestamp}_${random}`.toUpperCase();
  }
}

export default new ConsentLogsService();