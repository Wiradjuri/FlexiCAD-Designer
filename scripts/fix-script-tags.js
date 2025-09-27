// Fix broken script tags in HTML files
// The regex replacement messed up the line breaks

const fs = require('fs');
const path = require('path');

const filesToFix = [
    'public/test-supabase.html',
    'public/payment.html',
    'public/payment-success.html',
    'public/payment-first-verification.html',
    'public/my-designs.html',
    'public/manual-fix.html',
    'public/manage-promo.html',
    'public/index.html',
    'public/home.html',
    'public/fix-login.html',
    'public/debug-db.html',
    'public/database-test.html',
    'public/auth-system-test.html',
    'public/ai.html',
    'public/simple-auth-test.html',
    'public/config-test.html'
];

// Fix the broken script tag pattern
const brokenPattern = /(<script src="[^"]*"><\/script>)\s*(<script src="js\/secure-config-loader\.js"><\/script>)/g;
const fixedReplacement = '$1\n    $2';

// Also fix the env-config.js reference that might still exist
const envConfigPattern = /<script src="js\/env-config\.js"><\/script>\s*(<script src="js\/secure-config-loader\.js"><\/script>)/g;
const envConfigReplacement = '$1';

function fixFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File not found: ${filePath}`);
            return false;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // Fix broken script tags
        const newContent1 = content.replace(brokenPattern, fixedReplacement);
        if (newContent1 !== content) {
            content = newContent1;
            changed = true;
        }

        // Remove any remaining env-config.js references
        const newContent2 = content.replace(envConfigPattern, envConfigReplacement);
        if (newContent2 !== content) {
            content = newContent2;
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed ${filePath}`);
            return true;
        } else {
            console.log(`ℹ️ No changes needed for ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
        return false;
    }
}

console.log('🔧 Fixing broken script tags...\n');

let fixedCount = 0;
for (const file of filesToFix) {
    if (fixFile(file)) {
        fixedCount++;
    }
}

console.log(`\n🎯 Fixed ${fixedCount} files`);
console.log('🔧 All script tags should now be properly formatted!');