# FlexiCAD Designer - Professional Parametric 3D Design Platform

[![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)](https://github.com/Wiradjuri/FlexiCAD-Designer)
[![Netlify Deploy](https://img.shields.io/badge/deploy-netlify-00c7b7)](https://netlify.com)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI%20GPT-412991)](https://openai.com)

> **🚀 Production Ready!** This application is fully prepared for production deployment with intelligent feature detection, security hardening, and performance optimizations.

A modern, production-ready SaaS web application that generates OpenSCAD code using AI. Built for professional CAD users, educators, and makers who need parametric 3D designs quickly and efficiently.

## ✅ Production Status

**Ready for immediate deployment** with the following features:

- 🎯 **AI Code Generation** - Fully functional with OpenAI integration
- 🔐 **Demo Mode** - Works without authentication for testing
- 💳 **Payment Processing** - Stripe integration ready
- 🛡️ **Security Hardened** - Headers, CSP, and vulnerability scanning
- ⚡ **Performance Optimized** - Caching, compression, and CDN ready
- 📱 **Mobile Responsive** - Works perfectly on all devices

**Quick Start for Production:**
```bash
npm run production-check  # Verify readiness
npm run build            # Generate production config
npm run deploy           # Deploy to Netlify
```

## 🚀 Features

- **AI-Powered Design Generation**: Describe your design and get professional OpenSCAD code instantly
- **Smart Clarification System**: AI asks intelligent questions for ambiguous requests
- **Extensive Template Library**: Pre-built parametric templates across multiple categories
- **Secure Authentication**: User management with Supabase Auth and JWT tokens
- **Subscription Management**: Flexible monthly ($10 AUD) or yearly ($50 AUD) plans via Stripe
- **Design Management**: Save, organize, and manage your AI-generated designs
- **Row Level Security**: Database isolation ensures users only see their own data
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real-time Validation**: OpenSCAD code validation and error detection

## 🛠 Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5 (Single Page Application)
- **Backend**: Netlify Functions (Node.js serverless)
- **Authentication**: Supabase Auth with JWT tokens
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Payments**: Stripe integration with webhooks
- **AI**: OpenAI GPT API for code generation
- **Hosting**: Netlify static hosting + serverless functions

## 📁 Project Structure

```
FlexiCAD-Designer/
├── landing_pages/           # Frontend pages and assets
│   ├── index.html          # Main landing page
│   ├── templates.html      # Template gallery
│   ├── ai.html            # AI design generator
│   ├── my-designs.html    # User dashboard
│   ├── login.html         # Authentication
│   └── config/config.js   # Frontend configuration
├── netlify/functions/      # Serverless backend functions
│   ├── generate-template.js    # AI code generation
│   ├── list-objects.js        # Template listing
│   ├── create-checkout-session.js # Stripe payments
│   ├── stripe-webhook.js      # Payment webhooks
│   ├── save-design.js         # Design persistence
│   └── get-templates.js       # Template management
├── objects/                # OpenSCAD template library
│   ├── index.json         # Template registry
│   ├── manifest.json      # Metadata index
│   └── [template-name]/   # Individual templates
│       ├── metadata.json  # Parameters & configuration
│       └── template.scad  # OpenSCAD implementation
├── ai-reference/           # AI training examples
│   ├── examples.json      # Reference code database
│   ├── Basics/           # Basic OpenSCAD examples
│   ├── Advanced/         # Complex implementations
│   └── Parametric/       # Parametric design patterns
├── database/              # Database setup and migrations
│   └── user-isolation-policy.sql # Row Level Security setup
├── supabase/              # Supabase configuration
│   └── config.toml        # Local development setup
└── scripts/               # Development utilities
    └── setup.js           # Environment setup script
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager
- Supabase account (for auth & database)
- OpenAI API key (for AI generation)
- Stripe account (for payments)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/FlexiCAD-Designer
   cd FlexiCAD-Designer
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

3. **Required environment variables**
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI Configuration  
   OPENAI_API_KEY=your_openai_api_key

   # Stripe Configuration
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

4. **Database setup**
   - Create a new Supabase project
   - Run SQL migrations from `database/user-isolation-policy.sql`
   - Enable Row Level Security for data isolation

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open `http://localhost:8888` in your browser
   - Register a new account to test functionality

### Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create designs table
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('monthly', 'yearly')),
  period_end TIMESTAMPTZ NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for designs
CREATE POLICY "Users can view own designs" ON designs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own designs" ON designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own designs" ON designs
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for subscriptions
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

### Installation & Development

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure the app:**
   Update `config/config.js` with your Supabase and Stripe keys.

3. **Start development server:**

   ```bash
   npm run dev
   ```

   This starts Netlify Dev at `http://localhost:8888`

4. **Alternative simple server:**

   ```bash
   npm run dev:simple
   ```

   This starts a basic HTTP server at `http://localhost:3000`

### Testing

Run the AI template tests:

```bash
# Make sure netlify dev is running first
npm run dev

# In another terminal:
node dev/tests/test-ai-templates.js
```

### Deployment

1. **Connect to Netlify:**

   ```bash
   netlify login
   netlify init
   ```

2. **Set environment variables in Netlify dashboard**

3. **Deploy:**

   ```bash
   npm run deploy
   ```

## API Documentation

### Generate Template

`POST /.netlify/functions/generate-template`

**Request:**

```json
{
  "description": "PlayStation 5 controller grips",
  "category": "gaming"
}
```

**Response (Design):**

```json
{
  "title": "PS5 Controller Grips",
  "description": "Ergonomic grips for PlayStation 5 DualSense controller",
  "code": "// OpenSCAD code here...",
  "filename": "ps5-controller-grips.scad",
  "features": ["Custom grip texture", "Easy installation"],
  "usage": "Print in TPU for best grip"
}
```

**Response (Clarification):**

```json
{
  "clarification_needed": true,
  "questions": ["Which iPhone model?", "Any camera cutouts needed?"],
  "suggestions": ["iPhone 15", "iPhone 14 Pro"]
}
```

### List Templates

`GET /.netlify/functions/list-objects`

**Response:**

```json
{
  "items": [
    {
      "slug": "phone-mount",
      "title": "Phone Mount",
      "description": "Adjustable phone holder",
      "category": "electronics",
      "tags": ["phone", "mount", "adjustable"]
    }
  ]
}
```

## Key Features Implementation

### AI Generation Logic

- **Known Accessories**: PS5 controller grips, DualSense grips → Generate immediately
- **Ambiguous Requests**: iPhone case, storage box → Request clarification
- **Complex Items**: Furniture, load-bearing → Ask dimensions and specifications

### Code Quality Validation

- Must contain `$fn`, `$fa`, or `$fs` parameters
- Must use modules and constructive geometry (difference, union, etc.)
- Must include non-cube primitives (cylinder, sphere)
- Rejects placeholder/TODO content
- Sanitizes escaped variables (`\$fn` → `$fn`)

### Authentication Flow

1. User registers with email/password and selects plan
2. Stripe payment processing
3. User account created in Supabase
4. Webhook updates subscription status
5. User can access protected features

### Access Control

- **Public**: Home page, template browsing
- **Login Required**: AI Generator, My Designs, template code viewing
- **Active Subscription**: AI Generation functionality

## Troubleshooting

### Common Issues

1. **Netlify Functions not working**: Ensure `.env` variables are set in Netlify dashboard
2. **Stripe webhook errors**: Verify webhook endpoint and secret in Stripe dashboard
3. **Supabase connection issues**: Check RLS policies and API keys
4. **Template loading errors**: Verify `objects/` directory structure

### Debug Mode

Enable debug logging by setting `localStorage.debug = 'flexicad:*'` in browser console.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
