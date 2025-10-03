(function () {
  const Q = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>[...r.querySelectorAll(s)];

  function ensureModalLib(){ if (window.FCModals?.closeAll) try{FCModals.closeAll()}catch{} }
  function escapeHtml(s=''){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
  function showJSON(title, data){
    const pretty = typeof data==='string'?data:JSON.stringify(data,null,2);
    if (window.FCModals?.open){
      FCModals.open({ title: title||'Result', content:`<pre style="white-space:pre-wrap">${escapeHtml(pretty)}</pre>`, buttons:[{text:'Close',role:'close',variant:'primary'}]});
    } else { alert(`${title}\n\n${pretty}`); }
  }
  async function callJson(path, opts){
    const res = await window.AdminGate.fetchWithAuth(path, opts);
    const text = await res.text();
    let json; try{ json = JSON.parse(text);}catch{ json = { raw:text }; }
    if(!res.ok){ const err=new Error(`HTTP ${res.status}`); err.status=res.status; err.body=json; throw err; }
    return json;
  }

  const actions = {
    async health(){ showJSON('System Health', await callJson('/.netlify/functions/admin-health',{method:'GET'})); },
    async 'manage-users'(){ showJSON('Users', await callJson('/.netlify/functions/admin-list-users',{method:'GET'})); },
    async 'view-subscriptions'(){
      try{ showJSON('Subscriptions / Dashboard Stats', await callJson('/.netlify/functions/admin-dashboard-stats',{method:'GET'})); }
      catch{ showJSON('Payments Overview', await callJson('/.netlify/functions/admin-payments-overview',{method:'GET'})); }
    },
    async 'promo-codes'(){ showJSON('Promo Codes', await callJson('/.netlify/functions/manage-promo-codes?action=list',{method:'GET'})); },
    async 'billing-reports'(){ showJSON('Billing Reports', await callJson('/.netlify/functions/admin-payments-overview',{method:'GET'})); },
    async 'ai-usage'(){ showJSON('AI Usage Stats', await callJson('/.netlify/functions/admin-ai-overview',{method:'GET'})); },
    async 'learning-data'(){ showJSON('Learning Data', await callJson('/.netlify/functions/admin-list-training-assets',{method:'GET'})); },
    async 'user-feedback'(){ showJSON('User Feedback', await callJson('/.netlify/functions/admin-feedback-list',{method:'GET'})); },
    async 'system-logs'(){ showJSON('System Logs', await callJson('/.netlify/functions/admin-system-tools?action=logs',{method:'GET'})); },
    async 'health-check'(){ showJSON('Health Check', await callJson('/.netlify/functions/check-database?type=payment_first_validation',{method:'POST'})); },
    async 'backups'(){ showJSON('Backups', await callJson('/.netlify/functions/admin-system-tools?action=backups',{method:'GET'})); },
    async __smoke(){
      const seq=['health','manage-users','view-subscriptions','promo-codes','billing-reports','ai-usage','learning-data','user-feedback','system-logs'];
      const out={}; for(const k of seq){ try{ await actions[k](); out[k]='ok'; }catch(e){ out[k]=`fail:${e?.status||e?.message}`; } }
      console.log('[admin smoke]', out); return out;
    }
  };

  function bindClicks(){
    document.addEventListener('click', ev=>{
      const el = ev.target.closest('[data-admin-action]'); if(!el) return;
      ev.preventDefault();
      const key = el.getAttribute('data-admin-action');
      if(!actions[key]) return console.warn('No action for', key);
      actions[key]().catch(err=>{ console.error('Admin action error', key, err); showJSON(`Error: ${key}`, err?.body ?? {error:err?.message||String(err)}); });
    });
  }

  async function init(){
    ensureModalLib();
    const ok = await window.AdminGate.requireAdminOrRedirect(); if(!ok) return;
    bindClicks();
    const status = Q('[data-system-status]'); if(status) status.textContent='Online';
    window.AdminPanel = { actions };     // ← global export
    console.log('[admin-panel] ready');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
