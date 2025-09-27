---
mode: agent
---

> **Goal:** Apply a consistent **dark theme** across the whole FlexiCAD project, add a **persistent top navigation bar** to every page, ensure each page has a short **intro header**, and make sure the **Templates modal** that shows `.scad` has an obvious **Close** control.
> **Critical constraint:** **Do not change any existing functionality** or API behavior. Do not rename IDs/classes that current JS relies on. Do not change fetch URLs or request/response schemas. Only add non-breaking markup/CSS and minimal JS for the close button if needed.
>
> ---
>
> ### Files you MAY touch (only as described):
>
> * `styles.css` (or create `styles/dark.css` if not present) → add global dark theme variables, base styles, navbar styles, and modal styling.
> * Each HTML page: `index.html`, `home.html`, `ai.html`, `templates.html`, `my-designs.html`, `about-us.html`, `login.html`, `register.html`, `debug.html`, `test-ai.html` → insert the navbar markup at the top, and a short intro `<header>` below the navbar. Keep existing page content and IDs intact.
> * `templates.html` only: ensure the `.scad` modal has a visible **Close** button and that clicking it hides the modal. If a close element already exists, just style it and wire it up.
> * **Do NOT modify** any files under `netlify/functions/**`, `config/config.js`, or existing JS logic that calls APIs (except to add a one-line event listener for the modal close if missing).
>
> ---
>
> ### Dark theme requirements:
>
> 1. Define CSS variables on `:root` for dark theme, e.g.:
>
>    * `--bg:#0e0f12; --panel:#16181d; --text:#e9eef6; --muted:#a9b3c2; --brand:#4f8cff; --border:#23262f; --accent:#3a7aff; --danger:#ff4f4f;`
> 2. Set global base styles (body, headings, links, buttons, inputs, cards/panels, grids) using those tokens.
> 3. Respect `prefers-color-scheme: dark` and **default to dark** if no preference.
> 4. Ensure good contrast and accessible focus states (outline or box-shadow).
> 5. Do **not** remove existing classes/IDs. Only add styles; if you must add classes, they must be additive and not used by existing JS.
>
> ---
>
> ### Persistent top navbar (all pages):
>
> * Insert the same `<nav>` block at the very top of `<body>` on every page. It should be sticky at top, full-width, and use dark styles.
> * Include links (these exact hrefs): `home.html`, `templates.html`, `ai.html`, `my-designs.html`, and brand “FlexiCAD Designer” (link to `home.html` or `index.html` depending on page).
> * Include a right-aligned user area with an email placeholder element: `<span id="user-email" class="user-email">Welcome</span>` and a `<button id="logout-btn" class="btn-logout">Logout</button>`. **Keep these IDs unchanged** since existing JS references them.
> * Add an “active” style based on the current page (e.g., compare `location.pathname` and add `aria-current="page"` + an `.active` class to the matching link) — do this purely in DOM on page load without changing existing app logic.
>
> **Example navbar markup to add (adjust only the page title text where needed):**
>
> ```html
> <header class="site-header">
>   <nav class="site-nav">
>     <a href="home.html" class="brand">FlexiCAD Designer</a>
>     <ul class="nav-links">
>       <li><a href="home.html">Home</a></li>
>       <li><a href="templates.html">Templates</a></li>
>       <li><a href="ai.html">AI Generator</a></li>
>       <li><a href="my-designs.html">My Designs</a></li>
>     </ul>
>     <div class="user-area">
>       <span id="user-email" class="user-email">Welcome</span>
>       <button id="logout-btn" class="btn-logout">Logout</button>
>     </div>
>   </nav>
> </header>
> ```
>
> ---
>
> ### Page intro headers (all pages, below navbar):
>
> * Add a compact page intro section directly under the navbar:
>
> ```html
> <section class="page-intro">
>   <h1>PAGE_TITLE_HERE</h1>
>   <p class="muted">One-sentence description of what the page does.</p>
> </section>
> ```
>
> * Use a relevant title/description per page:
>
>   * `home.html`: “Welcome to FlexiCAD” — “Browse templates, generate OpenSCAD, and manage your designs.”
>   * `templates.html`: “Templates Library” — “Curated parametric OpenSCAD templates. Click to view/clone.”
>   * `ai.html`: “AI Design Generator” — “Describe a design in plain English, get ready-to-compile .scad.”
>   * `my-designs.html`: “My Designs” — “Your saved and generated OpenSCAD projects.”
>   * `about-us.html`: “About FlexiCAD” — “Vision, team, and platform details.”
>   * `login.html` / `register.html`: “Account Access” — “Sign in or create an account to save and manage designs.”
>   * `debug.html` / `test-ai.html`: keep titles short; note that they’re internal/testing pages.
>
> ---
>
> ### Templates modal close (templates.html only):
>
> * Ensure the modal that shows `.scad` has a visible close affordance:
>
>   * Add a top-right “×” button with `id="modal-close"` (if absent), styled to be obvious and keyboard-focusable.
>   * Hook it to the existing modal hide logic (if there’s already a listener, don’t duplicate). If missing, add:
>
>     ```js
>     document.getElementById('modal-close')?.addEventListener('click',()=>document.getElementById('code-modal')?.classList.remove('active'));
>     document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.getElementById('code-modal')?.classList.remove('active'); });
>     ```
>   * Clicking the backdrop (outside modal content) should also close the modal if that behavior already exists; if not present, add a single event listener to the backdrop.
>   * **Do not** alter how `.scad` is loaded or rendered; only enhance the UI for closing it.
>
> ---
>
> ### CSS structure to add (in `styles.css` or `styles/dark.css` you create):
>
> * Global tokens in `:root` (as listed above).
> * Base elements: `body`, headings, links, buttons, inputs.
> * Layout: `.site-header`, `.site-nav`, `.nav-links`, `.user-area`, `.page-intro`.
> * Cards and panels: match existing class names like `.card`, `.grid`, `.template-card`, `.template-header`, etc., but only add styles — no removals.
> * Modal: `#code-modal`, `.modal-content`, `#modal-close`.
> * Accessibility: focus states (`:focus-visible`) and sufficient color contrast.
>
> ---
>
> ### Acceptance criteria:
>
> * All existing features still work (AI generation, template listing, viewing/downloading `.scad`, auth UI hooks).
> * The UI uses a cohesive dark theme on every page with readable contrast.
> * A consistent sticky top navbar appears on every page with correct active link styling.
> * Each page shows a small intro header with a meaningful title and one-line description.
> * In `templates.html`, the `.scad` viewer modal has a visible “Close” button and ESC key support.
> * No console errors/warnings introduced. No CORS or routing changes.
> * Zero changes to API endpoints, fetch paths, or DOM IDs referenced by JS.
>
> **Make the changes now.**
