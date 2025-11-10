# Input Validation Middleware - Developer Guide

## Overview

This guide explains how to use the centralized input validation middleware to protect API endpoints from malformed input and injection attacks.

## Quick Start

### 1. Import Validation Schemas

```javascript
import { authValidation, gameValidation, consentValidation } from "../middleware/validation.js";
```

### 2. Apply to Routes

```javascript
router.post("/auth/register", authValidation.register, register);
router.post("/games", gameValidation.create, newGame);
router.put("/consent", consentValidation.update, updateConsent);
```

### 3. Remove Manual Validation from Controllers

**Before:**
```javascript
import { validationResult } from "express-validator";

export const myController = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    // ... business logic
};
```

**After:**
```javascript
export const myController = async (req, res) => {
    // Validation handled by middleware
    // Input is guaranteed to be valid here
    const { email, password } = req.body; // Already validated
    // ... business logic
};
```

## Available Validation Schemas

### Authentication

```javascript
import { authValidation } from "../middleware/validation.js";

router.post("/auth/register", authValidation.register, register);
router.post("/auth/login", authValidation.login, login);
router.post("/auth/refresh", authValidation.refresh, refreshToken);
router.post("/auth/logout", authValidation.logout, logout);
```

### Consent Management

```javascript
import { consentValidation } from "../middleware/validation.js";

router.put("/consent", consentValidation.update, updateConsent);
```

### Game Management

```javascript
import { gameValidation } from "../middleware/validation.js";

router.post("/games", gameValidation.create, newGame);
router.get("/games/:id", gameValidation.getById, getGame);
router.post("/games/:id/moves", gameValidation.makeMove, makeMove);
```

### Data Rights (GDPR)

```javascript
import { 
    dataDeletionValidation, 
    dataPortabilityValidation, 
    dataAccessValidation 
} from "../middleware/validation.js";

router.delete("/data", dataDeletionValidation.delete, deleteUserData);
router.get("/data-portability", dataPortabilityValidation.export, exportUserData);
router.get("/data-access", dataAccessValidation.get, getUserData);
```

### Third Party & Compliance

```javascript
import { thirdPartyValidation, updateComplianceValidation } from "../middleware/validation.js";

router.post("/third-party/share", thirdPartyValidation.share, shareData);
router.delete("/third-party/revoke/:provider", thirdPartyValidation.revoke, revokeAccess);
router.post("/compliance/acknowledge", updateComplianceValidation.acknowledge, acknowledge);
```

## Creating Custom Validations

### Option 1: Use Common Validations

```javascript
import { commonValidations, handleValidationErrors } from "../middleware/validation.js";

const myValidation = [
    commonValidations.email,
    commonValidations.password,
    body("age").isInt({ min: 13, max: 120 }).withMessage("Age must be 13-120"),
    handleValidationErrors
];

router.post("/my-route", myValidation, myController);
```

### Option 2: Use createValidation Helper

```javascript
import { createValidation } from "../middleware/validation.js";
import { body } from "express-validator";

const myValidation = createValidation([
    body("username").isString().isLength({ min: 3, max: 20 }),
    body("bio").optional().isString().isLength({ max: 500 })
]);

router.post("/profile", myValidation, updateProfile);
```

### Option 3: Define Full Schema

```javascript
import { body, handleValidationErrors } from "../middleware/validation.js";

export const customValidation = {
    createPost: [
        body("title")
            .trim()
            .notEmpty().withMessage("Title is required")
            .isLength({ min: 5, max: 100 }).withMessage("Title must be 5-100 characters"),
        body("content")
            .trim()
            .notEmpty().withMessage("Content is required")
            .isLength({ min: 10, max: 5000 }).withMessage("Content must be 10-5000 characters"),
        body("tags")
            .optional()
            .isArray().withMessage("Tags must be an array")
            .custom((tags) => tags.every(tag => typeof tag === 'string'))
            .withMessage("All tags must be strings"),
        handleValidationErrors
    ]
};
```

## Common Validation Rules

### Email

```javascript
import { commonValidations } from "../middleware/validation.js";

// Validates, normalizes (lowercase), and trims email
commonValidations.email
```

### Password

```javascript
// Basic (min 8 chars)
commonValidations.passwordBasic

// Strict (uppercase, lowercase, number required)
commonValidations.password
```

### Username

```javascript
// 3-30 chars, alphanumeric + underscores/hyphens
commonValidations.username
```

### MongoDB ObjectId

```javascript
// Validates 24-char hex string
commonValidations.mongoId
```

### Boolean Fields

```javascript
commonValidations.boolean("fieldName")
```

### String Fields

```javascript
commonValidations.string("fieldName", minLength, maxLength)
```

### Pagination

```javascript
commonValidations.pagination.page   // ?page=1
commonValidations.pagination.limit  // ?limit=20
```

## Error Response Format

All validation errors return HTTP 400 with this structure:

```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "not-an-email",
      "location": "body"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "value": "short",
      "location": "body"
    }
  ]
}
```

## Validation Chain Methods

### Common Methods

