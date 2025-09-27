// Environment-based configuration loader
// This file loads config from environment variables in production
// and from local config in development

let CONFIG;

if (typeof window !== 'undefined') {
  // Browser environment
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development - load from local config
    CONFIG = {
      SUPABASE_URL: 'https://fifqqnflxwfgnidawxzw.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnFxbmZseHdmZ25pZGF3eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MzUyNDUsImV4cCI6MjA3NDUxMTI0NX0.-49wxfcA9xwEbTHzuSL3RFGS9QCLaH9Dyb8lw_zSDk0',
      APP_NAME: 'FlexiCAD Designer',
      VERSION: '1.0.0',
      NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
    };
  } else {
    // Production - will be replaced by Netlify build process
    CONFIG = {
      SUPABASE_URL: '{{SUPABASE_URL}}',
      SUPABASE_ANON_KEY: '{{SUPABASE_ANON_KEY}}',
      APP_NAME: 'FlexiCAD Designer',
      VERSION: '1.0.0',
      NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
    };
  }
} else {
  // Node.js environment (for build process)
  CONFIG = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project-id.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your-anon-key-here',
    APP_NAME: 'FlexiCAD Designer',
    VERSION: '1.0.0',
    NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
  };
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}