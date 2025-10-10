import jwtService from '../services/jwt.service.js';
import UserModel from '../models/user.model.js';
import userDb from '../models/userdb.js';
import { isUsingMongoDB } from '../config/database.js';

/**
 * JWT Authentication Middleware
 * GDPR Article 32 compliant with security logging
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwtService.verifyAccessToken(token);
    
    // Get user data
    let user;
    if (isUsingMongoDB()) {
      user = await UserModel.findById(decoded.userId);
    } else {
      user = await userDb.findUserByEmail(decoded.email);
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if account is locked
    const isLocked = isUsingMongoDB() ? user.isLocked : userDb.isAccountLocked(user);
    if (isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked'
      });
    }

    // Attach user to request
    req.user = isUsingMongoDB() ? user.toObject() : userDb.sanitizeUser(user);
    req.userId = user.id || user._id;
    
    next();

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const decoded = jwtService.verifyAccessToken(token);
    
    let user;
    if (isUsingMongoDB()) {
      user = await UserModel.findById(decoded.userId);
    } else {
      user = await userDb.findUserByEmail(decoded.email);
    }

    if (user && user.isActive) {
      req.user = isUsingMongoDB() ? user.toObject() : userDb.sanitizeUser(user);
      req.userId = user.id || user._id;
    } else {
      req.user = null;
      req.userId = null;
    }

    next();

  } catch (error) {
    // Don't fail on optional auth
    req.user = null;
    req.userId = null;
    next();
  }
};