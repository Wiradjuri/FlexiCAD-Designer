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

# CONTINUATION ADDENDUM — PHASE 4 (Admin Dashboard, NO MOCKS E2E, Star Legend, Security)
Assume all prior “surgical hardening” work is complete and passing. Do NOT re-plan or revert previous changes. Continue with the SAME GUARDRAILS:
- Touch only what’s necessary; if you change any API/filename/behavior, update every caller/import/test in the SAME commit.
- Keep all secrets in env vars. Preserve payment-first gating. Maintain CSP-friendly patterns (no inline on* handlers, no eval).
- Use the project’s live logging style in any changed/new serverless code.
- **NO MOCKS, NO STUBS.** All checks use real providers (Stripe Test Mode, OpenAI with minimal tokens, real Supabase auth). Small, surgical additions only.
- This addendum **supersedes** the earlier “mockable” note under the Quality Bar: for admin-run end-to-end checks, use real providers (Stripe Test Mode etc.), not mocks.

ENV VARS (document in README; do not hardcode):
- ADMIN_EMAIL (default allowlist includes: bmuzza1992@gmail.com)
- STRIPE_PRICE_TEST (Stripe Test Mode Price ID for a minimal plan)
- E2E_BASE_URL (origin to test against; deploy preview or prod)
- OPENAI_MODEL, OPENAI_MAX_TOKENS (keep tiny; e.g., 256)
- Optional: RUN_ADMIN_E2E=true to enable admin-only destructive tests

A) ADMIN DASHBOARD — manage-prompts.html (ADMIN-ONLY, UNIFIED CONSOLE)
Goal: Turn /admin/manage-prompts.html into a single-pane admin console for the allowlisted admin (ADMIN_EMAIL). Reuse existing endpoints where possible; add only what’s missing.

Access Control:
- Client: if user email ≠ ADMIN_EMAIL, redirect to home. Do not render controls.
- Server: every admin endpoint verifies a valid Supabase session AND email ∈ allowlist. Return 403 on failure.

Cards/Sections (minimal UI churn; consistent styles, CSP-safe):
1) Health & Connectivity
   - Call a new/reused `admin_health` function returning:
     { ok, email, supabase:{ok}, stripe:{ok,lastWebhookAt}, openai:{ok,model}, runtime:{rev,env:"test|prod"} }
   - Server-side checks only; never expose secrets.

2) Stripe Integration — **Real Test Flow (NO MOCKS)**
   - Button: “Open Test Checkout” → serverless `admin_create_test_checkout` creates a **Stripe Test Mode** Checkout Session for STRIPE_PRICE_TEST, tied to a generated test email (admin+e2e-<timestamp>@example.com) or an entered email. Returns checkout URL; open in a new tab.
   - After checkout returns to site, show “Verify Entitlement” → `admin_verify_entitlement?email=<testEmail>` checks `profiles.subscription_plan` (or equivalent) and returns PASS/FAIL with details.
   - Display last 10 relevant Stripe events for that email from your existing webhook store; if none exists, add minimal `webhook_events` table with admin-only RLS.

3) Auth Flow Quick Tests (NO MOCKS)
   - “Open Register Test” → navigates to real register page prefilled with a throwaway test email (admin completes real Stripe Test Mode checkout).
   - “Open Login Test” → navigates to real login page for that test user.
   - “Session Echo” → call `/netlify/functions/session_echo` to return `{ email, entitled }` for the current session (auth required).

4) AI Generation Smoke Test (NO MOCKS)
   - Button: “Run AI Smoke Test” → `admin_ai_smoke_test` performs a **real** tiny AI generation (token-capped), asserts non-empty output, and stores a feedback row with `quality_score=5` + `quality_label="excellent"` for the admin test user. Returns `{ ok, tokensUsed, outputBytes, feedbackRowId }`.

5) Promo Codes (reuse)
   - Create/list/disable promo codes using existing endpoints. Enforce admin-only on server.

6) User Entitlements (surgical)
   - List users with `profiles.subscription_plan`. Actions: refresh from Stripe, set plan, revoke. All mutations append to `admin_audit` (reuse if present; otherwise add minimal table + admin-only RLS).

