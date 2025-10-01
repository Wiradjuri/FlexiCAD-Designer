// Generator UI Controller - Phase 4.7.9
// Handles progress tracking and layout management for AI generator

console.log('[Generator UI] Controller loaded');

// Progress tracking system already implemented inline in ai.html
// This file exists for future enhancements and organization

/**
 * Initialize Smart Suggestions click handlers
 * Makes suggestion chips interactive - clicking appends text to prompt
 */
function initSmartSuggestions() {
    const suggestionItems = document.querySelectorAll('.suggestion-item[data-text]');
    const promptTextarea = document.getElementById('promptInput');
    
    if (!suggestionItems.length || !promptTextarea) {
        console.warn('[Generator UI] Smart Suggestions or prompt textarea not found');
        return;
    }
    
    suggestionItems.forEach(item => {
        item.addEventListener('click', () => {
            const suggestionText = item.getAttribute('data-text');
            if (!suggestionText) return;
            
            const currentPrompt = promptTextarea.value.trim();
            
            // Append with proper spacing
            if (currentPrompt) {
                promptTextarea.value = currentPrompt + ' ' + suggestionText;
            } else {
                promptTextarea.value = suggestionText;
            }
            
            // Visual feedback
            item.classList.add('active');
            setTimeout(() => item.classList.remove('active'), 300);
            
            // Focus textarea
            promptTextarea.focus();
            
            // Toast notification
            if (window.FCModals && window.FCModals.toast) {
                window.FCModals.toast(`Added: ${suggestionText}`, 'success');
            }
        });
    });
    
    console.log(`[Generator UI] Initialized ${suggestionItems.length} smart suggestions`);
}

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmartSuggestions);
} else {
    initSmartSuggestions();
}
