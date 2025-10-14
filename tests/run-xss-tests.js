#!/usr/bin/env node

/**
 * XSS Test Runner
 * Executes all XSS protection tests
 */

import { runXSSTests } from './xss.test.js';

console.log('🛡️  XSS Protection Test Suite');
console.log('================================');

// Run the tests
const results = runXSSTests();

// Exit with appropriate code
if (results.failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}