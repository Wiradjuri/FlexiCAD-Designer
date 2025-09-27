# FlexiCAD Designer

An AI-powered web platform for creating OpenSCAD 3D designs with natural language prompts, featuring template management and user authentication.

## 🚀 Features

- **AI-Powered Generation**: Create OpenSCAD designs using natural language descriptions
- **Template Library**: Professional, ready-to-use 3D design templates
- **User Authentication**: Secure user accounts with Supabase auth
- **Design Management**: Save, organize, and share your designs
- **Dark Theme UI**: Modern, responsive dark theme interface
- **Cloud Storage**: Designs automatically saved to the cloud
- **Export Capabilities**: Download designs as .scad files
- **Real-time Collaboration**: Share and collaborate on designs

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Authentication**: Supabase Auth (email/password)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 for code generation
- **Hosting**: Netlify with serverless functions
- **Styling**: Custom dark theme CSS

## 📁 Project Structure

```bash
FlexiCAD-Designer/
├── public/                          # Frontend static files
│   ├── index.html                  # Login/register page
│   ├── home.html                   # Dashboard/welcome page
│   ├── about.html                  # About page
│   ├── ai.html                     # AI generator (protected)
│   ├── templates.html              # Template browser
│   ├── my-designs.html             # User designs (protected)
│   ├── css/
│   │   └── dark-theme.css          # Main stylesheet
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

### 5. Development Server

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Start development server
netlify dev
```

The app will be available at `http://localhost:8888`

## 🚀 Deployment

### Netlify Deployment

1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
3. Deploy settings:
   - Build command: (leave empty for static site)
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

### Manual Deployment

```bash
# Build and deploy
netlify deploy --prod
```

## 📚 Usage Guide

### For Users

1. **Registration**: Create an account at the homepage
2. **AI Generation**:
   - Go to "AI Generator"
   - Describe your design in detail
   - Review and customize generated OpenSCAD code
   - Save to your design library
3. **Templates**:
   - Browse the template library
   - View code and documentation
   - Download or customize templates
4. **Design Management**:
   - Access "My Designs" to view saved designs
   - Copy, download, or delete designs
   - Organize your design portfolio

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

---

Built with ❤️ using AI-powered development tools.
