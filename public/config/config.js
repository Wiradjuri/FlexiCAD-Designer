// Configuration for FlexiCAD Designer
const CONFIG = {
    // Supabase configuration - LOCAL TESTING VALUES
    SUPABASE_URL: 'https://fifqqnflxwfgnidawxzw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnFxbmZseHdmZ25pZGF3eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzUyNDUsImV4cCI6MjA3NDUxMTI0NX0.-49wxfcA9xwEbTHzuSL3RFGS9QCLaH9Dyb8lw_zSDk0',
    
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