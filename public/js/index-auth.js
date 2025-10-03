// public/js/index-auth.js
// Phase: 4.7.18 - Admin login flow from index page

(function(){
  function showMsg(text){
    const msg = document.getElementById('adminLoginMsg');
    if (!msg) return;
    msg.style.display = 'block';
    msg.textContent = text;
  }

  async function handleAdminLogin(){
    try{
      await window.flexicadAuth.init(); // now waits for UMD + config
      const email = document.querySelector('#loginEmail')?.value?.trim();
      const password = document.querySelector('#loginPassword')?.value || '';
      if (!email || !password) throw new Error('Please enter email and password.');

      const loginRes = await window.flexicadAuth.login(email, password);
      if (!loginRes?.ok) throw new Error(loginRes?.error || 'Login failed');

      const supa = window.flexicadAuth.getSupabaseClient();
      const { data:{ session } } = await supa.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No session token');

      const res = await fetch('/.netlify/functions/admin-health', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      if (res.ok) {
        window.location.href = 'admin-controlpanel.html';
      } else {
        const j = await res.json().catch(()=>({}));
        showMsg(`❌ ${j?.error || 'Not an admin'}`);
      }
    }catch(err){
      showMsg(`❌ ${(err && err.message) || err}`);
      console.error('[adminLogin]', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('adminLoginBtn');
    if (btn) btn.addEventListener('click', handleAdminLogin);
  });
})();
