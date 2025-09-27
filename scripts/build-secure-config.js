const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Production-Ready Build Script for FlexiCAD Designer
 * 
 * This script securely injects environment variables into the public config file
 * at build time, ensuring sensitive API keys are never exposed in source code.
 * 
 * Security Features:
 * - Validates all required environment variables
 * - Creates backup of original config
 * - Injects variables only at build time
 * - Validates injected values
 */

const CONFIG_FILE = path.join(__dirname, '..', 'public', 'config', 'config.js');
const CONFIG_BACKUP = path.join(__dirname, '..', 'public', 'config', 'config.js.backup');

// Required environment variables for production
const REQUIRED_ENV_VARS = {
    SUPABASE_URL: 'Supabase project URL',
    SUPABASE_ANON_KEY: 'Supabase anonymous key', 
    STRIPE_PUBLISHABLE_KEY: 'Stripe publishable key'
};

// Optional environment variables
const OPTIONAL_ENV_VARS = {
    DEBUG_AUTH: 'Debug authentication (default: false)',
    NODE_ENV: 'Node environment (default: production)'
};

function validateEnvironmentVariables() {
    console.log('🔍 Validating environment variables...');
    
    const missing = [];
    const invalid = [];
    
    // Check required variables
    for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
        const value = process.env[varName];
        
        if (!value) {
            missing.push(`${varName} - ${description}`);
            continue;
        }
        
        // Validate format
        if (varName === 'SUPABASE_URL' && !value.includes('.supabase.co')) {
            invalid.push(`${varName} - Must be a valid Supabase URL`);
        }
        
        if (varName === 'SUPABASE_ANON_KEY' && !value.startsWith('eyJ')) {
            invalid.push(`${varName} - Must be a valid JWT token`);
        }
        
        if (varName === 'STRIPE_PUBLISHABLE_KEY' && !value.startsWith('pk_')) {
            invalid.push(`${varName} - Must start with pk_`);
        }
    }
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(item => console.error(`  - ${item}`));
        throw new Error('Please set all required environment variables in .env file');
    }
    
    if (invalid.length > 0) {
        console.error('❌ Invalid environment variables:');
        invalid.forEach(item => console.error(`  - ${item}`));
        throw new Error('Please fix invalid environment variable formats');
    }
    
    console.log('✅ All environment variables validated');
}

function createBackup() {
    if (fs.existsSync(CONFIG_FILE)) {
        fs.copyFileSync(CONFIG_FILE, CONFIG_BACKUP);
        console.log('📋 Created backup of config.js');
    }
}

function injectEnvironmentVariables() {
    console.log('🔧 Injecting environment variables into config...');
    
    if (!fs.existsSync(CONFIG_FILE)) {
        throw new Error(`Config file not found: ${CONFIG_FILE}`);
    }
    
    let configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    
    // Replace placeholders with actual values
    const replacements = {
        '{{SUPABASE_URL}}': process.env.SUPABASE_URL,
        '{{SUPABASE_ANON_KEY}}': process.env.SUPABASE_ANON_KEY,
        '{{STRIPE_PUBLISHABLE_KEY}}': process.env.STRIPE_PUBLISHABLE_KEY
    };
    
    for (const [placeholder, value] of Object.entries(replacements)) {
        if (configContent.includes(placeholder)) {
            configContent = configContent.replace(placeholder, value);
            console.log(`  ✓ Replaced ${placeholder}`);
        } else {
            console.warn(`  ⚠️ Placeholder ${placeholder} not found in config`);
        }
    }
    
    // Write the updated config
    fs.writeFileSync(CONFIG_FILE, configContent);
    console.log('✅ Environment variables injected successfully');
}

function validateInjectedConfig() {
    console.log('🔍 Validating injected configuration...');
    
    const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    
    // Check for remaining placeholders
    const remainingPlaceholders = configContent.match(/\{\{[^}]+\}\}/g);
    if (remainingPlaceholders) {
        console.error('❌ Found unreplaced placeholders:', remainingPlaceholders);
        throw new Error('Configuration injection incomplete');
    }
    
    // Basic validation of injected values
    if (!configContent.includes(process.env.SUPABASE_URL)) {
        throw new Error('Supabase URL not properly injected');
    }
    
    console.log('✅ Configuration validation passed');
}

function main() {
    try {
        console.log('🚀 Starting secure build process...\n');
        
        // Validate environment variables
        validateEnvironmentVariables();
        
        // Create backup of original config
        createBackup();
        
        // Inject environment variables
        injectEnvironmentVariables();
        
        // Validate the injected configuration
        validateInjectedConfig();
        
        console.log('\n✅ Secure build completed successfully!');
        console.log('🔒 API keys have been securely injected into configuration');
        console.log('📋 Original config backed up as config.js.backup');
        
    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        
        // Restore backup if injection failed
        if (fs.existsSync(CONFIG_BACKUP)) {
            fs.copyFileSync(CONFIG_BACKUP, CONFIG_FILE);
            console.log('📋 Restored original config from backup');
        }
        
        process.exit(1);
    }
}

// Run the build process
if (require.main === module) {
    main();
}

module.exports = { validateEnvironmentVariables, injectEnvironmentVariables };