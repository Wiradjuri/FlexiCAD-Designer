// Script to update all HTML files to use secure config loader
// Replaces insecure config file references with secure loader

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
    'public/index.html',
    'public/register.html', 
    'public/templates.html',
    'public/my-designs.html',
    'public/home.html',
    'public/payment.html',
    'public/payment-success.html',
    'public/payment-first-verification.html',
    'public/manage-promo.html',
    'public/auth-system-test.html',
    'public/test-supabase.html',
    'public/simple-auth-test.html'
];

// Pattern to find and replace
const oldPattern = /\s*<script src="config\/env-config\.js"><\/script>\s*\n\s*<script src="config\/config\.js"><\/script>/g;
const replacement = `    <script src="js/secure-config-loader.js"></script>`;

// Files that only have config.js (no env-config.js)
const configOnlyFiles = [
    'public/manual-fix.html',
    'public/fix-login.html', 
    'public/debug-db.html',
    'public/database-test.html',
    'public/config-test.html'
];

const configOnlyPattern = /\s*<script src="config\/config\.js"><\/script>/g;

function updateFile(filePath, pattern, replacement) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File not found: ${filePath}`);
            return false;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const updatedContent = content.replace(pattern, replacement);

        if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`✅ Updated ${filePath}`);
            return true;
        } else {
            console.log(`ℹ️ No changes needed for ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
        return false;
    }
}

console.log('🔒 Updating HTML files to use secure config loader...\n');

// Update files with both env-config.js and config.js
let updatedCount = 0;
for (const file of filesToUpdate) {
    if (updateFile(file, oldPattern, replacement)) {
        updatedCount++;
    }
}

// Update files with only config.js
for (const file of configOnlyFiles) {
    if (updateFile(file, configOnlyPattern, replacement)) {
        updatedCount++;
    }
}

console.log(`\n🎯 Updated ${updatedCount} files successfully`);
console.log('🔒 All HTML files now use secure config loader!');