// Secure Configuration Loader for FlexiCAD Designer
// Fetches configuration from secure server endpoint
// No sensitive data stored in client-side files

(function() {
    'use strict';
    
    // Prevent multiple initializations
    if (window.CONFIG_LOADER_INITIALIZED) {
        return;
    }
    window.CONFIG_LOADER_INITIALIZED = true;

    // Global CONFIG object
    window.CONFIG = {
        loaded: false,
        loading: false,
        error: null
    };

    // Load configuration from secure endpoint
    async function loadConfig() {
        if (window.CONFIG.loaded || window.CONFIG.loading) {
            return window.CONFIG.loaded ? Promise.resolve() : waitForConfig();
        }

        window.CONFIG.loading = true;
        
        try {
            console.log('Loading secure configuration...');
            
            const response = await fetch('/.netlify/functions/get-public-config', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'default'
            });

            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
            }

            const config = await response.json();
            
            // Merge configuration into global CONFIG object
            Object.assign(window.CONFIG, config);
            window.CONFIG.loaded = true;
            window.CONFIG.loading = false;
            window.CONFIG.error = null;
            
            console.log('Configuration loaded successfully');
            
            // Dispatch event for components waiting for config
            window.dispatchEvent(new CustomEvent('config-loaded', { detail: config }));
            
        } catch (error) {
            console.error('Failed to load configuration:', error);
            window.CONFIG.error = error.message;
            window.CONFIG.loading = false;
            
            // Fallback to minimal config to prevent app breaking
            window.CONFIG = {
                ...window.CONFIG,
                APP_NAME: 'FlexiCAD Designer',
                VERSION: '1.0.0',
                NETLIFY_FUNCTIONS_BASE: '/.netlify/functions',
                PAYMENT_FIRST: true,
                error: error.message
            };
            
            window.dispatchEvent(new CustomEvent('config-error', { detail: error }));
        }
    }

    // Wait for config to load (for synchronous-like usage)
    function waitForConfig(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (window.CONFIG.loaded) {
                resolve();
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('Configuration loading timeout'));
            }, timeout);

            function onConfigLoaded() {
                clearTimeout(timeoutId);
                window.removeEventListener('config-loaded', onConfigLoaded);
                window.removeEventListener('config-error', onConfigError);
                resolve();
            }

            function onConfigError(event) {
                clearTimeout(timeoutId);
                window.removeEventListener('config-loaded', onConfigLoaded);
                window.removeEventListener('config-error', onConfigError);
                reject(new Error(`Configuration error: ${event.detail.message}`));
            }

            window.addEventListener('config-loaded', onConfigLoaded);
            window.addEventListener('config-error', onConfigError);
        });
    }

    // Expose utilities
    window.CONFIG.load = loadConfig;
    window.CONFIG.waitForLoad = waitForConfig;

    // Auto-load configuration when script loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadConfig);
    } else {
        loadConfig();
    }

})();