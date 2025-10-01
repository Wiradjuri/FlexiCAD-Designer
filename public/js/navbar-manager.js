// Unified Navbar Manager for FlexiCAD Designer - Phase 4.7.1
// Exact 5 items with consistent highlight and sizing

class FlexiCADNavbar {
    constructor() {
        this.navItems = [
            { text: 'Home', href: 'index.html', id: 'home' },
            { text: 'Templates', href: 'templates.html', id: 'templates' },
            { text: 'AI Generator', href: 'ai.html', id: 'ai' },
            { text: 'My Designs', href: 'my-designs.html', id: 'my-designs' },
            { text: 'About', href: 'about.html', id: 'about' }
        ];
        this.currentPage = this.getCurrentPage();
        this.user = null;
        this.initializeNavbar();
    }

    getCurrentPage() {
        const path = window.location.pathname.replace(/\/+$/, '');
        if (path.includes('home.html') || path === '' || path === '/') return 'home';
        if (path.includes('templates.html')) return 'templates';
        if (path.includes('ai.html')) return 'ai';
        if (path.includes('my-designs.html')) return 'my-designs';
        if (path.includes('about.html')) return 'about';
        if (path.includes('admin/') || path.includes('admin-controlpanel.html')) return 'admin';
        return 'other';
    }

    async initializeNavbar() {
        await this.loadUserInfo();
        this.renderNavbar();
        this.setupEventListeners();
    }

    async loadUserInfo() {
        try {
            // Check if FlexiCAD auth is available
            if (window.flexicadAuth && window.flexicadAuth.session) {
                this.user = window.flexicadAuth.session.user;
                
                // Check admin status via server-side validation
                await this.validateAdminStatus();
                
                return;
            }
            
            // Fallback: Check if user is logged in via session storage or auth token
            const authResponse = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (authResponse.ok) {
                const data = await authResponse.json();
                this.user = data.user;
            }
        } catch (error) {
            console.warn('Could not verify user authentication:', error);
        }
    }
    
