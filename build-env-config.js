const fs = require('fs');
const path = require('path');

// Build configuration script for FlexiCAD Designer
// This script injects environment variables into the client-side config at build time

// Load environment variables from .env file
require('dotenv').config();

const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY
};

// Validate required environment variables
const missingVars = Object.entries(envVars).filter(([key, value]) => !value).map(([key]) => key);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

// Create environment JavaScript file
const envContent = `
// Auto-generated environment configuration
// DO NOT EDIT - This file is generated at build time
window.ENV = ${JSON.stringify(envVars, null, 2)};
`;

// Write to public directory
const envFilePath = path.join(__dirname, 'public', 'config', 'env-config.js');
fs.writeFileSync(envFilePath, envContent);

console.log('✅ Environment configuration built successfully');
console.log('📁 Generated:', envFilePath);
console.log('🔧 Environment variables injected:', Object.keys(envVars).join(', '));