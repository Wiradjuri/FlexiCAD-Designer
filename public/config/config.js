// Production-ready configuration for FlexiCAD Designer
// Idempotent configuration that can be loaded multiple times safely

// Check if CONFIG already exists to prevent redeclaration
if (typeof CONFIG === 'undefined') {
    // Global CONFIG declaration - only create once
    var CONFIG = {};
}

// Only initialize if not already done
if (!CONFIG.initialized) {
    // Supabase configuration - uses environment variables when available
    CONFIG.SUPABASE_URL = typeof window !== 'undefined' && window.ENV?.SUPABASE_URL ? 
        window.ENV.SUPABASE_URL : 
        'https://fifqqnflxwfgnidawxzw.supabase.co'; // Your actual Supabase URL
    
    CONFIG.SUPABASE_ANON_KEY = typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY ? 
        window.ENV.SUPABASE_ANON_KEY : 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnFxbmZseHdmZ25pZGF3eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzUyNDUsImV4cCI6MjA3NDUxMTI0NX0.-49wxfcA9xwEbTHzuSL3RFGS9QCLaH9Dyb8lw_zSDk0'; // Your actual anon key
    
    // Stripe configuration - uses environment variables when available
    CONFIG.STRIPE_PUBLISHABLE_KEY = typeof window !== 'undefined' && window.ENV?.STRIPE_PUBLISHABLE_KEY ? 
        window.ENV.STRIPE_PUBLISHABLE_KEY : 
        'pk_live_51S0HmuPJgpJveDpNR9rM9NxgbmAGtLpBWkG4JkWwGcAw4IzOeSlKFXe9ggnyIFCfi6hm1UvcPXqiyFZD1jFGCv0P00I2jQNOw8'; // Your actual publishable key
    
    // Application settings
    CONFIG.APP_NAME = 'FlexiCAD Designer';
    CONFIG.VERSION = '1.0.0';
    
    // API endpoints
    CONFIG.NETLIFY_FUNCTIONS_BASE = '/.netlify/functions';
    
    // Payment-first system configuration
    CONFIG.PAYMENT_FIRST = true;
    CONFIG.FEATURES = {
        STRICT_PAYMENT_ENFORCEMENT: true,
        DEBUG_AUTH: true,
        AUTO_LOGOUT_UNPAID: true,
        SESSION_MONITORING: true
    };
    
    // Pricing configuration
    CONFIG.PRICING = {
        MONTHLY: {
            amount: 10,
            currency: 'USD',
            interval: 'month',
            plan_id: 'monthly'
        },
        YEARLY: {
            amount: 50,
            currency: 'USD',
            interval: 'year',
            plan_id: 'yearly',
            savings: 70
        }
    };
    
    // Database configuration
    CONFIG.DATABASE = {
        PROFILES_TABLE: 'profiles',
        REQUIRED_FIELDS: ['id', 'email', 'is_paid', 'is_active', 'stripe_customer_id']
    };
    
    // Mark as initialized to prevent re-initialization
    CONFIG.initialized = true;
    
    console.log('✅ FlexiCAD configuration loaded');
}

// Validation function to check if configuration is properly set up
CONFIG.validate = function() {
    const errors = [];
    
    // Check Supabase configuration
    if (!this.SUPABASE_URL || this.SUPABASE_URL.includes('your-project-id')) {
        errors.push('Supabase URL not configured - please set your actual project URL');
    }
    
    if (!this.SUPABASE_ANON_KEY || this.SUPABASE_ANON_KEY.includes('YOUR_ACTUAL_ANON_KEY_HERE')) {
        errors.push('Supabase anon key not configured - please set your actual anon key');
    }
    
    // Check Stripe configuration
    if (!this.STRIPE_PUBLISHABLE_KEY || this.STRIPE_PUBLISHABLE_KEY.includes('your_actual_stripe_publishable_key_here')) {
        errors.push('Stripe publishable key not configured - please set your actual publishable key');
    }
    
    if (errors.length > 0) {
        console.error('❌ Configuration errors found:');
        errors.forEach(error => console.error('  -', error));
        throw new Error('Please update your configuration with real values. See setup instructions.');
    }
    
    console.log('✅ Configuration validation passed');
    return true;
};

// Helper function to get configuration values safely
CONFIG.get = function(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this);
};

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}