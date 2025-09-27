// FlexiCAD Payment-First Authentication System
// Production-ready authentication with Supabase integration and payment enforcement

class FlexiCADAuth {
    constructor() {
        this.user = null;
        this.paymentStatus = null;
        this.isInitialized = false;
        this.supabaseClient = null;
        this.authStateChangeListener = null;
    }

    // Initialize authentication system with Supabase
    async init() {
        try {
            console.log('🔄 Initializing FlexiCAD Authentication System...');

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
                
                // Sync with session storage
                sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));
                
                // Check payment status
                await this.checkPaymentStatus();
            } else {
                // No Supabase session, check session storage for fallback
                const userStr = sessionStorage.getItem('flexicad_user');
                if (userStr) {
                    console.log('📦 Found user in session storage (fallback)');
                    this.user = JSON.parse(userStr);
                    await this.checkPaymentStatus();
                }
            }

            // Set up auth state change listener
            this.setupAuthStateListener();

            this.isInitialized = true;
            console.log('✅ Authentication system initialized');
            
            return { success: true, user: this.user, paymentStatus: this.paymentStatus };
        } catch (error) {
            console.error('❌ Auth initialization error:', error);
            this.isInitialized = true;
            return { success: false, error: error.message };
        }
    }

    // Initialize Supabase client
    async initializeSupabase() {
        try {
            // Check if Supabase library is loaded
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase library not loaded. Please include the Supabase CDN script.');
            }

            // Ensure config is loaded
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG not loaded. Please include config.js first.');
            }

            // Validate configuration
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
            }

            if (CONFIG.SUPABASE_URL === 'https://your-project.supabase.co' || 
                CONFIG.SUPABASE_ANON_KEY === 'your-anon-key') {
                throw new Error('Please update your Supabase configuration with real values.');
            }

            // Create Supabase client directly
            this.supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    storageKey: 'flexicad_auth_token',
                    storage: window.localStorage
                }
            });

            console.log('✅ Supabase client initialized successfully');
            return this.supabaseClient;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            throw new Error(`Authentication system unavailable: ${error.message}`);
        }
    }

    // Set up auth state change listener
    setupAuthStateListener() {
        if (!this.supabaseClient) return;

        this.authStateChangeListener = this.supabaseClient.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔄 Auth state change:', event);
                
                if (event === 'SIGNED_IN' && session) {
                    this.user = session.user;
                    sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));
                    await this.checkPaymentStatus();
                } else if (event === 'SIGNED_OUT') {
                    this.user = null;
                    this.paymentStatus = null;
                    sessionStorage.removeItem('flexicad_user');
                    sessionStorage.removeItem('flexicad_session_token');
                }
            }
        );
    }

    // Check payment status from profiles table (payment-first enforcement)
    async checkPaymentStatus() {
        if (!this.user || !this.user.id) {
            this.paymentStatus = { is_paid: false, subscription_plan: 'none', is_active: false };
            return this.paymentStatus;
        }

        try {
            console.log('🔄 Checking payment status for user:', this.user.id);

            if (!this.supabaseClient) {
                await this.initializeSupabase();
            }

            // Query the profiles table directly
            const { data: profile, error } = await this.supabaseClient
                .from('profiles')
                .select('is_paid, subscription_plan, is_active, stripe_customer_id, created_at')
                .eq('id', this.user.id)
                .single();

            if (error) {
                console.error('❌ Profile query error:', error);
                throw new Error(`Profile lookup failed: ${error.message}`);
            }

            if (!profile) {
                console.error('🚨 No profile found for authenticated user - payment-first violation');
                throw new Error('User profile not found. This should not happen in payment-first system.');
            }

            this.paymentStatus = {
                is_paid: profile.is_paid || false,
                subscription_plan: profile.subscription_plan || 'none',
                is_active: profile.is_active || false,
                stripe_customer_id: profile.stripe_customer_id,
                created_at: profile.created_at
            };

            console.log('✅ Payment status loaded:', this.paymentStatus);

            // In payment-first system, all authenticated users should be paid and active
            if (!this.paymentStatus.is_paid || !this.paymentStatus.is_active) {
                console.error('🚨 Payment-first violation detected:', {
                    user_id: this.user.id,
                    is_paid: this.paymentStatus.is_paid,
                    is_active: this.paymentStatus.is_active
                });
                // Don't auto-logout here, let calling function handle it
            }

            return this.paymentStatus;
        } catch (error) {
            console.error('❌ Payment status check failed:', error);
            this.paymentStatus = { 
                is_paid: false, 
                subscription_plan: 'none', 
                is_active: false,
                error: error.message 
            };
            return this.paymentStatus;
        }
    }

    // Check if user is authenticated and has paid
    async requireAuth(redirectPath = '/index.html') {
        if (!this.isInitialized) {
            await this.init();
        }

        // Check if user is logged in
        if (!this.user) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = `${redirectPath}?auth=required`;
            return false;
        }

        // Check payment status
        if (!this.paymentStatus) {
            await this.checkPaymentStatus();
        }

        // In payment-first system, all logged in users should be paid and active
        if (!this.paymentStatus.is_paid || !this.paymentStatus.is_active) {
            console.log('🚨 User not paid or not active - forcing logout (should not happen in payment-first system)');
            this.logout();
            return false;
        }

        return true;
    }

    // Updated login method with profile checking
    async login(email, password) {
        try {
            console.log('🔄 Starting login process for:', email);

            if (!this.supabaseClient) {
                await this.initializeSupabase();
            }

            // STEP 1: Check if user exists in Supabase profiles table first
            const { data: profile, error: profileError } = await this.supabaseClient
                .from('profiles')
                .select('id, email, is_paid, is_active')
                .eq('email', email.toLowerCase())
                .single();

            if (profileError && profileError.code === 'PGRST116') {
                // User doesn't exist in profiles table - redirect to register
                console.log('❌ User not found in profiles table - redirecting to register');
                throw new Error('ACCOUNT_NOT_FOUND');
            } else if (profileError) {
                throw new Error(`Profile check failed: ${profileError.message}`);
            }

            // STEP 2: User exists in profiles, check if they're paid and active
            if (!profile.is_paid || !profile.is_active) {
                console.log('🚨 User exists but not paid/active:', profile);
                throw new Error('ACCOUNT_NOT_PAID');
            }

            // STEP 3: Attempt Supabase authentication
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('❌ Supabase login error:', error);
                
                // Handle specific auth errors
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please check your credentials.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please check your email and click the confirmation link.');
                } else {
                    throw new Error(error.message);
                }
            }

            if (!data.user) {
                throw new Error('Login failed - no user data returned');
            }

            console.log('✅ Login successful');
            
            // User data is automatically set by auth state listener
            this.user = data.user;
            sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));

            // Re-fetch payment status to ensure sync
            await this.checkPaymentStatus();

            console.log('✅ Login complete with payment verification');
            
            return { 
                success: true, 
                user: this.user, 
                paymentStatus: this.paymentStatus
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            
            // Handle special error cases
            if (error.message === 'ACCOUNT_NOT_FOUND') {
                return { 
                    success: false, 
                    error: 'ACCOUNT_NOT_FOUND',
                    redirectToRegister: true,
                    message: 'Account not found. Please register first.'
                };
            } else if (error.message === 'ACCOUNT_NOT_PAID') {
                return { 
                    success: false, 
                    error: 'ACCOUNT_NOT_PAID',
                    message: 'Account exists but payment is required. Please contact support.'
                };
            }
            
            return { success: false, error: error.message };
        }
    }

    // Payment-first registration: goes directly to Stripe checkout
    async register(email, password, plan = 'monthly') {
        try {
            console.log('🎯 Starting payment-first registration for:', { email, plan });

            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    plan: plan
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const { sessionId, url, message } = await response.json();
            console.log('✅ Checkout session created, redirecting to:', url);

            if (url) {
                // Store email temporarily for success page
                sessionStorage.setItem('flexicad_registration_email', email);
                window.location.href = url;
            } else {
                throw new Error('No checkout URL returned');
            }
            
            return { 
                success: true, 
                redirectingToPayment: true,
                message: message
            };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Production-ready logout with proper cleanup
    async logout() {
        try {
            console.log('🔄 Logging out user...');

            // Sign out from Supabase
            if (this.supabaseClient) {
                const { error } = await this.supabaseClient.auth.signOut();
                if (error) {
                    console.error('Supabase logout error:', error);
                }
            }

            // Clean up auth state listener
            if (this.authStateChangeListener) {
                this.authStateChangeListener.data?.subscription?.unsubscribe();
                this.authStateChangeListener = null;
            }

            // Clear local state
            this.user = null;
            this.paymentStatus = null;

            // Clear session storage
            sessionStorage.removeItem('flexicad_user');
            sessionStorage.removeItem('flexicad_session_token');
            sessionStorage.removeItem('flexicad_registration_email');

            console.log('✅ Logout complete');

            // Redirect to login page
            window.location.href = '/index.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Force cleanup even if logout fails
            this.user = null;
            this.paymentStatus = null;
            window.location.href = '/index.html';
        }
    }

    // Check URL parameters for checkout status
    checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('checkout')) {
            const checkoutStatus = urlParams.get('checkout');
            
            if (checkoutStatus === 'success') {
                const sessionId = urlParams.get('session_id');
                const registrationEmail = sessionStorage.getItem('flexicad_registration_email');
                
                return { 
                    type: 'checkout_success', 
                    message: `Payment successful! Your FlexiCAD Designer account has been created. You can now log in with ${registrationEmail || 'your email'}.`,
                    sessionId: sessionId
                };
            } else if (checkoutStatus === 'cancelled') {
                return { 
                    type: 'checkout_cancelled', 
                    message: 'Payment was cancelled. No account was created. You can try again anytime.' 
                };
            }
        }

        if (urlParams.has('auth')) {
            const authStatus = urlParams.get('auth');
            if (authStatus === 'required') {
                return { type: 'auth_required', message: 'Please log in to access FlexiCAD Designer.' };
            }
        }

        return null;
    }

    // Check if an email is available for registration
    async checkEmailAvailability(email) {
        try {
            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: 'test123', // Dummy password for validation
                    plan: 'monthly'
                })
            });

            const result = await response.json();
            
            if (response.status === 400 && result.code === 'EMAIL_EXISTS') {
                return { available: false, message: result.error };
            }
            
            return { available: true };
        } catch (error) {
            console.error('Email availability check failed:', error);
            return { available: true }; // Default to available if check fails
        }
    }
}

// Global instance
window.flexicadAuth = new FlexiCADAuth();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlexiCADAuth;
}