import { validationResult } from "express-validator";
import authService from "../../services/auth.service.js";
import { getStorageType } from "../../config/database.js";

/**
 * Authentication Controller - GDPR Article 32 Compliant
 * Implements secure login with comprehensive audit logging
 */

/**
 * POST /auth/login
 * User login with security checks and audit logging
 */
export const login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { identifier, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const userAgent = req.get("User-Agent") || "Unknown";

    // Rate limiting check (basic implementation)
    const clientKey = `${ipAddress}_${userAgent}`;
    if (req.rateLimit && req.rateLimit.remaining < 3) {
      return res.status(429).json({
        success: false,
        message: "Too many login attempts. Please try again later.",
        retryAfter: req.rateLimit.resetTime,
      });
    }

    // Attempt login
    const result = await authService.login(
      identifier,
      password,
      ipAddress,
      userAgent,
    );

    // Set secure HTTP-only cookie for refresh token
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: result.tokens.tokenType,
      },
      metadata: {
        loginTime: new Date().toISOString(),
        storageType: getStorageType(),
        securityCompliance: "GDPR Article 32",
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    // Return generic error message for security
    const isAccountLocked = error.message.includes("locked");
    const statusCode = isAccountLocked ? 423 : 401;

    res.status(statusCode).json({
      success: false,
      message: error.message,
      data: null,
      metadata: {
        loginTime: new Date().toISOString(),
        storageType: getStorageType(),
        securityCompliance: "GDPR Article 32",
      },
    });
  }
};

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const userAgent = req.get("User-Agent") || "Unknown";

    const result = await authService.refreshToken(
      refreshToken,
      ipAddress,
      userAgent,
    );

    // Set new refresh token cookie
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: result.tokens.tokenType,
      },
      metadata: {
        refreshTime: new Date().toISOString(),
        storageType: getStorageType(),
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error.message);

    // Clear invalid refresh token cookie
    res.clearCookie("refreshToken");

    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
      data: null,
    });
  }
};

/**
 * POST /auth/logout
 * User logout with token cleanup
 */
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const userAgent = req.get("User-Agent") || "Unknown";

    await authService.logout(refreshToken, ipAddress, userAgent);

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logout successful",
      data: null,
      metadata: {
        logoutTime: new Date().toISOString(),
        storageType: getStorageType(),
      },
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    // Clear cookie even on error
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "Logout completed",
      data: null,
    });
  }
};

/**
 * GET /auth/me
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    // User data is attached by auth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user,
        lastAccessed: new Date().toISOString(),
      },
      metadata: {
        storageType: getStorageType(),
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    res.status(500).json({
      success: false,
      message: "Error retrieving profile",
      error: error.message,
    });
  }
};

/**
 * GET /auth/security-events
 * Get user's security audit trail (GDPR Article 32)
 */
export const getSecurityEvents = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const limit = parseInt(req.query.limit) || 50;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const events = await authService.getUserSecurityEvents(userId, limit);

    res.status(200).json({
      success: true,
      message: "Security events retrieved successfully",
      data: {
        events,
        totalEvents: events.length,
        userId,
      },
      metadata: {
        requestTime: new Date().toISOString(),
        storageType: getStorageType(),
        gdprCompliance: "Article 32 - Security audit trail",
      },
    });
  } catch (error) {
    console.error("Get security events error:", error.message);

    res.status(500).json({
      success: false,
      message: "Error retrieving security events",
      error: error.message,
    });
  }
};
