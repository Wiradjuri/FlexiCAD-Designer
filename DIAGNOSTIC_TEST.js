// DETAILED DIAGNOSTIC TEST - Run this to see WHAT failed
// Copy and paste into console after running the quick test

console.clear();
console.log('%c🔬 DETAILED DIAGNOSTIC - AI Generator Page', 'font-size: 18px; font-weight: bold; color: #ff6b6b;');
console.log('');

const diagnostics = [];

function diagnose(category, name, check, actualValue) {
    const passed = !!check;
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    
    console.log(`%c${icon} ${name}`, `color: ${color}; font-weight: bold;`);
    console.log(`   Expected: truthy`);
    console.log(`   Actual: ${actualValue}`);
    console.log(`   Type: ${typeof actualValue}`);
    console.log('');
    
    diagnostics.push({ category, name, passed, actualValue, type: typeof actualValue });
}

// Core Infrastructure
console.group('🔧 CORE INFRASTRUCTURE');
diagnose('Core', 'window.navbarManager', window.navbarManager, window.navbarManager);
diagnose('Core', 'window.flexicadAuth', window.flexicadAuth, window.flexicadAuth);
diagnose('Core', 'window.verifyAdminAndToggleBadge', typeof window.verifyAdminAndToggleBadge === 'function', window.verifyAdminAndToggleBadge);
diagnose('Core', 'document.querySelector("nav.nav")', document.querySelector('nav.nav'), document.querySelector('nav.nav'));
diagnose('Core', 'document.querySelector("[data-admin-badge]")', document.querySelector('[data-admin-badge]'), document.querySelector('[data-admin-badge]'));
console.groupEnd();

// Modal System
console.group('🎭 MODAL SYSTEM');
diagnose('Modals', 'window.FCModals', window.FCModals, window.FCModals);
diagnose('Modals', 'window.showModal (function)', typeof window.showModal === 'function', window.showModal);
diagnose('Modals', 'window.closeModal (function)', typeof window.closeModal === 'function', window.closeModal);
diagnose('Modals', 'window.promptModal (function)', typeof window.promptModal === 'function', window.promptModal);
console.groupEnd();

// AI Page Elements
console.group('🤖 AI GENERATOR PAGE ELEMENTS');
console.log('Checking DOM elements...');
console.log('');

const elements = {
    'promptText': document.getElementById('promptText'),
    'ai-suggestions-panel': document.querySelector('.ai-suggestions-panel'),
    'suggestion-item (count)': document.querySelectorAll('.suggestion-item').length,
    'generateBtn': document.getElementById('generateBtn'),
    'progress-bar': document.querySelector('.progress-bar'),
    'outputCode': document.getElementById('outputCode'),
    'copyCodeBtn': document.getElementById('copyCodeBtn'),
    'saveBtn': document.getElementById('saveBtn'),
    'downloadBtn': document.getElementById('downloadBtn')
};

Object.entries(elements).forEach(([name, value]) => {
    const exists = name.includes('count') ? value > 0 : !!value;
    const icon = exists ? '✅' : '❌';
    const color = exists ? 'green' : 'red';
    
    console.log(`%c${icon} ${name}`, `color: ${color}; font-weight: bold;`);
    if (name.includes('count')) {
        console.log(`   Found: ${value} items`);
    } else {
        console.log(`   Element: ${value ? 'Found' : 'NULL'}`);
        if (value) {
            console.log(`   Tag: <${value.tagName.toLowerCase()}>`);
            console.log(`   ID: ${value.id || 'none'}`);
            console.log(`   Classes: ${value.className || 'none'}`);
        }
    }
    console.log('');
    
    diagnose('Elements', name, exists, value);
});
console.groupEnd();

// Check Scripts Loaded
console.group('📜 SCRIPT LOADING CHECK');
const scripts = Array.from(document.querySelectorAll('script[src]'))
    .map(s => s.src.split('/').pop());

const expectedScripts = [
    'modals.js',
    'navbar-manager.js',
    'flexicad-auth.js',
    'secure-config-loader.js'
];

expectedScripts.forEach(script => {
    const loaded = scripts.some(s => s.includes(script));
    const icon = loaded ? '✅' : '❌';
    const color = loaded ? 'green' : 'red';
    console.log(`%c${icon} ${script}`, `color: ${color};`);
});
console.groupEnd();

// Summary
console.log('');
console.log('%c═══════════════════════════════════════', 'color: #888;');
const passed = diagnostics.filter(d => d.passed).length;
const failed = diagnostics.filter(d => !d.passed).length;
console.log(`%cDIAGNOSTIC RESULTS: ${passed} passed, ${failed} failed`, 'font-size: 16px; font-weight: bold;');

if (failed > 0) {
    console.log('');
    console.log('%c⚠️ FAILURES:', 'color: red; font-weight: bold; font-size: 14px;');
    diagnostics.filter(d => !d.passed).forEach(d => {
        console.log(`  ❌ ${d.name}`);
        console.log(`     Category: ${d.category}`);
        console.log(`     Value: ${d.actualValue}`);
        console.log(`     Type: ${d.type}`);
    });
}

console.log('%c═══════════════════════════════════════', 'color: #888;');

// Return failures for inspection
diagnostics.filter(d => !d.passed);
