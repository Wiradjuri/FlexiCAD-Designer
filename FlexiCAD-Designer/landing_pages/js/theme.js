// FlexiCAD Designer - Theme Management
// This file handles theme switching between light and dark modes

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('flexicad-theme', newTheme);
  
  updateThemeToggle(newTheme);
  
  // Dispatch custom event for components that need to react to theme changes
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
}

/**
 * Update the theme toggle button appearance
 * @param {string} theme - The current theme ('light' or 'dark')
 */
function updateThemeToggle(theme) {
  const icon = document.getElementById('themeIcon');
  const text = document.getElementById('themeText');
  
  if (!icon || !text) return;
  
  if (theme === 'light') {
    icon.textContent = '☀️';
    text.textContent = 'Light';
  } else {
    icon.textContent = '🌙';
    text.textContent = 'Dark';
  }
}

/**
 * Initialize theme from localStorage or default to dark
 */
function initTheme() {
  const savedTheme = localStorage.getItem('flexicad-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeToggle(savedTheme);
}

/**
 * Get the current theme
 * @returns {string} Current theme ('light' or 'dark')
 */
function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

/**
 * Set a specific theme
 * @param {string} theme - Theme to set ('light' or 'dark')
 */
function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') {
    console.warn('Invalid theme. Use "light" or "dark"');
    return;
  }
  
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('flexicad-theme', theme);
  updateThemeToggle(theme);
  
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}

// Auto-initialize theme when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}

// Export functions for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toggleTheme,
    updateThemeToggle,
    initTheme,
    getCurrentTheme,
    setTheme
  };
}