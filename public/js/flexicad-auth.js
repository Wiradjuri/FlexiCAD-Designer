// FlexiCAD Payment-First Authentication System
// This system ensures no user account exists until payment is completed

class FlexiCADAuth {
    constructor() {
        this.user = null;
        this.paymentStatus = null;
        this.isInitialized = false;
    }

    // Initialize authentication system
    async init() {
        try {
            // Check if user is logged in (from session storage)
            const userStr = sessionStorage.getItem('flexicad_user');
            if (userStr) {
                this.user = JSON.parse(userStr);
            }

            // If we have a user, check their payment status
            if (this.user) {
                await this.checkPaymentStatus();
            }

            this.isInitialized = true;
            return { success: true, user: this.user, paymentStatus: this.paymentStatus };
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.isInitialized = true;
            return { success: false, error: error.message };
        }
    }

    // Check if user has paid (all users should have paid in this system)
    async checkPaymentStatus() {
        if (!this.user || !this.user.id) {
            this.paymentStatus = { is_paid: false, subscription_plan: 'none' };
            return this.paymentStatus;
        }

        try {
            const response = await fetch(`/.netlify/functions/check-payment-status?userId=${this.user.id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            this.paymentStatus = await response.json();
            console.log('Payment status:', this.paymentStatus);
            
            // In payment-first system, if user exists but isn't paid, something is wrong
            if (!this.paymentStatus.is_paid) {
                console.error('🚨 User exists but is not paid - this should not happen in payment-first system');
                this.logout(); // Force logout for security
            }
            
            return this.paymentStatus;
        } catch (error) {
            console.error('Payment status check failed:', error);
            this.paymentStatus = { is_paid: false, subscription_plan: 'none', error: error.message };
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

        // In payment-first system, all logged in users should be paid
        if (!this.paymentStatus.is_paid) {
            console.log('🚨 User not paid - forcing logout (should not happen in payment-first system)');
            this.logout();
            return false;
        }

        return true;
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

    // Login function that checks payment after successful auth
    async login(email, password) {
        try {
            const response = await fetch('/.netlify/functions/auth-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'signin',
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Login failed');
            }

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message);
            }

            // Store user info
            this.user = result.data.user;
            sessionStorage.setItem('flexicad_user', JSON.stringify(this.user));
            
            if (result.sessionToken) {
                sessionStorage.setItem('flexicad_session_token', result.sessionToken);
            }

            // Check payment status - in payment-first system, all users should be paid
            await this.checkPaymentStatus();

            // If somehow user is not paid, this is an error condition
            if (!this.paymentStatus.is_paid) {
                console.error('🚨 Logged in user is not paid - this should not happen in payment-first system');
                this.logout();
                throw new Error('Account access issue. Please contact support.');
            }

            return { 
                success: true, 
                user: this.user, 
                paymentStatus: this.paymentStatus
            };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout function
    logout() {
        this.user = null;
        this.paymentStatus = null;
        sessionStorage.removeItem('flexicad_user');
        sessionStorage.removeItem('flexicad_session_token');
        sessionStorage.removeItem('flexicad_registration_email');
        window.location.href = '/index.html';
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