# FlexiCAD Designer

An AI-powe## 🔧 Admin Features

- **Admin Console**: Unified management at `/admin/admin-controlpanel.html`
- **System Health**: Real-time monitoring of Supabase, Stripe, and OpenAI
- **Dashboard Metrics**: User stats, active today, total designs, recent activity
- **Admin Subpages**: Access Control, Payment Management, AI Management, System Tools
- **Training Assets**: Upload and manage SVG/SCAD/JSONL training data
- **Feedback Review**: Accept/reject user feedback to improve AI training
- **Stripe Testing**: Test checkout flows with real Stripe Test Mode
- **AI Smoke Tests**: Validate AI generation pipeline
- **User Management**: View user statistics and entitlements
- **Promo Codes**: Create and manage discount codes at `/manage-promo.html`
- **Configuration**: View runtime configuration (read-only)

### 👤 Admin Access

To access the admin console:

1. **Set Admin Email**:
   - Add `ADMIN_EMAILS` environment variable with comma-separated emails
   - Or add row to `admin_emails` table: `INSERT INTO public.admin_emails (email) VALUES ('your-email@example.com');`
   - Default admin: `bmuzza1992@gmail.com`

2. **Log in** with your admin email at `/login.html`

3. **Admin Link** will appear in the navbar (🔧 Admin)

4. **Access Console** at [/admin/admin-controlpanel.html](/admin/admin-controlpanel.html)

#### Optional: Admin Passphrase (Second Factor)

For additional security, you can require a passphrase for admin access:

1. **Set Environment Variable**: `ADMIN_PASSPHRASE=your-secret-passphrase`
2. **Admin users** will be redirected to `/admin-login.html` to enter the passphrase
3. **Passphrase is server-side only** - never exposed to client
4. **Short-lived session flag** stored in `sessionStorage` for convenience

Note: The passphrase is checked by the `admin-health` function when the `X-Admin-Passphrase` header is present.

#### Admin Subpages:
- **Access Control** - Manage admin permissions and user accounts
- **Payment Management** - View subscriptions, webhooks, plan distribution
- **AI Management** - Training data, feedback review, model settings
- **System Tools** - Tag recomputation, system diagnostics

## 📁 Project Structuretform for creating OpenSCAD 3D designs with natural language prompts, featuring template management, user authentication, and comprehensive admin tools.

## 🔒 Security Notice

**This application uses secure server-side configuration.** API keys are never exposed in public files and are served securely from `/.netlify/functions/get-public-config`. The `/config/` directory is protected and inaccessible via web requests.

## 🚀 Features

- **AI-Powered Generation**: Create OpenSCAD designs using natural language descriptions with learning system
- **Template Library**: Professional, ready-to-use 3D design templates
- **Payment-First Authentication**: Secure subscription-based access with Stripe integration
- **AI Learning System**: Feedback collection and continuous improvement of AI generations
- **Design Management**: Save, organize, and share your designs
- **Admin Console**: Comprehensive management dashboard for administrators
- **Promo Code System**: Discount codes with admin management
- **Star Rating System**: Quality feedback with explicit rating meanings
- **Dark Theme UI**: Modern, responsive dark theme interface
- **Cloud Storage**: Designs automatically saved to the cloud
- **Export Capabilities**: Download designs as .scad files
- **Real-time Analytics**: System health monitoring and user statistics

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Authentication**: Supabase Auth (payment-first system)
- **Payments**: Stripe (checkout sessions, webhooks)
- **Database**: Supabase (PostgreSQL with RLS)
- **AI**: OpenAI GPT-4o-mini for code generation
- **Hosting**: Netlify with serverless functions
- **Styling**: Custom dark theme CSS

## � Admin Features

- **Admin Console**: Unified management at `/admin/manage-prompts.html`
- **System Health**: Real-time monitoring of Supabase, Stripe, and OpenAI
- **Stripe Testing**: Test checkout flows with real Stripe Test Mode
- **AI Smoke Tests**: Validate AI generation pipeline
- **User Management**: View user statistics and entitlements
- **Promo Codes**: Create and manage discount codes
- **Configuration**: View runtime configuration (read-only)

