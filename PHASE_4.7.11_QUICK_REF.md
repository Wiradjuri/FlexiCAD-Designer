# Phase 4.7.11 Quick Reference

## 🚀 New npm Scripts

```bash
# Scan repo and generate inventory.json
npm run audit:paths

# Fix all path issues automatically
npm run fix:paths

# Validate path consistency
npm run test:paths
```

---

## 📝 File Naming Rules

### HTML Assets
```html
<!-- ✅ CORRECT -->
<script src="/js/secure-config-loader.js" defer></script>
<link href="/css/dark-theme.css" rel="stylesheet">

<!-- ❌ WRONG -->
<script src="js/secure-config-loader.js"></script>
<link href="css/dark-theme.css" rel="stylesheet">
```

### Function Imports
```javascript
// ✅ CORRECT
import { requireAdmin } from '../lib/require-admin.mjs';
import { requireAuth } from '../lib/require-auth.mjs';

// ❌ WRONG
import { requireAdmin } from 'netlify/lib/require-admin.mjs';
```

---

## 🔧 Troubleshooting

### Assets 404
```bash
# Audit current state
npm run audit:paths

# Fix paths
npm run fix:paths

# Verify
npm run test:paths
```

### Import Errors
```bash
# Check for wrong imports
npm run test:paths

# Manual check
cat scripts/inventory.json | jq '.problems'
```

---

## ✅ Pre-Commit Checklist

- [ ] Run `npm run audit:paths`
- [ ] Run `npm run test:paths` (must pass)
- [ ] If tests fail, run `npm run fix:paths`
- [ ] Re-test after fixes

---

## 📦 What Changed

- **31 HTML files:** Path normalization (js/ → /js/, css/ → /css/)
- **netlify.toml:** Added `/admin/manage-promos.html` redirect
- **package.json:** Added 3 new audit/fix/test scripts

---

## 🎯 Key Takeaways

1. **Always use root-relative paths** for shared assets (`/js/`, `/css/`)
2. **Functions use `../lib/*`** for internal imports
3. **Run tests before commit** to catch issues early
4. **Automated fixer available** if manual fixes needed

---

**Full documentation:** `PHASE_4.7.11_COMPLETE.md`
