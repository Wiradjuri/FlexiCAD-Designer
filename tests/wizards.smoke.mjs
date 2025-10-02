#!/usr/bin/env node
/**
 * Smoke test: Template wizards modal
 * 
 * Tests that template wizards open correctly in a modal:
 * - window.templateWizards global is available
 * - openWizard() method exists
 * - Modal system is loaded
 * 
 * Note: This is a basic Node.js test. For full browser testing,
 * use Playwright or Puppeteer to test actual modal rendering.
 * 
 * Usage: node tests/wizards.smoke.mjs
 * Requires: Netlify dev server running on localhost:8888
 */

import https from 'https';
import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8888';
const PAGE_URL = '/ai.html';

async function testWizardsAvailability() {
  console.log('🧪 Template Wizards Smoke Test\n');
  console.log(`Target: ${BASE_URL}${PAGE_URL}\n`);

  return new Promise((resolve, reject) => {
    const url = new URL(PAGE_URL, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(url, (res) => {
      console.log(`📡 Response: ${res.statusCode} ${res.statusMessage}`);
      
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Check for key patterns in HTML
        const hasWizardsScript = body.includes('template-wizards-v2.js');
        const hasModalsScript = body.includes('modals.js');
        const hasWizardButtons = body.includes('data-wizard') || body.includes('openWizard');
        
        console.log('\n📋 Page Analysis:');
        console.log(`  ${hasWizardsScript ? '✅' : '❌'} template-wizards-v2.js loaded`);
        console.log(`  ${hasModalsScript ? '✅' : '❌'} modals.js loaded`);
        console.log(`  ${hasWizardButtons ? '✅' : '❌'} Wizard trigger elements present`);

        // Additional checks
        const hasModalContainer = body.includes('id="fc-modal"') || body.includes('class="modal"');
        console.log(`  ${hasModalContainer ? '✅' : '❌'} Modal container in HTML`);

        const allChecks = hasWizardsScript && hasModalsScript && hasWizardButtons && hasModalContainer;

        console.log('\n🎯 Validation:');
        if (allChecks) {
          console.log('  ✅ All wizard dependencies present');
          console.log('\n✨ Wizards Smoke Test PASSED\n');
          console.log('ℹ️  Note: For full modal interaction testing, use Playwright:\n');
          console.log('   npx playwright test --ui\n');
          resolve();
        } else {
          console.log('  ❌ Missing wizard dependencies');
          console.log('\n💥 Wizards Smoke Test FAILED\n');
          reject(new Error('Missing required wizard elements'));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Request error: ${err.message}`);
      reject(err);
    });
  });
}

// Playwright test template (for future use)
console.log(`
📝 For browser-based wizard testing, create this Playwright test:

// tests/wizards.spec.js
const { test, expect } = require('@playwright/test');

test('template wizard opens in modal', async ({ page }) => {
  await page.goto('http://localhost:8888/ai.html');
  
  // Wait for wizard system to load
  await page.waitForFunction(() => window.templateWizards);
  
  // Click wizard button (adjust selector as needed)
  await page.click('[data-wizard="cube"]');
  
  // Verify modal opened
  await expect(page.locator('.fc-modal-overlay')).toBeVisible();
  await expect(page.locator('.fc-modal-content')).toContainText('Cube Wizard');
  
  // Close modal
  await page.click('.fc-modal-close');
  await expect(page.locator('.fc-modal-overlay')).not.toBeVisible();
});

Run with: npx playwright test tests/wizards.spec.js
`);

// Run test
testWizardsAvailability()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`\n💥 Test failed: ${err.message}\n`);
    process.exit(1);
  });
