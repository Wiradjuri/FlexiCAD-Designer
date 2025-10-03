// Phase: 4.7.21 - Admin login entry point
// Handles admin login button click and verification

(function(){
  function showMsg(text, isError = true){
    const msg = document.getElementById('adminLoginMsg');
    if (!msg) return;
    msg.style.display = 'block';
    msg.textContent = text;
    msg.style.color = isError ? 'var(--error, #ff4444)' : 'var(--success, #44ff44)';
  }

  async function handleAdminLogin(){
    try{
      // Phase: 4.7.21 - Ensure auth initialized (waits for UMD)
      await window.flexicadAuth.init();
      
      const email = document.querySelector('#loginEmail')?.value?.trim();
      const password = document.querySelector('#loginPassword')?.value || '';
      if (!email || !password) throw new Error('Please enter email and password.');

      // Phase: 4.7.21 - Use admin login flag
      const loginRes = await window.flexicadAuth.login(email, password, {
        adminLoginRequested: true
      });
      
      if (!loginRes?.success) {
        throw new Error(loginRes?.error || 'Login failed');
      }

      // If login succeeds with admin flag, it redirects automatically
      // This code only runs if something went wrong
      if (!loginRes.isAdmin) {
        showMsg('❌ Not an admin account');
      } else {
        showMsg('✅ Admin verified! Redirecting...', false);
      }
      
    }catch(err){
      const msg = err?.message || String(err);
      if (msg.includes('Not an admin')) {
        showMsg('❌ Not an admin account');
      } else if (msg.includes('Invalid login credentials')) {
        showMsg('❌ Invalid email or password');
      } else if (msg.includes('Email not confirmed')) {
        showMsg('❌ Please confirm your email first');
      } else if (msg.includes('Payment required') || msg.includes('payment')) {
        showMsg('❌ Payment required');
      } else {
        showMsg(`❌ ${msg}`);
      }
      console.error('[adminLogin]', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('adminLoginBtn');
    if (btn) btn.addEventListener('click', handleAdminLogin);
  });
})();
