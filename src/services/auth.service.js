import UserModel from "../models/user.model.js";
import userDb from "../models/userdb.js";
import jwtService from "./jwt.service.js";
import consentLogsService from "./consentLogs.service.js";
import { isUsingMongoDB } from "../config/database.js";

/**
 * Authentication Service - GDPR Article 32 Compliant
 * Handles user authentication with comprehensive security logging
 */
class AuthService {
  /**
   * User login with security checks
   */
  async login(identifier, password, ipAddress, userAgent) {
    try {
      let user;

      if (isUsingMongoDB()) {
        // MongoDB implementation
        user = await UserModel.findOne({
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() },
          ],
        }).select("+password");

        if (!user) {
          await this.logSecurityEvent(
            "login_failed",
            null,
            ipAddress,
            userAgent,
            `Unknown identifier: ${identifier}`,
          );
          throw new Error("Invalid credentials");
        }

        // Check if account is locked
        if (user.isLocked) {
          await user.addSecurityEvent(
            "login_failed",
            ipAddress,
            userAgent,
            "Account locked",
          );
          throw new Error(
            "Account temporarily locked due to too many failed attempts",
          );
        }

        // Verify password
        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
          await user.incFailedAttempts();
          await user.addSecurityEvent(
            "login_failed",
            ipAddress,
            userAgent,
            "Invalid password",
          );
          throw new Error("Invalid credentials");
        }

        // Reset failed attempts and update login info
        await user.resetFailedAttempts();
        user.lastLoginAt = new Date();
        user.lastLoginIP = ipAddress;
        await user.save();

