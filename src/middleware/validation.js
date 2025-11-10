/**
 * Centralized Input Validation Middleware
 * 
 * Provides schema-based validation using express-validator to prevent injection attacks
 * and malformed input. All incoming requests are validated before reaching business logic.
 * 
 * Features:
 * - Standardized error format (400 responses)
 * - Reusable validation schemas
 * - Protection against injection attacks (SQL, NoSQL, XSS)
 * - Type coercion and sanitization
 * 
 * @module middleware/validation
 */

import { body, param, query, validationResult } from "express-validator";

/**
 * Middleware to handle validation errors with consistent format
 * Use this after validation chains to catch and format errors
 * 
 * @returns {Function} Express middleware
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg,
            value: err.value,
            location: err.location
        }));

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: formattedErrors,
            code: "VALIDATION_ERROR"
        });
    }

    next();
};

/**
 * Common validation rules for reusability
 */
export const commonValidations = {
    // Email validation with sanitization
    email: body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Valid email is required")
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage("Email must not exceed 255 characters"),

    // Password validation (minimum security requirements)
    password: body("password")
        .isString().withMessage("Password must be a string")
        .isLength({ min: 8, max: 128 }).withMessage("Password must be 8-128 characters")
        .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/).withMessage("Password must contain at least one lowercase letter")
        .matches(/[0-9]/).withMessage("Password must contain at least one number"),

    // Basic password (less strict, for existing implementations)
    passwordBasic: body("password")
        .isString().withMessage("Password must be a string")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),

    // Username validation
    username: body("username")
        .optional()
        .trim()
        .isString().withMessage("Username must be a string")
        .isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters")
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage("Username can only contain letters, numbers, underscores, and hyphens"),

    // MongoDB ObjectId validation
    mongoId: param("id")
        .trim()
        .notEmpty().withMessage("ID is required")
        .matches(/^[a-f\d]{24}$/i).withMessage("Invalid ID format"),

    // Boolean field validation
    boolean: (fieldName) => body(fieldName)
        .optional()
        .isBoolean().withMessage(`${fieldName} must be a boolean`),

    // String field with length limits
    string: (fieldName, minLength = 1, maxLength = 500) => body(fieldName)
        .optional()
        .trim()
        .isString().withMessage(`${fieldName} must be a string`)
        .isLength({ min: minLength, max: maxLength })
        .withMessage(`${fieldName} must be ${minLength}-${maxLength} characters`),

    // Pagination validation
    pagination: {
        page: query("page")
            .optional()
            .isInt({ min: 1 }).withMessage("Page must be a positive integer")
            .toInt(),
        limit: query("limit")
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
            .toInt(),
    }
};

// ============================================================================
// VALIDATION SCHEMAS FOR SPECIFIC ROUTES
// ============================================================================

/**
 * Authentication Routes Validation
 */
export const authValidation = {
    // POST /auth/register
    register: [
        commonValidations.email,
        commonValidations.passwordBasic,
        commonValidations.username,
        handleValidationErrors
    ],

    // POST /auth/login
    login: [
        body("identifier")
            .trim()
            .notEmpty().withMessage("Email or username is required")
            .isLength({ min: 3, max: 100 }).withMessage("Identifier must be 3-100 characters"),
        commonValidations.passwordBasic,
        handleValidationErrors
    ],

    // POST /auth/refresh (minimal validation, token in cookie)
    refresh: [
        handleValidationErrors
    ],

    // POST /auth/logout
    logout: [
        handleValidationErrors
    ]
};

/**
 * Consent Routes Validation
 */
export const consentValidation = {
    // PUT /consent
    update: [
        body("purposes")
            .isObject().withMessage("Purposes must be an object"),
        body("purposes.marketing")
            .optional()
            .isBoolean().withMessage("Marketing consent must be boolean"),
        body("purposes.analytics")
            .optional()
            .isBoolean().withMessage("Analytics consent must be boolean"),
        body("purposes.personalization")
            .optional()
            .isBoolean().withMessage("Personalization consent must be boolean"),
        body("purposes.thirdParty")
            .optional()
            .isBoolean().withMessage("Third party consent must be boolean"),
        handleValidationErrors
    ]
};

/**
 * Game Routes Validation
 */