    async validateAdminStatus() {
        if (!this.user || !window.flexicadAuth?.session?.access_token) {
            this.isServerValidatedAdmin = false;
            return;
        }
        
        try {
            const response = await fetch('/.netlify/functions/admin-health', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${window.flexicadAuth.session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isServerValidatedAdmin = data.admin === true;
            } else {
                this.isServerValidatedAdmin = false;
            }
        } catch (error) {
            console.warn('Admin validation failed:', error);
            this.isServerValidatedAdmin = false;
        }
    }

    generateNavHTML() {
        const isAuthenticated = !!this.user;
        const isAdmin = this.isServerValidatedAdmin || (this.user?.email && this.isAdminEmail(this.user.email));
        
        let linksHTML = '';
        
        // Render exact 5 navigation items
        this.navItems.forEach(item => {
            const activeClass = this.currentPage === item.id ? ' active' : '';
            const href = item.id === 'home' && isAuthenticated ? 'home.html' : item.href;
            linksHTML += `<li><a href="${href}" class="nav-link${activeClass}">${item.text}</a></li>`;
        });

        // Admin link (if admin) - separate from main 5 with Phase 4.6 styling
        if (isAdmin) {
            const adminActive = this.currentPage === 'admin' ? ' active' : '';
            linksHTML += `<li><a href="admin-controlpanel.html" class="nav-link admin-nav${adminActive}">🔧 Admin</a></li>`;
        }

        // User section
        let userSection = '';
        if (isAuthenticated) {
            const displayEmail = this.user.email?.length > 20 
                ? this.user.email.substring(0, 17) + '...' 
                : this.user.email;
            
            userSection = `
                <div class="nav-user">
                    <span class="user-info" title="${this.user.email}">${displayEmail}</span>
                    <button class="logout-btn" onclick="navbarManager.handleLogout()">Logout</button>
                </div>
            `;
        } else {
            userSection = `
                <div class="nav-user">
                    <a href="index.html" class="btn btn-outline">Login</a>
                </div>
            `;
        }

        return `
            <nav class="nav">
                <div class="nav-container">
                    <a href="${isAuthenticated ? 'home.html' : 'index.html'}" class="nav-brand">
                        FlexiCAD Designer
                    </a>
                    <ul class="nav-links">
                        ${linksHTML}
                    </ul>
                    ${userSection}
                </div>
            </nav>
        `;
    }

    renderNavbar() {
        // Look for existing nav element
        const existingNav = document.querySelector('nav.nav');
        if (existingNav) {
            existingNav.outerHTML = this.generateNavHTML();
        } else {
            // Insert at beginning of body
            document.body.insertAdjacentHTML('afterbegin', this.generateNavHTML());
        }
    }

    setupEventListeners() {
        // Handle responsive mobile menu (if implemented)
        const mobileToggle = document.querySelector('.nav-mobile-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }

        // Apply active highlighting based on current page
        this.updateActiveStates();

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const linkIndex = parseInt(e.key) - 1;
                const navLinks = document.querySelectorAll('.nav-links .nav-link');
                if (navLinks[linkIndex]) {
                    navLinks[linkIndex].click();
                }
            }
        });
    }

    updateActiveStates() {
        // Update active states for existing navigation
        const path = window.location.pathname.replace(/\/+$/, '');
        document.querySelectorAll('.nav .nav-link').forEach(link => {
            const href = (link.getAttribute('href') || '').replace(/\/+$/, '');
            const isActive = path.endsWith(href) || (path === '' && href.includes('index.html'));
            link.classList.toggle('active', isActive);
        });
        
        // Apply Phase 4.6 enhancements
        this.applyPhase46Styling();
    }
    
    checkAdminAccess() {
        return this.isServerValidatedAdmin || (this.user?.email && this.isAdminEmail(this.user.email));
    }
    
    applyPhase46Styling() {
        // Ensure admin nav has proper Phase 4.6 styling
        const adminNav = document.querySelector('.nav-link.admin-nav');
        if (adminNav) {
            adminNav.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
            adminNav.style.color = 'white';
            adminNav.style.borderRadius = '20px';
            adminNav.style.padding = '0.5rem 1rem';
            adminNav.style.fontWeight = 'bold';
            adminNav.style.transition = 'all 0.3s ease';
            adminNav.style.border = '2px solid transparent';
            
            adminNav.addEventListener('mouseenter', () => {
                adminNav.style.transform = 'scale(1.05)';
                adminNav.style.borderColor = 'white';
                adminNav.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.3)';
            });
            
            adminNav.addEventListener('mouseleave', () => {
                adminNav.style.transform = 'scale(1)';
                adminNav.style.borderColor = 'transparent';
                adminNav.style.boxShadow = 'none';
            });
        }
    }

    toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.classList.toggle('nav-open');
        }
    }

    isAdminEmail(email) {
        // Phase 4.7.2: Check against ADMIN_EMAILS env var if available, otherwise use default list
        const defaultAdminEmails = [
            'bmuzza1992@gmail.com',
            'brad@bradmax.com.au',
            'admin@flexicad.com.au'
        ];
        
        // In production, this would check process.env.ADMIN_EMAILS
        // For now, using client-side fallback
        const adminEmails = window.config?.adminEmails || defaultAdminEmails;
        
        return adminEmails.includes(email?.toLowerCase());
    }

    async handleLogout() {
        try {
            // Clear any local storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Call logout endpoint if available
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (logoutError) {
                console.warn('Logout API call failed:', logoutError);
            }

            // Redirect to login
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect anyway
            window.location.href = 'index.html';
        }
    }

    // Method to update active page (for SPA-like behavior)
    updateActivePage(pageId) {
        this.currentPage = pageId;
        this.renderNavbar();
    }

    // Method to update user info after login
    updateUser(userData) {
        this.user = userData;
        this.renderNavbar();
    }
}

// Global instance
window.navbarManager = new FlexiCADNavbar();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlexiCADNavbar;
}