## �📁 Project Structure

```bash
FlexiCAD-Designer/
├── public/                          # Frontend static files
│   ├── index.html                  # Landing/welcome page
│   ├── login.html                  # Login page
│   ├── register.html               # Registration page
│   ├── home.html                   # Dashboard (protected)
│   ├── about.html                  # About page
│   ├── ai.html                     # AI generator (protected)
│   ├── templates.html              # Template browser (protected)
│   ├── my-designs.html             # User designs (protected)
│   ├── manage-promo.html           # Promo code management (admin)
│   ├── admin/
│   │   └── manage-prompts.html     # Unified admin console
│   ├── css/
│   │   └── dark-theme.css          # Main stylesheet
│   ├── js/
│   │   ├── secure-config-loader.js # Secure configuration system
│   │   └── flexicad-auth.js        # Payment-first authentication
│   └── templates/                  # Template library
│       ├── manifest.json           # Template metadata
│       ├── arduino-case/           # Example template
│       │   ├── meta.json
│       │   ├── README.md
│       │   └── template.scad
│       └── car-fascia/             # Example template
│           ├── meta.json
│           ├── README.md
│           └── template.scad
├── config/
│   └── config.js                   # App configuration
├── netlify/
│   └── functions/                  # Serverless functions
│       ├── generate-template.js    # AI generation endpoint
│       ├── save-design.js          # Save user designs
│       ├── list-designs.js         # List user designs
│       └── delete-design.js        # Delete user designs
├── netlify.toml                    # Netlify configuration
├── package.json                    # Node.js dependencies
└── README.md                       # Project documentation
```

## 🔧 Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Supabase account and project
- OpenAI API key
- Netlify account (for deployment)

### 1. Clone and Install

```bash
git clone <repository-url>
cd flexicad-designer
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and create the designs table:

```sql
-- Create the designs table
create table public.designs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  prompt text,
  code text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table public.designs enable row level security;

-- Create policies
create policy "Users can view their own designs"
  on public.designs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own designs"
  on public.designs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own designs"
  on public.designs for delete
  using (auth.uid() = user_id);

create policy "Users can update their own designs"
  on public.designs for update
  using (auth.uid() = user_id);
```

3. Get your Supabase URL and anon key from **Settings > API**

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### 4. Configuration

Update `config/config.js` with your Supabase credentials:

```javascript
window.FlexiCADConfig = {
  environment: "development",
  siteUrl: "http://localhost:8888",
  api: { baseUrl: "/.netlify/functions" },
  supabase: {
    url: "https://your-project.supabase.co",
    anonKey: "your-supabase-anon-key"
  },
  // ... other config
};
```

### 5. Database Migrations

Run the database migrations to set up AI learning and promo code systems:

```bash
# See MIGRATIONS.md for detailed steps
# Apply all migrations by running the SQL files in your Supabase SQL editor:
# 1. database/setup_ai_learning.sql
# 2. database/setup_promo_codes.sql
```

### 6. Development Server

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Start development server
netlify dev
```

The app will be available at `http://localhost:8888`

### 7. Local Dev Tokens (Phase 4.7.16)

For local development testing of protected endpoints (SSE, admin health), use dev tokens to bypass Supabase JWT validation:

#### Get a Fresh Supabase JWT

Open DevTools console on any authenticated page:

```javascript
await window.flexicadAuth.init();
const { data: { session } } = await window.flexicadAuth.getSupabaseClient().auth.getSession();
console.log(session.access_token);
```

#### Set Environment Variables

```bash
# Set dev environment
netlify env:set APP_ENV development

# Set admin emails
netlify env:set ADMIN_EMAILS "your-email@gmail.com"

# Set dev bearer token (paste JWT from above)
netlify env:set DEV_BEARER_TOKEN "eyJhbGc..."

# Set dev admin token (same JWT if you're an admin)
netlify env:set DEV_ADMIN_TOKEN "eyJhbGc..."
```

Or add to `.env` file:

```properties
APP_ENV=development
ADMIN_EMAILS=your-email@gmail.com
DEV_BEARER_TOKEN=eyJhbGc...
DEV_ADMIN_TOKEN=eyJhbGc...
```

