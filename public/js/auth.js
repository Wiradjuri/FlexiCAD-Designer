// FlexiCAD Authentication Utility
// Handles session management across all pages using sessionStorage

const FlexiAuth = {
    // Check if user is logged in
    isLoggedIn() {
        const user = sessionStorage.getItem('flexicad_user');
        return user !== null;
    },

    // Get current user data
    getCurrentUser() {
        const userData = sessionStorage.getItem('flexicad_user');
        return userData ? JSON.parse(userData) : null;
    },

    // Alias for getCurrentUser (for compatibility)
    getUser() {
        return this.getCurrentUser();
    },

    // Get stored session token (if available)
    getSessionToken() {
        const token = sessionStorage.getItem('flexicad_session_token');
        return token;
    },

    // Store session token
    setSessionToken(token) {
        if (token) {
            sessionStorage.setItem('flexicad_session_token', token);
        } else {
            sessionStorage.removeItem('flexicad_session_token');
        }
    },

    // Redirect to login if not authenticated
    requireAuth() {
        if (!this.isLoggedIn()) {
            console.log('User not authenticated, redirecting to login...');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    // Update user info in UI
    updateUserUI() {
        const user = this.getCurrentUser();
        const userInfoElement = document.getElementById('userInfo');
        
        if (user && userInfoElement) {
            userInfoElement.textContent = user.email;
        }

        // Show/hide user navigation
        const navUser = document.querySelector('.nav-user');
        if (navUser) {
            if (user) {
                navUser.style.display = 'flex';
            } else {
                navUser.style.display = 'none';
            }
        }
    },

    // Make authenticated request to Netlify functions
    async makeAuthenticatedRequest(endpoint, data = {}) {
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.id,
                user_email: user.email,
                ...data
            })
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        return response.json();
    },

    // Logout function
    async logout() {
        try {
            // Clear session storage
            sessionStorage.removeItem('flexicad_user');
            sessionStorage.removeItem('flexicad_session_token');
            
            // Optionally call logout endpoint to invalidate server session
            try {
                await fetch('/.netlify/functions/auth-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout' })
                });
            } catch (e) {
                console.log('Server logout failed, but local logout successful');
            }

            // Redirect to login
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect anyway
            sessionStorage.removeItem('flexicad_user');
            sessionStorage.removeItem('flexicad_session_token');
            window.location.href = 'index.html';
        }
    },

    // Initialize auth for a page
    init() {
        // Check authentication
        if (!this.requireAuth()) {
            return false;
        }

        // Update UI
        this.updateUserUI();

        // Set up logout handlers
        const logoutButtons = document.querySelectorAll('.logout-btn');
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });

        return true;
    }
};

// Global logout function for onclick handlers
function handleLogout() {
    FlexiAuth.logout();
}