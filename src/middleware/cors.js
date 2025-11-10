/**
 * CORS Middleware
 * Cross-Origin Resource Sharing Configuration
 * GDPR Article 32 - Security of Processing
 * 
 * Implements strict CORS policies to:
 * - Allow only whitelisted frontend domains
 * - Control credential sharing
 * - Log and block unauthorized origins
 * - Prevent cross-origin attacks
 */

import cors from "cors";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Whitelist of allowed origins
 * Only these domains can access the backend API
 */
const allowedOrigins = [
  // Production domains
  process.env.FRONTEND_URL,
  process.env.PRODUCTION_DOMAIN,
  "https://gomoku-pl.vercel.app",
  
  // Staging domains
  process.env.STAGING_URL,
  
  // Development domains (only in non-production)
  ...(isDevelopment
    ? [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://localhost:3000",
        "https://localhost:5173",
      ]
    : []),
].filter(Boolean); // Remove undefined values

/**
 * CORS configuration options
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin && !isProduction) {
      return callback(null, true);
    }

    // Check if origin is whitelisted
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log rejected origin for security monitoring
      console.warn(
        `CORS: Rejected request from unauthorized origin: ${origin || "no-origin"}`
      );
      console.warn(`Allowed origins:`, allowedOrigins);

      callback(
        new Error(
          `CORS policy: Origin ${origin || "no-origin"} is not allowed to access this resource`
        )
      );
    }
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

  // Allowed request headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],

  // Headers exposed to the browser
  exposedHeaders: [
    "Content-Range",
    "X-Content-Range",
    "X-Total-Count",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],

  // Preflight request cache duration (seconds)
  maxAge: 86400, // 24 hours

  // Pass the CORS preflight response to the next handler
  preflightContinue: false,

  // Provide a status code for successful OPTIONS requests
  optionsSuccessStatus: 204,
};

/**
 * Create CORS middleware instance
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Custom CORS error handler
 * Provides detailed error messages and logging
 */
export const corsErrorHandler = (err, req, res, next) => {
  if (err.message && err.message.includes("CORS policy")) {
    console.error("CORS Error:", {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(403).json({
      success: false,
      message: "Cross-origin request blocked by CORS policy",
      error: isProduction
        ? "Access denied"
        : `Origin ${req.headers.origin} is not whitelisted`,
    });
  }

  next(err);
};

/**
 * Log CORS configuration on startup
 */
export const logCorsConfiguration = () => {
  console.info("\n=== CORS Configuration ===");
  console.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.info(`Credentials allowed: ${corsOptions.credentials}`);
  console.info(`Allowed origins (${allowedOrigins.length}):`);
  
  allowedOrigins.forEach((origin, index) => {
    console.info(`  ${index + 1}. ${origin}`);
  });

  console.info(`Allowed methods: ${corsOptions.methods.join(", ")}`);
  console.info(`Preflight cache: ${corsOptions.maxAge}s (${corsOptions.maxAge / 3600}h)`);
  console.info("========================\n");
};

/**
 * Validate origin against whitelist
 * Utility function for manual origin checking
 */
export const isOriginAllowed = (origin) => {
  if (!origin) {
    return !isProduction; // Allow no-origin in dev only
  }

  return allowedOrigins.includes(origin);
};

/**
 * Add origin to whitelist dynamically
 * Use with caution - typically for development/testing
 */
export const addAllowedOrigin = (origin) => {
  if (!origin || typeof origin !== "string") {
    console.warn("Invalid origin provided to addAllowedOrigin");
    return false;
  }

  if (!allowedOrigins.includes(origin)) {
    allowedOrigins.push(origin);
    console.info(`Added origin to CORS whitelist: ${origin}`);
    return true;
  }

  console.warn(`Origin already in whitelist: ${origin}`);
  return false;
};

/**
 * Remove origin from whitelist
 * Use to dynamically restrict access
 */
export const removeAllowedOrigin = (origin) => {
  const index = allowedOrigins.indexOf(origin);
  
  if (index > -1) {
    allowedOrigins.splice(index, 1);
    console.info(`Removed origin from CORS whitelist: ${origin}`);
    return true;
  }

  console.warn(`Origin not found in whitelist: ${origin}`);
  return false;
};

/**
 * Get current whitelist
 * For debugging and monitoring
 */
export const getAllowedOrigins = () => {
  return [...allowedOrigins]; // Return a copy
};

/**
 * Strict CORS for sensitive endpoints
 * Extra validation for GDPR and auth endpoints
 */
export const strictCors = (req, res, next) => {
  const origin = req.headers.origin;

  if (!isOriginAllowed(origin)) {
    console.warn(
      `Strict CORS: Blocked access to sensitive endpoint from: ${origin || "no-origin"}`
    );
    return res.status(403).json({
      success: false,
      message: "Access denied: Origin not authorized for this endpoint",
    });
  }

  next();
};

/**
 * CORS monitoring middleware
 * Tracks cross-origin requests for security analysis
 */
export const corsMonitor = (req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    const isAllowed = isOriginAllowed(origin);
    
    // Log all cross-origin requests
    const logEntry = {
      timestamp: new Date().toISOString(),
      origin,
      allowed: isAllowed,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    if (!isAllowed) {
      console.warn("CORS Monitor: Unauthorized origin attempt:", logEntry);
    } else if (isDevelopment) {
      console.debug("CORS Monitor: Authorized request:", logEntry);
    }
  }

  next();
};

// Log configuration on module load
if (!process.env.SUPPRESS_CORS_LOG) {
  logCorsConfiguration();
}

export default {
  corsMiddleware,
  corsErrorHandler,
  corsOptions,
  isOriginAllowed,
  addAllowedOrigin,
  removeAllowedOrigin,
  getAllowedOrigins,
  strictCors,
  corsMonitor,
  logCorsConfiguration,
};
