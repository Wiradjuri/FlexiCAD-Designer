---
mode: agent
---

You are my senior engineer. Apply modern, secure, production-ready patterns. Make changes in this repo:

**GOALS**

1. Fix the **Templates** page so it lists objects from `/objects/<object-name>/` where each subdir contains:

   * `template.scad` (the OpenSCAD file)
   * `README.md` (markdown description to render)
   * `index.json` (metadata/refs)
     Rules:
   * **Name** = `<object-name>` (subdirectory name)
   * **Description** = contents of `README.md` (rendered from markdown)
   * **Index reference** = parsed JSON from `index.json`
     Only display objects that have all three required files.
2. Add OpenAI API integration using the **Responses API** with **structured outputs** to generate OpenSCAD. It must be server-side (Netlify function) so keys are never exposed.
3. Add File Search (vector store) setup scripts to “teach” the model with curated OpenSCAD examples in `ai-reference/`.

**CONSTRAINTS & STANDARDS**

* Node 18+, ESM modules.
* Never expose API keys client-side.
* Provide **complete files**, not snippets.
* Use my live logging pattern everywhere: timestamps, banners, tail-friendly logs.

  * `const ts = () => new Date().toISOString();`
  * `const banner = (label) => console.log(\`\n===== \${label} @ \${ts()} =====\`);\`
  * `const logKV = (k,v)=>console.log(\`\[\${ts()}] \${k}: \${typeof v==="string"?v\:JSON.stringify(v)}\`);\`
* Keep code readable, commented, and secure.

**TASKS (implement end-to-end):**

A) **List Templates API**

* Create `netlify/functions/list-objects.js` that:

  * Scans `/objects` for subdirectories.
  * Validates presence of `template.scad`, `README.md`, `index.json`.
  * Reads `README.md` and parses `index.json`.
  * Returns JSON:

    ```json
    {
      "ok": true,
      "count": <number>,
      "objects": [
        {
          "name": "<object-name>",
          "description_md": "<raw markdown from README.md>",
          "index": { /* parsed from index.json */ },
          "files": {
            "scad": "/objects/<name>/template.scad",
            "readme": "/objects/<name>/README.md",
            "index": "/objects/<name>/index.json"
          }
        }
      ]
    }
    ```
  * Include CORS headers and OPTIONS handling.

B) **Frontend Templates Page**

* Update or create `landing_pages/templates.html` to:

  * Fetch `/api/list-objects`.
  * Render a responsive grid:

    * Title = `name`.
    * Description = render `description_md` (basic client-side markdown renderer; no extra deps).
    * Show pretty JSON of `index`.
    * Links to `template.scad`, `README.md`, `index.json`.
  * Add a search box and “Refresh” button.
  * Use the logging pattern above in the page (banner + log lines).

C) **Routing**

* Ensure `netlify.toml` has:

  ```toml
  [functions]
    node_bundler = "esbuild"

  [[redirects]]
    from = "/api/list-objects"
    to = "/.netlify/functions/list-objects"
    status = 200

  [[redirects]]
    from = "/api/generate-template"
    to = "/.netlify/functions/generate-template"
    status = 200

  [[redirects]]
    from = "/api/assistant-run"
    to = "/.netlify/functions/assistant-run"
    status = 200
  ```
* Keep existing build/publish values; just add redirects if missing.

D) **OpenAI Responses API (serverless)**

* Create `netlify/functions/generate-template.js` that:

  * Validates JSON POST body: `{ "objectId": string, "params": object }`.
  * Uses `openai` SDK and **Responses API** with a **json\_schema** `response_format` enforcing:

    ```json
    {
      "ok": "boolean",
      "objectId": "string",
      "summary": "string",
      "openscad_code": "string",
      "warnings": ["string"],
      "metrics": { }
    }
    ```
  * Calls a local prompt generator at `src/lib/promptFactory.js` to assemble `systemPrompt` + `userPrompt`.
  * Performs quick “lint” checks on the returned OpenSCAD (mixed center flags, huge output length) and appends warnings.
  * Returns the structured JSON payload.
* Create `src/lib/promptFactory.js`:

  * System prompt that enforces parametric OpenSCAD, modules, comments, mm units, printability, and sane `$fn`.
  * User payload is serialized JSON with `{ task, objectId, params, guidance, return_contract, printability_prefs }`.
  * Add at least one example object guide (e.g., `key_hook_organizer`).

E) **Assistants API (runner)**

* Create `netlify/functions/assistant-run.js`:

  * Accepts `{ userPrompt, metadata }`.
  * Creates a thread, posts the message, runs the assistant, polls to completion, and returns the final assistant message content.
  * Use the logging pattern. Handle timeouts and error states.
  * This endpoint is optional for now but must compile; we will wire File Search to it in section F.

F) **File Search (Vector Store) Scripts**

* Add `scripts/load-openscad-examples.mjs`:

  * Reads `ai-reference/` for `.scad`/`.md`/`.txt` exemplar files.
  * Uploads them with `purpose: "assistants"`.
  * Creates a vector store and batches files into it.
  * Prints `VECTOR_STORE_ID`.
* Add `scripts/attach-store-to-assistant.mjs`:

  * Requires env: `OPENAI_ASSISTANT_ID`, `OPENAI_VECTOR_STORE_ID`.
  * Updates the Assistant with a `file_search` tool and attaches the store.
  * Strengthens instructions to “consult attached examples before answering.”

G) **Environment & Dependencies**

* Update `.env.example` with:

  ```
  OPENAI_API_KEY=
  OPENAI_MODEL=gpt-4.1
  OPENAI_ASSISTANT_ID=
  OPENAI_VECTOR_STORE_ID=
  ```
* Add `openai` dependency and ensure ESM is on (`"type": "module"`).
* Never reference secrets in client code.

H) **Quality Bar (what to output)**

* Provide **full file contents** for every new/changed file:

  * `netlify/functions/list-objects.js`
  * `landing_pages/templates.html`
  * `netlify/functions/generate-template.js`
  * `src/lib/promptFactory.js`
  * `netlify/functions/assistant-run.js`
  * `scripts/load-openscad-examples.mjs`
  * `scripts/attach-store-to-assistant.mjs`
  * `.env.example` (append vars if file exists)
  * `netlify.toml` (show only the final merged content)
* Include explanatory comments at the top of each file.

I) **Acceptance Tests (run locally)**

* Start Netlify dev: `npx netlify dev`
* Visit `/landing_pages/templates.html` → the grid renders only valid objects (those with the required trio).
* `GET /api/list-objects` returns JSON with `ok:true`, `count`, `objects[]`.
* `POST /api/generate-template` with:

  ```json
  {
    "objectId":"key_hook_organizer",
    "params":{"width_mm":200,"height_mm":150,"depth_mm":30,"hooks":5,"hook_length_mm":40,"hook_diameter_mm":5,"hook_angle_deg":30,"mount_hole_spacing_mm":180,"label_width_mm":80,"label_height_mm":20,"edge_radius_mm":2}
  }
  ```

  returns 200 with `openscad_code` string and optional `warnings`.
* Scripts:

  * `node scripts/load-openscad-examples.mjs` prints `VECTOR_STORE_ID`.
  * With env set, `node scripts/attach-store-to-assistant.mjs` updates the assistant successfully.

J) **Style & Lint**

* Use the logging helpers on all serverless functions.
* Clean, modern JS. No deprecated APIs. Handle CORS and OPTIONS.
* Keep code self-documenting with comments for future contributors.

**Deliverables:** Commit-ready file contents and a brief note explaining any assumptions you made. Do not give pseudo-diffs; provide complete files ready to paste.

---
