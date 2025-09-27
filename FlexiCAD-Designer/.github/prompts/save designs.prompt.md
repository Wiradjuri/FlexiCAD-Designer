---
mode: agent
---


You are assisting on a static Netlify site called **FlexiCAD Designer**.
Do **not** alter existing working behavior of `ai.html` (generation flow) or `templates.html` (templates grid).
Your task is to implement **saving AI-generated .scad code to Supabase** so the **My Designs** page can read it later.

### Requirements

* Keep all current page behaviors intact.
* Add a **Netlify function** `save-design` that:

  * Validates a Supabase **Bearer** JWT from the client.
  * Inserts a new row into `ai_designs` table.
  * Returns `{ ok: true, id }` on success.
* Use **CORS** headers for browser calls.
* Use **service role key on server only** (function). **Never** ship it to client.
* Client (ai.html) must call `/.netlify/functions/save-design` **relative path** with the user’s Supabase JWT.

### File & Code Changes (create/update EXACTLY as below)

1. **Create table & RLS** (run in Supabase SQL editor)

```sql
-- Table
create table if not exists public.ai_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  prompt text not null,
  code text not null,
  context jsonb,
  design_type text,
  device_name text,
  device_matched boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.ai_designs enable row level security;

-- Policies
create policy "insert own designs" on public.ai_designs
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "select own designs" on public.ai_designs
  for select to authenticated
  using (auth.uid() = user_id);

create policy "delete own designs" on public.ai_designs
  for delete to authenticated
  using (auth.uid() = user_id);
```

2. **Netlify function**: `netlify/functions/save-design.js`

```js
// netlify/functions/save-design.js
// Saves AI-generated OpenSCAD code to Supabase for the authenticated user.

const { createClient } = require('@supabase/supabase-js');

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: 'Supabase environment not configured' });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json(401, { error: 'Missing Authorization Bearer token' });
    }
    const jwt = authHeader.slice(7);

    // Validate the user token
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) {
      return json(401, { error: 'Invalid or expired token' });
    }
    const userId = userData.user.id;

    // Parse body
    const { prompt, code, context, designType, deviceName, deviceMatched } = JSON.parse(event.body || '{}');
    if (!prompt || !code) return json(400, { error: 'prompt and code are required' });

    // Insert
    const { data, error } = await admin
      .from('ai_designs')
      .insert({
        user_id: userId,
        prompt,
        code,
        context: context || null,
        design_type: designType || null,
        device_name: deviceName || null,
        device_matched: !!deviceMatched
      })
      .select('id')
      .single();

    if (error) return json(500, { error: error.message });

    return json(200, { ok: true, id: data.id });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
```

3. **Ensure Netlify config** (update or create `netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "."

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
    Access-Control-Allow-Methods = "GET, POST, OPTIONS"
```

4. **AI page client save call** (edit `ai.html` only in the `autoSaveDesign()` method)

* Keep all existing functionality.
* Ensure the `fetch` target is **relative** and includes the **Bearer** from Supabase session.
* If `autoSaveDesign()` already exists, replace its fetch block with this exact call:

```js
const { data: sess } = await this.supabase.auth.getSession();
const token = sess?.session?.access_token;
if (!token) return; // not logged in; skip saving

const lastUser = this.conversationHistory.filter(m => m.role === 'user').pop();
const prompt = lastUser?.content || 'Generated design';

const res = await fetch('/.netlify/functions/save-design', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    prompt,
    code: this.currentCode,
    context: this.currentContext || null,
    designType: this.currentContext?.designType || null,
    deviceName: this.currentContext?.deviceName || null,
    deviceMatched: !!this.currentContext?.deviceMatched
  })
});
if (!res.ok) throw new Error(`Save failed ${res.status}`);
```

5. **Environment variables**

* In **Netlify dashboard → Site settings → Environment variables** add:

  * `SUPABASE_URL` = your project URL (e.g., `https://xxxx.supabase.co`)
  * `SUPABASE_SERVICE_ROLE_KEY` = service role key (server only)
  * `OPENAI_API_KEY` = already used by your generator
* In your **client config file** (`config/config.js`) keep:

  * `supabase.url`
  * `supabase.anonKey`
* **Do not** expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

6. **Local dev**

* Install CLI if needed: `npm i -D netlify-cli`
* Start dev with unified functions & static hosting:

  ```bash
  npx netlify dev
  ```
* The AI page should generate code and then call `/.netlify/functions/save-design` with 200 OK.

### Acceptance Criteria

* Generating a design on **ai.html** produces a **200 OK** POST to `/.netlify/functions/save-design`.
* A new row appears in `public.ai_designs` tied to the current user (`user_id = auth.uid()`).
* **my-designs.html** (already implemented) lists the saved designs for the logged-in user, with **View / Copy / Download / Delete** actions working.
* No regressions to existing AI generation and Templates browsing.

If anything is ambiguous, prefer minimal edits and keep current UX intact.