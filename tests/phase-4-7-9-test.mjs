// Phase 4.7.9 Integration Test
// Run this in browser console after logging in as admin

async function testPhase479() {
  console.log('🧪 Starting Phase 4.7.9 Tests...\n');
  
  // Get JWT token
  const session = await window.supabase?.auth.getSession();
  if (!session?.data?.session?.access_token) {
    console.error('❌ No session token found. Please log in first.');
    return;
  }
  
  const token = session.data.session.access_token;
  const base = window.location.origin + '/.netlify/functions';
  
  console.log('✓ Session token retrieved\n');
  
  // Test 1: Admin Dashboard Stats
  console.log('Test 1: Admin Dashboard Stats');
  try {
    const res = await fetch(`${base}/admin-dashboard-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.ok && data.totals && data.activeToday && data.recentActivity) {
      console.log('✅ Dashboard stats:', {
        users: data.totals.users,
        designs: data.totals.designs,
        activeToday: data.activeToday.users
      });
    } else {
      console.error('❌ Dashboard stats failed:', data);
    }
  } catch (error) {
    console.error('❌ Dashboard stats error:', error.message);
  }
  
  // Test 2: Access List
  console.log('\nTest 2: Admin Access List');
  try {
    const res = await fetch(`${base}/admin-access-list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.ok && data.adminsFromTable && data.adminsFromProfiles) {
      console.log('✅ Access list:', {
        tableAdmins: data.adminsFromTable.length,
        profileAdmins: data.adminsFromProfiles.length
      });
    } else {
      console.error('❌ Access list failed:', data);
    }
  } catch (error) {
    console.error('❌ Access list error:', error.message);
  }
  
  // Test 3: Payment Overview
  console.log('\nTest 3: Payment Overview');
  try {
    const res = await fetch(`${base}/admin-payments-overview`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.ok) {
      console.log('✅ Payment overview:', {
        paidUsers: data.paidUsers,
        totalUsers: data.totalUsers,
        webhooks: data.webhookEvents?.length || 0
      });
    } else {
      console.error('❌ Payment overview failed:', data);
    }
  } catch (error) {
    console.error('❌ Payment overview error:', error.message);
  }
  
  // Test 4: AI Overview
  console.log('\nTest 4: AI Overview');
  try {
    const res = await fetch(`${base}/admin-ai-overview`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.ok && data.config) {
      console.log('✅ AI overview:', {
        model: data.config.openaiModel,
        examples: data.trainingExamplesCount,
        assets: data.totalAssets
      });
    } else {
      console.error('❌ AI overview failed:', data);
    }
  } catch (error) {
    console.error('❌ AI overview error:', error.message);
  }
  
  // Test 5: System Tools
  console.log('\nTest 5: System Tools');
  try {
    const res = await fetch(`${base}/admin-system-tools`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ op: 'flush-cache' })
    });
    const data = await res.json();
    
    if (data.ok) {
      console.log('✅ System tools:', data.result);
    } else {
      console.error('❌ System tools failed:', data);
    }
  } catch (error) {
    console.error('❌ System tools error:', error.message);
  }
  
  // Test 6: Modal System
  console.log('\nTest 6: Modal System');
  if (window.showModal && window.hideModal) {
    console.log('✅ Modal functions available on window');
    
    // Quick test
    window.showModal('<div style="padding:2rem;"><h2>Test Modal</h2><button onclick="window.hideModal()">Close</button></div>');
    setTimeout(() => {
      window.hideModal();
      console.log('✅ Modal show/hide works');
    }, 500);
  } else {
    console.error('❌ Modal functions not found on window');
  }
  
  // Test 7: Template Wizards
  console.log('\nTest 7: Template Wizards');
  if (window.templateWizards && window.templateWizards.showCreateWizard) {
    console.log('✅ Template wizards available');
  } else {
    console.log('⚠️  Template wizards not available (only on templates.html)');
  }
  
  console.log('\n🎉 Phase 4.7.9 Tests Complete!\n');
  console.log('Manual checks:');
  console.log('1. Visit /admin-controlpanel.html - verify stats load');
  console.log('2. Click subpage navigation - verify data displays');
  console.log('3. Visit /templates.html - click Create button');
  console.log('4. Visit /ai.html?prompt=test&auto=true - check progress');
}

// Auto-run if this script is executed
if (typeof window !== 'undefined') {
  testPhase479();
}