#### Restart Dev Server

```bash
netlify dev --force
```

#### Run Smoke Tests

```bash
# Test SSE endpoint
npm run test:dev:sse

# Test admin health endpoint
npm run test:dev:admin
```

**Expected Results:**
- ✅ SSE endpoint: 200 OK (not 401)
- ✅ Admin health: 200 OK or 403 (not 401)
- Console logs show: `[require-auth] dev bearer accepted` or `[require-admin] dev admin accepted`

**⚠️ Security Notes:**
- Dev tokens only work when `APP_ENV=development`
- Never commit `.env` file with tokens to git
- Remove `DEV_*_TOKEN` vars before production deploy
- Tokens expire after 1 hour (exp claim in JWT)

### 8. Testing

```bash
# Run integration tests against local dev server
npm run test:dev

# Run tests against production
npm run test:prod

# Just run npm test (defaults to local)
npm test
```

## 🚀 Deployment

### Netlify Deployment

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard:

**Required Environment Variables:**
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server functions)
   - `OPENAI_API_KEY` - OpenAI API key for AI generation
   - `STRIPE_SECRET_KEY` - Stripe secret key for payments (use sk_test_ for admin tests)
   - `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
   - `STRIPE_PRICE_TEST` - Stripe price ID for admin test checkout

**Optional Environment Variables:**
   - `ADMIN_EMAIL` - Admin email for management (defaults to bmuzza1992@gmail.com)
   - `OPENAI_MODEL` - OpenAI model to use (defaults to gpt-4o-mini)
   - `OPENAI_MAX_TOKENS` - Token limit for admin smoke tests (defaults to 256)
   - `SUPABASE_STORAGE_BUCKET_TRAINING` - Storage bucket for training assets (defaults to training-assets)
   - `ALLOW_KEY_REVEAL_PUBLISHABLE` - Allow revealing publishable keys in admin (defaults to true)
   - `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret
   - `TEST_USER_EMAIL` - Email for integration testing
   - `E2E_BASE_URL` - Base URL for E2E tests
   - `RUN_ADMIN_E2E` - Enable admin E2E tests (true/false)

3. Deploy settings:
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

### Manual Deployment

```bash
# Build and deploy
netlify deploy --prod
```

## 🧪 Testing

FlexiCAD Designer includes comprehensive integration tests that verify:

- Configuration loading and security
- Payment-first authentication enforcement
- Promo code system functionality
- AI learning system integration
- All Netlify functions availability

**Running Tests:**

```bash
# Local development testing
npm run test:dev

# Production testing
npm run test:prod
```

**Test Coverage:**
- ✅ Secure configuration loading
- ✅ Authentication and payment gates
- ✅ Promo code validation and management
- ✅ AI feedback system
- ✅ Function availability and error handling

## 📚 Usage Guide

### For Users

1. **Registration**: Create an account and complete payment at the homepage
2. **AI Generation**:
   - Go to "AI Generator" (requires payment)
   - Describe your design in detail
   - Review and customize generated OpenSCAD code
   - Rate the generation and provide feedback
   - Save to your design library
3. **Templates**:
   - Browse the template library
   - View code and documentation
   - Download or customize templates
4. **Design Management**:
   - Access "My Designs" to view saved designs
   - Copy, download, or delete designs

### For Administrators

1. **Admin Console**:
   - Access `/admin/manage-prompts.html` (admin-only)
   - Unified dashboard for system management
   - Live test harness for all system components

2. **Admin Test Harness**:
   - **Health & Connectivity**: Real-time checks of Supabase, Stripe, and OpenAI
   - **Stripe Tests**: Create test checkouts and verify entitlements (Test Mode only)
   - **Auth Flow Tests**: Register/login testing with session validation
   - **AI Smoke Tests**: Validate AI generation with token-limited testing
   - **User Management**: View stats and manage entitlements
   - **Feedback Review**: Accept/reject user feedback for training
   - **Training Assets**: Upload SVG/SCAD/JSONL files for model improvement
   - **Runtime Config**: View configuration with key masking and reveal

