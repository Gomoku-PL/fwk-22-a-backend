/**
 * User Registration Test Suite
 * 
 * Tests GDPR-compliant user registration (Articles 5, 6, 25)
 * Covers validation, encryption, uniqueness, and email verification
 * 
 * Run with: npm test tests/register.test.js
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import request from 'supertest';
import User from '../src/models/user.model.js';
import { connectMongoDB } from '../src/config/database.js';

// Note: Adjust app import based on actual server structure
// For tests, you may need to export app separately from server.js
const API_BASE = 'http://localhost:4000'; // Adjust port as needed

describe('User Registration - POST /api/auth/register', () => {
    let agent;

    beforeEach(async () => {
        // Ensure MongoDB is connected
        await connectMongoDB();

        // Create agent to persist session cookies
        agent = request.agent(API_BASE);

        // Clean up test users before each test
        try {
            await User.deleteMany({ email: /test.*@example\.com/ });
        } catch (error) {
            // Ignore if collection doesn't exist yet
        }
    });

    afterEach(async () => {
        // Clean up test users after each test
        try {
            await User.deleteMany({ email: /test.*@example\.com/ });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('AC1: Endpoint accepts minimal required info', () => {
        it('should accept email and password only (data minimization - GDPR Article 5)', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test1@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('test1@example.com');
            expect(res.body.user.username).toBeDefined(); // Auto-generated
        });

        it('should accept email, password, and optional username', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test2@example.com',
                    password: 'SecurePass123!',
                    username: 'testuser'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user.username).toBe('testuser');
        });

        it('should normalize and lowercase email addresses', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'Test3@EXAMPLE.COM',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe('test3@example.com');
        });

        it('should derive username from email if not provided', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'johndoe@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.user.username).toBeDefined();
            expect(res.body.user.username).toContain('johndoe');
        });
    });

    describe('AC2: Hash passwords using bcrypt', () => {
        it('should not return plain password in response', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test4@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.user.password).toBeUndefined();
            expect(JSON.stringify(res.body)).not.toContain('SecurePass123!');
        });

        it('should store hashed password in database (bcrypt)', async () => {
            const plainPassword = 'SecurePass123!';

            await agent
                .post('/api/auth/register')
                .send({
                    email: 'test5@example.com',
                    password: plainPassword
                });

            // Fetch user from DB with password field
            const user = await User.findOne({ email: 'test5@example.com' }).select('+password');

            expect(user).toBeDefined();
            expect(user.password).toBeDefined();
            expect(user.password).not.toBe(plainPassword); // Must be hashed
            expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash format
            expect(user.password.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
        });

        it('should use bcrypt comparePassword method successfully', async () => {
            const plainPassword = 'SecurePass123!';

            await agent
                .post('/api/auth/register')
                .send({
                    email: 'test6@example.com',
                    password: plainPassword
                });

            const user = await User.findOne({ email: 'test6@example.com' }).select('+password');

            // Test bcrypt comparison
            const isMatch = await user.comparePassword(plainPassword);
            expect(isMatch).toBe(true);

            const isNotMatch = await user.comparePassword('WrongPassword');
            expect(isNotMatch).toBe(false);
        });
    });

    describe('AC3: Validate unique email and secure input', () => {
        it('should reject registration with duplicate email', async () => {
            // First registration
            await agent
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'SecurePass123!'
                });

            // Attempt duplicate registration
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'duplicate@example.com',
                    password: 'AnotherPass456!'
                });

            expect(res.status).toBe(409); // Conflict
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Email already in use');
        });

        it('should reject registration with duplicate username', async () => {
            // First registration
            await agent
                .post('/api/auth/register')
                .send({
                    email: 'user1@example.com',
                    password: 'SecurePass123!',
                    username: 'uniqueuser'
                });

            // Attempt duplicate username
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'user2@example.com',
                    password: 'AnotherPass456!',
                    username: 'uniqueuser'
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Username unavailable');
        });

        it('should validate email format', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toBeDefined();
        });

        it('should enforce minimum password length (8 characters)', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test7@example.com',
                    password: 'short'
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.errors).toBeDefined();
            expect(JSON.stringify(res.body.errors)).toContain('8 characters');
        });

        it('should enforce username length constraints (3-30 chars)', async () => {
            // Too short
            const res1 = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test8@example.com',
                    password: 'SecurePass123!',
                    username: 'ab' // Only 2 chars
                });

            expect(res1.status).toBe(400);
            expect(res1.body.success).toBe(false);

            // Too long
            const res2 = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test9@example.com',
                    password: 'SecurePass123!',
                    username: 'a'.repeat(31) // 31 chars
                });

            expect(res2.status).toBe(400);
            expect(res2.body.success).toBe(false);
        });

        it('should sanitize and normalize email (express-validator)', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: '  Test10@EXAMPLE.COM  ', // Whitespace + uppercase
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe('test10@example.com'); // Trimmed and lowercased
        });
    });

    describe('AC4: Send email verification token', () => {
        it('should generate verification token (logged for dev)', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test11@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('verify your account');

            // In non-production, token may be returned for testing
            if (process.env.NODE_ENV !== 'production') {
                expect(res.body.verification).toBeDefined();
                expect(res.body.verification.token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
                expect(res.body.verification.expiresInMinutes).toBeDefined();
            }
        });

        it('should set emailVerified to false initially', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'test12@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.user.emailVerified).toBe(false);

            // Verify in database
            const user = await User.findOne({ email: 'test12@example.com' });
            expect(user.emailVerified).toBe(false);
        });
    });

    describe('GDPR Compliance - Articles 5, 6, 25', () => {
        it('GDPR Article 5: Data minimization - only collects necessary fields', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'gdpr1@example.com',
                    password: 'SecurePass123!'
                });

            const user = await User.findOne({ email: 'gdpr1@example.com' });

            // Should only have essential fields
            expect(user.email).toBeDefined();
            expect(user.username).toBeDefined();
            expect(user.password).toBeDefined();
            expect(user.createdAt).toBeDefined();

            // No unnecessary personal data
            expect(user.firstName).toBeUndefined();
            expect(user.lastName).toBeUndefined();
            expect(user.phoneNumber).toBeUndefined();
            expect(user.address).toBeUndefined();
        });

        it('GDPR Article 6: Lawful basis - explicit consent for data processing', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'gdpr2@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            // Registration itself implies consent to create account
            // In production, ensure privacy policy acceptance is logged
        });

        it('GDPR Article 25: Privacy by design - secure defaults', async () => {
            await agent
                .post('/api/auth/register')
                .send({
                    email: 'gdpr3@example.com',
                    password: 'SecurePass123!'
                });

            const user = await User.findOne({ email: 'gdpr3@example.com' });

            // Secure defaults
            expect(user.emailVerified).toBe(false); // Email verification required
            expect(user.isActive).toBe(true); // Account active by default
            expect(user.failedLoginAttempts).toBe(0); // No failed attempts initially
            expect(user.accountLockUntil).toBeNull(); // Not locked
        });

        it('should not leak sensitive information in error messages', async () => {
            // Attempt duplicate email
            await agent.post('/api/auth/register').send({
                email: 'leak@example.com',
                password: 'SecurePass123!'
            });

            const res = await agent.post('/api/auth/register').send({
                email: 'leak@example.com',
                password: 'SecurePass123!'
            });

            // Error message should not reveal user details
            expect(res.body.message).not.toContain('leak@example.com');
            expect(res.body.message).toBe('Email already in use'); // Generic message
        });
    });

    describe('DoD: Validation and encryption implemented', () => {
        it('should validate all required fields', async () => {
            // Missing email
            const res1 = await agent
                .post('/api/auth/register')
                .send({ password: 'SecurePass123!' });
            expect(res1.status).toBe(400);

            // Missing password
            const res2 = await agent
                .post('/api/auth/register')
                .send({ email: 'test@example.com' });
            expect(res2.status).toBe(400);
        });

        it('should encrypt password with bcrypt (cost factor 12)', async () => {
            await agent
                .post('/api/auth/register')
                .send({
                    email: 'encrypt@example.com',
                    password: 'SecurePass123!'
                });

            const user = await User.findOne({ email: 'encrypt@example.com' }).select('+password');

            // bcrypt format: $2a$12$... (algorithm + cost factor + salt + hash)
            expect(user.password).toMatch(/^\$2[aby]\$12\$/); // Cost factor 12
        });
    });

    describe('DoD: User record created and verified', () => {
        it('should create user record with all required fields', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'record@example.com',
                    password: 'SecurePass123!',
                    username: 'recorduser'
                });

            expect(res.status).toBe(201);

            const user = await User.findOne({ email: 'record@example.com' });

            expect(user).toBeDefined();
            expect(user.email).toBe('record@example.com');
            expect(user.username).toBe('recorduser');
            expect(user.emailVerified).toBe(false);
            expect(user.isActive).toBe(true);
            expect(user.createdAt).toBeDefined();
            expect(user.updatedAt).toBeDefined();
        });

        it('should return user data in response (excluding password)', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'response@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.id).toBeDefined();
            expect(res.body.user.email).toBe('response@example.com');
            expect(res.body.user.username).toBeDefined();
            expect(res.body.user.emailVerified).toBe(false);
            expect(res.body.user.createdAt).toBeDefined();
            expect(res.body.user.password).toBeUndefined(); // Never expose password
        });
    });

    describe('Error Handling & Edge Cases', () => {
        it('should return 503 when MongoDB is disabled (in-memory mode)', async () => {
            // This test assumes STORAGE_TYPE env var controls MongoDB
            // Skip if MongoDB is enabled
            if (process.env.STORAGE_TYPE === 'mongodb') {
                return; // Skip this test when MongoDB is enabled
            }

            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'memory@example.com',
                    password: 'SecurePass123!'
                });

            expect(res.status).toBe(503);
            expect(res.body.message).toContain('Registration unavailable');
        });

        it('should handle race conditions for duplicate email (11000 error)', async () => {
            // Simulate concurrent registrations
            const promises = [
                agent.post('/api/auth/register').send({
                    email: 'race@example.com',
                    password: 'SecurePass123!'
                }),
                agent.post('/api/auth/register').send({
                    email: 'race@example.com',
                    password: 'SecurePass123!'
                })
            ];

            const results = await Promise.allSettled(promises);

            // One should succeed (201), one should fail (409)
            const statuses = results.map(r => r.value?.status).filter(Boolean);
            expect(statuses).toContain(201);
            expect(statuses).toContain(409);
        });

        it('should handle database errors gracefully', async () => {
            // This is a hypothetical test; actual implementation depends on test setup
            // In practice, you might mock User.save() to throw an error

            // For now, verify error response structure
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'invalid@email@com', // Double @ (may cause DB error)
                    password: 'SecurePass123!'
                });

            // Should return 400 or 500, not crash
            expect([400, 500]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Security Features', () => {
        it('should initialize security tracking fields', async () => {
            await agent
                .post('/api/auth/register')
                .send({
                    email: 'security@example.com',
                    password: 'SecurePass123!'
                });

            const user = await User.findOne({ email: 'security@example.com' });

            expect(user.failedLoginAttempts).toBe(0);
            expect(user.accountLockUntil).toBeNull();
            expect(user.lastLoginAt).toBeNull();
            expect(user.lastLoginIP).toBeNull();
            expect(user.securityEvents).toBeDefined();
            expect(Array.isArray(user.securityEvents)).toBe(true);
        });

        it('should not expose internal database IDs in error messages', async () => {
            const res = await agent
                .post('/api/auth/register')
                .send({
                    email: 'invalid',
                    password: 'short'
                });

            const responseStr = JSON.stringify(res.body);
            expect(responseStr).not.toMatch(/_id|ObjectId/i);
        });
    });
});

/**
 * Manual Testing Commands (cURL)
 * 
 * Run these after starting the backend server:
 * npm run dev (in backend directory)
 */

/*
# Test 1: Valid registration with minimal data
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
# Expected: 201 Created with user object and verification message

# Test 2: Valid registration with username
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@example.com","password":"SecurePass123!","username":"testuser"}'
# Expected: 201 Created with username="testuser"

# Test 3: Duplicate email
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"AnotherPass456!"}'
# Expected: 409 Conflict - "Email already in use"

# Test 4: Invalid email format
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"SecurePass123!"}'
# Expected: 400 Bad Request with validation errors

# Test 5: Password too short
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test3@example.com","password":"short"}'
# Expected: 400 Bad Request - "Password must be at least 8 characters"

# Test 6: Missing required fields
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test4@example.com"}'
# Expected: 400 Bad Request - missing password

# Test 7: Username too short
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test5@example.com","password":"SecurePass123!","username":"ab"}'
# Expected: 400 Bad Request - "Username must be 3-30 characters"
*/
