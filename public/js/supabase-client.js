// Production-ready Supabase client initialization
// Singleton pattern to ensure only one client instance

class SupabaseClientManager {
    constructor() {
        this.client = null;
        this.initialized = false;
        this.initPromise = null;
    }

    async initialize() {
        // Return existing initialization promise if already in progress
        if (this.initPromise) {
            return this.initPromise;
        }

        // Return existing client if already initialized
        if (this.initialized && this.client) {
            return this.client;
        }

        // Create new initialization promise
        this.initPromise = this._createClient();
        return this.initPromise;
    }

    async _createClient() {
        try {
            // Ensure config is loaded
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG not loaded. Please include config.js first.');
            }

            // Check if Supabase library is loaded
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase library not loaded. Please include the Supabase CDN script.');
            }

            // Validate configuration
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
            }

            if (CONFIG.SUPABASE_URL === 'https://your-project.supabase.co' || 
                CONFIG.SUPABASE_ANON_KEY === 'your-anon-key') {
                throw new Error('Please update your Supabase configuration with real values.');
            }

            // Create Supabase client
            this.client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    storageKey: 'flexicad_auth_token',
                    storage: window.localStorage
                }
            });

            this.initialized = true;
            console.log('✅ Supabase client initialized successfully');
            
            return this.client;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
            this.initialized = false;
            this.client = null;
            this.initPromise = null;
            throw error;
        }
    }

    getClient() {
        if (!this.initialized || !this.client) {
            throw new Error('Supabase client not initialized. Call initialize() first.');
        }
        return this.client;
    }

    isInitialized() {
        return this.initialized && this.client !== null;
    }

    // Reset client (for testing or re-initialization)
    reset() {
        this.client = null;
        this.initialized = false;
        this.initPromise = null;
    }
}

// Global singleton instance
window.supabaseManager = window.supabaseManager || new SupabaseClientManager();

// Convenience function for getting initialized client
window.getSupabaseClient = async function() {
    return await window.supabaseManager.initialize();
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseClientManager;
}