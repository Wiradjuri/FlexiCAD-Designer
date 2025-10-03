// Phase: 4.7.21 - Client admin guard with payment check
// Client-side guard for admin pages
// - Waits for Supabase UMD to be ready
// - Gets session token
// - Checks payment status
// - Calls /.netlify/functions/admin-health with Authorization header
// - Unlocks the page on success; otherwise shows a message & redirects

(() => {
  const FETCH_TIMEOUT_MS = 6000;
  const MAX_RETRIES = 3;

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  async function getToken() {
    if (!window.flexicadAuth?.init) throw new Error('Auth not loaded');
    await window.flexicadAuth.init();
    const supa = window.flexicadAuth.getSupabaseClient?.();
    if (!supa?.auth?.getSession) throw new Error('Supabase client not ready');
    const { data: { session } } = await supa.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('No session token');
    return { token, session };
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal, cache: 'no-store' });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  function unlock() {
    document.documentElement.classList.remove('admin-locked');
    document.body.classList.remove('admin-locked');
    // Close any stray modal created by earlier code (if present)
    if (typeof window.closeModal === 'function') {
      try { window.closeModal('adminGate'); } catch(_) {}
    }
  }

  async function deny(reason) {
    console.warn('[admin-gate] denied:', reason);
    // Phase: 4.7.21 - Redirect to appropriate page based on reason
    let redirectTo = 'home.html';
    if (reason && String(reason).includes('Payment required')) {
      redirectTo = 'register.html?payment=required';
    } else if (reason && String(reason).includes('No session token')) {
      redirectTo = 'index.html';
    }
    
    // If a modal system exists, show a brief message, then redirect
    if (typeof window.FCModals?.alert === 'function') {
      try { window.FCModals.alert('Access denied', (reason || 'Not authorized').toString()); } catch(_) {}
      await sleep(1200);
    }
    window.location.href = redirectTo;
  }

  async function verifyAdmin() {
    // Phase: 4.7.21 - Get token and session (retry a bit for UMD load)
    let token, session;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try { 
        const result = await getToken();
        token = result.token;
        session = result.session;
        break; 
      }
      catch(e){ if (i === MAX_RETRIES - 1) throw e; await sleep(400 * (i + 1)); }
    }

    // Phase: 4.7.21 - Check payment status
    if (session?.user?.id) {
      try {
        const paid = await window.flexicadAuth.checkPaymentStatus(session.user.id);
        if (!paid?.hasPaid) {
          return { ok: false, status: 402, body: 'Payment required' };
        }
      } catch (e) {
        console.warn('[admin-gate] Payment check failed:', e);
      }
    }

    // Call admin-health with Authorization (retry on network/timeout)
    let lastErr;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const res = await fetchWithTimeout('/.netlify/functions/admin-health', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          const txt = await res.text().catch(()=>'');
          return { ok:false, status:res.status, body:txt };
        }
        const json = await res.json().catch(()=>({}));
        const isAdmin = !!json.isAdmin || !!json.admin || !!json.ok;
        return { ok:isAdmin, status:200, body:json };
      } catch (e) {
        lastErr = e;
        await sleep(500 * (i + 1));
      }
    }
    throw lastErr || new Error('Network error');
  }

  async function run() {
    // Lock UI until verified
    document.documentElement.classList.add('admin-locked');
    document.body.classList.add('admin-locked');

    try {
      const result = await verifyAdmin();
      if (result.ok) {
        console.log('[admin-gate] admin verified:', result.body?.user?.email || '');
        unlock();
      } else {
        await deny(`HTTP ${result.status}: ${result.body}`);
      }
    } catch (e) {
      await deny(e?.message || String(e));
    }
  }

  // Phase: 4.7.21 - Expose helpers for admin-controlpanel.js
  window.AdminGate = {
    requireAdminOrRedirect: async () => {
      try {
        const result = await verifyAdmin();
        return result.ok;
      } catch (e) {
        await deny(e?.message || String(e));
        return false;
      }
    },
    fetchWithAuth: async (url, options = {}) => {
      const { token } = await getToken();
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      });
    }
  };

  document.addEventListener('DOMContentLoaded', run);
})();
