const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function scanDirectory(dirPath, baseDir = dirPath) {
  const items = [];
  const entries = await fs.promises.readdir(dirPath);
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = await fs.promises.stat(fullPath);
    
    if (stats.isDirectory()) {
      // Recursively scan subdirectories
      const subItems = await scanDirectory(fullPath, baseDir);
      items.push(...subItems);
    } else {
      const ext = path.extname(entry).toLowerCase();
      
      // Only include .scad, .md, .json files
      if (['.scad', '.md', '.json'].includes(ext)) {
        try {
          const content = await fs.promises.readFile(fullPath, 'utf8');
          const relativePath = path.relative(baseDir, fullPath).replace(/\\\\/g, '/');
          
          const item = {
            path: relativePath,
            ext: ext,
            bytes: Buffer.byteLength(content, 'utf8'),
            sha256: sha256(content),
            content: content
          };
          
          items.push(item);
          log(`Added: ${relativePath} (${item.bytes} bytes)`);
        } catch (error) {
          log(`⚠️  Skipped ${fullPath}: ${error.message}`);
        }
      }
    }
  }
  
  return items;
}

async function buildAiReferenceManifest() {
  log('🔧 Building AI reference manifest...');
  
  const aiRefDir = path.join(__dirname, '../ai-reference');
  const manifestPath = path.join(aiRefDir, 'manifest.json');
  
  try {
    const items = await scanDirectory(aiRefDir);
    
    // Sort by priority: .scad first, then by path
    items.sort((a, b) => {
      if (a.ext === '.scad' && b.ext !== '.scad') return -1;
      if (b.ext === '.scad' && a.ext !== '.scad') return 1;
      return a.path.localeCompare(b.path);
    });
    
    const manifest = {
      version: 1,
      generated_at: new Date().toISOString(),
      count: items.length,
      total_bytes: items.reduce((sum, item) => sum + item.bytes, 0),
      items: items
    };
    
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    
    log(`✅ AI reference manifest built: ${items.length} items, ${manifest.total_bytes} bytes`);
    log(`📊 Types: ${items.filter(i => i.ext === '.scad').length} .scad, ${items.filter(i => i.ext === '.md').length} .md, ${items.filter(i => i.ext === '.json').length} .json`);
    
    return true;
  } catch (error) {
    log(`❌ Failed to build AI reference manifest: ${error.message}`);
    return false;
  }
}

module.exports = { buildAiReferenceManifest };