7) Templates Moderation (reuse)
   - List Objects/** via index.json; publish/unpublish, reindex, validate; show errors inline.

8) Runtime Config (read-only)
   - Show non-secret CONFIG from `secure-config-loader.js`. No secrets shown or edited.

Minimal New/Confirmed Endpoints (ADD ONLY IF MISSING; ELSE REUSE):
- GET `admin_health` — checks Supabase, Stripe (Test Mode), OpenAI (tiny call), returns statuses; admin-only.
- POST `admin_create_test_checkout` — returns Stripe Checkout URL for STRIPE_PRICE_TEST for a generated/entered test email; admin-only; idempotent keys for mutations.
- GET `admin_verify_entitlement` — validates entitlement for email; admin-only.
- GET `session_echo` — returns `{ email, entitled }` for authenticated user (not admin-only).
- POST `admin_ai_smoke_test` — runs tiny real AI generate, stores feedback, returns metrics; admin-only.
- GET `admin_audit_feed` — last 50 admin audit entries; admin-only.

All endpoints: schema-validate inputs, rate-limit mutating calls, structured JSON errors, log using project format.

B) AI STAR RATING — EXPLICIT MEANINGS
In the AI generated designs page (existing feedback UI):
- Add visible legend + tooltips for stars:
  1★ Unusable/bad (major errors; won’t render/compile)
  2★ Poor (heavy fixes required)
  3★ OK (works; needs improvements)
  4★ Good (minor tweaks)
  5★ Excellent (ready to use)
- When persisting feedback, include `quality_label` derived from score.
- Server-side validation: accept only 1..5; reject otherwise with 400.

C) SECURITY HARDENING (SURGICAL)
- Admin endpoints: verify session + ADMIN_EMAIL server-side; never rely on client checks.
- RLS: for any new tables (`admin_audit`, `webhook_events` if added), add admin-only policies. SQL must be idempotent; include in MIGRATIONS.md.
- Input validation for all new endpoints (tiny schema or existing validator), output encoding for UI; prefer `textContent` over `innerHTML`.
- Keep CSP-friendly DOM patterns; no new inline handlers.

D) REAL E2E AUTOMATION (OPTIONAL BUT RECOMMENDED) — NO MOCKS
Add minimal Playwright tests against E2E_BASE_URL (deploy preview/prod). These exercise the **real** flows:
1) auth-register-checkout.spec.ts — register → Stripe Test Mode checkout (card 4242… ) → entitlement PASS.
2) auth-login.spec.ts — login with that user → session_echo shows entitled.
3) ai-generate.spec.ts — run tiny AI generation → non-empty output → submit 5★ feedback → row recorded.
4) promo-codes.spec.ts — admin-only create/list/disable promo; audit entries present (run only if RUN_ADMIN_E2E=true).

Package scripts:
- "e2e": "playwright test"
- "e2e:headed": "playwright test --headed"

Keep tokens small and runs quick. Document Stripe Test Mode steps in README. NO MOCKS.

E) DOCS, PLAN & ACCEPTANCE
- Update PLAN.md with the minimal file list you will touch in this phase and why.
- Update README: env vars (names only), Stripe Test Mode instructions, how to run E2E against E2E_BASE_URL.
- Update MIGRATIONS.md for any new tables/RLS (idempotent).
- Acceptance:
  - /admin/manage-prompts.html shows: Health, Stripe Test flow, Auth quick tests, AI smoke test, Promo Codes, User Entitlements, Templates, Runtime Config (read-only).
  - Non-admins cannot access admin page or admin endpoints (server returns 403).
  - AI page shows star legend; feedback persists `quality_score` + `quality_label`.
  - Only necessary files changed; all impacted references updated in the same commit.
  - (If E2E added) Playwright tests pass against E2E_BASE_URL using real providers (Stripe Test Mode, OpenAI), with minimal runtime and cost.


GOAL: Extend the admin page (`/admin/manage-prompts.html`) with a **Feedback Review** console so the allowlisted admin can:
1) Review user feedback on AI outputs.
2) Decide per item: **Accept (good feedback → “train the model”)** OR **Reject (“do not train”)**.
3) Accepted items are promoted into a curated **training examples** set that the generator can use as few-shot signals (adapter layer only, no broad refactor).
4) Everything is secure and auditable.

ENV VARS (document in README)
- ADMIN_EMAIL
- OPENAI_MODEL, OPENAI_MAX_TOKENS (tiny, e.g., 256)
- Optional: OPENAI_FINE_TUNE_ENABLE=false (placeholder for future)

A) ADMIN UI — FEEDBACK REVIEW CARD
Add a new card “Feedback Review” (admin-only) with:
- Filters: status = Pending | Accepted | Rejected; search by user email/design id.
- Columns: created_at, user_email, design_id/template, stars (1..5 + label), short comment/snippet (sanitized), actions.
- Actions per row:
  - **Accept & Train** → promotes to curated training set and marks feedback “accepted”.
  - **Reject (Do Not Train)** → marks feedback “rejected”.
- Bulk Accept/Reject with confirmation dialogs.
- Toasts with structured server errors.
- No inline handlers; use JS modules + addEventListener.

B) SERVERLESS ENDPOINTS (ADD IF MISSING; ELSE REUSE) — ADMIN-ONLY
- GET `admin_feedback_list` — query by status/search; paginated.
- POST `admin_feedback_decide` — body: { feedback_id, decision: "accept"|"reject", tags?: string[] }
  - On accept: sanitize/persist to curated set; set feedback.review_status='accepted', reviewed_by, reviewed_at; audit log.
  - On reject: set review_status='rejected', reviewed_by, reviewed_at; optional reason; audit log.
  - Idempotent: re-deciding returns 200 with current state.
- GET `admin_training_examples_list` — list curated examples; filter by tag/template.
- POST `admin_training_rebuild_context` — rebuild cached prompt context/embeddings from accepted examples (if cache used).

C) DATA MODEL (IDEMPOTENT SQL; MINIMAL)
If these don’t exist, add:
- ai_feedback: add fields (if missing)
  - review_status TEXT CHECK (review_status IN ('pending','accepted','rejected')) DEFAULT 'pending'
  - reviewed_by TEXT NULL, reviewed_at TIMESTAMPTZ NULL
- ai_training_examples (admin-only RLS)
  - id UUID PK DEFAULT gen_random_uuid()
  - source_feedback_id UUID NULL REFERENCES ai_feedback(id)
  - input_prompt TEXT NOT NULL
  - generated_code TEXT NOT NULL
  - quality_score INT NOT NULL
  - quality_label TEXT NOT NULL
  - tags TEXT[] DEFAULT '{}'::TEXT[]
  - active BOOLEAN DEFAULT TRUE
  - created_by TEXT NOT NULL
  - created_at TIMESTAMPTZ DEFAULT now()

RLS:
- ai_training_examples: admin-only read/write.
- ai_feedback: users create their feedback; only admin can change review fields.

MIGRATIONS: add idempotent SQL to MIGRATIONS.md. Do not weaken existing RLS.

D) GENERATOR INTEGRATION (SURGICAL)
- In generation (e.g., enhanced-generate-template.js or current function), **augment** prompts with a small set of curated examples (top-N accepted, filtered by tag/template).
- Implement as a thin adapter; do not refactor core generator.
- Log: “Loaded N curated examples (tags: …)” for observability and E2E assertions.
- If `admin_training_rebuild_context` exists, prefer its cache; otherwise live read.

E) E2E & ACCEPTANCE (NO MOCKS)
Admin journey:
1) Visit `/admin/manage-prompts.html` → “Feedback Review” lists pending items.
2) Accept one item → receive `{ ok:true, feedback_id, promoted_example_id }`; new example appears in “Training Examples”; audit entry written.
3) Trigger tiny AI generation for same template/tag → logs include “Loaded N curated examples …”; output non-empty.
4) Reject another pending item → status updated; audit entry exists.

Docs:
- README: admin review workflow, env vars.
- MIGRATIONS.md: idempotent SQL.
- PLAN.md: minimal file list touched and why.

Commit order:
1) PLAN.md update (Phase 4.1)
2) Migrations + endpoints (+ audit)
3) Admin UI card + wiring
4) Generator adapter + log line
5) README/MIGRATIONS updates

Each commit includes a short CHANGESET note (goal, files touched, acceptance).