        await user.addSecurityEvent(
          "login_success",
          ipAddress,
          userAgent,
          "Successful login",
        );
      } else {
        // In-memory implementation
        user = await userDb.findUserByEmailOrUsername(identifier);

        if (!user) {
          await this.logSecurityEvent(
            "login_failed",
            null,
            ipAddress,
            userAgent,
            `Unknown identifier: ${identifier}`,
          );
          throw new Error("Invalid credentials");
        }

        // Check if account is locked
        if (userDb.isAccountLocked(user)) {
          userDb.addSecurityEvent(
            user,
            "login_failed",
            ipAddress,
            userAgent,
            "Account locked",
          );
          throw new Error(
            "Account temporarily locked due to too many failed attempts",
          );
        }

        // Verify password
        const isValidPassword = await userDb.comparePassword(user, password);

        if (!isValidPassword) {
          await userDb.incrementFailedAttempts(user);
          userDb.addSecurityEvent(
            user,
            "login_failed",
            ipAddress,
            userAgent,
            "Invalid password",
          );
          throw new Error("Invalid credentials");
        }

        // Reset failed attempts and update login info
        await userDb.resetFailedAttempts(user);
        await userDb.updateLastLogin(user, ipAddress);

        userDb.addSecurityEvent(
          user,
          "login_success",
          ipAddress,
          userAgent,
          "Successful login",
        );
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id || user._id,
        email: user.email,
        username: user.username,
      };

      const tokens = jwtService.generateTokenPair(tokenPayload);

      // Store refresh token
      if (isUsingMongoDB()) {
        user.refreshTokens.push({
          token: tokens.refreshToken,
          createdAt: new Date(),
        });
        await user.save();
      } else {
        userDb.addRefreshToken(user, tokens.refreshToken);
      }

      // Log consent event for authentication
      await consentLogsService.logConsentEvent({
        userId: user.email,
        eventType: "consent_viewed",
        purposes: { authentication: true },
        consentMethod: "login",
        ipAddress,
        userAgent,
        processingPurpose: "User authentication and session management",
      });

      return {
        user: this.sanitizeUser(user),
        tokens,
        loginSuccess: true,
      };
    } catch (error) {
      console.error("Login error:", error.message);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken, ipAddress, userAgent) {
    try {
      const decoded = jwtService.verifyRefreshToken(refreshToken);
      let user;

      if (isUsingMongoDB()) {
        user = await UserModel.findById(decoded.userId);

        if (
          !user ||
          !user.refreshTokens.some((t) => t.token === refreshToken)
        ) {
          throw new Error("Invalid refresh token");
        }

        // Remove old refresh token and generate new pair
        user.refreshTokens = user.refreshTokens.filter(
          (t) => t.token !== refreshToken,
        );
      } else {
        user = await userDb.findUserByEmail(decoded.email);

        if (
          !user ||
          !user.refreshTokens.some((t) => t.token === refreshToken)
        ) {
          throw new Error("Invalid refresh token");
        }

        userDb.removeRefreshToken(user, refreshToken);
      }

      // Generate new token pair
      const tokenPayload = {
        userId: user.id || user._id,
        email: user.email,
        username: user.username,
      };

      const tokens = jwtService.generateTokenPair(tokenPayload);

      // Store new refresh token
      if (isUsingMongoDB()) {
        user.refreshTokens.push({
          token: tokens.refreshToken,
          createdAt: new Date(),
        });
        await user.save();
        await user.addSecurityEvent(
          "token_refresh",
          ipAddress,
          userAgent,
          "Token refreshed",
        );
      } else {
        userDb.addRefreshToken(user, tokens.refreshToken);
        userDb.addSecurityEvent(
          user,
          "token_refresh",
          ipAddress,
          userAgent,
          "Token refreshed",
        );
      }

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      await this.logSecurityEvent(
        "token_refresh_failed",
        null,
        ipAddress,
        userAgent,
        error.message,
      );
      throw new Error("Invalid refresh token");
    }
  }

  /**
   * User logout
   */
  async logout(refreshToken, ipAddress, userAgent) {
    try {
      if (!refreshToken) return { success: true };

      const decoded = jwtService.decodeToken(refreshToken);
      if (!decoded) return { success: true };

      let user;

      if (isUsingMongoDB()) {
        user = await UserModel.findById(decoded.userId);
        if (user) {
          user.refreshTokens = user.refreshTokens.filter(
            (t) => t.token !== refreshToken,
          );
          await user.save();
          await user.addSecurityEvent(
            "logout",
            ipAddress,
            userAgent,
            "User logout",
          );
        }
      } else {
        user = await userDb.findUserByEmail(decoded.email);
        if (user) {
          userDb.removeRefreshToken(user, refreshToken);
          userDb.addSecurityEvent(
            user,
            "logout",
            ipAddress,
            userAgent,
            "User logout",
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error.message);
      return { success: true }; // Don't fail logout on errors
    }
  }

  /**
   * Get user security events for audit
   */
  async getUserSecurityEvents(userId, limit = 50) {
    try {
      if (isUsingMongoDB()) {
        const user = await UserModel.findById(userId);
        return user ? user.securityEvents.slice(-limit) : [];
      } else {
        return userDb.getSecurityEvents(userId, limit);
      }
    } catch (error) {
      console.error("Error fetching security events:", error);
      return [];
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(eventType, userId, ipAddress, userAgent, details) {
    try {
      // Log to consent system for GDPR compliance
      await consentLogsService.logConsentEvent({
        userId: userId || "unknown",
        eventType: "consent_viewed",
        purposes: { security_audit: true },
        consentMethod: "system_event",
        ipAddress,
        userAgent,
        processingPurpose: `Security event: ${eventType} - ${details}`,
      });
    } catch (error) {
      console.error("Error logging security event:", error);
    }
  }

  /**
   * Sanitize user data for response
   */
  sanitizeUser(user) {
    if (isUsingMongoDB()) {
      const sanitized = user.toObject();
      delete sanitized.password;
      delete sanitized.refreshTokens;
      delete sanitized.__v;
      return sanitized;
    } else {
      return userDb.sanitizeUser(user);
    }
  }
}

export default new AuthService();
