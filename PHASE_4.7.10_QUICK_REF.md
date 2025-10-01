# Phase 4.7.10 — Quick Reference 🚀

**One-page API reference for hotfix changes**

---

## 🎨 Modal System (UMD + ESM)

### Primary API (Recommended)

```javascript
// Show custom modal
FCModals.show({
    title: 'Modal Title',
    body: '<p>HTML content</p>',
    actions: [
        {text: 'Save', class: 'primary', handler: () => save()},
        {text: 'Cancel', class: 'secondary', handler: () => FCModals.hide()}
    ]
});

// Hide modal
FCModals.hide();

// Confirmation dialog (returns Promise<boolean>)
const confirmed = await FCModals.confirm('Delete this item?', 'Confirm Delete');
if (confirmed) {
    // User clicked OK
}

// Prompt dialog (returns Promise<string|null>)
const name = await FCModals.prompt('Enter your name:', 'Anonymous', 'User Input');
if (name) {
    console.log('User entered:', name);
}

// Toast notification
FCModals.toast('Success!', 'success'); // types: info, success, warning, error
```

### Legacy API (Backward Compatibility)

```javascript
// Still works for old code
showModal('<div>Content</div>');
hideModal();
```

### ESM Import

```javascript
import {FCModals, showModal, hideModal, confirmModal, promptModal, toast} from './modals.js';
```

---

## 🔐 Admin Panel JWT Pattern

### fcFetch Helper (Internal)

```javascript
// Automatically adds Bearer token from flexicadAuth
async function fcFetch(path, init = {}) {
    const client = await window.flexicadAuth.getSupabaseClient();
    const {data, error} = await client.auth.getSession();
    
    if (error || !data.session) {
        throw new Error('Not authenticated');
    }
    
    const headers = {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {})
    };
    
    return fetch(`/.netlify/functions/${path}`, {...init, headers});
}

// Usage
const resp = await fcFetch('admin-dashboard-stats');
const data = await resp.json();
```

### Admin Initialization Pattern

```javascript
async function initializeAdmin() {
    // Wait for flexicadAuth
    await window.flexicadAuth.init();
    
    // Check admin status
    if (!(await window.flexicadAuth.isAdmin())) {
        FCModals.show({
            title: '🚫 Access Denied',
            body: '<p>Admin access required.</p>'
        });
        return;
    }
    
    // Load dashboard
    await renderDashboard();
    
    // Bind tile handlers
    bindTiles();
}

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
    initializeAdmin();
}
```

### HTML Patterns

**Metric elements (data-metric):**
```html
<span data-metric="total-users">Loading...</span>
<span data-metric="active-users">Loading...</span>
<span data-metric="total-designs">Loading...</span>
```

**Button handlers (id, not onclick):**
```html
<button id="btn-manage-users">Manage Users</button>
<button id="btn-view-audit-log">View Audit Log</button>
```

**Script loading order:**
```html
<script src="https://unpkg.com/@supabase/supabase-js@2.58.0/dist/umd/supabase.js" defer></script>
<script src="js/secure-config-loader.js" defer></script>
<script src="js/flexicad-auth.js" defer></script>
<script src="js/navbar-manager.js" defer></script>
<script src="js/modals.js" defer></script>
<script src="js/admin-controlpanel.js" defer></script>
```

---

## 🎯 Smart Suggestions (Interactive)

### HTML Structure

```html
<div class="suggestion-item" data-text="with dimensions 100mm × 60mm × 40mm">
    <span class="suggestion-icon">+</span> Specific size
</div>
```

### JavaScript Handler (Auto-initialized)

```javascript
// In generator-ui.js
function initSmartSuggestions() {
    const suggestionItems = document.querySelectorAll('.suggestion-item[data-text]');
    const promptTextarea = document.getElementById('promptInput');
    
    suggestionItems.forEach(item => {
        item.addEventListener('click', () => {
            const text = item.getAttribute('data-text');
            const current = promptTextarea.value.trim();
            
            // Append with spacing
            promptTextarea.value = current ? current + ' ' + text : text;
            
            // Visual feedback
            item.classList.add('active');
            setTimeout(() => item.classList.remove('active'), 300);
            
            // Focus and toast
            promptTextarea.focus();
            FCModals.toast(`Added: ${text}`, 'success');
        });
    });
}
```

### CSS (Active State)

```css
.suggestion-item.active {
    background: var(--primary);
    color: white;
    transform: scale(0.98);
}
```

---

## 📝 Script Loading Pattern

**All pages:**
1. Supabase UMD
2. secure-config-loader
3. flexicad-auth
4. navbar-manager
5. modals
6. Page-specific controllers

**Always use `defer`:**
```html
<script src="..." defer></script>
```

**No `type="module"` for modals.js** (UMD mode)

---

## 🧪 Quick Test Commands

### Test Admin Panel
```javascript
// In browser console on admin-controlpanel.html
await window.flexicadAuth.init();
await window.flexicadAuth.isAdmin(); // Should return true
```

### Test Modals
```javascript
// In browser console
FCModals.show({title: 'Test', body: '<p>Works!</p>'});
FCModals.hide();
await FCModals.confirm('Test?');
await FCModals.prompt('Name?');
FCModals.toast('Test!', 'success');
```

### Test Smart Suggestions
1. Open ai.html
2. Click any suggestion chip
3. Verify text appears in textarea
4. Verify toast notification

---

## 🚫 Anti-Patterns (Don't Do This)

### ❌ Direct Supabase Calls
```javascript
// WRONG - bypasses flexicadAuth
const session = await window.supabase.auth.getSession();
```

### ✅ Correct Pattern
```javascript
// RIGHT - uses shared client
const client = await window.flexicadAuth.getSupabaseClient();
const {data} = await client.auth.getSession();
```

### ❌ Inline Event Handlers
```html
<!-- WRONG - CSP violation -->
<button onclick="doThing()">Click</button>
```

### ✅ Correct Pattern
```html
<!-- RIGHT - ID + addEventListener -->
<button id="btn-do-thing">Click</button>
<script>
    document.getElementById('btn-do-thing').addEventListener('click', doThing);
</script>
```

### ❌ Loading Modals as Module
```html
<!-- WRONG - throws export error -->
<script src="js/modals.js" type="module"></script>
```

### ✅ Correct Pattern
```html
<!-- RIGHT - UMD mode -->
<script src="js/modals.js" defer></script>
```

---

## 📋 File Checklist

- ✅ `public/js/modals.js` - UMD + ESM wrapper
- ✅ `public/js/admin-controlpanel.js` - fcFetch pattern
- ✅ `public/admin-controlpanel.html` - data-metric, #btn-* IDs
- ✅ `public/js/generator-ui.js` - Smart Suggestions handler
- ✅ `public/ai.html` - Script loading order

---

**Phase 4.7.10 Quick Reference** | Last Updated: January 2025
