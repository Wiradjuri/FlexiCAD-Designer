const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function buildObjectsManifest() {
  log('🔧 Building objects manifest...');

  const objectsDir = path.join(__dirname, '../objects');
  const manifestPath = path.join(__dirname, '../public/objects/manifest.json');

  try {
    const entries = await fs.promises.readdir(objectsDir);
    const templates = [];

    for (const entry of entries) {
      const fullPath = path.join(objectsDir, entry);
      const stats = await fs.promises.stat(fullPath);

      if (stats.isDirectory()) {
        try {
          const metadata = JSON.parse(
            await fs.promises.readFile(path.join(fullPath, 'metadata.json'), 'utf8')
          );
          const readme = await fs.promises.readFile(path.join(fullPath, 'README.md'), 'utf8');

          templates.push({
            slug: entry,
            name: metadata.name || entry,
            description: metadata.description || readme.split('\n')[0] || '',
            category: metadata.category || 'General',
            tags: metadata.tags || [],
            difficulty: metadata.difficulty || 'Intermediate',
            estimated_time: metadata.estimated_time || '30-60 minutes',
            files: {
              metadata: `/objects/${entry}/metadata.json`,
              readme: `/objects/${entry}/README.md`,
              template: `/objects/${entry}/template.scad`
            }
          });

          log(`✅ Added: ${entry}`);
        } catch (err) {
          log(`⚠️ Skipped ${entry}: ${err.message}`);
        }
      }
    }

    const manifest = {
      version: 1,
      generated_at: new Date().toISOString(),
      count: templates.length,
      templates
    };

    await fs.promises.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    log(`📦 Manifest written to ${manifestPath} (${templates.length} templates)`);
  } catch (err) {
    log(`❌ Failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) buildObjectsManifest();
