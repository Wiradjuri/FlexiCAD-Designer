#!/usr/bin/env node
/**
 * Phase 4.7.16 Verification Script
 * 
 * Verifies dev token authentication is working correctly:
 * - Checks environment variables
 * - Tests SSE endpoint
 * - Tests admin health endpoint
 * - Provides troubleshooting guidance
 * 
 * Usage: node tests/verify-dev-tokens.mjs
 */

import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888';

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

function checkEnv() {
  log('cyan', '\n📋 Environment Check\n');
  
  const required = [
    'APP_ENV',
    'DEV_BEARER_TOKEN',
    'DEV_ADMIN_TOKEN',
    'ADMIN_EMAILS'
  ];
  
  let allPresent = true;
  
  for (const key of required) {
    const value = process.env[key];
    if (value) {
      const display = key.includes('TOKEN') 
        ? `${value.substring(0, 30)}...` 
        : value;
      log('green', `  ✅ ${key}: ${display}`);
    } else {
      log('red', `  ❌ ${key}: NOT SET`);
      allPresent = false;
    }
  }
  
  if (!allPresent) {
    log('yellow', '\n⚠️  Missing environment variables!');
    log('yellow', '   Add them to .env or export in shell\n');
    return false;
  }
  
  // Check APP_ENV is development
  if (process.env.APP_ENV !== 'development') {
    log('yellow', `\n⚠️  APP_ENV is '${process.env.APP_ENV}', should be 'development'`);
    return false;
  }
  
  log('green', '\n✅ All environment variables present\n');
  return true;
}

async function testEndpoint(name, path, token, expectOk = true) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    
    log('blue', `\n🧪 Testing ${name}`);
    log('cyan', `   ${url.href}`);
    
    const req = http.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      log('cyan', `   Response: ${res.statusCode} ${res.statusMessage}`);
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // For SSE, check content type
        if (path.includes('generate-design-stream')) {
          const contentType = res.headers['content-type'] || '';
          if (contentType.includes('text/event-stream')) {
            log('green', `   ✅ SSE stream response (Content-Type: ${contentType})`);
            resolve(true);
            return;
          }
        }
        
        // For JSON responses
        try {
          const data = JSON.parse(body);
          log('cyan', `   Body: ${JSON.stringify(data, null, 2)}`);
          
          if (res.statusCode === 200 && data.ok) {
            log('green', `   ✅ Success (200 OK, ok: true)`);
            resolve(true);
          } else if (res.statusCode === 403 && data.code === 'admin_required') {
            log('green', `   ✅ Expected 403 (admin check working)`);
            resolve(true);
          } else if (res.statusCode === 401) {
            log('red', `   ❌ Unauthorized (401) - Token may be expired or invalid`);
            resolve(false);
          } else {
            log('yellow', `   ⚠️  Unexpected: ${res.statusCode}, ok: ${data.ok}`);
            resolve(false);
          }
        } catch (err) {
          log('yellow', `   ⚠️  Non-JSON response or parse error`);
          log('cyan', `   Raw: ${body.substring(0, 200)}`);
          resolve(res.statusCode === 200);
        }
      });
    });
    
    req.on('error', (err) => {
      log('red', `   ❌ Request error: ${err.message}`);
      log('yellow', `   Is netlify dev running?`);
      resolve(false);
    });
  });
}

async function runTests() {
  log('cyan', '\n╔════════════════════════════════════════════════════════╗');
  log('cyan', '║   Phase 4.7.16 Dev Token Verification                 ║');
  log('cyan', '╚════════════════════════════════════════════════════════╝');
  
  // Check environment
  const envOk = checkEnv();
  if (!envOk) {
    log('red', '\n❌ Environment check failed\n');
    log('yellow', 'Fix: Add missing variables to .env\n');
    process.exit(1);
  }
  
  // Test endpoints
  const tests = [
    {
      name: 'SSE Progress Endpoint',
      path: '/.netlify/functions/generate-design-stream',
      token: process.env.DEV_BEARER_TOKEN
    },
    {
      name: 'Admin Health Endpoint',
      path: '/.netlify/functions/admin-health',
      token: process.env.DEV_ADMIN_TOKEN
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.path, test.token);
    results.push({ name: test.name, passed: result });
  }
  
  // Summary
  log('cyan', '\n╔════════════════════════════════════════════════════════╗');
  log('cyan', '║   Test Summary                                         ║');
  log('cyan', '╚════════════════════════════════════════════════════════╝\n');
  
  const allPassed = results.every(r => r.passed);
  
  for (const result of results) {
    if (result.passed) {
      log('green', `  ✅ ${result.name}`);
    } else {
      log('red', `  ❌ ${result.name}`);
    }
  }
  
  if (allPassed) {
    log('green', '\n🎉 All tests passed! Dev tokens working correctly.\n');
    process.exit(0);
  } else {
    log('red', '\n❌ Some tests failed\n');
    log('yellow', 'Troubleshooting:');
    log('yellow', '  1. Check if tokens are expired (get fresh JWT from browser)');
    log('yellow', '  2. Verify ADMIN_EMAILS includes your email');
    log('yellow', '  3. Ensure APP_ENV=development');
    log('yellow', '  4. Restart: netlify dev --force');
    log('yellow', '  5. Check function logs for errors\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  log('red', `\n💥 Verification failed: ${err.message}\n`);
  process.exit(1);
});
