# FlexiCAD Designer - Dark Theme Implementation

This document describes the dark theme implementation for the FlexiCAD Designer web application.

## Overview

The dark theme provides a modern, eye-friendly interface that can be toggled by users. It includes:

- **Comprehensive dark color palette** with proper contrast ratios
- **Light theme alternative** for user preference
- **Theme persistence** using localStorage  
- **Responsive design** that works across all screen sizes
- **Consistent styling** across all pages

## Files Structure

```
landing_pages/
├── css/
│   └── dark-theme.css          # Main theme stylesheet
├── js/
│   └── theme.js               # Theme management JavaScript
├── index.html                 # Login/register page
├── home.html                  # User dashboard
├── ai.html                    # AI code generator
├── templates.html             # Template browser
└── ...
```

## Color Palette

### Dark Theme (Default)
- **Backgrounds**: 
  - Primary: `#0e0f12` (main background)
  - Secondary: `#16181d` (cards, panels)
  - Tertiary: `#1a1d25` (hover states)
- **Text**:
  - Primary: `#e9eef6` (main text)
  - Secondary: `#a9b3c2` (subtext)
  - Muted: `#6b7280` (disabled/placeholder)
- **Brand**: `#4f8cff` (primary blue)
- **Status Colors**: Success (`#10b981`), Error (`#ff4f4f`), Warning (`#f59e0b`)

### Light Theme
- **Backgrounds**: White/light grays
- **Text**: Dark grays/black
- **Same brand and status colors** for consistency

## Features

### Theme Toggle
- **Button**: Located in navigation bar on all pages
- **Icons**: 🌙 for dark mode, ☀️ for light mode
- **Persistence**: User preference saved in localStorage
- **Auto-init**: Theme loads on page refresh

### CSS Custom Properties
All colors use CSS custom properties (variables) for easy theme switching:

```css
:root {
  --bg-primary: #0e0f12;
  --text-primary: #e9eef6;
  --brand-primary: #4f8cff;
  /* ... */
}

[data-theme="light"] {
  --bg-primary: #ffffff;
  --text-primary: #1e293b;
  /* ... */
}
```

### JavaScript API
The theme system provides several functions:

```javascript
toggleTheme()           // Switch between light/dark
setTheme('dark')       // Set specific theme
getCurrentTheme()      // Get current theme
initTheme()           // Initialize from localStorage
```

## Components Styled

### Navigation
- Dark header with subtle borders
- Hover effects on links
- Theme toggle button integrated

### Cards & Panels
- Consistent card styling across pages
- Subtle shadows and borders
- Hover animations

### Forms
- Dark input fields with proper focus states
- Styled buttons with hover effects
- Error/success message styling

### Modals
- Dark overlay backgrounds
- Styled content areas
- Proper contrast for readability

### Code Display
- Dark code backgrounds
- Syntax-friendly colors
- Monospace font consistency

## Browser Support

- **Modern browsers** (Chrome 60+, Firefox 55+, Safari 12+)
- **CSS custom properties** support required
- **localStorage** for theme persistence
- **Responsive design** for mobile devices

## Usage

### Adding Theme Support to New Pages

1. **Include the CSS and JS**:
```html
<link rel="stylesheet" href="css/dark-theme.css">
<script src="js/theme.js"></script>
```

2. **Add theme toggle to navigation**:
```html
<button onclick="toggleTheme()" class="theme-toggle">
  <span class="theme-toggle-icon" id="themeIcon">🌙</span>
  <span id="themeText">Dark</span>
</button>
```

3. **Use CSS custom properties**:
```css
.my-component {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-secondary);
}
```

### Customizing Colors

Edit the CSS custom properties in `css/dark-theme.css`:

```css
:root {
  --brand-primary: #your-color;
  /* Add or modify colors as needed */
}
```

## Accessibility

- **WCAG AA compliant** contrast ratios
- **Keyboard navigation** support
- **Screen reader friendly** with proper ARIA labels
- **Reduced motion** respect (no jarring animations)

## Performance

- **Single CSS file** for all theme styles
- **Minimal JavaScript** (~2KB)
- **CSS custom properties** for efficient switching
- **No external dependencies**

## Future Enhancements

- **Auto theme detection** based on system preferences
- **High contrast mode** for accessibility
- **Custom theme editor** for power users
- **Animation preferences** for reduced motion

## Contributing

When adding new components:

1. Use existing CSS custom properties
2. Test in both light and dark themes
3. Ensure proper contrast ratios
4. Follow the existing design patterns
5. Update this documentation if needed

## Troubleshooting

### Theme not switching
- Check that `theme.js` is loaded
- Verify localStorage is available
- Ensure CSS custom properties are supported

### Colors look wrong
- Check CSS custom property usage
- Verify theme attribute is set correctly
- Test in different browsers

### Styles not applying
- Confirm CSS file is loaded
- Check for CSS specificity issues
- Validate HTML structure matches expected classes