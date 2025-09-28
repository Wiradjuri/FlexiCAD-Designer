---
mode: agent
---
You are my senior engineer pair—review the entire FlexiCAD Designer repo and make targeted, high-leverage improvements. Follow these constraints and steps exactly.

CONTEXT & SCOPE
- Tech stack: Netlify (Functions), Supabase (auth/DB/RLS), Stripe (payments), OpenAI (AI generation), vanilla JS/HTML/CSS.
- Project goal: payment-first authentication, AI generator that learns from feedback, template library, promo codes, secure config.
- There are additional design docs and “starter files” under: .github/instructions/**
  - These filenames (ai_learning_sessions.sql, enhanced-generate-template.js, ai-feedback.js, teach-ai.js, promo-management.html, enhanced-checkout.js, enhanced-ai-generator.html, enhanced-payment-page.html, secure-config-loader.js) are NEW/UNWIRED references. Treat them as guidance; wire them in only if beneficial and consistent with project architecture.

NON-NEGOTIABLE RULES
1) Do NOT touch any file that doesn’t need to change to achieve a concrete improvement or to fix a dependency/contract ripple.
2) If you change a file’s API/exports or behavior, update every caller/import/reference and any tests, types, and docs that depend on it in the same PR.
3) Refactors must be behavior-preserving unless explicitly fixing a bug; when fixing a bug, add tests that fail before and pass after.
4) Keep environment secrets in environment variables. Never hard-code keys. Never log secrets.
5) Preserve payment-first flow: new user → Stripe checkout (success only) → access to app; failure/decline → no access.
6) All code must use modern, secure patterns (ES modules, async/await, input validation, error boundaries, CSP-friendly, no deprecated APIs).
7) Use the repo’s live logging style (timestamped banners + transcript to logs, tail support) for any new/changed serverless code.

WHAT TO DELIVER (IN THIS ORDER)
A) Discovery pass:
   - Read the repo, infer architecture, and scan .github/instructions/** for intended direction.
   - Emit a concise PLAN.md (root) describing:
     - Current state & gaps.
     - Minimal, surgical changes that provide maximum benefit.
     - Files you intend to edit/add/remove and why.
     - Exact acceptance criteria per change.

B) Surgical improvements (commit in logically separated steps):
   1. SECURITY & CONFIG
      - Implement /public/js/secure-config-loader.js (from instructions) safely:
        - Loads non-secret runtime flags (not secrets) before app bootstrap.
        - Provides a single CONFIG object; no global leaks; no duplicate “const CONFIG” redeclarations.
        - Replace any ad-hoc config shims with this loader; update all references.
      - Add CSP-safe script loading, remove inline eval-like patterns, and sanitize any dynamic HTML insertions.
   2. PAYMENT-FIRST AUTH (Supabase + Stripe)
      - Ensure the login loop is eliminated:
        - After successful Stripe session → persist verified entitlement (e.g., profiles.subscription_plan) and gate routes/UI by entitlement.
        - On SIGNED_IN without valid entitlement → redirect to payment page (no access to home/templates/AI).
      - Add robust session checks on page load and in function calls; avoid brittle timer-based checks.
      - Implement promo-code aware checkout path using enhanced-checkout.js ideas if appropriate.
   3. PROMO CODES (admin-only)
      - Add minimal, secure admin UI (promo-management.html) gated by admin email/role.
      - Serverless endpoint(s) to create/list/disable codes with validation and audit logs.
   4. AI GENERATOR + LEARNING
      - If it’s a net improvement, wire enhanced-generate-template.js for generation:
        - Clear interface: input params, validation, deterministic logging, structured errors.
      - Add optional ai-feedback.js endpoint to accept user feedback on outputs.
      - If feasible without churn, integrate teach-ai.js (manual teaching) behind auth.
      - Create ai_learning_sessions.sql migration and RLS policies; do not weaken security.
   5. FRONTEND PAGES
      - If it’s beneficial, replace/augment ai.html, home.html, payment.html with the enhanced pages from instructions:
        - enhanced-ai-generator.html (with feedback hooks)
        - enhanced-payment-page.html (promo code box, entitlement messaging)
      - Keep styles cohesive; don’t duplicate CSS.
   6. TEMPLATES PAGE ROBUSTNESS
      - Ensure templates read from the Objects directory using index.json + README.md mapping as documented.
      - Handle missing/invalid files gracefully; surface actionable UI errors.

C) QUALITY BAR
   - Add/extend automated checks:
     - Unit tests for serverless functions (happy path + auth failures + invalid input).
     - Integration test (script) that simulates: register → checkout (mockable) → entitlement gate → AI generate → feedback.
   - Lint/format passes clean. No dead code. No console noise except structured logs.
   - Update README with:
     - Environment vars (names only), local dev steps, Netlify function routes, Stripe webhook instructions, Supabase migrations.
   - Include MIGRATIONS.md with steps to apply ai_learning_sessions.sql safely (idempotent).

D) PR REQUIREMENTS
   - Single PR titled: “Surgical hardening: config, payment-first, promos, AI learning”.
   - First commit: add PLAN.md; subsequent commits follow the plan.
   - Each commit message: <scope>: <concise change>, include BREAKING if any.
   - Update all callers for any changed exports in the same commit.

CHECKLIST BEFORE YOU OPEN THE PR
- [ ] No unused imports/vars; tree-shake friendly.
- [ ] No secrets in code/logs.
- [ ] Payment-first flow enforced on all gated routes.
- [ ] Promo flow works end-to-end; non-admins can’t manage codes.
- [ ] AI endpoints validate inputs; rate-limit & reject anonymous calls.
- [ ] All references updated for any renamed/moved files.
- [ ] Tests pass locally; instructions for running them included.

NOTES
- The files listed in .github/instructions/** are guidance/new. Only wire them if they improve the design without broad churn. If an existing module is already solid, leave it.
- When in doubt, prefer adapters and shims over wide refactors.
- If you must skip any suggested enhancement, justify briefly in PLAN.md under “Deferred”.

Now begin: generate PLAN.md with the proposed minimal change set, then implement the work incrementally as specified above.