export const gameValidation = {
    // POST /games (new game)
    create: [
        body("mode")
            .optional()
            .isIn(["pvp", "pve", "online"]).withMessage("Mode must be pvp, pve, or online"),
        body("difficulty")
            .optional()
            .isIn(["easy", "medium", "hard"]).withMessage("Difficulty must be easy, medium, or hard"),
        body("boardSize")
            .optional()
            .isInt({ min: 15, max: 19 }).withMessage("Board size must be between 15 and 19")
            .toInt(),
        handleValidationErrors
    ],

    // POST /games/:id/moves
    makeMove: [
        param("id")
            .trim()
            .notEmpty().withMessage("Game ID is required"),
        body("row")
            .isInt({ min: 0, max: 18 }).withMessage("Row must be between 0 and 18")
            .toInt(),
        body("col")
            .isInt({ min: 0, max: 18 }).withMessage("Column must be between 0 and 18")
            .toInt(),
        body("player")
            .optional()
            .isIn(["black", "white", "X", "O", 1, 2]).withMessage("Invalid player identifier"),
        handleValidationErrors
    ],

    // GET /games/:id
    getById: [
        param("id")
            .trim()
            .notEmpty().withMessage("Game ID is required"),
        handleValidationErrors
    ]
};

/**
 * Data Deletion Routes Validation
 */
export const dataDeletionValidation = {
    // DELETE /data
    delete: [
        body("confirmEmail")
            .optional()
            .trim()
            .isEmail().withMessage("Valid confirmation email required")
            .normalizeEmail(),
        body("reason")
            .optional()
            .trim()
            .isString()
            .isLength({ max: 500 }).withMessage("Reason must not exceed 500 characters"),
        handleValidationErrors
    ]
};

/**
 * Data Portability Routes Validation
 */
export const dataPortabilityValidation = {
    // GET /data-portability?format=json|csv
    export: [
        query("format")
            .optional()
            .isIn(["json", "csv", "xml"]).withMessage("Format must be json, csv, or xml")
            .toLowerCase(),
        handleValidationErrors
    ]
};

/**
 * Data Access Routes Validation
 */
export const dataAccessValidation = {
    // GET /data-access
    get: [
        query("category")
            .optional()
            .isIn(["profile", "consent", "games", "security", "all"])
            .withMessage("Invalid category"),
        handleValidationErrors
    ]
};

/**
 * Third Party Data Sharing Validation
 */
export const thirdPartyValidation = {
    // POST /third-party/share
    share: [
        body("provider")
            .trim()
            .notEmpty().withMessage("Provider is required")
            .isIn(["analytics", "marketing", "cdn", "payment"])
            .withMessage("Invalid provider"),
        body("dataTypes")
            .isArray({ min: 1 }).withMessage("Data types must be a non-empty array"),
        body("dataTypes.*")
            .isIn(["email", "name", "usage", "preferences"])
            .withMessage("Invalid data type"),
        body("purpose")
            .trim()
            .notEmpty().withMessage("Purpose is required")
            .isLength({ max: 200 }).withMessage("Purpose must not exceed 200 characters"),
        handleValidationErrors
    ],

    // DELETE /third-party/revoke/:provider
    revoke: [
        param("provider")
            .trim()
            .notEmpty().withMessage("Provider is required")
            .isIn(["analytics", "marketing", "cdn", "payment"])
            .withMessage("Invalid provider"),
        handleValidationErrors
    ]
};

/**
 * Update Compliance Validation
 */
export const updateComplianceValidation = {
    // POST /update-compliance/acknowledge
    acknowledge: [
        body("version")
            .trim()
            .notEmpty().withMessage("Version is required")
            .matches(/^\d+\.\d+\.\d+$/).withMessage("Version must be in semver format (e.g., 2.0.0)"),
        body("acknowledged")
            .isBoolean().withMessage("Acknowledged must be boolean"),
        handleValidationErrors
    ]
};

/**
 * Generic validation for custom use cases
 */
export const createValidation = (validationChain) => {
    return [...validationChain, handleValidationErrors];
};

/**
 * Sanitization helper to strip dangerous characters
 * Use for fields that will be displayed or logged
 */
export const sanitizeInput = (str) => {
    if (typeof str !== "string") return str;
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
        .replace(/javascript:/gi, "") // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, "") // Remove inline event handlers
        .trim();
};

export default {
    handleValidationErrors,
    commonValidations,
    authValidation,
    consentValidation,
    gameValidation,
    dataDeletionValidation,
    dataPortabilityValidation,
    dataAccessValidation,
    thirdPartyValidation,
    updateComplianceValidation,
    createValidation,
    sanitizeInput
};
