// Generator UI Controller - Phase 4.7.18
// Handles smart suggestions with detail capture for AI generator

console.log('[Generator UI] Controller loaded');

/**
 * Initialize Smart Suggestions click handlers
 * Makes suggestion chips interactive - clicking toggles selection
 * and may prompt for details if needed
 */
function initSmartSuggestions() {
    const suggestionItems = document.querySelectorAll('.suggestion-item[data-text]');
    const promptTextarea = document.getElementById('designPrompt') || document.getElementById('promptInput');
    
    if (!suggestionItems.length || !promptTextarea) {
        console.warn('[Generator UI] Smart Suggestions or prompt textarea not found');
        return;
    }
    
    // Ensure handleSuggestionClick is available globally (defined in ai.html main script)
    if (typeof window.handleSuggestionClick === 'function') {
        console.log(`[Generator UI] Using global handleSuggestionClick for ${suggestionItems.length} suggestions`);
        return; // Already wired up
    }
    
    // Fallback: simple click handler (no detail capture)
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
            item.classList.toggle('active');
            
            // Focus textarea
            promptTextarea.focus();
            
            // Toast notification
            if (window.FCModals && window.FCModals.toast) {
                window.FCModals.toast(`Added: ${suggestionText}`, 'success');
            }
        });
    });
    
    console.log(`[Generator UI] Initialized ${suggestionItems.length} smart suggestions (fallback mode)`);
}

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmartSuggestions);
} else {
    initSmartSuggestions();
}
