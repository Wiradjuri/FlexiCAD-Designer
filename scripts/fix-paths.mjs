// scripts/fix-paths.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const write = process.argv.includes('--write');

function read(p){ return fs.readFileSync(p,'utf8'); }
function save(p,c){ 
  if (write) {
    fs.writeFileSync(p,c);
    console.log(`✓ Fixed: ${path.relative(ROOT, p)}`);
  } else {
    console.log(`Would fix: ${path.relative(ROOT, p)}`);
  }
}

function list(globDir, exts) {
  const out = [];
  function walk(dir) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) return;
    
    for (const e of fs.readdirSync(fullDir, { withFileTypes: true })) {
      if (['node_modules','.git','.netlify','.vscode','dist','build','supabase'].includes(e.name)) continue;
      const p = path.join(fullDir, e.name);
      if (e.isDirectory()) walk(path.relative(ROOT, p));
      else if (exts.includes(path.extname(p))) out.push(p);
    }
  }
  walk(globDir);
  return out;
}

const fnFiles  = list('netlify/functions', ['.mjs', '.js']);
const htmlFiles= list('public', ['.html']);

let fixes = 0;

console.log(`\n=== Phase 4.7.11 Path Fixer ===`);
console.log(`Mode: ${write ? 'WRITE' : 'DRY-RUN'}`);
console.log(`\nScanning ${fnFiles.length} function files and ${htmlFiles.length} HTML files...\n`);

// Fix server imports
console.log('--- Fixing server imports ---');
for (const f of fnFiles) {
  const src = read(f);
  let out = src;
  
  // Fix netlify/lib/ imports to ../lib/
  out = out.replace(/from\s+['"]netlify\/lib\/(require-admin\.mjs)['"]/g, "from '../lib/$1'");
  out = out.replace(/from\s+['"]netlify\/lib\/(require-auth\.mjs)['"]/g, "from '../lib/$1'");
  out = out.replace(/from\s+['"]netlify\/lib\/(knowledge-loader\.mjs)['"]/g, "from '../lib/$1'");
  
  if (out !== src) { 
    save(f, out); 
    fixes++; 
  }
}

// Fix HTML script order & root paths
console.log('\n--- Fixing HTML paths and script references ---');
for (const f of htmlFiles) {
  let src = read(f);
  let changed = false;
  
  // Root-relative urls for shared assets (only fix if relative paths found)
  const newSrc = src
    .replace(/src="js\//g, 'src="/js/')
    .replace(/href="css\//g, 'href="/css/')
    .replace(/src="\.\/js\//g, 'src="/js/')
    .replace(/href="\.\/css\//g, 'href="/css/');
  
  if (newSrc !== src) {
    src = newSrc;
    changed = true;
  }

  // Replace legacy admin links
  const adminFixed = src
    .replace(/\/admin\/manage-prompts\.html/g, '/admin-controlpanel.html')
    .replace(/\/admin\/manage-promos\.html/g, '/admin-controlpanel.html')
    .replace(/href="admin\/manage-prompts\.html"/g, 'href="/admin-controlpanel.html"');
  
  if (adminFixed !== src) {
    src = adminFixed;
    changed = true;
  }

  // Ensure modals.js not type=module and has defer
  const modalsFixed = src
    .replace(/<script([^>]*?)src="([^"]*?)modals\.js"([^>]*?)type="module"([^>]*)><\/script>/g,
             '<script$1src="$2modals.js"$3 defer></script>')
    .replace(/<script([^>]*?)src="([^"]*?)modals\.js"([^>]*)>(?![\s\S]*defer)/g,
             (match) => match.includes('defer') ? match : match.replace('>', ' defer>'));

  if (modalsFixed !== src) {
    src = modalsFixed;
    changed = true;
  }

  if (changed) {
    save(f, src);
    fixes++;
  }
}

console.log(`\n=== Summary ===`);
console.log(JSON.stringify({ fixedFiles: fixes, mode: write ? 'APPLIED' : 'DRY-RUN' }, null, 2));

if (!write && fixes > 0) {
  console.log(`\n⚠️  Run with --write to apply ${fixes} fixes`);
}
