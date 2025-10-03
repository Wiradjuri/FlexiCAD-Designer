// FlexiCAD Designer - Comprehensive Functional Test Script
// Run this in browser console after loading each page

const FlexiCADTester = {
    results: [],
    currentPage: '',

    log(test, status, message = '') {
        const result = {
            page: this.currentPage,
            test,
            status, // 'PASS', 'FAIL', 'WARN'
            message,
            timestamp: new Date().toISOString()
        };
        this.results.push(result);
        
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} [${this.currentPage}] ${test}: ${message || status}`);
        return result;
    },

    // =======================
    // 1. INDEX.HTML TESTS
    // =======================
    async testIndexPage() {
        this.currentPage = 'index.html';
        console.group('🔍 Testing index.html (Login/Register Page)');

        try {
            // Check critical scripts loaded
            this.log('Script: navbar-manager.js', 
                typeof window.navbarManager !== 'undefined' ? 'PASS' : 'FAIL',
                typeof window.navbarManager !== 'undefined' ? 'Loaded' : 'Not loaded'
            );

            this.log('Script: flexicad-auth.js',
                typeof window.flexicadAuth !== 'undefined' ? 'PASS' : 'FAIL',
                typeof window.flexicadAuth !== 'undefined' ? 'Loaded' : 'Not loaded'
            );

            // Check navbar rendered
            const nav = document.querySelector('nav.nav');
            this.log('Navbar rendering',
                nav ? 'PASS' : 'FAIL',
                nav ? 'Navbar present' : 'Navbar missing'
            );

            // Check nav items count
            const navLinks = document.querySelectorAll('.nav-links .nav-link');
            this.log('Navbar items count',
                navLinks.length === 5 ? 'PASS' : 'FAIL',
                `Found ${navLinks.length} items (expected 5: Home, Templates, AI, My Designs, About)`
            );

            // Check admin badge hidden by default
            const adminBadge = document.querySelector('[data-admin-badge]');
            this.log('Admin badge visibility',
                adminBadge && adminBadge.style.display === 'none' ? 'PASS' : 'WARN',
                adminBadge ? `Display: ${adminBadge.style.display}` : 'Badge not found'
            );

            // Check forms exist
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            this.log('Login form',
                loginForm ? 'PASS' : 'FAIL',
                loginForm ? 'Form exists' : 'Form missing'
            );
            this.log('Register form',
                registerForm ? 'PASS' : 'FAIL',
                registerForm ? 'Form exists' : 'Form missing'
            );

            // Check tab switching
            const tabs = document.querySelectorAll('.tab-btn');
            this.log('Form tabs',
                tabs.length === 2 ? 'PASS' : 'FAIL',
                `Found ${tabs.length} tabs (Login/Register)`
            );

            // Check pricing section
            const pricingCards = document.querySelectorAll('.plan-card');
            this.log('Pricing plans',
                pricingCards.length >= 2 ? 'PASS' : 'FAIL',
                `Found ${pricingCards.length} pricing plans`
            );

        } catch (error) {
            this.log('Index page tests', 'FAIL', `Error: ${error.message}`);
        }

        console.groupEnd();
        return this.results.filter(r => r.page === 'index.html');
    },

    // =======================
    // 2. AI.HTML TESTS
    // =======================
    async testAIPage() {
        this.currentPage = 'ai.html';
        console.group('🔍 Testing ai.html (AI Generator)');

        try {
            // Check modals.js loaded
            this.log('Script: modals.js',
                typeof window.FCModals !== 'undefined' ? 'PASS' : 'FAIL',
                typeof window.FCModals !== 'undefined' ? 'Loaded' : 'Not loaded'
            );

            this.log('UMD modal functions',
                typeof window.showModal === 'function' && typeof window.closeModal === 'function' ? 'PASS' : 'FAIL',
                `showModal: ${typeof window.showModal}, closeModal: ${typeof window.closeModal}`
            );

            this.log('promptModal function',
                typeof window.promptModal === 'function' ? 'PASS' : 'FAIL',
                typeof window.promptModal === 'function' ? 'Available for smart suggestions' : 'Missing'
            );

            // Check prompt textarea
            const promptTextarea = document.getElementById('promptText');
            this.log('Prompt textarea',
                promptTextarea ? 'PASS' : 'FAIL',
                promptTextarea ? 'Found' : 'Missing'
            );

            // Check suggestions panel
            const suggestionsPanel = document.querySelector('.ai-suggestions-panel');
            this.log('Suggestions panel',
                suggestionsPanel ? 'PASS' : 'FAIL',
                suggestionsPanel ? 'Panel exists' : 'Panel missing'
            );

            // Check suggestion items
            const suggestionItems = document.querySelectorAll('.suggestion-item');
            this.log('Suggestion items',
                suggestionItems.length > 0 ? 'PASS' : 'FAIL',
                `Found ${suggestionItems.length} suggestion items`
            );

            // Check generate button
            const generateBtn = document.getElementById('generateBtn');
            this.log('Generate button',
                generateBtn ? 'PASS' : 'FAIL',
                generateBtn ? 'Button exists' : 'Button missing'
            );

            // Check output panel
            const outputPanel = document.querySelector('.ai-output-panel');
            this.log('Output panel',
                outputPanel ? 'PASS' : 'FAIL',
                outputPanel ? 'Panel exists' : 'Panel missing'
            );

            // Check progress elements
            const progressBar = document.querySelector('.progress-bar');
            const progressText = document.getElementById('progressText');
            this.log('Progress tracking',
                progressBar && progressText ? 'PASS' : 'FAIL',
                progressBar && progressText ? 'Progress bar and text ready' : 'Missing progress elements'
            );

            // Check code output area
            const outputCode = document.getElementById('outputCode');
            this.log('Code output area',
                outputCode ? 'PASS' : 'FAIL',
                outputCode ? 'Found' : 'Missing'
            );

            // Check action buttons
            const copyBtn = document.getElementById('copyCodeBtn');
            const saveBtn = document.getElementById('saveBtn');
            const downloadBtn = document.getElementById('downloadBtn');
            this.log('Action buttons',
                copyBtn && saveBtn && downloadBtn ? 'PASS' : 'FAIL',
                `Copy: ${!!copyBtn}, Save: ${!!saveBtn}, Download: ${!!downloadBtn}`
            );

        } catch (error) {
            this.log('AI page tests', 'FAIL', `Error: ${error.message}`);
        }

        console.groupEnd();
        return this.results.filter(r => r.page === 'ai.html');
    },

    // =======================
    // 3. MY-DESIGNS.HTML TESTS
    // =======================
    async testMyDesignsPage() {
        this.currentPage = 'my-designs.html';
        console.group('🔍 Testing my-designs.html');

        try {
            // Check modals.js loaded
            this.log('Script: modals.js',
                typeof window.FCModals !== 'undefined' ? 'PASS' : 'FAIL'
            );

            // Check local showModal function exists (fallback)
            this.log('Local showModal function',
                typeof showModal === 'function' ? 'PASS' : 'FAIL',
                typeof showModal === 'function' ? 'Defined locally' : 'Not defined'
            );

            // Check designs grid
            const designsGrid = document.getElementById('designsGrid');
            this.log('Designs grid',
                designsGrid ? 'PASS' : 'FAIL',
                designsGrid ? 'Grid container exists' : 'Missing'
            );

            // Check loading state
            const loading = document.getElementById('loading');
            this.log('Loading indicator',
                loading ? 'PASS' : 'FAIL',
                loading ? 'Exists' : 'Missing'
            );

            // Check empty state
            const emptyState = document.getElementById('emptyState');
            this.log('Empty state',
                emptyState ? 'PASS' : 'FAIL',
                emptyState ? 'Exists' : 'Missing'
            );

            // Check modals
            const designModal = document.getElementById('designModal');
            const deleteModal = document.getElementById('deleteModal');
            this.log('Design modals',
                designModal && deleteModal ? 'PASS' : 'FAIL',
                `Design modal: ${!!designModal}, Delete modal: ${!!deleteModal}`
            );

            // Check copy/download functions
            this.log('Copy function',
                typeof copyModalCode === 'function' ? 'PASS' : 'FAIL',
                typeof copyModalCode === 'function' ? 'Defined' : 'Missing'
            );

            this.log('Download function',
                typeof downloadModalCode === 'function' ? 'PASS' : 'FAIL',
                typeof downloadModalCode === 'function' ? 'Defined' : 'Missing'
            );

        } catch (error) {
            this.log('My Designs page tests', 'FAIL', `Error: ${error.message}`);
        }

        console.groupEnd();
        return this.results.filter(r => r.page === 'my-designs.html');
    },

    // =======================
    // 4. TEMPLATES.HTML TESTS
    // =======================
    async testTemplatesPage() {
        this.currentPage = 'templates.html';
        console.group('🔍 Testing templates.html');

        try {
            // Check modals.js integration
            this.log('UMD showModal',
                typeof window.showModal === 'function' ? 'PASS' : 'FAIL'
            );

            // Check templates grid
            const templatesGrid = document.getElementById('templatesGrid');
            this.log('Templates grid',
                templatesGrid ? 'PASS' : 'FAIL',
                templatesGrid ? 'Grid exists' : 'Missing'
            );

            // Check wizard modal
            const wizardModal = document.getElementById('wizardModal');
            this.log('Wizard modal',
                wizardModal ? 'PASS' : 'FAIL',
                wizardModal ? 'Modal exists for parameter entry' : 'Missing'
            );

            // Check code modal
            const codeModal = document.getElementById('codeModal');
            this.log('Code modal',
                codeModal ? 'PASS' : 'FAIL',
                codeModal ? 'Modal exists for code viewing' : 'Missing'
            );

            // Check readme modal
            const readmeModal = document.getElementById('readmeModal');
            this.log('README modal',
                readmeModal ? 'PASS' : 'FAIL',
                readmeModal ? 'Modal exists' : 'Missing'
            );

            // Check category tabs
            const categoryTabs = document.querySelectorAll('.category-tab');
            this.log('Category tabs',
                categoryTabs.length > 0 ? 'PASS' : 'FAIL',
                `Found ${categoryTabs.length} category tabs`
            );

        } catch (error) {
            this.log('Templates page tests', 'FAIL', `Error: ${error.message}`);
        }

        console.groupEnd();
        return this.results.filter(r => r.page === 'templates.html');
    },

    // =======================
    // 5. ADMIN-LOGIN.HTML TESTS
    // =======================
    async testAdminLoginPage() {
        this.currentPage = 'admin-login.html';
        console.group('🔍 Testing admin-login.html');

        try {
            // Check admin status display
            const adminStatus = document.querySelector('.admin-status');
            this.log('Admin status display',
                adminStatus ? 'PASS' : 'FAIL',
                adminStatus ? 'Status area exists' : 'Missing'
            );

            // Check passphrase form
            const passphraseForm = document.getElementById('passphraseForm');
            this.log('Passphrase form',
                passphraseForm ? 'PASS' : 'FAIL',
                passphraseForm ? 'Form exists' : 'Missing'
            );

            // Check passphrase input
            const passphraseInput = document.getElementById('passphrase');
            this.log('Passphrase input',
                passphraseInput ? 'PASS' : 'FAIL',
                passphraseInput ? 'Input field exists' : 'Missing'
            );

        } catch (error) {
            this.log('Admin login page tests', 'FAIL', `Error: ${error.message}`);
        }

        console.groupEnd();
        return this.results.filter(r => r.page === 'admin-login.html');
    },

    // =======================
    // 6. NAVBAR ADMIN BADGE TESTS
    // =======================
    async testAdminBadgeFunctionality() {
        console.group('🔍 Testing Admin Badge Functionality');

        try {
            // Check if verifyAdminAndToggleBadge exists
            this.log('verifyAdminAndToggleBadge function',
                typeof window.verifyAdminAndToggleBadge === 'function' ? 'PASS' : 'FAIL',
                typeof window.verifyAdminAndToggleBadge === 'function' ? 'Function available' : 'Missing'
            );

            // Check admin badge element
            const adminBadge = document.querySelector('[data-admin-badge]');
            this.log('Admin badge element',
                adminBadge ? 'PASS' : 'FAIL',
                adminBadge ? 'Badge element found' : 'Badge missing'
            );

            if (adminBadge) {
                this.log('Badge initial state',
                    adminBadge.style.display === 'none' ? 'PASS' : 'WARN',
                    `Display: ${adminBadge.style.display || 'default'}`
                );
            }

            // Check for network errors in console (can't test programmatically but log reminder)
            console.info('⚠️ Manual Check: Open Network tab and verify no "NetworkError when attempting to fetch resource"');
            console.info('⚠️ Manual Check: Verify only ONE call to admin-health endpoint on page load');

        } catch (error) {
            this.log('Admin badge tests', 'FAIL', `Error: ${error.message}`);
        }

        console.groupEnd();
    },

    // =======================
    // 7. GENERATE FULL REPORT
    // =======================
    generateReport() {
        console.group('📊 COMPREHENSIVE TEST REPORT');
        
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const warned = this.results.filter(r => r.status === 'WARN').length;
        const total = this.results.length;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
        console.log(`❌ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
        console.log(`⚠️  Warnings: ${warned} (${((warned/total)*100).toFixed(1)}%)`);
        console.log(`${'='.repeat(60)}\n`);

        // Group by page
        const pages = [...new Set(this.results.map(r => r.page))];
        pages.forEach(page => {
            const pageResults = this.results.filter(r => r.page === page);
            const pagePassed = pageResults.filter(r => r.status === 'PASS').length;
            const pageFailed = pageResults.filter(r => r.status === 'FAIL').length;
            
            console.group(`📄 ${page}: ${pagePassed}/${pageResults.length} passed`);
            
            // Show failures first
            pageResults.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`❌ ${r.test}: ${r.message}`);
            });
            
            // Show warnings
            pageResults.filter(r => r.status === 'WARN').forEach(r => {
                console.log(`⚠️  ${r.test}: ${r.message}`);
            });
            
            console.groupEnd();
        });

        console.groupEnd();

        return {
            summary: { total, passed, failed, warned },
            details: this.results
        };
    },

    // =======================
    // 8. RUN ALL TESTS
    // =======================
    async runAllTests() {
        console.clear();
        console.log('%c🚀 FlexiCAD Designer - Comprehensive Functional Tests', 'font-size: 20px; font-weight: bold; color: #4ecdc4;');
        console.log('%cTesting Phase 4.7.18 Implementation + Navbar Admin Badge Patch\n', 'font-size: 14px; color: #888;');

        this.results = [];

        // Detect current page and run appropriate tests
        const path = window.location.pathname;
        
        if (path.includes('index.html') || path === '/' || path === '') {
            await this.testIndexPage();
        } else if (path.includes('ai.html')) {
            await this.testAIPage();
        } else if (path.includes('my-designs.html')) {
            await this.testMyDesignsPage();
        } else if (path.includes('templates.html')) {
            await this.testTemplatesPage();
        } else if (path.includes('admin-login.html')) {
            await this.testAdminLoginPage();
        }

        // Run navbar tests on all pages
        await this.testAdminBadgeFunctionality();

        // Generate report
        return this.generateReport();
    }
};

// Auto-run on load
console.log('FlexiCAD Tester loaded. Run: FlexiCADTester.runAllTests()');

// Export for console use
window.FlexiCADTester = FlexiCADTester;
