// FlexiCAD Payment-First Authentication System
// Phase: 4.7.18 - Race-proof Supabase UMD init for dev (wait for window.supabase)
// Users must pay before account creation - no free accounts allowed

// Phase: 4.7.18 - Do not canonicalize /index.html to /
function isLoginPathname(pn) {
    return pn === '/' || pn.endsWith('/index.html');
}

// Phase: 4.7.18 - Race-proof Supabase UMD init for dev (wait for window.supabase)
(function attachWaitForSupabase() {
  async function waitForSupabaseUMD(maxMs = 5000, stepMs = 100) {
    if (window.supabase?.createClient) return true;
    const start = Date.now();
    while ((Date.now() - start) < maxMs) {
      if (window.supabase?.createClient) return true;
      await new Promise(r => setTimeout(r, stepMs));
    }
    return false;
  }
  window.__FC_WAIT_SUPA__ = waitForSupabaseUMD;
})();

class FlexiCADAuth {
    constructor() {
        this.user = null;
        this.paymentStatus = null;
        this.isInitialized = false;
        this.isLoggingIn = false;
        this.supabaseClient = null;
        this.authStateChangeListener = null;
        this.isInitializing = false;
        this._initPromise = null;
        this.adminCheckCache = { value: null, expiresAt: 0 };
    }

    // Initialize authentication system
    async init() {
        if (this.isInitialized) {
            return true;
        }

        if (this._initPromise) {
            return this._initPromise;
        }

        this.isInitializing = true;

        const initPromise = (async () => {
            try {
                console.log('🔄 Initializing FlexiCAD Payment-First Authentication...');

                // CRITICAL: Wait for CONFIG to load before doing anything
                if (window.CONFIG && window.CONFIG.waitForLoad) {
                    console.log('🔧 Waiting for secure configuration...');
                    await window.CONFIG.waitForLoad();
                    console.log('✅ Secure configuration loaded');
                }

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
            } finally {
                this.isInitializing = false;
            }
        })();

        this._initPromise = initPromise.catch((error) => {
            this._initPromise = null;
            throw error;
        });

        return this._initPromise;
    }

