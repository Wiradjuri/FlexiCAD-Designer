// Production-ready configuration for FlexiCAD Designer
// Idempotent configuration that can be loaded multiple times safely

// Check if CONFIG already exists to prevent redeclaration
if (typeof CONFIG === 'undefined') {
    // Global CONFIG declaration - only create once
    var CONFIG = {};
}

// Only initialize if not already done
if (!CONFIG.initialized) {
    // Supabase configuration - uses environment variables
    CONFIG.SUPABASE_URL = typeof window !== 'undefined' ? window.ENV?.SUPABASE_URL || 'https://your-project.supabase.co' : 'https://your-project.supabase.co';
    CONFIG.SUPABASE_ANON_KEY = typeof window !== 'undefined' ? window.ENV?.SUPABASE_ANON_KEY || 'your-anon-key' : 'your-anon-key';
    
    // Stripe configuration - uses environment variables
    CONFIG.STRIPE_PUBLISHABLE_KEY = typeof window !== 'undefined' ? window.ENV?.STRIPE_PUBLISHABLE_KEY || 'pk_test_...' : 'pk_test_...';
    
    // Application settings
    CONFIG.APP_NAME = 'FlexiCAD Designer';
    CONFIG.VERSION = '1.0.0';
    
    // API endpoints
    CONFIG.NETLIFY_FUNCTIONS_BASE = '/.netlify/functions';
    
    // Payment-first system configuration
    CONFIG.PAYMENT_FIRST = true;
    CONFIG.FEATURES = {
        STRICT_PAYMENT_ENFORCEMENT: true,
        DEBUG_AUTH: true
    };
    
    // Mark as initialized to prevent re-initialization
    CONFIG.initialized = true;
}

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}