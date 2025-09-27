# 🚀 PRODUCTION DEPLOYMENT GUIDE - FlexiCAD Designer

## IMMEDIATE SECURITY ACTIONS (DO FIRST!)

### 1. REGENERATE SUPABASE KEYS (CRITICAL!)
Your old keys were exposed on GitHub. Do this NOW:

1. Go to https://supabase.com/dashboard
2. Select your project: `fifqqnflxwfgnidawxzw`
3. Go to Settings → API
4. **REGENERATE** both keys:
   - `anon/public` key
   - `service_role` key
5. Copy the NEW keys for step 2 below

---

## 2. UPDATE YOUR LOCAL .ENV FILE

Replace your current `.env` file with these NEW values:

```env
# ===========================================
# SUPABASE CONFIGURATION (REGENERATED KEYS!)
# ===========================================
SUPABASE_URL=https://fifqqnflxwfgnidawxzw.supabase.co
SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_SERVICE_ROLE_KEY_HERE

# ===========================================
# OPENAI CONFIGURATION (Required for AI generator)
# ===========================================
OPENAI_API_KEY=your_openai_api_key_here

# ===========================================
# OPTIONAL CONFIGURATIONS
# ===========================================
APP_ENV=production
APP_NAME=FlexiCAD Designer
APP_VERSION=1.0.0
NODE_ENV=production
```

---

## 3. UPDATE CONFIG.JS FOR PRODUCTION

Your `public/config/config.js` should look like this:

```javascript
// Configuration for FlexiCAD Designer - PRODUCTION
const CONFIG = {
    // Supabase configuration - REPLACE WITH YOUR NEW VALUES
    SUPABASE_URL: 'https://fifqqnflxwfgnidawxzw.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_NEW_ANON_KEY_HERE',
    
    // Application settings
    APP_NAME: 'FlexiCAD Designer',
    VERSION: '1.0.0',
    
    // API endpoints
    NETLIFY_FUNCTIONS_BASE: '/.netlify/functions'
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
```

---

## 4. NETLIFY DEPLOYMENT SETUP

### A. Connect Repository
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub: `Wiradjuri/FlexiCAD-Designer`
4. Branch: `main`

### B. Build Settings
```
Build command: echo 'No build step needed for static site'
Publish directory: public
Functions directory: netlify/functions
```

### C. Environment Variables (CRITICAL!)
Add these in Netlify Dashboard → Site Settings → Environment Variables:

```
SUPABASE_URL=https://fifqqnflxwfgnidawxzw.supabase.co
SUPABASE_ANON_KEY=[YOUR_NEW_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_NEW_SERVICE_ROLE_KEY]
OPENAI_API_KEY=[YOUR_OPENAI_KEY]
NODE_ENV=production
```

---

## 5. SUPABASE PRODUCTION SETUP

### A. URL Configuration
In your Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://your-netlify-domain.netlify.app`
- **Redirect URLs:** `https://your-netlify-domain.netlify.app/**`

### B. Database Tables
Make sure these tables exist (run in SQL Editor if missing):

```sql
-- ai_designs table
CREATE TABLE IF NOT EXISTS public.ai_designs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_designs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own designs" ON public.ai_designs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own designs" ON public.ai_designs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own designs" ON public.ai_designs
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own designs" ON public.ai_designs
    FOR DELETE USING (auth.uid() = user_id);
```

---

## 6. FINAL DEPLOYMENT STEPS

### Step 1: Update local config.js
```bash
# Edit public/config/config.js with your NEW Supabase keys
# Then commit and push:
git add public/config/config.js
git commit -m "Update config with new Supabase keys for production"
git push origin main
```

### Step 2: Deploy to Netlify
1. Netlify will auto-deploy when you push to main
2. Check build logs for any errors
3. Test authentication on your live site

### Step 3: Test Production Site
- [ ] Registration works
- [ ] Login works  
- [ ] AI generator works
- [ ] Templates load
- [ ] My Designs works

---

## 7. DEV MODE (LOCAL DEVELOPMENT)

For local development, just run:
```bash
netlify dev
```

Your local site will run at: `http://localhost:8888`

---

## 8. TROUBLESHOOTING

### If authentication fails:
1. Check Supabase URL configuration matches your live domain
2. Verify environment variables are set in Netlify
3. Check browser console for CORS errors

### If AI generator fails:
1. Verify OPENAI_API_KEY is set in Netlify environment variables
2. Check function logs in Netlify dashboard

### If builds fail:
1. Check Netlify build logs
2. Ensure all dependencies are in package.json
3. Verify netlify.toml configuration

---

## 🎯 QUICK CHECKLIST

- [ ] Regenerated Supabase keys
- [ ] Updated local .env file
- [ ] Updated config.js with new keys
- [ ] Connected GitHub to Netlify
- [ ] Set environment variables in Netlify
- [ ] Updated Supabase URL configuration
- [ ] Deployed and tested live site

**Your FlexiCAD Designer should be live and working within 15-20 minutes!**

---

## 📞 SUPPORT

If you encounter issues:
1. Check Netlify build logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Test Supabase connection in dashboard