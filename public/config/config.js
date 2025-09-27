// Production-ready configuration for FlexiCAD Designer
// This file uses environment variables and never exposes secrets
const CONFIG = {
    // Supabase configuration - uses environment variables
    SUPABASE_URL: typeof window !== 'undefined' ? window.ENV?.SUPABASE_URL || 'https://your-project.supabase.co' : 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: typeof window !== 'undefined' ? window.ENV?.SUPABASE_ANON_KEY || 'your-anon-key' : 'your-anon-key',
    
    // Stripe configuration - uses environment variables
    STRIPE_PUBLISHABLE_KEY: typeof window !== 'undefined' ? window.ENV?.STRIPE_PUBLISHABLE_KEY || 'pk_test_...' : 'pk_test_...',
    
    // Application settings
    APP_NAME: 'FlexiCAD Designer',
    VERSION: '1.0.0',
    
    // API endpoints
    NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}