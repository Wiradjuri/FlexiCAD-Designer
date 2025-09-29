// Simple integration test for admin feedback workflow
// Run this in browser console on admin console page after server starts

async function testFeedbackWorkflow() {
    console.log('🧪 Testing Phase 4.4.2 feedback workflow...');
    
    try {
        // Get session token
        const session = await supabaseClient.auth.getSession();
        const token = session.data?.session?.access_token;
        
        if (!token) {
            console.error('❌ No auth token - please login as admin');
            return;
        }
        
        console.log('✅ Auth token obtained');
        
        // Test 1: Load feedback list
        console.log('\n📋 Test 1: Loading feedback list...');
        const listResponse = await fetch('/.netlify/functions/admin-feedback-list?status=pending', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const listData = await listResponse.json();
        console.log('Response status:', listResponse.status);
        console.log('Response data:', listData);
        
        if (listData.ok) {
            console.log(`✅ Feedback list loaded: ${listData.total} items`);
        } else {
            console.error('❌ Failed to load feedback list:', listData.error);
        }
        
        // Test 2: Check if ai_feedback table exists by checking response structure
        if (listData.items && Array.isArray(listData.items)) {
            console.log('✅ Using proper ai_feedback table structure');
        } else {
            console.warn('⚠️ Response structure suggests old table format');
        }
        
        console.log('\n🎯 Phase 4.4.2 basic connectivity test complete');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Auto-run test if called from console
if (typeof window !== 'undefined' && window.supabaseClient) {
    // testFeedbackWorkflow();
    console.log('💡 Run testFeedbackWorkflow() to test Phase 4.4.2 implementation');
} else {
    console.log('⚠️ This test should be run in the admin console browser environment');
}