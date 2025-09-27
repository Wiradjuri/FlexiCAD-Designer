const fs = require('fs');
const path = require('path');

/**
 * Restore Config Backup Script
 * 
 * This script restores the original config.js from backup,
 * useful for development or when build process fails.
 */

const CONFIG_FILE = path.join(__dirname, '..', 'public', 'config', 'config.js');
const CONFIG_BACKUP = path.join(__dirname, '..', 'public', 'config', 'config.js.backup');

function restoreBackup() {
    console.log('🔄 Restoring config from backup...');
    
    if (!fs.existsSync(CONFIG_BACKUP)) {
        console.error('❌ No backup file found at:', CONFIG_BACKUP);
        console.log('ℹ️  This usually means the secure build hasn\'t been run yet');
        process.exit(1);
    }
    
    try {
        fs.copyFileSync(CONFIG_BACKUP, CONFIG_FILE);
        console.log('✅ Config restored from backup successfully');
        console.log('📋 Template placeholders are now active in config.js');
    } catch (error) {
        console.error('❌ Failed to restore config:', error.message);
        process.exit(1);
    }
}

// Run the restore process
if (require.main === module) {
    restoreBackup();
}

module.exports = { restoreBackup };