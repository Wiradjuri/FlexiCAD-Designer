// AI Generator Page Enhancement - Phase 4.7.1
// Smart suggestions layout and post-generation behavior

(function() {
    'use strict';

    let outputCol, suggestions, generateBtn;
    
    function initializeAIPageEnhancements() {
        outputCol = document.getElementById('ai-output-col');
        suggestions = document.getElementById('ai-suggestions');
        
        // Find generate button (multiple possible selectors)
        generateBtn = document.querySelector('#generateBtn') || 
                     document.querySelector('#ai-input-col .btn-primary') ||
                     document.querySelector('button[type="submit"]') ||
                     document.querySelector('.btn:contains("Generate")');

        if (generateBtn) {
            setupGenerateButtonBehavior();
        }

        // Initialize suggestions in sticky position
        if (suggestions) {
            suggestions.classList.add('sticky');
            suggestions.dataset.position = 'sidebar';
        }
    }

    function relocateSuggestionsBelow() {
        if (!outputCol || !suggestions) return;
        
        if (suggestions.dataset.position !== 'below') {
            // Move suggestions after the output column
            outputCol.insertAdjacentElement('afterend', suggestions);
            suggestions.dataset.position = 'below';
            suggestions.classList.remove('sticky');
            
            console.log('📍 Suggestions relocated below output');
        }
    }

    function focusOutput() {
        if (outputCol) {
            outputCol.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            console.log('🎯 Auto-scrolled to output');
        }
    }

    function setupGenerateButtonBehavior() {
        // Store original click handler if exists
        const originalHandler = generateBtn.onclick;
        
        generateBtn.addEventListener('click', function(e) {
            console.log('🤖 Generate button clicked - setting up post-generation behavior');
            
            // Allow original generation logic to run first
            if (originalHandler) {
                originalHandler.call(this, e);
            }
            
            // Wait for generation to complete, then enhance UX
            setTimeout(() => {
                relocateSuggestionsBelow();
                focusOutput();
            }, 100); // Short delay to let generation start
            
            // Also check periodically in case generation takes longer
            const checkInterval = setInterval(() => {
                const outputContent = outputCol?.querySelector('textarea, pre, .generated-content, .code-output');
                if (outputContent && outputContent.textContent.trim()) {
                    clearInterval(checkInterval);
                    relocateSuggestionsBelow();
                    focusOutput();
                }
            }, 500);
            
            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(checkInterval), 10000);
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAIPageEnhancements);
    } else {
        initializeAIPageEnhancements();
    }

    // Also initialize after a short delay to catch dynamically loaded content
    setTimeout(initializeAIPageEnhancements, 100);

    // Expose functions for external use
    window.aiPageEnhancements = {
        relocateSuggestionsBelow,
        focusOutput,
        initializeAIPageEnhancements
    };

})();