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

  async function showAccessControl() {
    try {
      const data = await fcFetch('admin-access-list');
      const admins = data.admins || [];
      
      const html = `
        <div style="max-height: 400px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border);">
                <th style="padding: 8px; text-align: left;">Email</th>
                <th style="padding: 8px; text-align: left;">Role</th>
                <th style="padding: 8px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${admins.map(a => `
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 8px;">${a.email}</td>
                  <td style="padding: 8px;">${a.role || 'admin'}</td>
                  <td style="padding: 8px; text-align: right;">
                    <button class="btn btn-sm btn-secondary" onclick="window.adminActions.removeAdmin('${a.id}')">Remove</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      window.showHtmlModal('Access Control', html);
    } catch (err) {
      window.showHtmlModal('Error', `Failed to load access control: ${err.message}`);
    }
  }

  async function showPaymentManagement() {
    try {
      const data = await fcFetch('admin-payments-overview');
      const html = `
        <div>
          <h4>Payment Summary</h4>
          <p>Total Revenue: $${(data.totalRevenue || 0).toFixed(2)}</p>
          <p>Active Subscriptions: ${data.activeSubscriptions || 0}</p>
          <p>Pending Payments: ${data.pendingPayments || 0}</p>
          
          <h4 style="margin-top: 1rem;">Recent Payments</h4>
          <div style="max-height: 300px; overflow-y: auto;">
            ${(data.recentPayments || []).map(p => `
              <div style="padding: 8px; border-bottom: 1px solid var(--border);">
                <strong>${p.email}</strong> — $${p.amount} — ${new Date(p.date).toLocaleDateString()}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      window.showHtmlModal('Payment Management', html);
    } catch (err) {
      window.showHtmlModal('Error', `Failed to load payments: ${err.message}`);
    }
  }

  async function showAIManagement() {
    try {
      const data = await fcFetch('admin-ai-overview');
      const html = `
        <div>
          <h4>AI Model Configuration</h4>
          <p><strong>Model:</strong> ${data.model || 'gpt-4o-mini'}</p>
          <p><strong>Training Examples:</strong> ${data.trainingCount || 0}</p>
          <p><strong>Curated Examples:</strong> ${data.curatedCount || 0}</p>
          
          <div style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="window.adminActions.runKnowledgeTest()">
              Run Knowledge Test
            </button>
          </div>
        </div>
      `;
      
      window.showHtmlModal('AI Management', html);
    } catch (err) {
      window.showHtmlModal('Error', `Failed to load AI overview: ${err.message}`);
    }
  }

  async function showSystemTools() {
    try {
      const data = await fcFetch('admin-system-tools');
      const html = `
        <div>
          <h4>System Statistics</h4>
          <p><strong>Tag Distribution:</strong></p>
          <div style="max-height: 200px; overflow-y: auto;">
            ${Object.entries(data.tagHistogram || {}).map(([tag, count]) => `
              <div style="padding: 4px;">${tag}: ${count}</div>
            `).join('')}
          </div>
        </div>
      `;
      
      window.showHtmlModal('System Tools', html);
    } catch (err) {
      window.showHtmlModal('Error', `Failed to load system tools: ${err.message}`);
    }
  }

  async function showFeedbackReview() {
    try {
      const data = await fcFetch('admin-feedback-list?status=pending');
      const feedback = data.feedback || [];
      
      if (feedback.length === 0) {
        window.showHtmlModal('Feedback Review', '<p>No pending feedback to review.</p>');
        return;
      }
      
      const html = `
        <div style="max-height: 400px; overflow-y: auto;">
          ${feedback.map((f, idx) => `
            <div style="padding: 12px; border-bottom: 1px solid var(--border); margin-bottom: 12px;">
              <p><strong>Design ID:</strong> ${f.design_id}</p>
              <p><strong>Rating:</strong> ${f.rating}/5</p>
              <p><strong>Comment:</strong> ${f.comment || 'No comment'}</p>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <button class="btn btn-sm btn-primary" onclick="window.adminActions.decideFeedback('${f.id}', 'accept', ${idx})">
                  Accept & Train
                </button>
                <button class="btn btn-sm btn-secondary" onclick="window.adminActions.decideFeedback('${f.id}', 'reject', ${idx})">
                  Reject
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      window.showHtmlModal('Feedback Review', html);
    } catch (err) {
      window.showHtmlModal('Error', `Failed to load feedback: ${err.message}`);
    }
  }

  async function showHealthCheck() {
    try {
      const data = await fcFetch('admin-health');
      const html = `
        <div>
          <h4>System Health</h4>
          <p><strong>Status:</strong> <span style="color: ${data.status === 'healthy' ? 'var(--accent-green)' : 'var(--accent-red)'}">${data.status || 'Unknown'}</span></p>
          <p><strong>Database:</strong> ${data.database ? '✅ Connected' : '❌ Disconnected'}</p>
          <p><strong>Storage:</strong> ${data.storage ? '✅ Connected' : '❌ Disconnected'}</p>
          <p><strong>Uptime:</strong> ${data.uptime || 'N/A'}</p>
        </div>
      `;
      
      window.showHtmlModal('Health Check', html);
    } catch (err) {
      window.showHtmlModal('Error', `Failed to load health check: ${err.message}`);
    }
  }

  // Global admin actions helper
  window.adminActions = {
    async removeAdmin(userId) {
      if (!await window.confirmModal?.(`Remove admin access for user ${userId}?`)) return;
      try {
        await fcFetch('admin-access-update', {
          method: 'POST',
          body: JSON.stringify({ userId, action: 'remove' })
        });
        window.showHtmlModal('Success', 'Admin removed successfully');
        setTimeout(() => window.hideModal(), 1500);
      } catch (err) {
        window.showHtmlModal('Error', err.message);
      }
    },
    
    async runKnowledgeTest() {
      try {
        const data = await fcFetch('admin-knowledge-test', { method: 'POST' });
        window.showHtmlModal('Knowledge Test Results', `<pre>${JSON.stringify(data, null, 2)}</pre>`);
      } catch (err) {
        window.showHtmlModal('Error', err.message);
      }
    },
    
    async decideFeedback(feedbackId, decision, idx) {
      try {
        await fcFetch('admin-feedback-decide', {
          method: 'POST',
          body: JSON.stringify({ feedbackId, decision })
        });
        window.showHtmlModal('Success', `Feedback ${decision}ed successfully`);
        setTimeout(() => {
          window.hideModal();
          showFeedbackReview(); // Refresh list
        }, 1000);
      } catch (err) {
        window.showHtmlModal('Error', err.message);
      }
    }
  };

  function bindTiles() {
    const tiles = [
      ['#btn-manage-users', showAccessControl],
      ['#btn-audit-log', () => window.showHtmlModal('Audit Log', 'Audit log viewer coming soon')],
      ['#btn-permissions', showAccessControl],
      ['#btn-view-subscriptions', showPaymentManagement],
      ['#btn-billing', showPaymentManagement],
      ['#btn-ai-stats', showAIManagement],
      ['#btn-learning', showAIManagement],
      ['#btn-feedback', showFeedbackReview],
      ['#btn-system-logs', () => window.showHtmlModal('System Logs', 'System log viewer coming soon')],
      ['#btn-health', showHealthCheck],
      ['#btn-backups', () => window.showHtmlModal('Backups', 'Backup management coming soon')],
    ];
    
    tiles.forEach(([sel, handler]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.addEventListener('click', async () => {
        try {
          await handler();
        } catch (err) {
          console.error('[Admin] Tile handler failed:', err);
          window.showHtmlModal('Error', err.message);
        }
      });
    });
  }

  async function initializeAdmin() {
    await window.flexicadAuth.init();
    const isAdmin = await window.flexicadAuth.isAdmin?.();
    if (!isAdmin) {
      window.showHtmlModal('Access denied', 'You do not have admin access.');
      setTimeout(() => location.href = '/', 2000);
      return;
    }
    await renderDashboard();
    bindTiles();
  }

  document.addEventListener('DOMContentLoaded', initializeAdmin);
})();
