// CSRF Protection Middleware
// - Generates a per-session token
// - Sends token via X-CSRF-Token response header
// - Validates token for state-changing methods (POST, PUT, DELETE, PATCH)
// - Uses constant-time comparison to avoid timing attacks

import crypto from "node:crypto";

// Internal: create and store a new token on the session
function generateCsrfToken(session) {
    const token = crypto.randomBytes(32).toString("hex"); // 64 hex chars
    session.csrfToken = token;
    return token;
}

// Public: rotate and return a new token (e.g., after login)
export function rotateCsrfToken(req) {
    if (!req.session) return null;
    return generateCsrfToken(req.session);
}

// Internal: constant-time equality for hex tokens
function tokensEqualHex(a, b) {
    try {
        const aBuf = Buffer.from(a, "hex");
        const bBuf = Buffer.from(b, "hex");
        if (aBuf.length !== bBuf.length) return false;
        return crypto.timingSafeEqual(aBuf, bBuf);
    } catch {
        return false;
    }
}

// Middleware: main CSRF protection
export function csrfProtection(req, res, next) {
    // Ensure session exists
    if (!req.session) {
        return res.status(403).json({
            success: false,
            message: "CSRF validation failed: session not found",
            code: "CSRF_SESSION_MISSING",
        });
    }

    // Ensure token exists on the session
    if (!req.session.csrfToken) {
        generateCsrfToken(req.session);
    }

    // Always expose current token on response header to help client stay in sync
    res.setHeader("X-CSRF-Token", req.session.csrfToken);

    // Skip validation for safe methods
    const method = req.method.toUpperCase();
    const safe = method === "GET" || method === "HEAD" || method === "OPTIONS";
    if (safe) return next();

    // Validate token for state-changing requests
    const headerToken = req.get("X-CSRF-Token");
    if (!headerToken) {
        return res.status(403).json({
            success: false,
            message: "CSRF token missing",
            code: "CSRF_MISSING",
        });
    }

    const valid = tokensEqualHex(headerToken, req.session.csrfToken);
    if (!valid) {
        return res.status(403).json({
            success: false,
            message: "Invalid CSRF token",
            code: "CSRF_INVALID",
        });
    }

    return next();
}

// Optional helper: explicitly provide token (can be used by routes if needed)
export function provideCsrfToken(req, res) {
    if (!req.session) {
        return res.status(403).json({
            success: false,
            message: "CSRF validation failed: session not found",
            code: "CSRF_SESSION_MISSING",
        });
    }
    if (!req.session.csrfToken) {
        generateCsrfToken(req.session);
    }
    res.setHeader("X-CSRF-Token", req.session.csrfToken);
    return res.status(200).json({
        success: true,
        message: "CSRF token provided",
        csrfToken: req.session.csrfToken,
    });
}

