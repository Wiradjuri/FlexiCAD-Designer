#!/usr/bin/env node
// Build script to replace environment variables in config.js for production

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../public/config/config.js');

// Template config.js content
const configTemplate = `// Configuration for FlexiCAD Designer - Auto-generated for production
const CONFIG = {
    // Supabase configuration
    SUPABASE_URL: '${process.env.SUPABASE_URL || 'https://your-project-id.supabase.co'}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'}',
    
    // Application settings
    APP_NAME: 'FlexiCAD Designer',
    VERSION: '1.0.0',
    
    // API endpoints
    NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}`;

// Write the config file
fs.writeFileSync(configPath, configTemplate);
console.log('✅ Production config.js generated successfully');
console.log('🔑 Using environment variables for sensitive data');