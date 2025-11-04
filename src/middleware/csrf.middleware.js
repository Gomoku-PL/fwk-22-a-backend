import crypto from "node:crypto";

/**
 * CSRF Protection Middleware
 * Generates a unique CSRF token per session and validates it on state-changing requests (POST/PUT/DELETE/PATCH).
 * Token is stored in session and must be sent by frontend in X-CSRF-Token header.
 * Rotates token after login or other security-sensitive events.
 */

/**
 * Generate a new CSRF token and store it in the session.
 * @param {object} session - Express session object
 * @returns {string} The generated CSRF token
 */
export const generateCsrfToken = (session) => {
    const token = crypto.randomBytes(32).toString("hex");
    session.csrfToken = token;
    return token;
};

/**
 * Middleware to provide CSRF token to the client.
 * Generates a token if one doesn't exist and exposes it in a response header or JSON.
 * Mount this on a GET endpoint (e.g., /api/csrf-token) or include in auth responses.
 */
export const provideCsrfToken = (req, res, next) => {
    if (!req.session.csrfToken) {
        generateCsrfToken(req.session);
    }
    // Option 1: Send as JSON (for dedicated endpoint)
    if (req.method === "GET" && req.path === "/csrf-token") {
        return res.json({ csrfToken: req.session.csrfToken });
    }
    // Option 2: Attach to response header (for any request)
    res.setHeader("X-CSRF-Token", req.session.csrfToken);
    next();
};

/**
 * Middleware to validate CSRF token on state-changing requests.
 * Checks X-CSRF-Token header against session-stored token.
 * Skips validation for safe methods (GET, HEAD, OPTIONS).
 */
export const validateCsrfToken = (req, res, next) => {
    // Skip validation for safe methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Retrieve token from request header
    const clientToken = req.headers["x-csrf-token"];
    const sessionToken = req.session?.csrfToken;

    // Validate token presence and match
    if (!clientToken) {
        return res.status(403).json({
            success: false,
            message: "CSRF token missing",
            code: "CSRF_MISSING",
        });
    }

    if (!sessionToken) {
        return res.status(403).json({
            success: false,
            message: "CSRF token not found in session. Please refresh and try again.",
            code: "CSRF_SESSION_MISSING",
        });
    }

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(clientToken), Buffer.from(sessionToken))) {
        return res.status(403).json({
            success: false,
            message: "Invalid CSRF token",
            code: "CSRF_INVALID",
        });
    }

    // Token is valid
    next();
};

/**
 * Rotate CSRF token (call after login, password change, or other sensitive actions).
 * Generates a new token and stores it in the session.
 * Frontend should fetch the new token after these events.
 */
export const rotateCsrfToken = (req) => {
    if (req.session) {
        return generateCsrfToken(req.session);
    }
    return null;
};

/**
 * Combined middleware: provides token on first request and validates on state-changing requests.
 * Use this as a single middleware if you want both behaviors.
 */
export const csrfProtection = (req, res, next) => {
    // Ensure token exists in session
    if (!req.session.csrfToken) {
        generateCsrfToken(req.session);
    }

    // Attach token to response header for client to read
    res.setHeader("X-CSRF-Token", req.session.csrfToken);

    // Validate on state-changing methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (!safeMethods.includes(req.method)) {
        const clientToken = req.headers["x-csrf-token"];
        const sessionToken = req.session.csrfToken;

        if (!clientToken) {
            return res.status(403).json({
                success: false,
                message: "CSRF token missing",
                code: "CSRF_MISSING",
            });
        }

        if (!crypto.timingSafeEqual(Buffer.from(clientToken), Buffer.from(sessionToken))) {
            return res.status(403).json({
                success: false,
                message: "Invalid CSRF token",
                code: "CSRF_INVALID",
            });
        }
    }

    next();
};

export default {
    generateCsrfToken,
    provideCsrfToken,
    validateCsrfToken,
    rotateCsrfToken,
    csrfProtection,
};
