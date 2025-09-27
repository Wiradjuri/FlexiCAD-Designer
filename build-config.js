#!/usr/bin/env node
// Build script to replace environment variables in config.js for production

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'public', 'config', 'config.js');
console.log('📁 Config path:', configPath);

// Check if we have environment variables (production)
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  console.log('🚀 Production build - injecting environment variables...');
  
  // Template config.js content with real environment variables
  const configTemplate = `// Configuration for FlexiCAD Designer - Auto-generated for production
const CONFIG = {
    // Supabase configuration
    SUPABASE_URL: '${process.env.SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}',
    
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

  // Write the production config file
  fs.writeFileSync(configPath, configTemplate);
  console.log('✅ Production config.js generated with real credentials');
} else {
  console.log('⚠️  Development build - keeping placeholder values');
  console.log('� Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables for production build');
}