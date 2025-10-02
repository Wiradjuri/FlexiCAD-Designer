fix(security): phase 4.7.17 - comprehensive auth security repairs

CRITICAL SECURITY FIXES:
- Remove duplicate requireAuth function (unpredictable behavior)
- Add environment variable validation (SUPABASE_URL, SUPABASE_ANON_KEY)
- Sanitize all logging (hide sensitive tokens/emails)
- Add production log guards (no logs in NODE_ENV=production)
- Add dev token bypass warnings (prevent accidental production use)

SECURITY FEATURES ADDED:
- validateEnv() - validates required env vars before use
- sanitizeForLog() - shows only first/last 10 chars of sensitive data
- CORS configuration support via ALLOWED_ORIGINS env var
- Generic error messages to prevent information disclosure
- Comprehensive JSDoc comments with security notes

FILES MODIFIED:
- netlify/lib/require-auth.mjs (147 lines) - complete security overhaul

DOCUMENTATION ADDED:
- SECURITY_REPAIRS.md (450+ lines) - full audit report
- SECURITY_REPAIRS_QUICK_REF.md (90 lines) - quick reference
- PHASE_4.7.17_COMPLETE.md (140 lines) - implementation summary

RISK ASSESSMENT:
- Before: 🔴 HIGH (5 critical issues)
- After: 🟡 MEDIUM (requires production config)
- With Config: 🟢 LOW (production-ready)

PRODUCTION REQUIREMENTS:
⚠️  Must configure before deploy:
- APP_ENV=production
- NODE_ENV=production
- ALLOWED_ORIGINS=https://flexicad.app
- Remove DEV_BEARER_TOKEN and DEV_ADMIN_TOKEN

TESTING:
✅ No syntax errors
✅ Backwards compatible with dev setup
✅ Verification script: node tests/verify-dev-tokens.mjs

NEXT STEPS:
- Apply same patterns to require-admin.mjs
- Add input validation to generate-design-stream.mjs
- Configure rate limiting before production deploy

Breaking Changes: NONE
Dev Impact: NONE (dev tokens still work)
Production Impact: HIGH (requires configuration)

Security audit identified 10 issues, 5 critical fixes implemented.
See SECURITY_REPAIRS.md for complete details.
