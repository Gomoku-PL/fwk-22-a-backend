import { validationResult } from 'express-validator';
import consentLogsService from '../services/consentLogs.service.js';
import { getStorageType } from '../config/database.js';

/**
 * Consent Logs Controller - GDPR Article 30 Compliance
 * Admin-only endpoints for audit trail management
 */

/**
 * Get audit trail with optional filters
 * Admin endpoint for compliance monitoring
 */
export const getAuditTrail = async (req, res) => {
  try {
    const { userId, eventType, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    const filters = {};
    if (userId) filters.userId = userId;
    if (eventType) filters.eventType = eventType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const auditTrail = await consentLogsService.getAuditTrail(filters);
    
    // Pagination for large datasets
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = auditTrail.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        logs: paginatedResults,
        pagination: {
          currentPage: parseInt(page),
          totalLogs: auditTrail.length,
          logsPerPage: parseInt(limit),
          totalPages: Math.ceil(auditTrail.length / limit)
        },
        filters,
        storageType: getStorageType()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving audit trail',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Get audit trail for specific user
 */
export const getUserAuditTrail = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const userAuditTrail = await consentLogsService.getUserAuditTrail(userId);

    res.status(200).json({
      success: true,
      data: {
        userId,
        logs: userAuditTrail,
        totalEntries: userAuditTrail.length,
        storageType: getStorageType()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving user audit trail',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Generate compliance report for date range
 */
export const getComplianceReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required for compliance reports'
      });
    }

    const report = await consentLogsService.getComplianceReport(startDate, endDate);

    res.status(200).json({
      success: true,
      data: {
        reportPeriod: {
          startDate,
          endDate
        },
        compliance: report,
        generatedAt: new Date().toISOString(),
        storageType: getStorageType()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating compliance report',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Get audit statistics
 */
export const getAuditStats = async (req, res) => {
  try {
    const stats = await consentLogsService.getAuditStats();

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving audit statistics',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Manual log entry (for testing/admin purposes)
 */
export const createAuditLog = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const logData = {
      ...req.body,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Admin Console',
      sessionId: req.sessionID || 'admin-session'
    };

    const logEntry = await consentLogsService.logConsentEvent(logData);

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      data: logEntry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating audit log',
      error: error.message,
      storageType: getStorageType()
    });
  }
};