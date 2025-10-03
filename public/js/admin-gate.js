// Phase: 4.7.21+ - Client admin guard with Bearer helper for tools
(function () {
  // Phase: 4.7.21+ - Helper to fetch with Bearer token
  async function fetchWithAuth(path, init = {}) {
    await window.flexicadAuth.init();
    const supa = window.flexicadAuth.getSupabaseClient();
    const { data: { session } } = await supa.auth.getSession();
    if (!session?.access_token) throw new Error('No session token');
    
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('Content-Type', 'application/json');
    
    return fetch(path, { ...init, headers, cache: 'no-store' });
  }

  // Phase: 4.7.21+ - Helper to check admin access or redirect
  async function requireAdminOrRedirect() {
    try {
      const pn = (location.pathname.replace(/\/+$/, '') || '/');
      const isAdminPage = pn.includes('/admin/') || pn.endsWith('/admin-controlpanel.html');
      if (!isAdminPage) return false;
      
      await window.flexicadAuth.init();
      const supa = window.flexicadAuth.getSupabaseClient();
      const { data: { session } } = await supa.auth.getSession();
      
      if (!session?.access_token) {
        location.replace('index.html');
        return false;
      }
      
      const r = await fetch('/.netlify/functions/admin-health', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      
      if (!r.ok || !(await r.json().catch(() => ({})))?.isAdmin) {
        location.replace('home.html');
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('[admin-gate] error:', e?.message || e);
      location.replace('home.html');
      return false;
    }
  }

  // Export globally for admin tools
  window.AdminGate = {
    fetchWithAuth,
    requireAdminOrRedirect
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // ---- Only run on admin pages ----
      const pn = (location.pathname.replace(/\/+$/, '') || '/');
      const isAdminPage =
        pn.includes('/admin/') || pn.endsWith('/admin-controlpanel.html');

      if (!isAdminPage) {
        console.info('[admin-gate] skipped: not an admin page');
        return; // <- Critical: do nothing on login/index or any non-admin page
      }

      // ---- Auth bootstrap ----
      if (!window.flexicadAuth || !window.flexicadAuth.init) {
        console.warn('[admin-gate] flexicadAuth not available yet');
        return location.replace('index.html');
      }

      await window.flexicadAuth.init();

      const supa = window.flexicadAuth.getSupabaseClient();
      const { data: { session } } = await supa.auth.getSession();

      if (!session?.access_token) {
        console.warn('[admin-gate] denied: No session token');
        return location.replace('index.html');
      }

      // Optional UX: enforce paid before admin
      const paid = await (window.flexicadAuth.checkPaymentStatus?.(session.user.id));
      if (paid && paid.hasPaid === false) {
        console.warn('[admin-gate] denied: unpaid account');
        return location.replace('register.html?payment=required');
      }

      // ---- Server-side admin verification ----
      const r = await fetch('/.netlify/functions/admin-health', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      });

      if (!r.ok) {
        console.warn('[admin-gate] denied: admin-health status', r.status);
        return location.replace('home.html');
      }

      const j = await r.json().catch(() => ({}));
      if (!j?.isAdmin) {
        console.warn('[admin-gate] denied: not admin');
        return location.replace('home.html');
      }

      console.info('[admin-gate] admin verified');
    } catch (e) {
      console.error('[admin-gate] error:', e?.message || e);
      location.replace('home.html');
    }
  });
})();
