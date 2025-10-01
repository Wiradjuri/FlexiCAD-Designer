/* site/js/modals.js - UMD + ESM dual mode, CSP-safe */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FCModals = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const STATE = { root: null, backdrop: null, container: null };
  function ensureRoot() {
    if (STATE.root) return;
    const root = document.createElement('div');
    root.id = 'modal-root';
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '10000';
    root.style.display = 'none';
    root.setAttribute('aria-hidden', 'true');

    const backdrop = document.createElement('div');
    backdrop.style.position = 'absolute';
    backdrop.style.inset = '0';
    backdrop.style.background = 'rgba(0,0,0,.5)';

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.background = '#0b1220';
    container.style.border = '1px solid #1f2937';
    container.style.borderRadius = '12px';
    container.style.width = 'min(720px, 92vw)';
    container.style.maxHeight = '80vh';
    container.style.overflow = 'auto';
    container.style.boxShadow = '0 10px 40px rgba(0,0,0,.6)';

    root.appendChild(backdrop);
    root.appendChild(container);
    document.body.appendChild(root);

    STATE.root = root; STATE.backdrop = backdrop; STATE.container = container;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function show({ title = 'Modal', body = '', actions = [] } = {}) {
    ensureRoot();
    clear(STATE.container);

    const header = document.createElement('div');
    header.style.padding = '16px 20px';
    header.style.borderBottom = '1px solid #1f2937';
    header.style.fontSize = '18px';
    header.style.fontWeight = '700';
    header.textContent = title;

    const content = document.createElement('div');
    content.style.padding = '16px 20px';
    if (typeof body === 'string') {
      const p = document.createElement('div');
      p.innerHTML = body;
      content.appendChild(p);
    } else {
      content.appendChild(body);
    }

    const footer = document.createElement('div');
    footer.style.padding = '12px 20px';
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    footer.style.justifyContent = 'flex-end';
    footer.style.borderTop = '1px solid #1f2937';

    (actions.length ? actions : [{ label: 'Close', variant: 'secondary', onClick: hide }]).forEach(btnDef => {
      const b = document.createElement('button');
      b.textContent = btnDef.label;
      b.className = 'btn ' + (btnDef.variant === 'primary' ? 'btn-primary' : 'btn-secondary');
      b.onclick = async () => {
        try { await (btnDef.onClick?.()); } finally { if (!btnDef.keepOpen) hide(); }
      };
      footer.appendChild(b);
    });

    STATE.container.appendChild(header);
    STATE.container.appendChild(content);
    STATE.container.appendChild(footer);

    STATE.root.style.display = 'block';
    STATE.root.removeAttribute('aria-hidden');
  }

  function hide() {
    if (!STATE.root) return;
    STATE.root.style.display = 'none';
    STATE.root.setAttribute('aria-hidden', 'true');
  }

  async function confirm(message, title = 'Confirm') {
    return new Promise(resolve => {
      const body = document.createElement('div');
      body.style.padding = '4px';
      body.textContent = message;
      show({
        title,
        body,
        actions: [
          { label: 'Cancel', variant: 'secondary', onClick: () => resolve(false) },
          { label: 'Confirm', variant: 'primary', onClick: () => resolve(true) }
        ]
      });
    });
  }

  async function prompt(message, placeholder = '', title = 'Input') {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      const label = document.createElement('div');
      label.textContent = message;
      label.style.marginBottom = '8px';
      const input = document.createElement('input');
      input.className = 'input';
      input.placeholder = placeholder;
      input.style.width = '100%';
      input.onkeydown = e => { if (e.key === 'Enter') { resolve(input.value); hide(); } };
      wrap.appendChild(label); wrap.appendChild(input);
      setTimeout(()=>input.focus(), 50);
      show({
        title,
        body: wrap,
        actions: [
          { label: 'Cancel', variant: 'secondary', onClick: () => resolve(null) },
          { label: 'OK', variant: 'primary', onClick: () => resolve(input.value) }
        ]
      });
    });
  }

  function toast(msg, type = 'info') {
    console.log(`[toast:${type}]`, msg);
  }

  const api = { show, hide, confirm, prompt, toast };
  if (typeof window !== 'undefined') {
    window.showModal = (opts) => api.show(opts);
    window.hideModal = () => api.hide();
  }
  return api;
}));

// ESM compat exports (safe even if not used as module)
export const FCModals = (typeof window !== 'undefined' && window.FCModals) ? window.FCModals : undefined;
export const showModal = (FCModals && FCModals.show) ? FCModals.show : undefined;
export const hideModal = (FCModals && FCModals.hide) ? FCModals.hide : undefined;
export const confirmModal = (FCModals && FCModals.confirm) ? FCModals.confirm : undefined;
export const promptModal = (FCModals && FCModals.prompt) ? FCModals.prompt : undefined;
export const toast = (FCModals && FCModals.toast) ? FCModals.toast : undefined;