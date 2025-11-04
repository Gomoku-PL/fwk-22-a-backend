/**
 * CSRF Protection Test Suite
 * 
 * Tests CSRF token generation, validation, and rotation across state-changing endpoints.
 * Covers acceptance criteria: token per session, validation before execution, error handling.
 * 
 * Run with: npm test csrf.test.js
 */

import { describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js'; // Adjust path if needed

describe('CSRF Protection', () => {
    let agent;
    let csrfToken;

    beforeEach(() => {
        // Create agent to persist session cookies across requests
        agent = request.agent(app);
    });

    describe('Token Generation', () => {
        it('should generate CSRF token on first request', async () => {
            const res = await agent.get('/api/health');

            csrfToken = res.headers['x-csrf-token'];
            expect(csrfToken).toBeDefined();
            expect(csrfToken).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
            expect(res.status).toBe(200);
        });

        it('should return same token for subsequent GET requests in same session', async () => {
            // First request
            const res1 = await agent.get('/api/health');
            const token1 = res1.headers['x-csrf-token'];

            // Second request (same session)
            const res2 = await agent.get('/api/health');
            const token2 = res2.headers['x-csrf-token'];

            expect(token1).toBe(token2);
        });

        it('should generate different tokens for different sessions', async () => {
            const agent1 = request.agent(app);
            const agent2 = request.agent(app);

            const res1 = await agent1.get('/api/health');
            const res2 = await agent2.get('/api/health');

            const token1 = res1.headers['x-csrf-token'];
            const token2 = res2.headers['x-csrf-token'];

            expect(token1).not.toBe(token2);
        });
    });

    describe('Token Validation - Safe Methods', () => {
        it('should allow GET requests without CSRF token', async () => {
            const res = await agent.get('/api/health');
            expect(res.status).toBe(200);
        });

        it('should allow HEAD requests without CSRF token', async () => {
            const res = await agent.head('/api/health');
            expect(res.status).toBe(200);
        });

        it('should allow OPTIONS requests without CSRF token', async () => {
            const res = await agent.options('/api/health');
            expect(res.status).not.toBe(403); // Should not reject for CSRF
        });
    });

    describe('Token Validation - State-Changing Methods', () => {
        beforeEach(async () => {
            // Get CSRF token before each test
            const res = await agent.get('/api/health');
            csrfToken = res.headers['x-csrf-token'];
        });

        it('should reject POST request without CSRF token', async () => {
            const res = await agent
                .post('/api/data')
                .send({ test: 'data' });

            expect(res.status).toBe(403);
            expect(res.body.code).toBe('CSRF_MISSING');
            expect(res.body.message).toContain('CSRF token missing');
        });

        it('should reject DELETE request without CSRF token', async () => {
            const res = await agent.delete('/api/data');

            expect(res.status).toBe(403);
            expect(res.body.code).toBe('CSRF_MISSING');
        });

        it('should reject PUT request without CSRF token', async () => {
            const res = await agent
                .put('/api/games/test-id')
                .send({ name: 'Updated' });

            expect(res.status).toBe(403);
            expect(res.body.code).toBe('CSRF_MISSING');
        });

        it('should reject PATCH request without CSRF token', async () => {
            const res = await agent
                .patch('/api/games/test-id')
                .send({ name: 'Patched' });

            expect(res.status).toBe(403);
            expect(res.body.code).toBe('CSRF_MISSING');
        });

        it('should reject request with invalid CSRF token', async () => {
            const res = await agent
                .post('/api/data')
                .set('X-CSRF-Token', 'invalid-token-12345')
                .send({ test: 'data' });

            expect(res.status).toBe(403);
            expect(res.body.code).toBe('CSRF_INVALID');
            expect(res.body.message).toContain('Invalid CSRF token');
        });

        it('should accept POST request with valid CSRF token', async () => {
            const res = await agent
                .post('/api/data')
                .set('X-CSRF-Token', csrfToken)
                .send({ test: 'data' });

            // Note: May still fail due to other validations (auth, business logic)
            // but should NOT fail with CSRF error
            expect(res.status).not.toBe(403);
            if (res.status === 403) {
                expect(res.body.code).not.toBe('CSRF_MISSING');
                expect(res.body.code).not.toBe('CSRF_INVALID');
            }
        });

        it('should accept DELETE request with valid CSRF token', async () => {
            const res = await agent
                .delete('/api/data')
                .set('X-CSRF-Token', csrfToken);

            expect(res.status).not.toBe(403);
            if (res.status === 403) {
                expect(res.body.code).not.toMatch(/CSRF/);
            }
        });
    });

    describe('Token Rotation', () => {
        it('should rotate CSRF token after login', async () => {
            // Get initial token
            const res1 = await agent.get('/api/health');
            const initialToken = res1.headers['x-csrf-token'];

            // Login (replace with valid credentials from your test database)
            const loginRes = await agent
                .post('/api/auth/login')
                .send({
                    identifier: 'test@example.com',
                    password: 'TestPassword123!'
                });

            // Get new token from login response
            const newToken = loginRes.body.data?.csrfToken;

            // Verify token was rotated
            expect(newToken).toBeDefined();
            expect(newToken).not.toBe(initialToken);
            expect(newToken).toMatch(/^[0-9a-f]{64}$/);
        });

        it('should reject old token after rotation', async () => {
            // Get initial token
            const res1 = await agent.get('/api/health');
            const oldToken = res1.headers['x-csrf-token'];

            // Login to rotate token
            await agent
                .post('/api/auth/login')
                .send({
                    identifier: 'test@example.com',
                    password: 'TestPassword123!'
                });

            // Try to use old token - should fail
            const res2 = await agent
                .post('/api/data')
                .set('X-CSRF-Token', oldToken)
                .send({ test: 'data' });

            expect(res2.status).toBe(403);
            expect(res2.body.code).toBe('CSRF_INVALID');
        });
    });

    describe('Session Validation', () => {
        it('should reject request without session cookie', async () => {
            // Make request without agent (no session persistence)
            const res = await request(app)
                .post('/api/data')
                .set('X-CSRF-Token', 'some-token-value')
                .send({ test: 'data' });

            expect(res.status).toBe(403);
            expect(res.body.code).toBe('CSRF_SESSION_MISSING');
        });

        it('should reject request when CSRF token not in session', async () => {
            // Create new session but don't fetch token first
            const newAgent = request.agent(app);

            const res = await newAgent
                .post('/api/data')
                .set('X-CSRF-Token', '1234567890abcdef')
                .send({ test: 'data' });

            expect(res.status).toBe(403);
            expect(res.body.code).toMatch(/CSRF_/);
        });
    });

    describe('Coverage - Protected Endpoints', () => {
        beforeEach(async () => {
            const res = await agent.get('/api/health');
            csrfToken = res.headers['x-csrf-token'];
        });

        const protectedEndpoints = [
            { method: 'post', path: '/api/auth/register', body: { email: 'test@test.com', password: 'Pass123!' } },
            { method: 'post', path: '/api/auth/logout', body: {} },
            { method: 'delete', path: '/api/data', body: {} },
            { method: 'post', path: '/api/data/request', body: { dataTypes: ['profile'] } },
            { method: 'post', path: '/api/consent', body: { type: 'marketing', granted: true } },
            { method: 'put', path: '/api/consent/marketing', body: { granted: false } },
            { method: 'delete', path: '/api/consent/marketing', body: {} },
        ];

        protectedEndpoints.forEach(({ method, path, body }) => {
            it(`should protect ${method.toUpperCase()} ${path}`, async () => {
                const resWithoutToken = await agent[method](path).send(body);
                expect(resWithoutToken.status).toBe(403);
                expect(resWithoutToken.body.code).toMatch(/CSRF_/);

                const resWithToken = await agent[method](path)
                    .set('X-CSRF-Token', csrfToken)
                    .send(body);
                // Should not fail due to CSRF (may fail for other reasons)
                if (resWithToken.status === 403) {
                    expect(resWithToken.body.code).not.toMatch(/CSRF_/);
                }
            });
        });
    });

    describe('Timing-Safe Comparison', () => {
        it('should use constant-time comparison to prevent timing attacks', async () => {
            const res1 = await agent.get('/api/health');
            const validToken = res1.headers['x-csrf-token'];

            // Create token with same prefix but different suffix
            const similarToken = validToken.substring(0, 60) + 'abcd';

            const start1 = Date.now();
            await agent
                .post('/api/data')
                .set('X-CSRF-Token', similarToken)
                .send({ test: 'data' });
            const time1 = Date.now() - start1;

            // Completely different token
            const start2 = Date.now();
            await agent
                .post('/api/data')
                .set('X-CSRF-Token', '0000000000000000000000000000000000000000000000000000000000000000')
                .send({ test: 'data' });
            const time2 = Date.now() - start2;

            // Timing difference should be minimal (< 50ms threshold)
            // This is not a perfect test but checks for obvious timing leaks
            const timingDiff = Math.abs(time1 - time2);
            expect(timingDiff).toBeLessThan(50);
        });
    });
});

/**
 * Manual Testing Commands (Bash/Git Bash)
 * 
 * 1. Start backend: npm start
 * 2. Run curl tests below
 */

/*
# Test 1: Get CSRF token
curl -c cookies.txt -v http://localhost:4000/api/health
# Look for: X-CSRF-Token: <64-char-hex-string>

# Test 2: Valid token (should succeed - may need auth)
curl -b cookies.txt -X DELETE http://localhost:4000/api/data \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <paste-token-from-test-1>"
# Expected: 200 or 401/other non-CSRF error

# Test 3: Missing token (should fail with CSRF_MISSING)
curl -b cookies.txt -X DELETE http://localhost:4000/api/data \
  -H "Content-Type: application/json"
# Expected: {"success":false,"message":"CSRF token missing","code":"CSRF_MISSING"}

# Test 4: Invalid token (should fail with CSRF_INVALID)
curl -b cookies.txt -X DELETE http://localhost:4000/api/data \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: invalid123"
# Expected: {"success":false,"message":"Invalid CSRF token","code":"CSRF_INVALID"}

# Test 5: No session (should fail with CSRF_SESSION_MISSING)
curl -X DELETE http://localhost:4000/api/data \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: anytoken"
# Expected: {"success":false,"message":"CSRF validation failed: session not found","code":"CSRF_SESSION_MISSING"}

# Test 6: Login and token rotation
curl -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"your@email.com","password":"YourPassword123"}'
# Check response: data.csrfToken should be present
# Subsequent requests should use this new token
*/
