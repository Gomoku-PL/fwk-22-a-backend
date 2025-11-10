import express from "express";
import {
  login,
  refreshToken,
  logout,
  getProfile,
  getSecurityEvents,
} from "../controllers/auth/login.controller.js";
import { validateSessionSecurity } from "../controllers/auth/session.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { register } from "../controllers/auth/register.controller.js";
import { authValidation } from "../middleware/validation.js";

const router = express.Router();

// Add session security validation to all routes
router.use(validateSessionSecurity);

/**
 * @route   POST /auth/register
 * @desc    Secure user registration (GDPR Articles 5, 6, 25)
 * @access  Public
 */
router.post("/register", authValidation.register, register);

/**
 * @route   POST /auth/login
 * @desc    User login with security checks
 * @access  Public
 */
router.post("/login", authValidation.login, login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post("/refresh", refreshToken);

/**
 * @route   POST /auth/logout
 * @desc    User logout with token cleanup
 * @access  Public
 */
router.post("/logout", logout);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", authenticateToken, getProfile);

/**
 * @route   GET /auth/security-events
 * @desc    Get user's security audit trail
 * @access  Private
 */
router.get("/security-events", authenticateToken, getSecurityEvents);

export default router;
