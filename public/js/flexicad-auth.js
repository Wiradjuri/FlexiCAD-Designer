// FlexiCAD Payment-First Authentication System
// Users must pay before account creation - no free accounts allowed

class FlexiCADAuth {
    constructor() {
        this.user = null;
        this.paymentStatus = null;
        this.isInitialized = false;
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

    // Initialize Supabase client
    async initializeSupabase() {
        try {
            if (typeof window.supabase === 'undefined') {
                throw new Error('Supabase library not loaded. Please include the Supabase CDN script.');
            }

            if (typeof window.flexicadConfig === 'undefined' || !window.flexicadConfig.supabase) {
                throw new Error('FlexiCAD configuration not loaded. Please include config.js');
            }

            const { supabase } = window.flexicadConfig;
            
            if (!supabase.url || !supabase.anonKey) {
                throw new Error('Supabase configuration is incomplete. Please check config.js');
            }

            this.supabaseClient = window.supabase.createClient(supabase.url, supabase.anonKey, {
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

    // Set up auth state change listener
    setupAuthStateListener() {
        if (!this.supabaseClient) return;

        this.authStateChangeListener = this.supabaseClient.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔄 Auth state change:', event);
                
                if (session && session.user) {
                    this.user = session.user;
                    await this.checkPaymentStatus();
                    
                    // Redirect if payment required
                    if (!this.paymentStatus?.hasPaid) {
                        console.log('⚠️ Payment required - redirecting');
                        window.location.href = '/register.html?payment=required';
                        return;
                    }
                    
                    sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));
                } else {
                    this.user = null;
                    this.paymentStatus = null;
                    sessionStorage.removeItem('flexicad_user');
                }
            }
        );
    }

    // Check payment status via API
    async checkPaymentStatus() {
        if (!this.user?.id) {
            this.paymentStatus = { hasPaid: false, needsRegistration: true };
            return this.paymentStatus;
        }

        try {
            console.log('🔄 Checking payment status for user:', this.user.id);

            const response = await fetch('/.netlify/functions/check-payment-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.user.id
                })
            });

            if (!response.ok) {
                throw new Error(`Payment check failed: ${response.status}`);
            }

            const result = await response.json();
            this.paymentStatus = result;
            
            console.log(result.hasPaid ? '✅ User has valid payment' : '❌ Payment required', result);
            return result;
        } catch (error) {
            console.error('❌ Payment status check failed:', error);
            this.paymentStatus = { hasPaid: false, needsRegistration: true, error: error.message };
            return this.paymentStatus;
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
                    throw new Error('Account requires payment. Please register to make payment.');
                }
                
                sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));
                return { success: true, user: data.user };
            } else {
                throw new Error('Login failed: No user data returned');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
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
}

// Global instance
window.flexicadAuth = new FlexiCADAuth();

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.flexicadAuth.init().catch(console.error);
    });
} else {
    window.flexicadAuth.init().catch(console.error);
}
