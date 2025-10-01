// scripts/inventory.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const exts = ['.html', '.css', '.js', '.mjs'];
const files = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.git','.netlify','.vscode','dist','build','supabase'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.includes(path.extname(p))) files.push(p);
  }
}
walk(ROOT);

const report = {
  html: [], js: [], css: [], functions: [], libs: [], problems: []
};

for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g,'/');
  const txt = fs.readFileSync(f, 'utf8');
  
  if (rel.endsWith('.html')) {
    const scripts = [...txt.matchAll(/<script\s[^>]*src="([^"]+)"/g)].map(m => m[1]);
    const links   = [...txt.matchAll(/<link\s[^>]*href="([^"]+)"/g)].map(m => m[1]);
    report.html.push({ file: rel, scripts, links });
    
    // Check for direct supabase usage
    if (/window\.supabase\.auth\.getSession\(\)/.test(txt) && !/flexicadAuth/.test(txt)) {
      report.problems.push({ file: rel, issue: 'Direct window.supabase.auth.getSession() use; must use flexicadAuth.getSupabaseClient()' });
    }
    
    // Check for process.env in HTML
    if (/process\.env\./.test(txt)) {
      report.problems.push({ file: rel, issue: 'Client-side process.env usage detected; must use secure-config-loader or get-public-config' });
    }
  } else if (rel.startsWith('netlify/functions/')) {
    const imports = [...txt.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
    report.functions.push({ file: rel, imports });
    
    // Check for wrong lib import root
    if (imports.some(i=>/^netlify\/lib\//.test(i))) {
      report.problems.push({ file: rel, issue: "Wrong lib import root; should be '../lib/*' from 'netlify/functions/*'" });
    }
  } else if (rel.startsWith('netlify/lib/')) {
    report.libs.push(rel);
  } else if (rel.endsWith('.js') || rel.endsWith('.mjs')) {
    report.js.push(rel);
    
    // Check for process.env in client JS (public/ folder)
    if (rel.startsWith('public/js/') && !/secure-config-loader|flexicad-auth/.test(rel)) {
      if (/process\.env\./.test(txt)) {
        report.problems.push({ file: rel, issue: 'Client-side process.env usage detected; must use window.APP_CONFIG' });
      }
    }
  } else if (rel.endsWith('.css')) {
    report.css.push(rel);
  }
}

console.log(JSON.stringify(report, null, 2));
