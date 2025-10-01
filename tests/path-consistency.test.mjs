// tests/path-consistency.test.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const invPath = path.join(ROOT, 'scripts', 'inventory.json');

if (!fs.existsSync(invPath)) {
  console.error('ERROR: inventory.json not found. Run: npm run audit:paths');
  process.exit(1);
}

const inv = JSON.parse(fs.readFileSync(invPath,'utf8'));

let fail = 0;

console.log('=== Path Consistency Tests ===\n');

// Test 1: No direct 'netlify/lib' imports in functions
console.log('Test 1: Checking function imports...');
inv.functions.forEach(fn => {
  fn.imports.forEach(i => {
    if (i.startsWith('netlify/lib/')) {
      console.error(`  ❌ FAIL: Wrong import root in ${fn.file} => ${i}`);
      console.error(`     Should be: '../lib/${i.replace('netlify/lib/', '')}'`);
      fail++;
    }
  });
});
if (fail === 0) console.log('  ✓ All function imports use correct relative paths\n');

// Test 2: Client must not call process.env
console.log('Test 2: Checking for client-side process.env usage...');
const clientFiles = [...inv.html, ...inv.js.filter(j => j.startsWith('public/'))];

inv.html.forEach(h => {
  const fullPath = path.join(ROOT, h.file);
  if (!fs.existsSync(fullPath)) return;
  
  const src = fs.readFileSync(fullPath, 'utf8');
  if (/process\.env\./.test(src)) { 
    console.error(`  ❌ FAIL: Client env leak in ${h.file}`); 
    fail++; 
  }
});

inv.js.forEach(j => {
  if (j.startsWith('public/js/') && !j.includes('secure-config-loader') && !j.includes('flexicad-auth')) {
    const fullPath = path.join(ROOT, j);
    if (!fs.existsSync(fullPath)) return;
    
    const src = fs.readFileSync(fullPath, 'utf8');
    if (/process\.env\./.test(src)) { 
      console.error(`  ❌ FAIL: Client env leak in ${j}`); 
      fail++; 
    }
  }
});
if (fail === 0) console.log('  ✓ No client-side process.env usage detected\n');

// Test 3: Check for direct window.supabase usage in HTML
console.log('Test 3: Checking for direct window.supabase.auth.getSession() usage...');
const directSupabaseFail = inv.problems.filter(p => p.issue.includes('Direct window.supabase'));
if (directSupabaseFail.length > 0) {
  directSupabaseFail.forEach(p => {
    console.error(`  ❌ FAIL: ${p.file} - ${p.issue}`);
    fail++;
  });
} else {
  console.log('  ✓ All pages use flexicadAuth.getSupabaseClient()\n');
}

// Test 4: Report all other problems
if (inv.problems.length > directSupabaseFail.length) {
  console.log('Test 4: Other issues detected...');
  inv.problems.filter(p => !p.issue.includes('Direct window.supabase')).forEach(p => {
    console.error(`  ⚠️  ${p.file}: ${p.issue}`);
  });
  console.log();
}

// Summary
console.log('=== Test Summary ===');
if (fail > 0) {
  console.error(`\n❌ FAILED: ${fail} issue(s) found`);
  console.log('\nRun to fix: npm run fix:paths');
  process.exit(1);
} else {
  console.log('✅ All path consistency checks passed!');
  console.log(`\nScanned:`);
  console.log(`  - ${inv.functions.length} Netlify functions`);
  console.log(`  - ${inv.html.length} HTML pages`);
  console.log(`  - ${inv.js.length} JavaScript files`);
  console.log(`  - ${inv.libs.length} shared libraries`);
}
