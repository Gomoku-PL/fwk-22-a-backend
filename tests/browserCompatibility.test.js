/**
 * Browser Compatibility Tests
 * GDPR Endpoint Validation Across Browsers
 * 
 * Tests all GDPR-related backend endpoints to ensure:
 * - Consistent API responses across browsers
 * - CORS headers properly configured
 * - Authentication works correctly
 * - Cookie handling is consistent
 * - Error responses are uniform
 */

import { expect } from "chai";
import fetch from "node-fetch";

// Test configuration
const API_BASE_URL = process.env.API_URL || "http://localhost:3001";
const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword123!",
  username: "testuser",
};

// Simulated browser user-agents
const BROWSERS = {
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
};

describe("Browser Compatibility Tests - GDPR Endpoints", function () {
  this.timeout(10000); // Increase timeout for network requests

  let authToken = null;

  /**
   * Helper: Make API request with specific browser user-agent
   */
  async function apiRequest(
    endpoint,
    options = {},
    browser = "chrome"
  ) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": BROWSERS[browser],
      ...options.headers,
    };

    if (authToken && !options.noAuth) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    };
  }

  /**
   * Test CORS headers across browsers
   */
  describe("CORS Configuration", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should handle CORS correctly for ${browser}`, async () => {
        const response = await apiRequest("/api/health", {}, browser);

        // Check CORS headers
        expect(response.headers).to.have.property("access-control-allow-origin");
        expect(response.headers).to.have.property("access-control-allow-credentials");

        // Verify response
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property("success", true);
      });
    });
  });

  /**
   * Test authentication endpoints
   */
  describe("Authentication Endpoints", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should register user correctly on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/auth/register",
          {
            method: "POST",
            body: JSON.stringify({
              ...TEST_USER,
              email: `${browser}_${TEST_USER.email}`,
            }),
          },
          browser
        );

        expect(response.status).to.be.oneOf([200, 201, 409]); // 409 if user exists
        expect(response.data).to.have.property("success");
      });

      it(`should login user correctly on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify({
              email: TEST_USER.email,
              password: TEST_USER.password,
            }),
          },
          browser
        );

        if (response.status === 200) {
          expect(response.data).to.have.property("accessToken");
          if (browser === "chrome") {
            authToken = response.data.accessToken; // Save for subsequent tests
          }
        }
      });
    });
  });

  /**
   * Test consent management endpoints
   */
  describe("Consent Management", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should retrieve consent preferences on ${browser}`, async () => {
        const response = await apiRequest("/api/consent", {}, browser);

        expect(response.status).to.be.oneOf([200, 401]); // 401 if not authenticated
        expect(response.data).to.have.property("success");
      });

      it(`should update consent preferences on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/consent",
          {
            method: "PUT",
            body: JSON.stringify({
              analytics: true,
              marketing: false,
              necessary: true,
            }),
          },
          browser
        );

        expect(response.status).to.be.oneOf([200, 401]);
        expect(response.data).to.have.property("success");
      });
    });
  });

  /**
   * Test data access endpoints (Right to Access)
   */
  describe("Data Access - GDPR Article 15", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should retrieve user data on ${browser}`, async () => {
        const response = await apiRequest("/api/data/access", {}, browser);

        expect(response.status).to.be.oneOf([200, 401]);
        expect(response.data).to.have.property("success");

        if (response.status === 200) {
          expect(response.data).to.have.property("data");
        }
      });
    });
  });

  /**
   * Test data portability endpoints (Right to Data Portability)
   */
  describe("Data Portability - GDPR Article 20", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should request data export on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/data/export",
          {
            method: "POST",
            body: JSON.stringify({
              format: "json",
            }),
          },
          browser
        );

        expect(response.status).to.be.oneOf([200, 202, 401]);
        expect(response.data).to.have.property("success");
      });
    });
  });

  /**
   * Test data deletion endpoints (Right to Erasure)
   */
  describe("Data Deletion - GDPR Article 17", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should request data deletion on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/data/delete",
          {
            method: "DELETE",
            body: JSON.stringify({
              confirmation: "DELETE",
            }),
          },
          browser
        );

        expect(response.status).to.be.oneOf([200, 202, 401]);
        expect(response.data).to.have.property("success");
      });
    });
  });

  /**
   * Test consent audit logs
   */
  describe("Consent Audit Logs", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should retrieve consent logs on ${browser}`, async () => {
        const response = await apiRequest("/api/consent/logs", {}, browser);

        expect(response.status).to.be.oneOf([200, 401]);
        expect(response.data).to.have.property("success");

        if (response.status === 200) {
          expect(response.data).to.have.property("logs");
        }
      });
    });
  });

  /**
   * Test data retention policies
   */
  describe("Data Retention", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should retrieve retention status on ${browser}`, async () => {
        const response = await apiRequest("/api/data/retention", {}, browser);

        expect(response.status).to.be.oneOf([200, 401]);
        expect(response.data).to.have.property("success");
      });
    });
  });

  /**
   * Test error handling consistency
   */
  describe("Error Handling Consistency", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should return consistent 404 error on ${browser}`, async () => {
        const response = await apiRequest("/api/nonexistent", {}, browser);

        expect(response.status).to.equal(404);
        expect(response.data).to.have.property("success", false);
        expect(response.data).to.have.property("message");
      });

      it(`should return consistent 401 error on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/consent",
          { noAuth: true },
          browser
        );

        if (response.status === 401) {
          expect(response.data).to.have.property("success", false);
          expect(response.data).to.have.property("message");
        }
      });

      it(`should return consistent validation error on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/auth/register",
          {
            method: "POST",
            body: JSON.stringify({
              email: "invalid-email",
              password: "123", // Too short
            }),
          },
          browser
        );

        expect(response.status).to.be.oneOf([400, 422]);
        expect(response.data).to.have.property("success", false);
      });
    });
  });

  /**
   * Test response time consistency
   */
  describe("Performance Consistency", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should respond within acceptable time on ${browser}`, async () => {
        const startTime = Date.now();
        await apiRequest("/api/health", {}, browser);
        const duration = Date.now() - startTime;

        expect(duration).to.be.lessThan(5000); // 5 seconds max
      });
    });
  });

  /**
   * Test cookie handling
   */
  describe("Cookie Handling", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should set cookies correctly on ${browser}`, async () => {
        const response = await apiRequest(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify(TEST_USER),
          },
          browser
        );

        if (response.status === 200) {
          expect(response.headers).to.have.property("set-cookie");
        }
      });
    });
  });

  /**
   * Test security headers
   */
  describe("Security Headers", () => {
    Object.keys(BROWSERS).forEach((browser) => {
      it(`should include security headers on ${browser}`, async () => {
        const response = await apiRequest("/api/health", {}, browser);

        // Check for important security headers
        expect(response.headers).to.have.property("x-content-type-options");
        expect(response.headers).to.have.property("x-frame-options");
        
        // Verify CORS headers
        if (response.headers["access-control-allow-origin"]) {
          expect(response.headers["access-control-allow-origin"]).to.be.a("string");
        }
      });
    });
  });

  /**
   * Summary report
   */
  after(function () {
    console.log("\n=== Browser Compatibility Test Summary ===");
    console.log(`Tested browsers: ${Object.keys(BROWSERS).join(", ")}`);
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log("==========================================\n");
  });
});

/**
 * Run tests
 * Usage: npm test -- tests/browserCompatibility.test.js
 */
export default describe;
