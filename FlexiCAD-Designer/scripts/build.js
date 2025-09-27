#!/usr/bin/env node

const { buildAiReferenceManifest } = require('./build-ai-manifest');
const { buildObjectsManifest } = require('./build-objects-manifest');

console.log('🚀 FlexiCAD Production Build');
console.log('================================');

// Read environment variables with fallbacks
const config = {
  environment: process.env.NODE_ENV || 'production',
  siteUrl: process.env.URL || 'https://flexicad.com.au',
  apiUrl: process.env.URL || 'https://flexicad.com.au',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    priceIds: {
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_1SB07SPJgpJveDpNhT51Z0OO',
      yearly: process.env.STRIPE_YEARLY_PRICE_ID || 'price_1SB07SPJgpJveDpNnB5dcFSS'
    }
  },
  features: {
    aiGeneration: !!process.env.OPENAI_API_KEY,
    userAuth: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    payments: !!process.env.STRIPE_PUBLISHABLE_KEY
  }
};

// Validate essential configuration (only fail for critical missing vars)
const criticalRequired = [
  'OPENAI_API_KEY'  // Essential for AI functionality
];

const optionalRequired = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'STRIPE_PUBLISHABLE_KEY'
];

const criticalMissing = criticalRequired.filter(key => !process.env[key]);
const optionalMissing = optionalRequired.filter(key => !process.env[key]);

if (criticalMissing.length > 0) {
  console.error('❌ Missing critical environment variables:', criticalMissing.join(', '));
  console.error('Please set these in your Netlify environment variables or .env file');
  process.exit(1);
}

if (optionalMissing.length > 0) {
  console.warn('⚠️  Missing optional environment variables:', optionalMissing.join(', '));
  console.warn('Some features may not work without these variables');
}

// Generate the configuration file
const configJs = `// Auto-generated configuration - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
window.FlexiCADConfig = ${JSON.stringify(config, null, 2)};

console.log('FlexiCAD Designer - Production mode loaded');`;

// Write the configuration file
const configPath = path.join(__dirname, '../landing_pages/config/config.js');
fs.writeFileSync(configPath, configJs);

console.log('✅ Configuration file generated successfully');
console.log('✅ Build complete');