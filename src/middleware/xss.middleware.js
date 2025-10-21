import sanitizer from "../utils/sanitizer.js";

/**
 * XSS Prevention Middleware
 * Automatically sanitizes request body data
 */
export const xssProtection = (options = {}) => {
  const {
    sanitizeBody = true,
    sanitizeQuery = true,
    sanitizeParams = true,
    setHeaders = true,
  } = options;

  return (req, res, next) => {
    // Set security headers
    if (setHeaders) {
      const cspHeaders = sanitizer.getCSPHeaders();
      Object.keys(cspHeaders).forEach((header) => {
        res.setHeader(header, cspHeaders[header]);
      });

      // Additional XSS protection headers
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
    }

    // Sanitize request body
    if (sanitizeBody && req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (sanitizeQuery && req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (sanitizeParams && req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  };
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (typeof obj !== "object" || obj === null) {
    return sanitizer.sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize the key name as well
    const sanitizedKey = sanitizer.sanitizeInput(key, { allowHtml: false });
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Specific middleware for user profile data
 */
export const sanitizeProfileData = (req, res, next) => {
  if (req.body) {
    req.body = sanitizer.sanitizeProfile(req.body);
  }
  next();
};

/**
 * Specific middleware for game data
 */
export const sanitizeGameData = (req, res, next) => {
  if (req.body) {
    req.body = sanitizer.sanitizeGameInput(req.body);
  }
  next();
};

/**
 * Middleware to sanitize response data before sending
 */
export const sanitizeResponse = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Recursively sanitize response data
    const sanitizedData = sanitizeResponseObject(data);
    return originalJson.call(this, sanitizedData);
  };

  next();
};

/**
 * Sanitize response object for safe rendering
 */
function sanitizeResponseObject(obj) {
  if (typeof obj !== "object" || obj === null) {
    if (typeof obj === "string") {
      return sanitizer.htmlEncode(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeResponseObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeResponseObject(value);
  }

  return sanitized;
}

export default {
  xssProtection,
  sanitizeProfileData,
  sanitizeGameData,
  sanitizeResponse,
};
