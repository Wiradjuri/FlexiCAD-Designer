// FlexiCAD Payment-First Authentication System
// Users must pay before account creation - no free accounts allowed

class FlexiCADAuth {
    constructor() {
        this.user = null;
        this.paymentStatus = null;
        this.isInitialized = false;
        this.isLoggingIn = false;
        this.supabaseClient = null;
        this.authStateChangeListener = null;
    }

    // Initialize authentication system
    async init() {
        try {
            console.log('🔄 Initializing FlexiCAD Payment-First Authentication...');

            // Initialize Supabase client
            await this.initializeSupabase();

            // Check current Supabase session
            const { data: { session }, error } = await this.supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Session check error:', error);
            }

            if (session && session.user) {
                console.log('✅ Found existing Supabase session');
                this.user = session.user;
                
                // Check if user has paid access
                await this.checkPaymentStatus();
                
                // If user is not paid, redirect to register for payment
                if (!this.paymentStatus?.hasPaid) {
                    console.log('⚠️ User found but no payment - redirecting to register');
                    await this.logout(); // Clear invalid session
                    window.location.href = '/register.html?payment=required';
                    return false;
                }
                
                sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));
            }

            // Set up auth state change listener
            this.setupAuthStateListener();

            this.isInitialized = true;
            console.log('✅ Payment-first authentication system initialized');
            return true;
        } catch (error) {
            console.error('❌ Auth initialization error:', error);
            throw error;
        }
    }

    // Initialize Supabase client with comprehensive config detection
    async initializeSupabase() {
        try {
            // Wait and retry logic for config loading
            let retries = 0;
            const maxRetries = 10;
            const retryDelay = 200; // Increased delay
            
            while (retries < maxRetries) {
                console.log(`🔧 Checking script dependencies... (attempt ${retries + 1})`);
                console.log('Supabase available:', typeof window.supabase);
                
                // Check multiple possible config names
                const configOptions = [
                    'flexicadConfig',
                    'FlexiCADConfig', 
                    'flexiCADConfig',
                    'FLEXICAD_CONFIG',
                    'CONFIG'
                ];
                
                let foundConfig = null;
                for (const configName of configOptions) {
                    if (window[configName] && window[configName].SUPABASE_URL) {
                        foundConfig = window[configName];
                        console.log(`✅ Found config as window.${configName}`);
                        break;
                    }
                }
                
                console.log('Config search results:');
                configOptions.forEach(name => {
                    console.log(`  window.${name}:`, typeof window[name], window[name] ? '✓' : '✗');
                });
                
                // Also check all window properties containing 'config'
                const allConfigKeys = Object.keys(window).filter(key => 
                    key.toLowerCase().includes('config')
                );
                console.log('All config-related keys:', allConfigKeys);
                
                if (typeof window.supabase !== 'undefined' && foundConfig) {
                    // Use the found config
                    window.flexicadConfig = foundConfig;
                    console.log('✅ Config successfully mapped');
                    break;
                }
                
                retries++;
                if (retries >= maxRetries) {
                    console.error('❌ Max retries reached. Debug info:', {
                        supabase: typeof window.supabase,
                        allWindowKeys: Object.keys(window).slice(0, 20), // First 20 keys
                        configKeys: allConfigKeys,
                        windowObject: window
                    });
                    throw new Error('FlexiCAD configuration not found after multiple attempts. Config may not be loading properly.');
                }
                
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            
            console.log('Final config object:', window.flexicadConfig);
            
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase library not loaded. Please include the Supabase CDN script.');
            }

            if (!window.flexicadConfig || (!window.flexicadConfig.SUPABASE_URL && !window.flexicadConfig.supabase)) {
                throw new Error('Supabase configuration missing from config object');
            }

            // Support both direct CONFIG format and nested supabase format
            let supabaseUrl, supabaseAnonKey;
            
            if (window.flexicadConfig.SUPABASE_URL) {
                // Direct CONFIG format
                supabaseUrl = window.flexicadConfig.SUPABASE_URL;
                supabaseAnonKey = window.flexicadConfig.SUPABASE_ANON_KEY;
            } else if (window.flexicadConfig.supabase) {
                // Nested supabase format
                supabaseUrl = window.flexicadConfig.supabase.url;
                supabaseAnonKey = window.flexicadConfig.supabase.anonKey;
            }
            
            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase configuration is incomplete. Please check config.js');
            }

            this.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });

            console.log('✅ Supabase client initialized successfully');
            return this.supabaseClient;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            throw error;
        }
    }

    // Set up auth state change listener with enhanced debugging
    setupAuthStateListener() {
        if (!this.supabaseClient) return;

        this.authStateChangeListener = this.supabaseClient.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`🔄 Auth state change: ${event}`, {
                    event,
                    hasSession: !!session,
                    userId: session?.user?.id,
                    userEmail: session?.user?.email,
                    timestamp: new Date().toISOString()
                });
                
                await this.handleAuthStateChange(event, session);
            }
        );
    }

    // Enhanced auth state handler with better debugging
    async handleAuthStateChange(event, session) {
        console.log(`🎯 Handling auth state: ${event}`);
        
        try {
            switch (event) {
                case 'INITIAL_SESSION':
                    console.log('📍 Initial session check...');
                    if (session) {
                        console.log('✅ Session exists, checking payment status...');
                        await this.handleExistingSession(session);
                    } else {
                        console.log('ℹ️ No initial session found');
                        this.handleNoSession();
                    }
                    break;
                    
                case 'SIGNED_IN':
                    console.log('✅ User signed in successfully');
                    await this.handleSignIn(session);
                    break;
                    
                case 'SIGNED_OUT':
                    console.log('👋 User signed out');
                    this.handleSignOut();
                    break;
                    
                case 'PASSWORD_RECOVERY':
                    console.log('🔑 Password recovery initiated');
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed');
                    break;
                    
                case 'USER_UPDATED':
                    console.log('👤 User updated');
                    break;
                    
                default:
                    console.log(`❓ Unknown auth event: ${event}`);
            }
        } catch (error) {
            console.error(`❌ Error handling auth state ${event}:`, error);
            this.showMessage && this.showMessage(error.message, 'error');
        }
    }

    async handleExistingSession(session) {
        console.log('🔍 Processing existing session for user:', session.user.email);
        
        try {
            this.user = session.user;
            
            // Skip processing if we're in the middle of a login
            if (this.isLoggingIn) {
                console.log('🔄 Login in progress, skipping existing session handler');
                return;
            }
            
            // Check if user has valid payment status
            console.log('💳 Checking payment status...');
            await this.checkPaymentStatus();
            
            console.log('💳 Payment status result:', this.paymentStatus);
            
            if (this.paymentStatus?.hasPaid) {
                console.log('✅ User has paid access');
                // Only redirect if on login/index page, otherwise let user stay on current page
                const currentPath = window.location.pathname;
                if (currentPath === '/' || currentPath === '/index.html') {
                    console.log('🏠 User on login page, redirecting to homepage...');
                    this.redirectToDashboard();
                } else {
                    console.log('📍 User already on valid page, no redirect needed');
                }
            } else {
                console.log('❌ User needs to complete payment, redirecting to register...');
                this.redirectToPayment('Payment required to access FlexiCAD Designer');
            }
        } catch (error) {
            console.error('❌ Error checking existing session:', error);
            this.redirectToPayment('Unable to verify payment status. Please register or contact support.');
        }
    }

    handleNoSession() {
        console.log('🔓 No active session detected');
        const currentPath = window.location.pathname;
        
        // Allow access to register and payment pages
        if (currentPath.includes('register.html') || 
            currentPath.includes('payment-success.html') ||
            currentPath.includes('direct-profile-fix.html') ||
            currentPath.includes('debug-db.html')) {
            console.log('📄 Allowing access to public page:', currentPath);
            return;
        }
        
        // Redirect to login for protected pages
        if (currentPath !== '/' && currentPath !== '/index.html') {
            console.log('🔄 Redirecting to login from protected page:', currentPath);
            window.location.href = '/';
        }
    }

    async handleSignIn(session) {
        console.log('🎉 Processing successful sign in for:', session.user.email);
        
        try {
            this.user = session.user;
            
            // Only process if not already handling login
            if (this.isLoggingIn) {
                console.log('🔄 Login already in progress, skipping auth state handler');
                return;
            }
            
            // Check payment status immediately after sign in
            await this.checkPaymentStatus();
            
            if (this.paymentStatus?.hasPaid) {
                console.log('✅ Paid user signed in');
                // Only redirect from login/index page, not from other pages
                const currentPath = window.location.pathname;
                if (currentPath === '/' || currentPath === '/index.html') {
                    console.log('🏠 Redirecting from login page to homepage');
                    this.redirectToDashboard();
                } else {
                    console.log('📍 User already on valid page after sign in');
                }
            } else {
                console.log('❌ Unpaid user signed in, redirecting to payment');
                this.redirectToPayment('Payment required to access FlexiCAD Designer');
            }
        } catch (error) {
            console.error('❌ Error processing sign in:', error);
            this.showMessage && this.showMessage('Sign in successful, but there was an error verifying your account. Please try again.', 'error');
        }
    }

    handleSignOut() {
        console.log('🚪 Processing sign out');
        this.user = null;
        this.paymentStatus = null;
        
        // Clear any cached data
        localStorage.removeItem('flexicad_user');
        sessionStorage.clear();
        
        // Redirect to login
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            window.location.href = '/';
        }
    }

    redirectToDashboard() {
        console.log('🏠 Checking if redirect to dashboard is needed...');
        const currentPath = window.location.pathname;
        
        // Define pages that authenticated users can access
        const allowedPages = [
            '/home.html',
            '/about.html', 
            '/templates.html',
            '/ai.html',
            '/my-designs.html'
        ];
        
        // If user is already on an allowed page, don't redirect
        if (allowedPages.includes(currentPath)) {
            console.log(`📍 User is on allowed page: ${currentPath}, no redirect needed`);
            return;
        }
        
        // Otherwise, redirect to homepage (not AI page)
        const dashboardPath = '/home.html';
        console.log(`📍 Current path: ${currentPath}, redirecting to: ${dashboardPath}`);
        window.location.href = dashboardPath;
    }

    redirectToPayment(message = null) {
        console.log('💳 Redirecting to payment/register page...');
        
        if (message) {
            // Store message to show on register page
            sessionStorage.setItem('payment_message', message);
        }
        
        const registerPath = '/register.html?payment=required';
        
        if (window.location.pathname !== '/register.html') {
            console.log(`📍 Current path: ${window.location.pathname}, redirecting to: ${registerPath}`);
            window.location.href = registerPath;
        } else {
            console.log('📍 Already on register page');
            if (message && this.showMessage) {
                this.showMessage(message, 'warning');
            }
        }
    }

    // Check payment status via API
    async checkPaymentStatus() {
        if (!this.user?.id) {
            console.log('❌ No user ID available for payment check');
            this.paymentStatus = { hasPaid: false, needsRegistration: true };
            return this.paymentStatus;
        }

        try {
            console.log('� Checking payment status for user:', this.user.id);

            const response = await fetch('/.netlify/functions/check-payment-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.user.id
                })
            });

            console.log('📡 Payment status response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Payment status check failed:', response.status, errorText);
                throw new Error(`Payment check failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('💳 Payment status data received:', result);
            
            // If user needs registration (not found in profiles), create profile automatically
            if (result.needsRegistration && this.user) {
                console.log('🔄 User needs profile - creating automatically...');
                await this.createProfileForUser();
                // Recheck payment status after creating profile
                return await this.checkPaymentStatus();
            }
            
            this.paymentStatus = {
                hasPaid: result.hasPaid || false,
                isActive: result.isActive || false,
                subscriptionPlan: result.subscriptionPlan || null,
                profile: result.profile || null
            };
            
            console.log(this.paymentStatus.hasPaid ? '✅ User has valid payment' : '❌ Payment required', this.paymentStatus);
            return this.paymentStatus;
        } catch (error) {
            console.error('❌ Payment status check error:', error);
            // Return false for payment status on error to be safe
            this.paymentStatus = {
                hasPaid: false,
                isActive: false,
                subscriptionPlan: null,
                profile: null,
                error: error.message
            };
            return this.paymentStatus;
        }
    }

    // Create profile for logged-in user
    async createProfileForUser() {
        if (!this.user) {
            throw new Error('No user logged in');
        }

        try {
            console.log('🔄 Creating profile for user:', this.user.email);

            const response = await fetch('/.netlify/functions/create-profile-on-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.user.id,
                    email: this.user.email
                })
            });

            if (!response.ok) {
                throw new Error(`Profile creation failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Profile created:', result);
            return result;
        } catch (error) {
            console.error('❌ Failed to create profile:', error);
            throw error;
        }
    }

    // Require authentication and payment
    async requireAuth(redirectPath = '/register.html') {
        if (!this.isInitialized) {
            await this.init();
        }

        // Check if user is logged in
        if (!this.user) {
            console.log('User not authenticated, redirecting to register');
            window.location.href = `${redirectPath}?auth=required`;
            return false;
        }

        // Check payment status
        if (!this.paymentStatus) {
            await this.checkPaymentStatus();
        }

        // Payment-first enforcement
        if (!this.paymentStatus.hasPaid) {
            console.log('User has no valid payment, redirecting to register');
            window.location.href = `${redirectPath}?payment=required`;
            return false;
        }

        console.log('✅ User authenticated with valid payment');
        return true;
    }

    // Login - only for users who have already paid
    async login(email, password) {
        try {
            console.log('🔄 Starting login process for:', email);
            
            // Set flag to prevent auth state handler interference
            this.isLoggingIn = true;
            
            if (!this.supabaseClient) {
                await this.initializeSupabase();
            }

            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                console.error('❌ Login error:', error);
                throw error;
            }

            if (data.user) {
                console.log('✅ Login successful, checking payment status...');
                this.user = data.user;
                
                // Check payment status
                await this.checkPaymentStatus();
                
                if (!this.paymentStatus.hasPaid) {
                    console.log('⚠️ User logged in but no valid payment');
                    await this.logout();
                    throw new Error('Account requires payment. Go to http://localhost:8888/fix-payment.html to fix your payment status, then try logging in again.');
                }
                
                console.log('✅ Payment verified - user has access');
                sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));
                
                // Small delay to ensure auth state is settled
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Redirect to homepage after successful login and payment verification
                console.log('🚀 Redirecting to homepage after successful login');
                window.location.href = '/home.html';
                
                return { success: true, user: data.user };
            } else {
                throw new Error('Login failed: No user data returned');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        } finally {
            // Clear the login flag
            this.isLoggingIn = false;
        }
    }

    // Register - payment-first system
    async registerWithPayment(email, password, plan = 'monthly') {
        try {
            console.log('🔄 Starting payment-first registration for:', email);

            // Step 1: Create checkout session
            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    plan: plan,
                    userId: null // No user yet - will be created after payment
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create payment session');
            }

            const { sessionId, url } = await response.json();
            
            console.log('✅ Payment session created');
            
            // Store registration data temporarily
            sessionStorage.setItem('pending_registration', JSON.stringify({
                email: email.trim(),
                password: password,
                plan: plan,
                sessionId: sessionId
            }));

            // Redirect to Stripe checkout
            window.location.href = url;
            
            return { success: true, redirecting: true };
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    // Alias for backward compatibility with HTML forms
    async register(email, password, plan = 'monthly') {
        return this.registerWithPayment(email, password, plan);
    }

    // Handle successful payment and create user
    async handlePaymentSuccess(sessionId) {
        try {
            console.log('🔄 Processing payment success...');

            const pendingData = sessionStorage.getItem('pending_registration');
            if (!pendingData) {
                throw new Error('No pending registration data found');
            }

            const { email, password, plan } = JSON.parse(pendingData);

            // Process payment success and create user
            const response = await fetch('/.netlify/functions/handle-payment-success', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    tempPassword: password
                })
            });

            if (!response.ok) {
                throw new Error('Failed to process payment success');
            }

            const result = await response.json();
            
            // Clean up pending data
            sessionStorage.removeItem('pending_registration');
            
            console.log('✅ Payment successful, user created:', result.userId);
            
            // Now log the user in
            return await this.login(email, password);
        } catch (error) {
            console.error('❌ Payment success handling error:', error);
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            console.log('🔄 Logging out user');
            
            if (this.supabaseClient) {
                const { error } = await this.supabaseClient.auth.signOut();
                if (error) {
                    console.error('Supabase logout error:', error);
                }
            }

            // Clear local state
            this.user = null;
            this.paymentStatus = null;
            sessionStorage.removeItem('flexicad_user');

            // Remove auth state listener
            if (this.authStateChangeListener) {
                this.authStateChangeListener.data.subscription.unsubscribe();
                this.authStateChangeListener = null;
            }

            console.log('✅ Logout successful');
            
            // Redirect to index page
            window.location.href = '/index.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }

    // Check if user is admin
    isAdmin() {
        if (!this.user || !this.paymentStatus?.hasPaid) return false;
        // Add admin logic here if needed
        return false;
    }

    // Check URL parameters
    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            authRequired: urlParams.get('auth') === 'required',
            paymentRequired: urlParams.get('payment') === 'required',
            paymentCancelled: urlParams.get('payment') === 'cancelled',
            sessionId: urlParams.get('session_id'),
            error: urlParams.get('error')
        };
    }

    // Get current user data
    getUser() {
        return this.user;
    }

    // Get session token (returns the actual JWT token from Supabase session)
    async getSessionToken() {
        if (!this.supabaseClient) {
            console.error('Supabase client not initialized');
            return null;
        }
        
        try {
            const { data: { session }, error } = await this.supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Error getting session token:', error);
                return null;
            }
            
            return session?.access_token || null;
        } catch (error) {
            console.error('Failed to get session token:', error);
            return null;
        }
    }
}

// Global instance
window.flexicadAuth = new FlexiCADAuth();

// Also create the FlexiAuth alias for backward compatibility
window.FlexiAuth = window.flexicadAuth;

// Note: Manual initialization required - call window.flexicadAuth.init() from your page
