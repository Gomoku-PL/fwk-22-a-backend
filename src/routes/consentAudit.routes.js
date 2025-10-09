import express from 'express';
import { body, query } from 'express-validator';
import {
  getAuditTrail,
  getUserAuditTrail,
  getComplianceReport,
  getAuditStats,
  createAuditLog
} from '../controllers/consentLogs.controller.js';

const router = express.Router();

// Validation for compliance report
const reportValidation = [
  query('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Validation for manual log creation
const logCreationValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required'),
  body('eventType')
    .isIn(['consent_given', 'consent_withdrawn', 'consent_updated', 'consent_viewed'])
    .withMessage('Invalid event type'),
  body('consentMethod')
    .isIn(['web_form', 'api_call', 'cookie_banner', 'email_opt_in', 'phone_consent'])
    .withMessage('Invalid consent method'),
  body('processingPurpose')
    .notEmpty()
    .withMessage('Processing purpose is required')
];

/**
 * @route   GET /api/consent/audit
 * @desc    Get audit trail with filters (Admin only)
 * @access  Admin
 */
router.get('/', getAuditTrail);

/**
 * @route   GET /api/consent/audit/user/:userId
 * @desc    Get audit trail for specific user
 * @access  Admin
 */
router.get('/user/:userId', getUserAuditTrail);

/**
 * @route   GET /api/consent/audit/report
 * @desc    Generate compliance report for date range
 * @access  Admin
 */
router.get('/report', reportValidation, getComplianceReport);

/**
 * @route   GET /api/consent/audit/stats
 * @desc    Get audit statistics
 * @access  Admin
 */
router.get('/stats', getAuditStats);

/**
 * @route   POST /api/consent/audit/log
 * @desc    Create manual audit log entry (Admin/Testing)
 * @access  Admin
 */
router.post('/log', logCreationValidation, createAuditLog);

export default router;