    // Initialize Supabase client
    async initializeSupabase() {
        try {
            console.log('🔧 Initializing Supabase client...');
            
            // Phase: 4.7.18 - Wait for UMD before creating client to fix dev race
            const ready = await (window.__FC_WAIT_SUPA__ ? window.__FC_WAIT_SUPA__(5000, 100) : Promise.resolve(!!(window.supabase && window.supabase.createClient)));
            if (!ready || !window.supabase?.createClient) {
                throw new Error('Supabase client library not available');
            }
            
            // CRITICAL: Wait for CONFIG to be loaded before creating client
            if (!window.CONFIG) {
                console.log('⏳ Waiting for CONFIG to load...');
                await new Promise(resolve => {
                    const checkConfig = () => {
                        if (window.CONFIG && window.CONFIG.SUPABASE_URL) {
                            resolve();
                        } else {
                            setTimeout(checkConfig, 100);
                        }
                    };
                    checkConfig();
                });
            }
            
            // Double-check that CONFIG is properly loaded
            if (!window.CONFIG || !window.CONFIG.SUPABASE_URL || !window.CONFIG.SUPABASE_ANON_KEY) {
                throw new Error('Configuration not properly loaded. Missing Supabase credentials.');
            }
            
            console.log('✅ CONFIG loaded, creating Supabase client...');
            
            // Check if global shared client already exists
            if (window._flexicadSupabaseClient) {
                console.log('♻️ Using existing shared Supabase client');
                this.supabaseClient = window._flexicadSupabaseClient;
                return this.supabaseClient;
            }

            // Create Supabase client with secure config and store globally
            this.supabaseClient = window.supabase.createClient(
                window.CONFIG.SUPABASE_URL, 
                window.CONFIG.SUPABASE_ANON_KEY, 
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                }
            );
            
            // Store as global shared instance
            window._flexicadSupabaseClient = this.supabaseClient;

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
        
        // Phase: 4.7.18 - Redirect to login page, keep URL stable (no canonicalization)
        if (!isLoginPathname(window.location.pathname)) {
            window.location.href = 'index.html';
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
    async registerWithPayment(email, password, plan = 'monthly', promoCode = '') {
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
                    userId: null, // No user yet - will be created after payment
                    promoCode: promoCode || undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Checkout session error:', response.status, errorData);

                // Surface friendly error message
                const errorMessage = errorData?.error?.message || 'Failed to create payment session';
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('✅ Checkout session response:', { hasUrl: !!data.url, hasId: !!data.id });

            // Extract URL and session ID from response
            const sessionId = data.id;
            const url = data.url;

            if (!url) {
                throw new Error('No checkout URL received from payment service');
            }
            
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
    async register(email, password, plan = 'monthly', promoCode = '') {
        return this.registerWithPayment(email, password, plan, promoCode);
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
            
            // Phase: 4.7.18 - Redirect to login page, keep URL stable (no / canonicalization)
            window.location.href = 'index.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }

    // Check if user is admin
    isAdmin() {
        if (!this.user || !this.paymentStatus?.hasPaid) return false;
        const now = Date.now();
        if (this.adminCheckCache.value !== null && this.adminCheckCache.expiresAt > now) {
            return this.adminCheckCache.value;
        }
        return false;
    }

    // Check admin access for sensitive operations
    async checkAdminAccess() {
        console.log('🔐 Checking admin access for user:', this.user?.email);

        if (!this.user || !this.paymentStatus?.hasPaid) {
            console.log('❌ User not authenticated or payment not verified');
            return false;
        }

        const now = Date.now();
        if (this.adminCheckCache.value !== null && this.adminCheckCache.expiresAt > now) {
            console.log('♻️ Using cached admin status');
            return this.adminCheckCache.value;
        }

        try {
            const token = await this.getSessionToken();
            if (!token) {
                this.adminCheckCache = { value: false, expiresAt: now + 60 * 1000 };
                return false;
            }

            const response = await fetch('/.netlify/functions/admin-health', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.ok ? await response.json() : null;
            const isAdmin = response.ok && data?.ok === true && data?.admin === true;

            this.adminCheckCache = {
                value: isAdmin,
                expiresAt: now + 5 * 60 * 1000
            };

            console.log('Admin check result:', isAdmin);
            return isAdmin;
        } catch (error) {
            console.error('Admin validation failed:', error);
            this.adminCheckCache = { value: false, expiresAt: now + 60 * 1000 };
            return false;
        }
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
            console.log('Getting Supabase session...');
            const { data: { session }, error } = await this.supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Error getting session token:', error);
                return null;
            }
            
            if (!session) {
                console.error('No active session found');
                return null;
            }
            
            const token = session.access_token;
            console.log('Session token type:', typeof token);
            console.log('Session token preview:', token ? token.substring(0, 50) + '...' : 'null');
            console.log('Session expires at:', session.expires_at);
            
            if (!token || typeof token !== 'string') {
                console.error('Invalid token format from session:', typeof token, token);
                return null;
            }
            
            return token;
        } catch (error) {
            console.error('Failed to get session token:', error);
            return null;
        }
    }

    // Getter to access the shared Supabase client
    getSupabaseClient() {
        if (!this.supabaseClient) {
            console.error('Supabase client not initialized. Call flexicadAuth.init() first.');
            return null;
        }
        return this.supabaseClient;
    }
}

// Global instance
window.flexicadAuth = new FlexiCADAuth();

// Phase: 4.7.18 - Expose UMD waiter
window.flexicadAuth.waitForSupabaseUMD = window.__FC_WAIT_SUPA__;

// Also create the FlexiAuth alias for backward compatibility with enhanced methods
window.FlexiAuth = {
    // Delegate most methods to flexicadAuth
    ...window.flexicadAuth,
    
    // Override specific methods for backward compatibility
    getUser: () => window.flexicadAuth.user,
    isLoggedIn: () => !!window.flexicadAuth.user,
    getCurrentUser: () => window.flexicadAuth.user,
    getSessionToken: () => window.flexicadAuth.getSessionToken(), // Keep as async
    getSupabaseClient: () => window.flexicadAuth.getSupabaseClient(),
    logout: () => window.flexicadAuth.logout()
};

// Global helper function to get the shared Supabase client
window.getSharedSupabaseClient = function() {
    return window._flexicadSupabaseClient || window.flexicadAuth.getSupabaseClient();
}
