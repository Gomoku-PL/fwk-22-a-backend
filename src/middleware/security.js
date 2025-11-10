/**
 * Security Middleware
 * GDPR Article 32 - Security of Processing
 * 
 * Implements comprehensive security measures including:
 * - Helmet for secure HTTP headers
 * - Rate limiting to prevent abuse
 * - Request sanitization
 * - Security logging and monitoring
 */

import helmet from "helmet";
import rateLimit from "express-rate-limit";

/**
 * Apply security headers using Helmet
 * Protects against common web vulnerabilities
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: "deny",
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },
});

/**
 * Rate limiting for API endpoints
 * Prevents brute force and DOS attacks
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
    });
  },
});

/**
 * Strict rate limiting for authentication endpoints
 * Extra protection against credential stuffing
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: "Too many login attempts, please try again later.",
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    console.warn(
      `Auth rate limit exceeded for IP: ${req.ip} - Potential brute force attack`
    );
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again in 15 minutes.",
    });
  },
});

/**
 * GDPR endpoint rate limiting
 * Moderate limits for data access/deletion requests
 */
export const gdprLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 GDPR requests per hour
  message: {
    success: false,
    message: "Too many data requests, please try again later.",
  },
  handler: (req, res) => {
    console.warn(`GDPR rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      message: "Too many data requests. Please try again in an hour.",
    });
  },
});

/**
 * Security logging middleware
 * Logs security-relevant events for monitoring
 */
export const securityLogger = (req, res, next) => {
  const securityEvents = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.get("user-agent"),
    userId: req.userId || null,
  };

  // Log suspicious patterns
  if (req.path.includes("..") || req.path.includes("//")) {
    console.warn("Suspicious path traversal attempt:", securityEvents);
  }

  if (req.headers["x-forwarded-for"]) {
    securityEvents.forwardedFor = req.headers["x-forwarded-for"];
  }

  // Attach security context to request
  req.securityContext = securityEvents;

  next();
};

/**
 * HTTPS enforcement middleware
 * Redirects HTTP to HTTPS in production
 */
export const enforceHTTPS = (req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    req.header("x-forwarded-proto") !== "https"
  ) {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
};

/**
 * Request sanitization
 * Removes potentially dangerous characters
 */
export const sanitizeRequest = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "string") {
        // Remove null bytes and control characters
        obj[key] = obj[key].replace(/\0/g, "").replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
      } else if (typeof obj[key] === "object") {
        sanitize(obj[key]);
      }
    });

    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * Security audit middleware
 * Tracks sensitive operations for compliance
 */
export const auditSensitiveOperation = (operationType) => {
  return (req, res, next) => {
    const auditLog = {
      timestamp: new Date().toISOString(),
      operationType,
      userId: req.userId || "anonymous",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      path: req.path,
      method: req.method,
    };

    console.info("Security Audit:", JSON.stringify(auditLog));

    // Store audit log (implement your storage mechanism)
    // Example: await AuditLog.create(auditLog);

    next();
  };
};

/**
 * Apply all security middleware to Express app
 */
export const applySecurityMiddleware = (app) => {
  // HTTPS enforcement
  app.use(enforceHTTPS);

  // Security headers
  app.use(securityHeaders);

  // Request sanitization
  app.use(sanitizeRequest);

  // Security logging
  app.use(securityLogger);

  console.info("✓ Security middleware applied");
};

export default {
  securityHeaders,
  apiLimiter,
  authLimiter,
  gdprLimiter,
  securityLogger,
  enforceHTTPS,
  sanitizeRequest,
  auditSensitiveOperation,
  applySecurityMiddleware,
};
