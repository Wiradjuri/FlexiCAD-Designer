// Configuration for FlexiCAD Designer
const CONFIG = {
    // Supabase configuration - REPLACE WITH YOUR VALUES
    SUPABASE_URL: 'https://your-project-id.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    

    // Application settings
    APP_NAME: 'FlexiCAD Designer',
    VERSION: '1.0.0',
    
    // API endpoints
    NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
};

// Export for use in modules (if using ES6 modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}