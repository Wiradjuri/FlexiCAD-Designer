// Quick integration test for Phase 4.7.7 endpoints
// Run with: node tests/phase-4-7-7-test.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fifqqnflxwfgnidawxzw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
const ADMIN_EMAIL = 'bmuzza1992@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function getAdminToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (error) throw new Error(`Auth failed: ${error.message}`);
  return data.session.access_token;
}

async function testEndpoint(name, url, token, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json().catch(() => null);
    
    if (response.ok && data?.ok) {
      console.log(`   ✅ PASS (${response.status})`);
      if (options.checkFields) {
        for (const field of options.checkFields) {
          const hasField = field.split('.').reduce((obj, key) => obj?.[key], data) !== undefined;
          console.log(`      ${hasField ? '✓' : '✗'} Has field: ${field}`);
        }
      }
      return { success: true, data };
    } else {
      console.log(`   ❌ FAIL (${response.status}): ${data?.error || 'Unknown error'}`);
      return { success: false, error: data?.error };
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Phase 4.7.7 Integration Tests');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    console.log('\n🔐 Authenticating as admin...');
    const token = await getAdminToken();
    console.log('✅ Authentication successful');
    
    const results = [];
    
    // Test admin-dashboard-stats
    results.push(await testEndpoint(
      'admin-dashboard-stats',
      `${BASE_URL}/.netlify/functions/admin-dashboard-stats`,
      token,
      {
        method: 'GET',
        checkFields: ['totals.users', 'totals.designs', 'totals.feedback', 'activeToday.users', 'activeToday.designs', 'recentActivity', 'config.openaiModel']
      }
    ));
    
    // Test admin-access-list
    results.push(await testEndpoint(
      'admin-access-list',
      `${BASE_URL}/.netlify/functions/admin-access-list`,
      token,
      {
        method: 'GET',
        checkFields: ['adminsFromTable', 'adminsFromProfiles']
      }
    ));
    
    // Test admin-payments-overview
    results.push(await testEndpoint(
      'admin-payments-overview',
      `${BASE_URL}/.netlify/functions/admin-payments-overview`,
      token,
      {
        method: 'GET',
        checkFields: ['summary.totalUsers', 'summary.paidUsers', 'planDistribution', 'recentWebhooks']
      }
    ));
    
    // Test admin-ai-overview
    results.push(await testEndpoint(
      'admin-ai-overview',
      `${BASE_URL}/.netlify/functions/admin-ai-overview`,
      token,
      {
        method: 'GET',
        checkFields: ['model', 'curatedExamples', 'assets.total', 'assets.byType']
      }
    ));
    
    // Test admin-system-tools (recompute-tags)
    results.push(await testEndpoint(
      'admin-system-tools (recompute-tags)',
      `${BASE_URL}/.netlify/functions/admin-system-tools`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ op: 'recompute-tags' }),
        checkFields: ['operation', 'tagHistogram']
      }
    ));
    
    // Test admin-jsonl-preview (with a test path)
    results.push(await testEndpoint(
      'admin-jsonl-preview',
      `${BASE_URL}/.netlify/functions/admin-jsonl-preview?object_path=curated/global.jsonl&limit=5`,
      token,
      {
        method: 'GET'
      }
    ));
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Test Summary');
    console.log('═══════════════════════════════════════════════════════');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total:  ${results.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review the output above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();
