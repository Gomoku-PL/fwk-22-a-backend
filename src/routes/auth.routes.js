import express from 'express';
import { body } from 'express-validator';
import {
  login,
  refreshToken,
  logout,
  getProfile,
  getSecurityEvents
} from '../controllers/auth/login.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation middleware
const loginValidation = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Identifier must be between 3 and 100 characters'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

/**
 * @route   POST /auth/login
 * @desc    User login with security checks
 * @access  Public
 */
router.post('/login', loginValidation, login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', refreshToken);

/**
 * @route   POST /auth/logout
 * @desc    User logout with token cleanup
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, getProfile);

/**
 * @route   GET /auth/security-events
 * @desc    Get user's security audit trail
 * @access  Private
 */
router.get('/security-events', authenticateToken, getSecurityEvents);

export default router;