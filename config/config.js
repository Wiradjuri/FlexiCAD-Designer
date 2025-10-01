// FlexiCAD Configuration - Set immediately with multiple fallbacks
(function() {
    const config = {
        environment: "development",
        siteUrl: "http://localhost:8888",
        api: {
            baseUrl: "/.netlify/functions"
        },
        supabase: {
            // Replace with your actual Supabase credentials
            url: "https://fifqqnflxwfgnidawxzw.supabase.co",
            anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnFxbmZseHdmZ25pZGF3eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzUyNDUsImV4cCI6MjA3NDUxMTI0NX0.-49wxfcA9xwEbTHzuSL3RFGS9QCLaH9Dyb8lw_zSDk0"
        },
        stripe: {
            publishableKey: "pk_live_51S0HmuPJgpJveDpNR9rM9NxgbmAGtLpBWkG4JkWwGcAw4IzOeSlKFXe9ggnyIFCfi6hm1UvcPXqiyFZD1jFGCv0P00I2jQNOw8"
        },
        features: {
            aiGeneration: true,
            userAuth: true,
            payments: true
        }
    };

    // Set config with multiple fallback names to ensure it's found
    window.flexicadConfig = config;
    window.FlexiCADConfig = config;
    window.FLEXICAD_CONFIG = config;
    
    // Also set a global flag that config is loaded
    window.FLEXICAD_CONFIG_LOADED = true;
    
    // Log successful config load
    console.log('✅ FlexiCAD configuration loaded');
    console.log('Config object:', config);

    // Validate configuration
    if (!config.supabase.url || !config.supabase.anonKey) {
        console.error('❌ Supabase configuration is missing');
    }

    if (config.features.payments && !config.stripe.publishableKey) {
        console.warn('⚠️ Stripe configuration is missing but payments are enabled');
    }
})();