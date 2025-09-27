# 🚀 SECURE PRODUCTION DEPLOYMENT

## ✅ SAFE APPROACH - NO CREDENTIALS IN GITHUB

### 1. Netlify Build Settings:
```
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions
```

### 2. Environment Variables in Netlify:
Set these in your Netlify Dashboard → Site Settings → Environment Variables:

```
SUPABASE_URL=https://fifqqnflxwfgnidawxzw.supabase.co
SUPABASE_ANON_KEY=[YOUR_REAL_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_REAL_SERVICE_KEY]
OPENAI_API_KEY=[YOUR_OPENAI_KEY]
NODE_ENV=production
```

### 3. How it works:
- **GitHub:** Only placeholder values (SAFE!)
- **Netlify Build:** Automatically injects real values from environment variables
- **Your Live Site:** Gets real credentials, works perfectly

### 4. For Local Development:
```bash
# Just run this - uses your local .env file
netlify dev
```

### 5. Supabase URL Configuration:
Update in Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://flexicad.com.au`
- **Redirect URLs:** `https://flexicad.com.au/**`

---

## 🔒 SECURITY BENEFITS:
- ✅ No real credentials ever go to GitHub
- ✅ Netlify handles sensitive data securely
- ✅ Build process injects credentials at deploy time
- ✅ Safe for public repositories

## 📋 DEPLOY CHECKLIST:
- [ ] Set environment variables in Netlify
- [ ] Update Supabase URL config to your domain
- [ ] Commit and push (only safe placeholder values)
- [ ] Netlify auto-deploys with real credentials injected

**Your site will be secure and working!** 🎉