3. **Feedback Review System**:
   - View pending, accepted, and rejected user feedback
   - Accept quality feedback to create training examples
   - Reject poor feedback with audit trail
   - Search and filter feedback by status and content

4. **Training Assets Management**:
   - Upload SVG, SCAD, and JSONL files for AI training
   - Files stored in Supabase Storage with admin-only access
   - Delete assets with audit logging
   - Support for tagged assets and metadata

3. **Stripe Test Mode Requirements**:
   - Use `sk_test_` and `pk_test_` keys for admin testing
   - Set `STRIPE_PRICE_TEST` environment variable
   - Test card: `4242 4242 4242 4242`
   - Live keys (`sk_live_`) automatically disable test functions

4. **Promo Code Management**:
   - Create, update, and disable promo codes
   - Monitor promo code usage and analytics
   - Set percentage or fixed amount discounts

5. **AI Learning Data**:
   - User feedback is automatically collected
   - AI improvements are applied based on user ratings
   - Quality labels: Unusable (1★) to Excellent (5★)
   - Training data builds over time

### Example AI Prompts

- "Create a phone case for iPhone 14 with camera cutouts and rounded corners"
- "Design a parametric desk organizer with compartments for pens, paper clips, and sticky notes"
- "Make a wall-mounted bracket for a 24-inch monitor with cable management"
- "Create a replacement knob for a kitchen cabinet, 30mm diameter with M6 screw hole"

## 🔧 API Reference

### Authentication

All protected endpoints require a bearer token:

```
Authorization: Bearer <supabase-jwt-token>
```

### Endpoints

#### `POST /.netlify/functions/generate-template`

Generate OpenSCAD code from natural language prompt.

**Request:**

```json
{
  "prompt": "Create a phone case with camera cutouts",
  "name": "Custom Phone Case"
}
```

**Response:**

```json
{
  "code": "// Generated OpenSCAD code...",
  "prompt": "Create a phone case with camera cutouts",
  "name": "Custom Phone Case"
}
```

#### `POST /.netlify/functions/save-design`

Save a design to the user's library.

**Request:**

```json
{
  "name": "My Design",
  "prompt": "Original prompt",
  "code": "// OpenSCAD code..."
}
```

#### `GET /.netlify/functions/list-designs`

List user's saved designs with pagination.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 50)
- `search`: Search term
- `sort`: Sort field (name, created_at)
- `order`: Sort order (asc, desc)

#### `DELETE /.netlify/functions/delete-design`

Delete a user's design.

**Request:**

```json
{
  "id": "design-uuid"
}
```

## 🎨 Customization

### Adding Templates

1. Create a new folder in `public/templates/`
2. Add required files:
   - `meta.json`: Template metadata
   - `README.md`: Documentation
   - `template.scad`: OpenSCAD code
3. Update `public/templates/manifest.json`

### Styling

The entire UI uses CSS custom properties defined in `public/css/dark-theme.css`. Modify the `:root` variables to customize colors and appearance.

## 🧪 Testing

### Admin Panel Testing

After logging in as an admin user (e.g., `bmuzza1992@gmail.com`):

#### Browser Testing
1. Visit `/admin-controlpanel.html`
2. Verify dashboard stats load (not showing "Loading...")
3. Click on each card heading to test subpages:
   - Access Control
   - Payment Management
   - AI Management
   - System Tools
4. Click "← Back to Dashboard" to return
5. Test System Tools buttons (Cache Flush, Recompute Tags)

#### Getting Your JWT Token
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Find Supabase session
4. Copy the `access_token` value

#### Terminal Testing (PowerShell)
```powershell
# Set your token
$TOKEN = "paste-your-access-token-here"
$BASE = "http://localhost:8888/.netlify/functions"

# Test dashboard stats
curl -H "Authorization: Bearer $TOKEN" "$BASE/admin-dashboard-stats" | ConvertFrom-Json

# Test access list
curl -H "Authorization: Bearer $TOKEN" "$BASE/admin-access-list" | ConvertFrom-Json

# Test AI overview
curl -H "Authorization: Bearer $TOKEN" "$BASE/admin-ai-overview" | ConvertFrom-Json

# Test system tools
curl -Method POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" `
  -Body '{"op":"flush-cache"}' "$BASE/admin-system-tools" | ConvertFrom-Json
