// site/js/admin-controlpanel.js
(function () {
  console.log('[Admin Control Panel] Controller loaded');

  async function fcFetch(path, init = {}) {
    const supa = window.flexicadAuth.getSupabaseClient();
    if (!supa) throw new Error('Supabase client not ready');
    const { data: { session } } = await supa.auth.getSession();
    if (!session) throw new Error('No session');

    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${session.access_token}`);
    headers.set('Content-Type', 'application/json');

    const res = await fetch(`/.netlify/functions/${path}`, { ...init, headers });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { ok:false, error:`Invalid JSON (${res.status})` }; }
    if (!res.ok || json.ok === false) {
      const err = json.error || `HTTP ${res.status}`;
      console.error(`[admin] ${path} failed`, err, json);
      throw new Error(err);
    }
    return json;
  }

  async function renderDashboard() {
    const totalsEl = {
      users: document.querySelector('[data-metric="total-users"]'),
      active: document.querySelector('[data-metric="active-today"]'),
      designs: document.querySelector('[data-metric="total-designs"]')
    };
    const activityEl = document.querySelector('#recent-activity');

    const data = await fcFetch('admin-dashboard-stats');
    if (totalsEl.users) totalsEl.users.textContent = data.totals?.users ?? 0;
    if (totalsEl.active) totalsEl.active.textContent = data.activeToday?.users ?? 0;
    if (totalsEl.designs) totalsEl.designs.textContent = data.totals?.designs ?? 0;

    if (activityEl) {
      activityEl.innerHTML = '';
      (data.recentActivity || []).forEach(a => {
        const li = document.createElement('div');
        li.className = 'list-item';
        li.textContent = `${a.type === 'design' ? '🎨' : '💬'} ${a.summary || a.id} — ${new Date(a.at).toLocaleString()}`;
        activityEl.appendChild(li);
      });
    }
  }

  function bindTiles() {
    const needsModal = [
      ['#btn-manage-users', 'Manage Users'],
      ['#btn-audit-log', 'Audit Log'],
      ['#btn-permissions', 'Permissions'],
      ['#btn-view-subscriptions', 'View Subscriptions'],
      ['#btn-billing', 'Billing Reports'],
      ['#btn-ai-stats', 'AI Usage Stats'],
      ['#btn-learning', 'Learning Data'],
      ['#btn-feedback', 'User Feedback'],
      ['#btn-system-logs', 'System Logs'],
      ['#btn-health', 'Health Check'],
      ['#btn-backups', 'Backups'],
    ];
    needsModal.forEach(([sel, title]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.addEventListener('click', () => {
        (window.FCModals?.show ?? window.showModal)({
          title,
          body: `This view is wired to load via subpage navigation. Use the section header to enter the subpage.`,
          actions: [{ label: 'Close' }]
        });
      });
    });
  }

  async function initializeAdmin() {
    await window.flexicadAuth.init();
    const isAdmin = await window.flexicadAuth.isAdmin?.();
    if (!isAdmin) {
      (window.FCModals?.show ?? window.showModal)({
        title: 'Access denied',
        body: 'You do not have admin access.',
        actions: [{ label: 'Back to Home', onClick: () => location.href = '/' }]
      });
      return;
    }
    await renderDashboard();
    bindTiles();
  }

  document.addEventListener('DOMContentLoaded', initializeAdmin);
})();
