// Phase: 4.7.21 - Normalize route detection without URL canonicalization
// Unified Navbar Manager for FlexiCAD Designer
// Exact 5 items with consistent highlight and sizing
// Phase 4.7.18+: Robust admin badge check with retry, timeout, single-fire

function isLoginPathname(pn) {
    return pn === '/' || pn.endsWith('/index.html');
}
function isHomePathname(pn) {
    return pn.endsWith('/home.html');
}

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

    // Phase: 4.7.21 - Normalize route detection without URL canonicalization
    getCurrentPage() {
        const pn = window.location.pathname.replace(/\/+$/, '') || '/';
        if (isHomePathname(pn)) return 'home';
        if (pn.includes('templates.html')) return 'templates';
        if (pn.includes('ai.html')) return 'ai';
        if (pn.includes('my-designs.html')) return 'my-designs';
        if (pn.includes('about.html')) return 'about';
        if (pn.includes('admin/') || pn.includes('admin-controlpanel.html')) return 'admin';
        if (isLoginPathname(pn)) return 'home'; // treat "/" and "/index.html" as same for highlighting
        return 'other';
    }

    async initializeNavbar() {
        await this.loadUserInfo();
        this.renderNavbar();
        this.setupEventListeners();
    }

    async loadUserInfo() {
        try {
            if (window.flexicadAuth?.init) {
                await window.flexicadAuth.init();
                this.user = window.flexicadAuth.user || null;
                if (!this.user) {
                    const stored = sessionStorage.getItem('flexicad_user');
                    if (stored) {
                        try {
                            this.user = JSON.parse(stored);
                        } catch (_) {
                            this.user = null;
                        }
                    }
                }
                return;
            }

            this.user = null;
        } catch (error) {
            console.warn('Could not verify user authentication:', error);
            this.user = null;
        }
    }

    generateNavHTML() {
        const isAuthenticated = !!this.user;
        
        let linksHTML = '';
        
        // Render exact 5 navigation items
        this.navItems.forEach(item => {
            const activeClass = this.currentPage === item.id ? ' active' : '';
            const href = item.id === 'home' && isAuthenticated ? 'home.html' : item.href;
            linksHTML += `<li><a href="${href}" class="nav-link${activeClass}">${item.text}</a></li>`;
        });

        // Admin link with data-admin-badge attribute for visibility toggle
        linksHTML += `<li><a href="admin-controlpanel.html" class="nav-link admin-nav" data-admin-badge style="display: none;">🔧 Admin</a></li>`;

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
            mobileToggle.addEventListener('click', () => this.toggleMobileMenu());
        }
    }

    updateActiveStates() {
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && this.currentPage !== 'other') {
                const linkId = this.navItems.find(item => item.href === href)?.id;
                if (linkId === this.currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    }

    toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.classList.toggle('mobile-open');
        }
    }

    async handleLogout() {
        try {
            if (window.flexicadAuth?.logout) {
                await window.flexicadAuth.logout();
            } else {
                // Fallback: clear storage and redirect
                sessionStorage.clear();
                localStorage.clear();
            }
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

// Robust admin badge check with retry, timeout, and single-fire
(function() {
  const STATE = {
    fired: false,               // prevent double-fire on a single page load
    lastResult: null,           // cache one result briefly
    cacheAt: 0,
  };

  const ADMIN_CACHE_MS = 10_000;   // cache result for 10s to avoid spamming
  const FETCH_TIMEOUT_MS = 5000;   // abort fetch after 5s
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 500;      // base backoff

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function getSessionTokenWithRetry() {
    // Ensure auth is initialized and a session is available.
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        if (window.flexicadAuth?.init) {
          await window.flexicadAuth.init(); // no-op if already initialized
          const supa = window.flexicadAuth.getSupabaseClient?.();
          if (supa?.auth?.getSession) {
            const { data: { session } } = await supa.auth.getSession();
            const token = session?.access_token;
            if (token) return token;
          }
        }
      } catch (_) { /* swallow and retry */ }
      await sleep(RETRY_DELAY_MS * (i + 1));
    }
    throw new Error('No Supabase session token available');
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  function toggleAdminBadge(isAdmin) {
    // Adjust selectors to your DOM
    const badge = document.querySelector('[data-admin-badge]');
    if (!badge) return;
    badge.style.display = isAdmin ? '' : 'none';
    badge.setAttribute('aria-hidden', isAdmin ? 'false' : 'true');
  }

  async function verifyAdminAndToggleBadge(options = {}) {
    const now = Date.now();

    // short-cache result to avoid hammering on route changes that quickly re-run DOMContentLoaded
    if (STATE.lastResult && (now - STATE.cacheAt) < ADMIN_CACHE_MS) {
      toggleAdminBadge(!!STATE.lastResult.isAdmin);
      return STATE.lastResult;
    }

    // avoid duplicate fires from multiple listeners
    if (STATE.fired) return STATE.lastResult;
    STATE.fired = true;

    try {
      // Phase: 4.7.18 - Ensure robust init (waits for UMD) before session fetch
      try { await window.flexicadAuth?.init?.(); } catch (e) { console.warn('[navbar] init failed:', e?.message || e); }
      
      const token = await getSessionTokenWithRetry();

      let attempt = 0;
      let lastErr = null;
      while (attempt < MAX_RETRIES) {
        try {
          const res = await fetchWithTimeout('/.netlify/functions/admin-health', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!res.ok) {
            // HTTP error – not a network error
            const text = await res.text().catch(() => '');
            console.warn('[navbar] admin-health HTTP error', res.status, text);
            toggleAdminBadge(false);
            STATE.lastResult = { ok: false, status: res.status, isAdmin: false };
            STATE.cacheAt = Date.now();
            return STATE.lastResult;
          }

          const json = await res.json().catch(() => ({}));
          const isAdmin = !!json.isAdmin || !!json.admin || !!json.ok; // function returns ok:true and admin:true
          toggleAdminBadge(isAdmin);
          STATE.lastResult = { ok: true, status: 200, isAdmin, user: json.user || null };
          STATE.cacheAt = Date.now();
          return STATE.lastResult;

        } catch (err) {
          // Network/Abort – retry with backoff
          lastErr = err;
          console.warn('[navbar] admin-health network error (attempt ' + (attempt + 1) + '):', err?.message || err);
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          attempt++;
        }
      }

      // after retries, give up gracefully, hide badge
      toggleAdminBadge(false);
      STATE.lastResult = { ok: false, status: 0, isAdmin: false, error: (lastErr && (lastErr.message || String(lastErr))) };
      STATE.cacheAt = Date.now();
      return STATE.lastResult;

    } finally {
      // allow another check after cache window if needed
      setTimeout(() => { STATE.fired = false; }, 1000);
    }
  }

  // expose globally
  window.verifyAdminAndToggleBadge = verifyAdminAndToggleBadge;

  // single fire after DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Defer a tick so secure-config + supabase UMD have time to attach
    setTimeout(() => verifyAdminAndToggleBadge().catch(err => {
      console.warn('Admin validation failed (init):', err?.message || err);
      toggleAdminBadge(false);
    }), 0);
  });

})();

// Global instance
window.navbarManager = new FlexiCADNavbar();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlexiCADNavbar;
}
