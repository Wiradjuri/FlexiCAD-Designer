#!/usr/bin/env node
/**
 * Smoke test: SSE progress streaming
 * 
 * Tests the /generate-design-stream endpoint with a short prompt
 * to verify:
 * - SSE connection established
 * - Progress events emitted (10%, 20%, 40%, 50%, 60%+)
 * - Final result event received
 * - No errors during streaming
 * 
 * Usage: node tests/sse-progress.smoke.mjs
 * Requires: Netlify dev server running on localhost:8888
 */

import https from 'https';
import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888';
const ENDPOINT = '/.netlify/functions/generate-design-stream';

// Use dev token from environment
const ACCESS_TOKEN = process.env.DEV_BEARER_TOKEN || 'test-token-123';

async function testSSEProgress() {
  console.log('🧪 SSE Progress Smoke Test\n');
  console.log(`Target: ${BASE_URL}${ENDPOINT}`);
  console.log(`Token: ${ACCESS_TOKEN.substring(0, 30)}...\n`);

  const progressEvents = [];
  let finalResult = null;
  let hasError = false;

  return new Promise((resolve, reject) => {
    const url = new URL(ENDPOINT, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const body = JSON.stringify({
      prompt: 'cube 10',
      design_name: 'Smoke Test Cube'
    });

    const req = protocol.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      console.log(`📡 Response: ${res.statusCode} ${res.statusMessage}`);
      
      if (res.statusCode !== 200) {
        console.error(`❌ Expected 200, got ${res.statusCode}`);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let buffer = '';
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5));
              
              if (data.event === 'progress') {
                progressEvents.push(data.pct);
                console.log(`  📊 Progress: ${data.pct}% — ${data.note || ''}`);
              } else if (data.event === 'result') {
                finalResult = data.code;
                console.log(`  ✅ Result received (${data.code?.length || 0} chars)`);
              } else if (data.event === 'error') {
                hasError = true;
                console.error(`  ❌ Error: ${data.message}`);
              }
            } catch (err) {
              console.warn(`  ⚠️  Failed to parse SSE data: ${line}`);
            }
          }
        }
      });

      res.on('end', () => {
        console.log('\n📋 Test Results:');
        console.log(`  Progress events: ${progressEvents.length}`);
        console.log(`  Progress range: ${Math.min(...progressEvents)}% - ${Math.max(...progressEvents)}%`);
        console.log(`  Final result: ${finalResult ? 'Yes' : 'No'}`);
        console.log(`  Errors: ${hasError ? 'Yes' : 'No'}`);

        // Validation
        const hasEnoughProgress = progressEvents.length >= 3;
        const hasGoodRange = Math.max(...progressEvents) >= 50;
        const hasFinalResult = !!finalResult;
        const noErrors = !hasError;

        const allPassed = hasEnoughProgress && hasGoodRange && hasFinalResult && noErrors;

        console.log('\n🎯 Validation:');
        console.log(`  ${hasEnoughProgress ? '✅' : '❌'} At least 3 progress events`);
        console.log(`  ${hasGoodRange ? '✅' : '❌'} Progress reaches 50%+`);
        console.log(`  ${hasFinalResult ? '✅' : '❌'} Final result received`);
        console.log(`  ${noErrors ? '✅' : '❌'} No errors`);

        if (allPassed) {
          console.log('\n✨ SSE Progress Test PASSED\n');
          resolve();
        } else {
          console.log('\n💥 SSE Progress Test FAILED\n');
          reject(new Error('Validation failed'));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Request error: ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

// Run test
testSSEProgress()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n💥 Test failed: ${err.message}\n`);
    process.exit(1);
  });