```

### Template Wizard Testing
1. Visit `/templates.html`
2. Click any "Create" button
3. Fill out the wizard form
4. Click "Preview" to see generated code
5. Click "Generate" to send to AI generator
6. Verify redirect to `/ai.html` with auto-run

### AI Generator Testing
1. Visit `/ai.html?prompt=test box&auto=true`
2. Watch progress bar animate (0% → 10% → 40% → 80% → 100%)
3. Verify output panel appears with code
4. Check auto-scroll to output
5. Test Smart Suggestions (click to add to prompt)
6. Verify suggestions appear both RHS and below output

### Browser Console Test Script
Open browser console and paste:
```javascript
// Load and run test script
fetch('/tests/phase-4-7-9-test.mjs')
  .then(r => r.text())
  .then(code => eval(code));
```

Or run directly:
```javascript
// Quick inline test
async function quickTest() {
  const session = await window.supabase?.auth.getSession();
  const token = session?.data?.session?.access_token;
  const res = await fetch('/.netlify/functions/admin-dashboard-stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Dashboard stats:', await res.json());
}
quickTest();
```

## 🔒 Security

- **Authentication**: JWT tokens from Supabase
- **Row Level Security**: Database policies ensure users only access their data
- **CORS**: Configured for secure cross-origin requests
- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: OpenAI API calls are protected against abuse

## 🐛 Troubleshooting

### Common Issues

1. **Authentication errors**: Check Supabase configuration and environment variables
2. **AI generation fails**: Verify OpenAI API key and quota
3. **Template loading issues**: Ensure manifest.json is valid JSON
4. **CORS errors**: Check Netlify function headers configuration

### Development Tips

- Use browser dev tools to debug authentication flows
- Check Netlify function logs for server-side errors
- Test with different AI prompts to understand generation capabilities
- Verify Supabase RLS policies are working correctly

## 📝 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📧 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review Supabase and OpenAI documentation

## 🔄 Version History

- **v1.0.0**: Initial release with AI generation, templates, and user auth
- **v1.1.0**: Added design management and improved UI
- **v1.2.0**: Enhanced AI prompts and template library
- **Phase 4.7.9** (2025-01-XX): Admin panel boot, template wizards, AI progress tracking
  - Fixed admin dashboard stats rendering
  - Fixed template wizard modal initialization
  - Added AI generator 4-stage progress (10%/40%/80%/100%)
  - Improved error handling across all systems
- **Phase 4.7.18** (2025-10-02): Align to Complete Functions & Buttons Reference
  - **modals.js**: Dual-mode UMD with window globals (`showModal`, `closeModal`)
  - **AI Generator**: Real SSE progress (5→25→40→50→60-90→95→100%), removed example prompts
  - **Smart Suggestions**: Detail capture prompts, multi-select with confirmation flow
  - **AI Sidebar**: Sticky positioning with proper overflow handling
  - **My Designs**: Fixed modal/copy/download with clipboard API + fallback
  - **Templates**: Navigation-based wizard opening, View Code/README modals
  - **Admin**: Optional passphrase second-factor (`ADMIN_PASSPHRASE` env var)
  - **CSS**: Modal z-index 10000+, progress bar smooth transitions (0.25s)
  - **Tests**: sse-progress.smoke.mjs, admin-gate.smoke.mjs

- **Phase 4.7.10** (2025-01-XX): Hotfix — UMD modals, Admin JWT, Smart Suggestions ✅
  - Converted modals.js to UMD+ESM dual-mode (fixed "export declarations" error)
  - Rewired admin panel to use flexicadAuth.getSupabaseClient() (no direct window.supabase)
  - Removed 470+ lines duplicate inline script from admin-controlpanel.html
  - Made Smart Suggestions interactive (click to append to prompt)
  - All pages use `defer` for CSP-safe script loading

---

Built with ❤️ using AI-powered development tools.
