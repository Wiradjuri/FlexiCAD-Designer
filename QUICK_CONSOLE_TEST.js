// Quick Browser Console Tests for FlexiCAD Designer
// Copy and paste this entire block into browser console

console.clear();
console.log('%c🔍 FlexiCAD Designer - Quick Console Tests', 'font-size: 18px; font-weight: bold; color: #4ecdc4;');
console.log('');

let passed = 0;
let failed = 0;

function test(name, condition, message = '') {
    if (condition) {
        console.log(`%c✅ ${name}`, 'color: green', message);
        passed++;
    } else {
        console.log(`%c❌ ${name}`, 'color: red', message);
        failed++;
    }
}

// Current page
const page = window.location.pathname.split('/').pop() || 'index.html';
console.log(`%cTesting: ${page}`, 'font-weight: bold; color: #58a6ff;');
console.log('');

// Universal Tests (All Pages)
console.group('🔧 Core Infrastructure');
test('Navbar Manager', typeof window.navbarManager !== 'undefined', 'window.navbarManager loaded');
test('FlexiCAD Auth', typeof window.flexicadAuth !== 'undefined', 'window.flexicadAuth loaded');
test('Admin Badge Function', typeof window.verifyAdminAndToggleBadge === 'function', 'verifyAdminAndToggleBadge available');
test('Navbar Rendered', document.querySelector('nav.nav') !== null, 'Navbar DOM element present');
test('Admin Badge Element', document.querySelector('[data-admin-badge]') !== null, 'Badge with data-admin-badge attribute');
console.groupEnd();

// Modals Tests (AI, My Designs, Templates)
if (page.includes('ai.html') || page.includes('my-designs.html') || page.includes('templates.html')) {
    console.group('🎭 Modal System');
    test('Modals UMD', typeof window.FCModals !== 'undefined', 'window.FCModals available');
    test('showModal', typeof window.showModal === 'function', 'window.showModal function');
    test('closeModal', typeof window.closeModal === 'function', 'window.closeModal function');
    
    if (page.includes('ai.html')) {
        test('promptModal', typeof window.promptModal === 'function', 'window.promptModal for smart suggestions');
    }
    console.groupEnd();
}

// AI Page Specific
if (page.includes('ai.html')) {
    console.group('🤖 AI Generator Page');
    test('Prompt Textarea', document.getElementById('promptText') !== null, 'Main prompt input');
    test('Suggestions Panel', document.querySelector('.ai-suggestions-panel') !== null, 'Smart suggestions sidebar');
    test('Suggestion Items', document.querySelectorAll('.suggestion-item').length > 0, `Found ${document.querySelectorAll('.suggestion-item').length} suggestions`);
    test('Generate Button', document.getElementById('generateBtn') !== null, 'Generate button present');
    test('Progress Bar', document.querySelector('.progress-bar') !== null, 'Progress bar for SSE');
    test('Output Code Area', document.getElementById('outputCode') !== null, 'Code output <pre> element');
    test('Copy Button', document.getElementById('copyCodeBtn') !== null, 'Copy code button');
    test('Save Button', document.getElementById('saveBtn') !== null, 'Save design button');
    test('Download Button', document.getElementById('downloadBtn') !== null, 'Download SCAD button');
    console.groupEnd();
}

// My Designs Page Specific
if (page.includes('my-designs.html')) {
    console.group('📁 My Designs Page');
    test('Designs Grid', document.getElementById('designsGrid') !== null, 'Designs grid container');
    test('Loading State', document.getElementById('loading') !== null, 'Loading indicator');
    test('Empty State', document.getElementById('emptyState') !== null, 'Empty state message');
    test('Design Modal', document.getElementById('designModal') !== null, 'Design view modal');
    test('Delete Modal', document.getElementById('deleteModal') !== null, 'Delete confirmation modal');
    test('Copy Function', typeof copyModalCode === 'function', 'copyModalCode function');
    test('Download Function', typeof downloadModalCode === 'function', 'downloadModalCode function');
    console.groupEnd();
}

// Templates Page Specific
if (page.includes('templates.html')) {
    console.group('📚 Templates Page');
    test('Templates Grid', document.getElementById('templatesGrid') !== null, 'Templates grid container');
    test('Wizard Modal', document.getElementById('wizardModal') !== null, 'Parameter wizard modal');
    test('Code Modal', document.getElementById('codeModal') !== null, 'Code view modal');
    test('README Modal', document.getElementById('readmeModal') !== null, 'README modal');
    test('Category Tabs', document.querySelectorAll('.category-tab').length > 0, `Found ${document.querySelectorAll('.category-tab').length} categories`);
    console.groupEnd();
}

// Admin Login Page Specific
if (page.includes('admin-login.html')) {
    console.group('🔐 Admin Login Page');
    test('Admin Status', document.querySelector('.admin-status') !== null, 'Status display area');
    test('Passphrase Form', document.getElementById('passphraseForm') !== null, 'Passphrase form');
    test('Passphrase Input', document.getElementById('passphrase') !== null, 'Passphrase input field');
    console.groupEnd();
}

// Check for console errors
console.group('⚠️ Console Errors Check');
console.log('%cManually check above for:', 'font-weight: bold;');
console.log('  - No "showModal is not defined" errors');
console.log('  - No "NetworkError when attempting to fetch resource"');
console.log('  - No "Uncaught ReferenceError" errors');
console.log('  - Admin badge check should complete (look for admin-health call in Network tab)');
console.groupEnd();

// Summary
console.log('');
console.log('%c═══════════════════════════════════════', 'color: #888;');
console.log(`%cTEST RESULTS: ${passed} passed, ${failed} failed`, 'font-size: 16px; font-weight: bold;', `(${passed}/${passed + failed})`);
if (failed === 0) {
    console.log('%c✅ ALL TESTS PASSED!', 'font-size: 16px; font-weight: bold; color: green;');
} else {
    console.log(`%c⚠️ ${failed} TEST(S) FAILED`, 'font-size: 16px; font-weight: bold; color: red;');
}
console.log('%c═══════════════════════════════════════', 'color: #888;');

// Return results
console.log('');
console.log('%cℹ️ Network Tab Checks:', 'font-weight: bold; color: #58a6ff;');
console.log('  1. Switch to Network tab');
console.log('  2. Filter for "admin-health"');
console.log('  3. Reload page (Ctrl+R)');
console.log('  4. Verify: ONE call to admin-health endpoint');
console.log('  5. Verify: Call completes successfully (200 status)');
console.log('  6. Verify: No "NetworkError" messages');

// Return object for inspection
({
    page,
    passed,
    failed,
    total: passed + failed,
    success: failed === 0
});
