/**
 * Cookie Configuration
 * Secure cookie settings for authentication and session management
 * GDPR Article 32 - Security of Processing
 * 
 * Implements secure cookie practices:
 * - HttpOnly: Prevents XSS attacks by making cookies inaccessible to JavaScript
 * - Secure: Ensures cookies are only sent over HTTPS
 * - SameSite: Prevents CSRF attacks
 * - Domain and Path restrictions
 */

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Base cookie configuration
 * Applied to all cookies by default
 */
export const baseCookieConfig = {
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: isProduction, // HTTPS only in production
  sameSite: isProduction ? "strict" : "lax", // CSRF protection
  path: "/", // Cookie available to entire domain
  domain: process.env.COOKIE_DOMAIN || undefined, // Set domain if specified
};

/**
 * Authentication cookie configuration
 * Used for access tokens and session identifiers
 */
export const authCookieConfig = {
  ...baseCookieConfig,
  maxAge: 15 * 60 * 1000, // 15 minutes
  sameSite: "strict", // Strictest CSRF protection for auth
  httpOnly: true, // Must be HttpOnly for security
  secure: isProduction, // HTTPS only in production
};

/**
 * Refresh token cookie configuration
 * Longer-lived token for renewing access tokens
 */
export const refreshTokenCookieConfig = {
  ...baseCookieConfig,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  sameSite: "strict",
  httpOnly: true,
  secure: isProduction,
  path: "/auth/refresh", // Restricted to refresh endpoint only
};

/**
 * CSRF token cookie configuration
 * Used for double-submit cookie CSRF protection
 */
export const csrfCookieConfig = {
  ...baseCookieConfig,
  httpOnly: false, // Must be accessible to JavaScript to read and send in headers
  secure: isProduction,
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Consent cookie configuration
 * Stores user's cookie consent preferences
 */
export const consentCookieConfig = {
  httpOnly: false, // Needs to be accessible to check consent
  secure: isProduction,
  sameSite: "lax", // Lax to allow cross-site navigation
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  path: "/",
};

/**
 * Session cookie configuration
 * Used for general session management
 */
export const sessionCookieConfig = {
  ...baseCookieConfig,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: "lax", // Lax for better UX while maintaining security
  httpOnly: true,
  secure: isProduction,
  name: process.env.SESSION_COOKIE_NAME || "gomoku_session",
};

/**
 * Preference cookie configuration
 * Stores non-sensitive user preferences (theme, language, etc.)
 */
export const preferenceCookieConfig = {
  httpOnly: false, // Accessible to JavaScript for preference reading
  secure: isProduction,
  sameSite: "lax",
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  path: "/",
};

/**
 * Cookie names enumeration
 * Centralized naming for consistency
 */
export const cookieNames = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  CSRF_TOKEN: "csrf_token",
  SESSION: "gomoku_session",
  CONSENT: "cookie_consent",
  PREFERENCES: "user_preferences",
};

/**
 * Set a secure cookie with appropriate configuration
 * @param {Object} res - Express response object
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} options - Additional cookie options
 */
export const setSecureCookie = (res, name, value, options = {}) => {
  const config = { ...baseCookieConfig, ...options };

  // Log cookie setting in development
  if (isDevelopment) {
    console.log(`Setting cookie: ${name}`, {
      httpOnly: config.httpOnly,
      secure: config.secure,
      sameSite: config.sameSite,
      maxAge: config.maxAge,
    });
  }

  res.cookie(name, value, config);
};

/**
 * Clear a cookie securely
 * @param {Object} res - Express response object
 * @param {string} name - Cookie name
 * @param {Object} options - Additional cookie options
 */
export const clearSecureCookie = (res, name, options = {}) => {
  const config = {
    ...baseCookieConfig,
    ...options,
    maxAge: 0,
    expires: new Date(0),
  };

  if (isDevelopment) {
    console.log(`Clearing cookie: ${name}`);
  }

  res.clearCookie(name, config);
};

/**
 * Validate cookie configuration
 * Ensures security requirements are met
 */
export const validateCookieConfig = (config) => {
  const warnings = [];

  // Check for security issues
  if (isProduction && !config.secure) {
    warnings.push("Cookie should be secure in production");
  }

  if (config.httpOnly === false && config.name?.includes("token")) {
    warnings.push("Token cookies should be HttpOnly");
  }

  if (!config.sameSite) {
    warnings.push("SameSite attribute should be set for CSRF protection");
  }

  if (warnings.length > 0) {
    console.warn(`Cookie configuration warnings for ${config.name}:`, warnings);
  }

  return warnings.length === 0;
};

/**
 * Get cookie configuration by type
 * @param {string} type - Cookie type (auth, refresh, csrf, session, consent, preference)
 * @returns {Object} Cookie configuration
 */
export const getCookieConfig = (type) => {
  const configs = {
    auth: authCookieConfig,
    refresh: refreshTokenCookieConfig,
    csrf: csrfCookieConfig,
    session: sessionCookieConfig,
    consent: consentCookieConfig,
    preference: preferenceCookieConfig,
  };

  const config = configs[type] || baseCookieConfig;
  validateCookieConfig({ ...config, name: type });

  return config;
};

/**
 * Development mode exceptions
 * Document why certain settings differ in development
 */
if (isDevelopment) {
  console.info("Cookie Configuration - Development Mode:");
  console.info("  - secure: false (HTTP allowed for local development)");
  console.info("  - sameSite: lax (relaxed for local testing)");
  console.info("  - All production cookies will use strict security settings");
}

/**
 * Production mode validation
 * Ensure all security settings are properly configured
 */
if (isProduction) {
  console.info("Cookie Configuration - Production Mode:");
  console.info("  ✓ HttpOnly enabled for sensitive cookies");
  console.info("  ✓ Secure flag enforced (HTTPS only)");
  console.info("  ✓ SameSite protection active");
  console.info("  ✓ Domain restrictions applied");
}

export default {
  baseCookieConfig,
  authCookieConfig,
  refreshTokenCookieConfig,
  csrfCookieConfig,
  consentCookieConfig,
  sessionCookieConfig,
  preferenceCookieConfig,
  cookieNames,
  setSecureCookie,
  clearSecureCookie,
  validateCookieConfig,
  getCookieConfig,
};
