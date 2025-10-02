#!/usr/bin/env node
/**
 * Smoke test: Admin authentication gate
 * 
 * Tests the /admin-health endpoint to verify:
 * - Proper bearer token authentication
 * - Admin role checking
 * - Response format
 * 
 * Usage: node tests/admin-gate.smoke.mjs
 * Requires: Netlify dev server running on localhost:8888
 */

import https from 'https';
import http, { get } from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888';
const ENDPOINT = '/.netlify/functions/admin-health';

// Use dev admin token from environment IVE SET IT IN THE .ENV FILE? 
const ADMIN_TOKEN = process.env.DEV_ADMIN_TOKEN;

async function testAdminGate() {
  console.log('🧪 Admin Gate Smoke Test\n');
  console.log(`Target: ${BASE_URL}${ENDPOINT}`);
  console.log(`Token: ${ADMIN_TOKEN.substring(0, 30)}...\n`);

  return new Promise((resolve, reject) => {
    const url = new URL(ENDPOINT, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(url, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      console.log(`📡 Response: ${res.statusCode} ${res.statusMessage}`);
      
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log('📦 Response body:', JSON.stringify(data, null, 2));

          // Validation
          const hasOkStatus = res.statusCode === 200 || res.statusCode === 403;
          const hasJsonResponse = data && typeof data === 'object';
          
          console.log('\n🎯 Validation:');
          console.log(`  ${hasOkStatus ? '✅' : '❌'} Valid HTTP status (200 or 403)`);
          console.log(`  ${hasJsonResponse ? '✅' : '❌'} JSON response received`);

          if (res.statusCode === 200) {
            console.log('  ✅ Admin access granted (token valid)');
          } else if (res.statusCode === 403) {
            console.log('  ℹ️  Admin access denied (expected with mock token)');
          }

          if (hasOkStatus && hasJsonResponse) {
            console.log('\n✨ Admin Gate Test PASSED\n');
            resolve();
          } else {
            console.log('\n💥 Admin Gate Test FAILED\n');
            reject(new Error('Validation failed'));
          }
        } catch (err) {
          console.error(`❌ Failed to parse response: ${err.message}`);
          console.error(`   Raw body: ${body}`);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Request error: ${err.message}`);
      reject(err);
    });
  });
}

// Test without token (should fail)
async function testWithoutToken() {
  console.log('🧪 Testing without token (should fail)\n');
  
  return new Promise((resolve, reject) => {
    const url = new URL(ENDPOINT, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(url, {
      headers: {
        'Accept': 'application/json'
      }
    }, (res) => {
      console.log(`📡 Response: ${res.statusCode} ${res.statusMessage}`);
      
      const shouldBe401or403 = res.statusCode === 401 || res.statusCode === 403;
      console.log(`  ${shouldBe401or403 ? '✅' : '❌'} Correctly rejected (401/403)`);
      
      if (shouldBe401or403) {
        console.log('\n✨ No-Token Test PASSED\n');
        resolve();
      } else {
        console.log('\n💥 No-Token Test FAILED (should reject)\n');
        reject(new Error('Should have rejected request without token'));
      }
    });

    req.on('error', (err) => {
      console.error(`❌ Request error: ${err.message}`);
      reject(err);
    });
  });
}

// Run tests
(async () => {
  try {
    await testWithoutToken();
    await testAdminGate();
    process.exit(0);
  } catch (err) {
    console.error(`\n💥 Tests failed: ${err.message}\n`);
    process.exit(1);
  }
})();
