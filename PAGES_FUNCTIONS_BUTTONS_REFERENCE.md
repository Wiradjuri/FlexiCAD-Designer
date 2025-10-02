# FlexiCAD Designer - Complete Page Functions & Buttons Reference

**Last Updated:** October 2, 2025  
**Phase:** 4.7.16 & 4.7.17 Complete  
**Status:** Production Ready

---

## Table of Contents

1. [Index/Login Page (index.html)](#1-indexlogin-page-indexhtml)
2. [AI Generator (ai.html)](#2-ai-generator-aihtml)
3. [My Designs (my-designs.html)](#3-my-designs-my-designshtml)
4. [Templates (templates.html)](#4-templates-templateshtml)
5. [Admin Control Panel (admin-controlpanel.html)](#5-admin-control-panel-admin-controlpanelhtml)
6. [Register/Payment (register.html)](#6-registerpayment-registerhtml)
7. [Payment Success (payment-success.html)](#7-payment-success-payment-successhtml)
8. [About Page (about.html)](#8-about-page-abouthtml)
9. [Shared Components](#9-shared-components)

---

## 1. Index/Login Page (index.html)

**Purpose:** Landing page with authentication forms and pricing display.

### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **Login Tab** | Tab Switch | `data-tab="login"` | Switches to login form view |
| **Register Tab** | Tab Switch | `data-tab="register"` | Switches to registration form view |
| **Sign In** | Submit | Form submit → `handleLogin()` | Authenticates user with email/password |
| **Create Account & Subscribe** | Submit | Form submit → `handleRegister()` | Creates account and redirects to payment |
| **Resend Confirmation Email** | Action | `resendConfirmation()` | Resends email verification link |
| **Monthly Plan Card** | Selection | `data-plan="monthly"` | Selects monthly subscription ($10/mo) |
| **Yearly Plan Card** | Selection | `data-plan="yearly"` | Selects yearly subscription ($100/yr) |

### Key Functions

#### `handleLogin(email, password)`
**Purpose:** Authenticates user and redirects to appropriate page  
**Actions:**
1. Calls `window.flexicadAuth.login(email, password)`
2. Checks user payment status
3. Redirects to `ai.html` if paid, or `payment.html` if unpaid
4. Shows error messages for invalid credentials

**Updated:** Phase 4.7.17 - Uses secure auth with sanitized logging

#### `handleRegister(email, password, promoCode)`
**Purpose:** Creates new user account and initiates payment flow  
**Actions:**
1. Validates password match
2. Checks if email already exists
3. Stores registration email in sessionStorage
4. Creates Stripe checkout session with promo code (if provided)
5. Redirects to Stripe payment page

**Updated:** Phase 4.7.16 - Supports promo code parameter

#### `checkAuthPeriodically()`
**Purpose:** Monitors authentication state every 5 seconds  
**Actions:**
1. Checks if user session is still valid
2. Redirects to login if session expired

#### `resendConfirmation(email)`
**Purpose:** Resends email verification  
**Actions:**
1. Calls `/.netlify/functions/auth-proxy` with action 'resend'
2. Shows success/error message
3. Disables button temporarily

---

## 2. AI Generator (ai.html)

**Purpose:** Main AI design generation interface with smart suggestions and real-time progress.

### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **Generate Design** | Submit | `generateDesign(event)` | Starts AI generation with SSE progress |
| **Suggestion Items** | Toggle | `handleSuggestionClick(item)` | Adds/removes design suggestions (multi-select) |
| **Context Tags** | Toggle | `setupContextTags()` | Toggles design context (functional, decorative, etc.) |
| **↑ Back to Prompt** | Scroll | `scrollToTop()` | Scrolls to top and focuses prompt textarea |
| **Copy Code** | Action | `copyOutputCode()` | Copies OpenSCAD code to clipboard |
| **Download .scad** | Action | `downloadSCAD()` | Downloads code as .scad file |
| **📦 Export STL** | Action | `showSTLExportModal()` | Opens STL export modal |
| **💾 Save Design** | Action | `saveDesign()` | Saves design to My Designs database |
| **🔄 Generate Another** | Action | `generateAnother()` | Resets form for new generation |
| **Enhancement Suggestions** | Action | `addEnhancement(text)` | Adds refinement to existing design |

### Key Functions

#### `generateDesign(event)`
**Purpose:** Main generation function with real-time SSE progress  
**Actions:**
1. Validates prompt input
2. Shows output panel and progress bar
3. Gets Supabase access token via `flexicadAuth.getSessionToken()`
4. Calls `generateWithSSE()` for streaming generation
5. Auto-scrolls to output panel

**Updated:** Phase 4.7.10 - Real SSE progress (not fake jumps)

#### `generateWithSSE(accessToken, prompt, designName)`
**Purpose:** Handles Server-Sent Events streaming for real-time progress  
**Actions:**
1. POST to `/.netlify/functions/generate-design-stream`
2. Streams progress events (10%, 30%, 60%, 100%)
3. Updates progress bar in real-time
4. Falls back to non-streaming if SSE fails
5. Displays generated OpenSCAD code

**Updated:** Phase 4.7.16 - Uses requireAuth with dev token support

**SSE Events:**
- `data: {pct: 10, note: "Starting..."}` - Progress update
- `data: {ok: true, code: "..."}` - Final result
- `data: {ok: false, error: "..."}` - Error

#### `handleSuggestionClick(item)`
**Purpose:** Multi-select suggestion system with confirmation modal  
**Actions:**
1. Toggles suggestion active state (+ icon becomes −)
2. Adds suggestion text to prompt
3. Tracks selected suggestions in Set
4. After first selection, asks "Add more suggestions?"
5. If user declines, scrolls to generate button

**Updated:** Phase 4.7.16 - Multi-select with follow-up confirmation

#### `updateProgress(percent)`
**Purpose:** Updates visual progress bar  
**Actions:**
1. Updates progress bar width (0-100%)
2. Updates percentage text
3. Animates smoothly with CSS transitions

#### `copyOutputCode()`
**Purpose:** Copies generated code to clipboard  
**Actions:**
1. Gets code from `#outputCode` element
2. Uses `navigator.clipboard.writeText()`
3. Shows "Copied!" feedback for 2 seconds

#### `downloadSCAD()`
**Purpose:** Downloads code as .scad file  
**Actions:**
1. Creates Blob with code content
2. Generates download link with proper filename
3. Triggers browser download
4. Cleans up blob URL

#### `showSTLExportModal()`
**Purpose:** Opens STL export interface  
**Actions:**
1. Calls `window.enhancedAI.showSTLExportModal()`
2. Passes current code and title
3. Opens modal for STL conversion parameters

#### `saveDesign()`
**Purpose:** Saves design to user's My Designs collection  
**Actions:**
1. Gets code, prompt, and design name
2. POST to Supabase `ai_designs` table
3. Shows success message
4. Links to My Designs page

**Status:** Implemented (saves to database)

#### `generateAnother()`
**Purpose:** Resets form for new generation  
**Actions:**
1. Clears form inputs
2. Hides output panel
3. Deselects all suggestions
4. Scrolls to top
5. Focuses prompt textarea

#### `relocateSuggestions()`
**Purpose:** Moves enhancement suggestions below output  
**Actions:**
1. Populates relocated suggestions section
2. Shows refinement options (add detail, make modular, etc.)
3. Makes section visible

#### `addEnhancement(enhancement)`
**Purpose:** Adds refinement text to existing prompt  
**Actions:**
1. Appends enhancement to current prompt
2. Adds comma separator if needed
3. User can regenerate with enhancement

#### `handleURLParameters()`
**Purpose:** Handles template wizard integration  
**Actions:**
1. Reads `?prompt=`, `?name=`, `?auto=` params
2. Pre-fills prompt and design name
3. Auto-runs generation if `auto=true`

**Updated:** Phase 4.7.11 - Template wizard integration

#### `getSelectedContexts()`
**Purpose:** Gets all active context tags  
**Returns:** Array of context strings (e.g., `['functional', 'modular']`)

#### `scrollToOutput()` / `scrollToTop()`
**Purpose:** Auto-scrolling for better UX  
**Actions:**
- `scrollToOutput()`: Smooth scroll to output panel
- `scrollToTop()`: Scroll to top and focus prompt

---

## 3. My Designs (my-designs.html)

**Purpose:** User's saved design library with view/copy/download/delete actions.

### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **🤖 Generate Design** | Link | Navigate to `ai.html` | Opens AI generator |
| **📚 Browse Templates** | Link | Navigate to `templates.html` | Opens template browser |
| **👁️ View** | Action | `viewDesign(designId)` | Opens design in modal | not showing anything when clicked
| **📋 Copy** | Action | `copyDesign(designId)` | Copies code to clipboard | doesnt work
| **⬇️ Download** | Action | `downloadDesign(designId)` | Downloads .scad file |
| **🗑️ Delete** | Action | `showDeleteConfirmation(designId)` | Opens delete confirmation modal |
| **Copy Code (Modal)** | Action | `copyModalCode()` | Copies code from modal |
| **Download (Modal)** | Action | `downloadModalCode()` | Downloads from modal |
| **🗑️ Delete (Modal)** | Action | `deleteCurrentDesign()` | Deletes current design |
| **Close (Modal)** | Action | `closeModal('designModal')` | Closes design view modal |
| **Cancel (Delete)** | Action | `closeModal('deleteModal')` | Cancels deletion |
| **Delete (Confirm)** | Action | `confirmDelete()` | Confirms and executes deletion |

### Key Functions

#### `initDesigns()`
**Purpose:** Initializes page with Supabase client  
**Actions:**
1. Gets shared Supabase client from `window.getSharedSupabaseClient()`
2. Initializes auth if needed
3. Calls `loadDesigns()`

#### `loadDesigns()`
**Purpose:** Fetches user's designs from database  
**Actions:**
1. Shows loading spinner
2. Gets current user from Supabase auth
3. Queries `ai_designs` table filtered by `user_id`
4. Orders by `created_at` descending
5. Calls `displayDesigns()` or `showEmpty()`

**Updated:** Phase 4.7.17 - Uses secure Supabase client

#### `displayDesigns()`
**Purpose:** Renders design cards in grid  
**Actions:**
1. Creates card HTML for each design
2. Shows code preview (first 100 chars)
3. Displays creation date
4. Adds action buttons
5. Uses `escapeHtml()` for XSS protection

#### `viewDesign(designId)`
**Purpose:** Opens design in modal for full view  
**Actions:**
1. Finds design by ID in array
2. Populates modal with title, prompt, code
3. Sets current design reference
4. Shows modal with `showModal('designModal')`

#### `copyDesign(designId)`
**Purpose:** Copies design code to clipboard  
**Actions:**
1. Finds design by ID
2. Uses `navigator.clipboard.writeText()`
3. Shows "✅ Copied!" feedback
4. Resets button text after 2 seconds

#### `downloadDesign(designId)`
**Purpose:** Downloads design as .scad file  
**Actions:**
1. Finds design by ID
2. Creates filename from design name (kebab-case)
3. Creates Blob and download link
4. Triggers browser download

#### `showDeleteConfirmation(designId)`
**Purpose:** Opens delete confirmation modal  
**Actions:**
1. Finds design by ID
2. Sets `designToDelete` reference
3. Shows design name in confirmation
4. Opens delete modal

#### `confirmDelete()`
**Purpose:** Deletes design from database  
**Actions:**
1. DELETE from `ai_designs` table
2. Removes from local array
3. Re-renders grid
4. Closes modal
5. Shows error if failed

#### `deleteCurrentDesign()`
**Purpose:** Deletes from view modal  
**Actions:**
1. Closes design modal
2. Opens delete confirmation
3. Passes current design ID

#### `copyModalCode()` / `downloadModalCode()`
**Purpose:** Actions from design view modal  not working
**Actions:**
- Copies/downloads current design
- Uses `currentDesign` reference

#### `showModal(modalId)` / `closeModal(modalId)`
**Purpose:** Modal visibility management  
**Actions:**
- Adds/removes `active` class
- Clears current references on close

#### `escapeHtml(unsafe)`
**Purpose:** XSS protection for user-generated content  
**Actions:**
1. Escapes `&`, `<`, `>`, `"`, `'`
2. Returns safe HTML string

#### `checkAuthPeriodically()`
**Purpose:** Session monitoring every 5 seconds  
**Actions:**
1. Checks `flexicadAuth.getUser()`
2. Redirects to login if session lost

---

## 4. Templates (templates.html)

**Purpose:** Browse and use pre-made parametric templates with wizard interface.
nothing working on this page cant see code no questions appear for user when they click create 
### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **🛠️ Use Template** | Action | `openTemplateWizard(templateId)` | Opens parametric wizard |
| **👁️ View Code** | Action | `viewCode(templateId)` | Shows template source code | not working nil shown
| **⬇️ Download** | Action | `downloadTemplate(templateId)` | Downloads .scad file |
| **ℹ️ README** | Action | `viewReadme(templateId)` | Shows template documentation |
| **Copy Code (Modal)** | Action | `copyCode()` | Copies template code |
| **Download (Modal)** | Action | `downloadCurrentTemplate()` | Downloads from modal |
| **Close (Modals)** | Action | `closeModal(modalId)` | Closes code/readme modal |

### Key Functions

#### `loadTemplates()`
**Purpose:** Loads template library from storage  
**Actions:**
1. First tries `/.netlify/functions/list-objects` (Supabase Storage)
2. Falls back to static `templates/manifest.json`
3. Calls `displayTemplates()`

**Updated:** Phase 4.4.3 - Supabase Storage integration

#### `displayTemplates(templateList)`
**Purpose:** Renders template cards  
**Actions:**
1. Creates card for each template
2. Shows template name, description, category
3. Adds action buttons
4. Sorts by category

#### `openTemplateWizard(templateId)`
**Purpose:** Opens parametric template wizard  
**Actions:**
1. Validates template ID
2. Navigates to `template-wizard.html?id={templateId}`
3. Wizard shows parameter form and live preview

**Updated:** Phase 4.7.11 - Fixed blank modal issue

**How Wizard Works:**
1. User selects template
2. Wizard shows parameter inputs (dimensions, options)
3. Live preview updates as user types
4. User can generate with AI or download directly

#### `viewCode(templateId)`
**Purpose:** Shows template source code in modal  
**Actions:**
1. Fetches `templates/{templateId}/template.scad`
2. Falls back to `list-objects` function
3. Displays code in modal
4. Shows filename for download

#### `viewReadme(templateId)`
**Purpose:** Shows template documentation  
**Actions:**
1. Fetches `templates/{templateId}/README.md`
2. Parses Markdown with `marked.parse()`
3. Displays as HTML in modal
4. Falls back to default text if missing

#### `downloadTemplate(templateId)`
**Purpose:** Downloads template source  
**Actions:**
1. Fetches template code
2. Creates filename from template name
3. Downloads as .scad file

#### `downloadCurrentTemplate()`
**Purpose:** Downloads from code modal  
**Actions:**
1. Uses `currentTemplate` reference
2. Calls `downloadTemplate()`

#### `copyCode()`
**Purpose:** Copies template code from modal  
**Actions:**
1. Gets code from `#codeContent`
2. Uses `navigator.clipboard.writeText()`
3. Falls back to `fallbackCopy()` for older browsers
4. Shows "Copied!" feedback

#### `fallbackCopy(text)`
**Purpose:** Clipboard copy for older browsers  
**Actions:**
1. Creates temporary textarea
2. Selects text
3. Executes `document.execCommand('copy')`
4. Removes textarea

#### `showCopyFeedback()`
**Purpose:** Visual feedback for copy action  
**Actions:**
1. Changes button text to "Copied!"
2. Resets after 2 seconds

---

## 5. Admin Control Panel (admin-controlpanel.html)
cant gain access instead of a admin email can we create a seperate page thats off the main one that requires login in password with some sort of extra security
**Purpose:** Admin-only interface for system monitoring and management.

### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **View Promo Codes** | Link | Navigate to `manage-promo.html` | Opens promo code manager |
| **View User Analytics** | Action | `loadUserAnalytics()` | Shows user stats dashboard |
| **System Health Check** | Action | `checkSystemHealth()` | Tests all integrations |
| **View Logs** | Action | `viewSystemLogs()` | Shows recent error logs |
| **Clear Cache** | Action | `clearSystemCache()` | Clears server cache |

### Key Functions

#### Admin Gate
**Purpose:** Restricts access to admin users only  
**Actions:**
1. Checks if user email in `ADMIN_EMAILS` env var
2. Calls `/.netlify/functions/admin-health` to verify
3. Redirects non-admins to home page

**Updated:** Phase 4.7.16 - Uses requireAdmin with dev token support

#### `checkSystemHealth()`
**Purpose:** Monitors all system integrations  
**Actions:**
1. Tests Supabase connection
2. Tests OpenAI API
3. Tests Stripe API
4. Shows status indicators (green/red dots)

**Updated:** Phase 4.7.17 - Simplified endpoint (removed Stripe/OpenAI checks)

#### `loadUserAnalytics()`
**Purpose:** Shows user statistics  
**Actions:**
1. Queries Supabase for user counts
2. Shows active subscriptions
3. Shows design generation counts
4. Displays in stat cards

#### Badge Verification
**Purpose:** Shows admin badge in navbar  
**Actions:**
1. Calls `verifyAdminAndToggleBadge()` on load
2. Uses real Supabase session token
3. Calls `admin-health` endpoint
4. Shows/hides badge based on response

**Updated:** Phase 4.7.16 - Added to navbar-manager.js

---

## 6. Register/Payment (register.html)

**Purpose:** Combined registration and payment flow with promo code support.

### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **Login Tab** | Tab Switch | `data-tab="login"` | Switches to login form |
| **Register Tab** | Tab Switch | `data-tab="register"` | Switches to register form |
| **Sign In** | Submit | Form submit → Login flow | Authenticates existing user |
| **Create Account & Subscribe** | Submit | Form submit → Registration | Creates account + Stripe checkout |
| **Monthly Plan Card** | Selection | `data-plan="monthly"` | Selects monthly plan ($10/mo) |
| **Yearly Plan Card** | Selection | `data-plan="yearly"` | Selects yearly plan ($100/yr) |
| **Resend Confirmation** | Action | `resendConfirmation()` | Resends verification email |

### Key Functions

#### Registration Flow
**Purpose:** Complete registration and payment process  
**Actions:**
1. User enters email, password, promo code (optional)
2. Form validates password match
3. Checks if email already exists
4. Stores email in sessionStorage
5. Creates Stripe checkout session
6. Redirects to Stripe payment page
7. After payment, Stripe webhook creates account
8. User redirected to payment-success page

**Updated:** Phase 4.7.16 - Promo code support

#### `handleRegister()`
**Purpose:** Creates checkout session with promo code  
**Actions:**
1. Validates inputs
2. Checks existing profile
3. POST to `/.netlify/functions/create-checkout-session`
4. Includes promo code in request body
5. Redirects to Stripe checkout URL

**Request Body:**
```javascript
{
  email: "user@example.com",
  plan: "monthly",
  promoCode: "WELCOME50" // optional
}
```

#### `handleLogin()`
**Purpose:** Authenticates user and checks payment  
**Actions:**
1. Calls `flexicadAuth.login()`
2. Checks payment status
3. Redirects to `ai.html` if paid
4. Redirects to `payment.html` if unpaid

#### `setLoadingState(button, loading, customText)`
**Purpose:** Button loading animation  
**Actions:**
1. Shows/hides spinner
2. Changes button text
3. Disables button during loading

#### `showMessage(message, type)`
**Purpose:** Displays success/error messages  
**Actions:**
1. Shows message div with color coding
2. Auto-hides after 5 seconds
3. Types: success (green), error (red), warning (yellow)

#### `showResendButton(email)`
**Purpose:** Shows email resend option  
**Actions:**
1. Displays resend section
2. Attaches click handler
3. Calls auth-proxy resend action

---

## 7. Payment Success (payment-success.html)

**Purpose:** Post-payment confirmation and account creation verification.

### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **Continue to AI Generator** | Link | Navigate to `ai.html` | Opens AI generator after account ready |
| **View My Designs** | Link | Navigate to `my-designs.html` | Opens design library |

### Key Functions

#### `checkWebhookAccountCreation()`
**Purpose:** Polls for webhook account creation  
**Actions:**
1. Runs every 5 seconds (max 20 attempts = 100 seconds)
2. Checks if Supabase profile created
3. Gets registration email from sessionStorage
4. POST to `/.netlify/functions/check-database?type=payment_first_validation`
5. Shows success or error message

**Updated:** Phase 4.4.3 - Webhook verification system

**Flow:**
1. User completes Stripe payment
2. Stripe sends webhook to server
3. Webhook creates Supabase account
4. This page polls until account found
5. Shows "Account Created" message
6. Enables continue buttons

#### `showAccountCreated(email)`
**Purpose:** Shows success state  
**Actions:**
1. Hides loading spinner
2. Shows success message with email
3. Enables navigation buttons

#### `showError(message)`
**Purpose:** Shows error state  
**Actions:**
1. Hides loading spinner
2. Shows error message
3. Provides retry link

---

## 8. About Page (about.html)

**Purpose:** Information about FlexiCAD Designer features and team.

### Buttons & Their Actions

| Button | Type | onClick Function | Purpose |
|--------|------|------------------|---------|
| **Get Started** | Link | Navigate to `register.html` | Opens registration |
| **Try AI Generator** | Link | Navigate to `ai.html` | Opens AI tool (requires login) |
| **Browse Templates** | Link | Navigate to `templates.html` | Opens template library |
| **View Documentation** | Link | External link | Opens docs site |

### Key Functions

**No interactive JavaScript functions** - Static content page with navigation links only.

---

## 9. Shared Components

### Navigation Bar (navbar-manager.js)

**Purpose:** Global navigation with user menu and admin badge.

#### Functions

##### `verifyAdminAndToggleBadge()`
**Purpose:** Shows/hides admin badge based on user role  
**Actions:**
1. Initializes `flexicadAuth`
2. Gets Supabase session token
3. Calls `/.netlify/functions/admin-health`
4. Shows badge if 200 response
5. Hides badge if non-200 response
6. Runs on DOMContentLoaded

**Updated:** Phase 4.7.16 - Added for admin gate

##### `handleLogout()`
**Purpose:** Logs out user  
**Actions:**
1. Calls `flexicadAuth.logout()`
2. Clears session storage
3. Redirects to login page

### Authentication (flexicad-auth.js)

**Purpose:** Centralized authentication system with Supabase.

#### Key Functions

##### `init()`
**Purpose:** Initializes Supabase client  
**Returns:** Supabase client instance

##### `login(email, password)`
**Purpose:** Authenticates user  
**Actions:**
1. Calls `supabaseClient.auth.signInWithPassword()`
2. Stores session
3. Returns `{ ok: true, user }` or `{ ok: false, error }`

##### `requireAuth()`
**Purpose:** Gate for protected pages  
**Actions:**
1. Checks if user logged in
2. Checks payment status
3. Redirects to appropriate page if needed
4. Returns true if user has access

**Updated:** Phase 4.7.16 - Payment-first flow enforced

##### `getSessionToken()`
**Purpose:** Gets current Supabase JWT  
**Returns:** Access token string for API calls

**Updated:** Phase 4.7.16 - Used by SSE endpoint

##### `logout()`
**Purpose:** Signs out user  
**Actions:**
1. Calls `supabaseClient.auth.signOut()`
2. Clears storage
3. Redirects to login

### STL Exporter (stl-exporter.js)

**Purpose:** Converts OpenSCAD code to STL files.

#### Functions

##### `showSTLExportModal(code, designName)`
**Purpose:** Opens STL export interface  
**Actions:**
1. Shows modal with resolution options
2. Previews estimated file size
3. Provides quality presets (Draft, Standard, High Quality)

##### `exportToSTL(code, resolution)`
**Purpose:** Generates STL file  
**Actions:**
1. POST to `/.netlify/functions/convert-to-stl`
2. Includes code and resolution parameters
3. Downloads resulting STL file
4. Shows progress indicator

**Status:** Ready for implementation (backend endpoint needed)

---

## Summary of Recent Updates

### Phase 4.7.16 (Dev Tokens & Admin Gate)
- ✅ Added dev token support for local testing
- ✅ Fixed admin-health endpoint import path
- ✅ Added `verifyAdminAndToggleBadge()` to navbar
- ✅ Template wizard integration with URL parameters

### Phase 4.7.17 (Security Hardening)
- ✅ Fixed duplicate auth functions
- ✅ Added environment validation
- ✅ Sanitized logging (hide sensitive data)
- ✅ Production log guards

### Phase 4.7.10 (SSE Progress)
- ✅ Real Server-Sent Events for AI generation
- ✅ Smooth progress bar (10→30→60→100%)
- ✅ Fallback to non-streaming if SSE fails

### Phase 4.7.11 (Multi-Select Suggestions)
- ✅ Multi-select suggestions with confirmation modal
- ✅ "Add more suggestions?" prompt after first selection
- ✅ Enhanced user experience

### Phase 4.4.3 (Template System)
- ✅ Template wizard with parametric inputs
- ✅ Supabase Storage integration
- ✅ Fixed blank modal issue

---

## Function Call Flow Diagrams

### AI Generation Flow
```
User clicks "Generate Design"
    ↓
generateDesign(event)
    ↓
flexicadAuth.getSessionToken()
    ↓
generateWithSSE(token, prompt, name)
    ↓
POST /.netlify/functions/generate-design-stream
    ↓
requireAuth(event) [Server]
    ↓
DEV_BEARER_TOKEN check (dev only) OR Supabase JWT validation
    ↓
OpenAI API call with streaming
    ↓
SSE events sent to client:
  - data: {pct: 10, note: "Starting..."}
  - data: {pct: 30, note: "Processing..."}
  - data: {pct: 60, note: "Generating code..."}
  - data: {ok: true, code: "..."}
    ↓
updateProgress(pct) for each event
    ↓
Display final code in output panel
```

### Login Flow
```
User submits login form
    ↓
handleLogin(email, password)
    ↓
flexicadAuth.login(email, password)
    ↓
Supabase signInWithPassword()
    ↓
Check payment status in user_profiles table
    ↓
If paid: Redirect to ai.html
If unpaid: Redirect to payment.html
If error: Show error message
```

### Registration Flow
```
User submits register form
    ↓
handleRegister(email, password, promoCode)
    ↓
Validate password match
    ↓
Store email in sessionStorage
    ↓
POST /.netlify/functions/create-checkout-session
    ↓
Create Stripe checkout session with promo code
    ↓
Redirect to Stripe payment page
    ↓
User completes payment
    ↓
Stripe webhook triggers
    ↓
Server creates Supabase account
    ↓
User redirected to payment-success.html
    ↓
checkWebhookAccountCreation() polls database
    ↓
Account found → Enable continue buttons
```

### Template Wizard Flow
```
User clicks "Use Template"
    ↓
openTemplateWizard(templateId)
    ↓
Navigate to template-wizard.html?id={id}
    ↓
Wizard loads template manifest
    ↓
Shows parameter form (dimensions, options)
    ↓
User adjusts parameters
    ↓
Live preview updates (if available)
    ↓
User clicks "Generate with AI"
    ↓
Construct prompt from parameters
    ↓
Navigate to ai.html?prompt={...}&auto=true
    ↓
AI generator auto-runs
```

---

## Testing Checklist

### AI Generator
- [ ] Generate design with prompt
- [ ] Select multiple suggestions
- [ ] Verify "Add more?" confirmation appears
- [ ] Check SSE progress updates smoothly
- [ ] Copy code to clipboard
- [ ] Download .scad file
- [ ] Save design to My Designs
- [ ] Generate another (reset form)

### My Designs
- [ ] View design in modal
- [ ] Copy code from card
- [ ] Copy code from modal
- [ ] Download from card
- [ ] Download from modal
- [ ] Delete design with confirmation
- [ ] Cancel deletion

### Templates
- [ ] View template code
- [ ] View template README
- [ ] Download template
- [ ] Open template wizard
- [ ] Wizard redirects to AI generator

### Admin Panel
- [ ] Admin badge shows for admin users
- [ ] Admin badge hidden for non-admin users
- [ ] System health check works
- [ ] All admin pages restricted

### Authentication
- [ ] Login works with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Registration creates checkout session
- [ ] Payment success polls for account
- [ ] Logout clears session
- [ ] Protected pages redirect if not authenticated

---

## Environment Variables Reference

### Required for All Endpoints

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### Dev Tokens (Phase 4.7.16)

```bash
# Only active when APP_ENV=development
APP_ENV=development
DEV_BEARER_TOKEN=eyJ... (real Supabase JWT)
DEV_ADMIN_TOKEN=eyJ... (real Supabase JWT)
```

---

## API Endpoints Reference

### Authentication
- `POST /.netlify/functions/auth-proxy` - Login, register, resend
- `GET /.netlify/functions/admin-health` - Admin verification

### AI Generation
- `POST /.netlify/functions/generate-design-stream` - SSE generation
- `POST /.netlify/functions/generate-template` - Non-streaming fallback

### Templates
- `GET /.netlify/functions/list-objects` - Template library

### Payment
- `POST /.netlify/functions/create-checkout-session` - Stripe checkout
- `POST /.netlify/functions/stripe-webhook` - Payment webhook
- `GET /.netlify/functions/check-database` - Verification polling

### STL Export
- `POST /.netlify/functions/convert-to-stl` - STL conversion (planned)

---

**End of Reference Document**