```javascript
import { body, param, query } from "express-validator";

// Check different request parts
body("field")    // Request body
param("id")      // URL parameters (/users/:id)
query("page")    // Query string (?page=1)

// Type validation
.isString()
.isInt({ min: 1, max: 100 })
.isBoolean()
.isEmail()
.isURL()
.isUUID()
.isISO8601() // Date

// Length validation
.isLength({ min: 3, max: 50 })
.isEmpty()
.notEmpty()

// Pattern matching
.matches(/^[a-zA-Z0-9]+$/)
.isAlphanumeric()
.isNumeric()

// Enum validation
.isIn(["value1", "value2", "value3"])

// Sanitization
.trim()
.toLowerCase()
.toUpperCase()
.escape()
.normalizeEmail()
.toInt()
.toFloat()

// Optional fields
.optional()
.optional({ checkFalsy: true })

// Custom validation
.custom((value) => {
    if (value !== "expected") {
        throw new Error("Invalid value");
    }
    return true;
})

// Error messages
.withMessage("Custom error message")
```

## Security Best Practices

### 1. Always Validate User Input

```javascript
// ❌ BAD: No validation
router.post("/user", createUser);

// ✅ GOOD: Validation middleware
router.post("/user", userValidation.create, createUser);
```

### 2. Sanitize Input

```javascript
import { sanitizeInput } from "../middleware/validation.js";

const cleanedInput = sanitizeInput(req.body.comment);
```

### 3. Type Enforcement

```javascript
// Prevents NoSQL injection
body("email").isString().isEmail()  // Must be string AND email format
body("age").isInt()                  // Cannot be { $ne: null }
```

### 4. Length Limits

```javascript
// Prevents DoS attacks
body("bio").isLength({ max: 1000 })
body("username").isLength({ min: 3, max: 30 })
```

### 5. Enum Validation

```javascript
// Prevents unexpected values
body("role").isIn(["user", "admin", "moderator"])
body("status").isIn(["active", "pending", "blocked"])
```

## Testing Validation

```javascript
import request from 'supertest';
import { expect } from 'vitest';

it('should reject invalid email', async () => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'ValidPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors.some(e => e.field === 'email')).toBe(true);
});
```

## Troubleshooting

### Validation Not Running

**Problem:** Controller receives invalid data

**Solution:** Ensure middleware is applied before controller:
```javascript
// ❌ WRONG ORDER
router.post("/route", controller, validation);

// ✅ CORRECT ORDER
router.post("/route", validation, controller);
```

### Custom Validation Not Working

**Problem:** Custom validator not triggering

**Solution:** Ensure you return true or throw an error:
```javascript
// ❌ BAD
.custom((value) => {
    if (value !== "expected") {
        return false; // This doesn't work!
    }
})

// ✅ GOOD
.custom((value) => {
    if (value !== "expected") {
        throw new Error("Invalid value");
    }
    return true;
})
```

### Errors Not Formatted Correctly

**Problem:** Old error format still appears

**Solution:** Ensure handleValidationErrors is last in chain:
```javascript
const myValidation = [
    body("field1").isString(),
    body("field2").isInt(),
    handleValidationErrors  // Must be last!
];
```

## Performance Tips

1. **Reuse validation chains** instead of duplicating
2. **Use optional() for optional fields** to skip unnecessary checks
3. **Order validations** from most to least likely to fail
4. **Limit regex complexity** to avoid ReDoS attacks

## Migration Checklist

- [ ] Import validation schemas into route file
- [ ] Apply validation middleware to routes
- [ ] Remove manual `validationResult()` checks from controllers
- [ ] Remove `import { validationResult }` from controllers
- [ ] Test endpoints with invalid data
- [ ] Verify error responses match new format
- [ ] Update frontend error handling (if needed)

## Complete Example

```javascript
// routes/product.routes.js
import express from "express";
import { body, handleValidationErrors } from "../middleware/validation.js";
import { createProduct, updateProduct } from "../controllers/product.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Validation schemas
const productValidation = {
    create: [
        body("name")
            .trim()
            .notEmpty().withMessage("Product name is required")
            .isLength({ min: 3, max: 100 }).withMessage("Name must be 3-100 characters"),
        body("price")
            .isFloat({ min: 0.01 }).withMessage("Price must be greater than 0")
            .toFloat(),
        body("category")
            .isIn(["electronics", "clothing", "food"]).withMessage("Invalid category"),
        body("inStock")
            .optional()
            .isBoolean().withMessage("inStock must be boolean"),
        handleValidationErrors
    ],
    
    update: [
        body("name")
            .optional()
            .trim()
            .isLength({ min: 3, max: 100 }),
        body("price")
            .optional()
            .isFloat({ min: 0.01 })
            .toFloat(),
        handleValidationErrors
    ]
};

// Routes with validation
router.post("/", authenticateToken, productValidation.create, createProduct);
router.put("/:id", authenticateToken, productValidation.update, updateProduct);

export default router;
```

```javascript
// controllers/product.controller.js
export const createProduct = async (req, res) => {
    // No validation needed - middleware guarantees valid input
    const { name, price, category, inStock = true } = req.body;
    
    try {
        const product = await Product.create({
            name,
            price,
            category,
            inStock
        });
        
        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create product"
        });
    }
};
```

## Resources

- **Validation Middleware:** `src/middleware/validation.js`
- **Test Suite:** `tests/validation.test.js`
- **Status Report:** `VALIDATION_IMPLEMENTATION_STATUS.md`
- **express-validator Docs:** https://express-validator.github.io/docs/

---

**Need Help?** Review the status report or existing validation schemas in `src/middleware/validation.js` for more examples.
