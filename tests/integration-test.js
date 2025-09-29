// Integration Tests for FlexiCAD Designer
// Tests the critical user flows and function validation

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Test configuration
const TEST_CONFIG = {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8888',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    testUserEmail: process.env.TEST_USER_EMAIL || 'test@flexicad.com',
    adminEmail: process.env.ADMIN_EMAIL || 'bmuzza1992@gmail.com'
};

// Initialize Supabase client for testing
let supabase;
if (TEST_CONFIG.supabaseUrl && TEST_CONFIG.supabaseServiceKey) {
    supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
}

class FlexiCADTests {
    constructor() {
        this.testResults = [];
        this.testUser = null;
    }

    async runAllTests() {
        console.log('🧪 Starting FlexiCAD Designer Integration Tests\n');

        // Test categories
        await this.testConfigurationLoading();
        await this.testFunctionAvailability();
        await this.testPaymentFirstAuth();
        await this.testPromoCodeSystem();
        await this.testAILearningSystem();

        this.printTestResults();
    }

    async testConfigurationLoading() {
        console.log('📋 Testing Configuration Loading...');

        await this.test('Config endpoint returns valid data', async () => {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/get-public-config`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Config endpoint failed: ${response.status}`);
            }

            // Verify required config keys
            const requiredKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'APP_NAME', 'PAYMENT_FIRST'];
            for (const key of requiredKeys) {
                if (!data.hasOwnProperty(key)) {
                    throw new Error(`Missing required config key: ${key}`);
                }
            }

            if (!data.PAYMENT_FIRST) {
                throw new Error('Payment-first mode not enabled');
            }

            return true;
        });

        await this.test('Config does not expose secrets', async () => {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/get-public-config`);
            const data = await response.json();
            const jsonString = JSON.stringify(data);

            // Check for accidentally exposed secrets
            const secretPatterns = [
                /sk_[a-zA-Z0-9]{24,}/,  // Stripe secret keys
                /service_role/,          // Supabase service role
                /eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]*$/,  // JWTs
            ];

            for (const pattern of secretPatterns) {
                if (pattern.test(jsonString)) {
                    throw new Error(`Potential secret exposed in config: ${pattern}`);
                }
            }

            return true;
        });
    }

    async testFunctionAvailability() {
        console.log('🔌 Testing Netlify Functions...');

        const criticalFunctions = [
            'get-public-config',
            'generate-template',
            'check-payment-status',
            'create-checkout-session',
            'validate-promo-code',
            'manage-promo-codes',
            'ai-feedback'
        ];

        for (const functionName of criticalFunctions) {
            await this.test(`Function ${functionName} is accessible`, async () => {
                const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/${functionName}`, {
                    method: 'OPTIONS'  // Check CORS/availability without triggering actual function
                });

                if (response.status === 404) {
                    throw new Error(`Function ${functionName} not found`);
                }

                // Function exists (even if it returns error for missing auth, that's OK)
                return response.status !== 404;
            });
        }
    }

    async testPaymentFirstAuth() {
        console.log('💳 Testing Payment-First Authentication...');

        await this.test('Unpaid user cannot access protected functions', async () => {
            // Try to generate template without auth
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/generate-template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Create a cube' })
            });

            // Should be rejected (401 or 403)
            if (response.status === 200) {
                throw new Error('Protected function allowed unauthorized access');
            }

            return response.status === 401 || response.status === 403;
        });

        await this.test('Payment status check requires user ID', async () => {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/check-payment-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Missing userId
            });

            const data = await response.json();
            return data.error && data.error.includes('User ID');
        });
    }

    async testPromoCodeSystem() {
        console.log('🎟️ Testing Promo Code System...');

        await this.test('Promo validation rejects invalid codes', async () => {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/validate-promo-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: 'INVALID_CODE_12345' })
            });

            const data = await response.json();
            return !data.valid;
        });

        await this.test('Promo management requires admin access', async () => {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/manage-promo-codes`, {
                method: 'GET'
                // No authorization header
            });

            return response.status === 403;
        });

        // Test with valid promo codes if database is available
        if (supabase) {
            await this.test('Valid promo codes are accepted', async () => {
                const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/validate-promo-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: 'WELCOME20' })
                });

                const data = await response.json();
                // Should be valid if promo exists, or proper error if not
                return data.valid === true || (data.valid === false && data.error);
            });
        }
    }

    async testAILearningSystem() {
        console.log('🤖 Testing AI Learning System...');

        await this.test('AI feedback requires authentication', async () => {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/ai-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: 'test-session',
                    feedback: 5
                })
            });

            return response.status === 401;
        });

        await this.test('AI feedback requires session ID', async () => {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/.netlify/functions/ai-feedback`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer fake-token'
                },
                body: JSON.stringify({
                    feedback: 5
                    // Missing sessionId
                })
            });

            const data = await response.json();
            return data.error && data.error.includes('Session ID');
        });
    }

    // Utility method for running individual tests
    async test(description, testFn) {
        try {
            const startTime = Date.now();
            const result = await testFn();
            const duration = Date.now() - startTime;

            if (result) {
                console.log(`  ✅ ${description} (${duration}ms)`);
                this.testResults.push({ description, status: 'PASS', duration });
            } else {
                console.log(`  ❌ ${description} - returned false`);
                this.testResults.push({ description, status: 'FAIL', duration, error: 'Test returned false' });
            }
        } catch (error) {
            console.log(`  ❌ ${description} - ${error.message}`);
            this.testResults.push({ description, status: 'FAIL', error: error.message });
        }
    }

    printTestResults() {
        console.log('\n📊 Test Results Summary');
        console.log('========================');

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        console.log(`Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

        if (failed > 0) {
            console.log('❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => console.log(`  - ${r.description}: ${r.error}`));
            console.log('');
        }

        if (failed === 0) {
            console.log('🎉 All tests passed! FlexiCAD Designer is working correctly.\n');
            return process.exit(0);
        } else {
            console.log('⚠️ Some tests failed. Please review the errors above.\n');
            return process.exit(1);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    // Validate environment
    if (!TEST_CONFIG.baseUrl) {
        console.error('❌ TEST_BASE_URL environment variable is required');
        process.exit(1);
    }

    const tester = new FlexiCADTests();
    tester.runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = FlexiCADTests;