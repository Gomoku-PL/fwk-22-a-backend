import { validationResult } from 'express-validator';
import consentService from '../services/consent.service.js';
import consentLogsService from '../services/consentLogs.service.js';
import { getStorageType } from '../config/database.js';

/**
 * GDPR Article 7 - Consent Controller
 * Works with both MongoDB and in-memory storage
 */

/**
 * Get user's current consent settings
 */
export const getConsent = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.sessionID || 'demo-user';
    const consent = await consentService.getConsent(userId);
    
    // Log the consent view event
    await consentLogsService.logConsentEvent({
      userId,
      eventType: 'consent_viewed',
      purposes: consent?.purposes || {},
      consentMethod: 'api_call',
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown',
      sessionId: req.sessionID || null,
      processingPurpose: 'User viewing consent settings'
    });
    
    if (!consent) {
      return res.status(200).json({
        success: true,
        data: {
          userId,
          purposes: {
            marketing: false,
            analytics: false,
            personalization: false,
            thirdParty: false
          },
          consentDate: null,
          withdrawalDate: null,
          storageType: getStorageType()
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...consent,
        storageType: getStorageType()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving consent settings',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Update user consent for specific purposes
 */
export const updateConsent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const userId = req.headers['user-id'] || req.sessionID || 'demo-user';
    const { purposes } = req.body;
    
    // Get previous consent for logging
    const previousConsent = await consentService.getConsent(userId);
    
    const hasAnyConsent = Object.values(purposes).some(consent => consent === true);
    
    const consentData = {
      purposes,
      consentDate: hasAnyConsent ? new Date() : null,
      withdrawalDate: !hasAnyConsent ? new Date() : null,
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown'
    };

    const consent = await consentService.setConsent(userId, consentData);

    // Log the consent event
    const eventType = hasAnyConsent ? 'consent_given' : 'consent_withdrawn';
    await consentLogsService.logConsentEvent({
      userId,
      eventType,
      purposes,
      previousPurposes: previousConsent?.purposes || {},
      consentMethod: 'api_call',
      ipAddress: consentData.ipAddress,
      userAgent: consentData.userAgent,
      sessionId: req.sessionID || null,
      processingPurpose: `User ${hasAnyConsent ? 'granted' : 'withdrew'} consent via API`
    });

    res.status(200).json({
      success: true,
      message: 'Consent updated successfully',
      data: {
        ...consent,
        storageType: getStorageType()
      }
    });
  } catch (error) {
    console.error('Error updating consent:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating consent',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Withdraw all consent (GDPR Article 7.3)
 */
export const withdrawAllConsent = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.sessionID || 'demo-user';
    
    // Get previous consent for logging
    const previousConsent = await consentService.getConsent(userId);
    
    const withdrawnConsent = {
      purposes: {
        marketing: false,
        analytics: false,
        personalization: false,
        thirdParty: false
      },
      withdrawalDate: new Date(),
      consentDate: null,
      ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown'
    };

    const consent = await consentService.setConsent(userId, withdrawnConsent);

    // Log the withdrawal event
    await consentLogsService.logConsentEvent({
      userId,
      eventType: 'consent_withdrawn',
      purposes: withdrawnConsent.purposes,
      previousPurposes: previousConsent?.purposes || {},
      consentMethod: 'api_call',
      ipAddress: withdrawnConsent.ipAddress,
      userAgent: withdrawnConsent.userAgent,
      sessionId: req.sessionID || null,
      processingPurpose: 'User withdrew all consent via API'
    });

    res.status(200).json({
      success: true,
      message: 'All consent withdrawn successfully',
      data: {
        ...consent,
        storageType: getStorageType()
      }
    });
  } catch (error) {
    console.error('Error withdrawing consent:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing consent',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Get consent history for audit purposes
 */
export const getConsentHistory = async (req, res) => {
  try {
    const userId = req.headers['user-id'] || req.sessionID || 'demo-user';
    const history = await consentService.getConsentHistory(userId);
    
    res.status(200).json({
      success: true,
      data: history,
      storageType: getStorageType()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving consent history',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Check if user has consent for specific purpose
 */
export const checkConsentForPurpose = async (req, res) => {
  try {
    const { purpose } = req.params;
    const userId = req.headers['user-id'] || req.sessionID || 'demo-user';
    
    const validPurposes = ['marketing', 'analytics', 'personalization', 'thirdParty'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose specified',
        validPurposes
      });
    }
    
    const hasConsent = await consentService.hasConsent(userId, purpose);
    
    res.status(200).json({
      success: true,
      data: {
        purpose,
        hasConsent,
        userId,
        storageType: getStorageType()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking consent',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Get database statistics (admin endpoint)
 */
export const getConsentStats = async (req, res) => {
  try {
    const stats = await consentService.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving consent statistics',
      error: error.message,
      storageType: getStorageType()
    });
  }
};

/**
 * Clear all consent data (testing endpoint)
 */
export const clearConsentData = async (req, res) => {
  try {
    const result = await consentService.clear();
    res.status(200).json({
      success: true,
      message: 'Consent data cleared successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing consent data',
      error: error.message,
      storageType: getStorageType()
    });
  }
};