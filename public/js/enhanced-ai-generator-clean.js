// Enhanced AI Generator - Phase 4.6/4.7 with Smart Suggestions
// This integrates with the modal system for better UX

class EnhancedAIGenerator {
    constructor() {
        this.activeSuggestions = new Set();
        this.init();
    }

    init() {
        this.setupSuggestionInteractions();
        this.setupSmartPromptAnalysis();
    }

    setupSuggestionInteractions() {
        // Handle suggestion clicks (already set up in ai.html template)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.suggestion-item')) {
                this.handleSuggestionClick(e.target.closest('.suggestion-item'));
            }
        });

        // Setup prompt analysis
        const promptTextarea = document.getElementById('designPrompt');
        if (promptTextarea) {
            let timeoutId;
            promptTextarea.addEventListener('input', (e) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    this.analyzePrompt(e.target.value);
                }, 500);
            });
        }
    }

    handleSuggestionClick(suggestionItem) {
        const text = suggestionItem.dataset.text;
        if (!text) return;

        const isActive = suggestionItem.classList.contains('active');
        
        if (isActive) {
            // Remove suggestion
            suggestionItem.classList.remove('active');
            const iconEl = suggestionItem.querySelector('.suggestion-icon');
            if (iconEl) iconEl.textContent = '+';
            this.activeSuggestions.delete(text);
            this.removeSuggestionFromPrompt(text);
        } else {
            // Add suggestion
            suggestionItem.classList.add('active');
            const iconEl = suggestionItem.querySelector('.suggestion-icon');
            if (iconEl) iconEl.textContent = '✓';
            this.activeSuggestions.add(text);
            this.addSuggestionToPrompt(text);
        }
    }

    addSuggestionToPrompt(suggestionText) {
        const promptTextarea = document.getElementById('designPrompt');
        if (!promptTextarea) return;

        let currentPrompt = promptTextarea.value.trim();
        
        // Check if prompt already contains this suggestion
        if (!currentPrompt.toLowerCase().includes(suggestionText.toLowerCase())) {
            if (currentPrompt) {
                currentPrompt += ' ' + suggestionText;
            } else {
                currentPrompt = suggestionText;
            }
            
            promptTextarea.value = currentPrompt;
            promptTextarea.focus();
            
            // Trigger input event
            promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    removeSuggestionFromPrompt(suggestionText) {
        const promptTextarea = document.getElementById('designPrompt');
        if (!promptTextarea) return;

        let currentPrompt = promptTextarea.value;
        
        // Remove the suggestion text (case-insensitive)
        const regex = new RegExp('\\s*' + suggestionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'gi');
        currentPrompt = currentPrompt.replace(regex, ' ').trim();
        
        promptTextarea.value = currentPrompt;
        promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setupSmartPromptAnalysis() {
        this.analyzePrompt = (prompt) => {
            if (!prompt) {
                this.resetSuggestionHighlights();
                return;
            }

            const keywords = {
                dimensions: ['size', 'dimension', 'mm', 'cm', 'inch', 'large', 'small', 'parametric', 'scale'],
                features: ['hole', 'mounting', 'ventilation', 'lid', 'removable', 'rounded', 'corner'],
                materials: ['PLA', 'PETG', 'TPU', 'print', 'support', 'infill', '3d printing'],
                advanced: ['hinge', 'threaded', 'snap', 'interlock', 'magnetic', 'joint']
            };

            this.resetSuggestionHighlights();
            
            const lowerPrompt = prompt.toLowerCase();
            
            Object.entries(keywords).forEach(([category, words]) => {
                const hasKeyword = words.some(word => lowerPrompt.includes(word.toLowerCase()));
                if (hasKeyword) {
                    this.highlightCategory(category);
                }
            });
        };
    }

    resetSuggestionHighlights() {
        document.querySelectorAll('.suggestion-category').forEach(cat => {
            cat.classList.remove('highlighted');
        });
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.classList.remove('recommended');
        });
    }

    highlightCategory(category) {
        const categoryEl = document.querySelector(`[data-category="${category}"]`);
        if (categoryEl) {
            categoryEl.classList.add('highlighted');
            
            // Highlight suggestions in this category
            const items = categoryEl.querySelectorAll('.suggestion-item');
            items.forEach((item, index) => {
                if (index < 3) { // Highlight first 3 items
                    item.classList.add('recommended');
                }
            });
        }
    }

    // Export active suggestions for enhanced generation
    getEnhancedPrompt(originalPrompt) {
        const suggestions = Array.from(this.activeSuggestions);
        if (suggestions.length === 0) return originalPrompt;
        
        return originalPrompt + (originalPrompt ? ' ' : '') + suggestions.join(' ');
    }

    // Show STL export modal - Phase 4.6.1 with auth check
    showSTLExportModal(scadCode, designTitle) {
        // Check authentication first
        if (!window.flexicadAuth?.user) {
            alert('Please log in to export STL files.');
            return;
        }
        
        if (!window.showModal) {
            alert('STL export is being prepared...');
            return;
        }

        const modalHTML = `
            <div class="stl-export-container">
                <h3>Export to STL</h3>
                <p>Generate a 3D-printable STL file from your OpenSCAD code.</p>
                
                <!-- OpenSCAD Access Section -->
                <div class="openscad-access" style="margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                        <h4>OpenSCAD Source Code</h4>
                        <button class="btn btn-secondary btn-small" onclick="enhancedAI.downloadSCAD('${designTitle || 'design'}')">
                            📥 Download .scad
                        </button>
                    </div>
                    <details>
                        <summary style="cursor: pointer; color: var(--accent-blue);">View/Edit Source Code</summary>
                        <textarea readonly style="width: 100%; height: 200px; margin-top: 0.5rem; font-family: monospace; font-size: 0.8rem;">${scadCode}</textarea>
                    </details>
                </div>
                
                <div class="export-options">
                    <div class="form-group">
                        <label class="form-label">STL Resolution Quality</label>
                        <select id="stl-resolution" class="form-select">
                            <option value="low">Low (Fast) - $fa=12, $fs=2</option>
                            <option value="medium" selected>Medium (Balanced) - $fa=6, $fs=1</option>
                            <option value="high">High (Detailed) - $fa=3, $fs=0.5</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">STL File Name</label>
                        <input type="text" id="stl-filename" class="form-input" 
                               value="${designTitle || 'flexicad-design'}" placeholder="Enter filename">
                    </div>
                </div>
                
                <div class="export-actions">
                    <button class="btn btn-secondary" onclick="window.hideModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="enhancedAI.processSTLExport()">
                        🔄 Generate STL
                    </button>
                </div>
            </div>
        `;

        // Store SCAD code for export
        this.currentSCADCode = scadCode;
        
        window.showModal(modalHTML);
    }

    async processSTLExport() {
        const resolution = document.getElementById('stl-resolution')?.value || 'medium';
        const filename = document.getElementById('stl-filename')?.value || 'flexicad-design';
        
        try {
            // Show loading
            const exportBtn = document.querySelector('.export-actions .btn-primary');
            if (exportBtn) {
                exportBtn.textContent = 'Generating...';
                exportBtn.disabled = true;
            }

            const response = await fetch('/.netlify/functions/export-stl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scadCode: this.currentSCADCode,
                    resolution,
                    filename
                })
            });

            if (!response.ok) {
                throw new Error('STL export failed');
            }

            // Download the STL file
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename.endsWith('.stl') ? filename : filename + '.stl';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            window.hideModal();
            
            // Show success message
            alert('STL file downloaded successfully!');

        } catch (error) {
            console.error('STL export error:', error);
            alert('Failed to export STL: ' + error.message);
        }
    }

    // Download SCAD file directly
    downloadSCAD(filename) {
        try {
            const scadCode = this.currentSCADCode || document.getElementById('output-panel')?.textContent;
            
            if (!scadCode) {
                alert('No OpenSCAD code available for download');
                return;
            }
            
            // Create and download the .scad file
            const blob = new Blob([scadCode], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename.endsWith('.scad') ? filename : filename + '.scad';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('SCAD download error:', error);
            alert('Failed to download OpenSCAD file');
        }
    }

    // Format category names for display
    formatCategoryName(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
}

// Initialize enhanced AI generator
let enhancedAI;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('designPrompt')) {
        enhancedAI = new EnhancedAIGenerator();
        
        // Make it globally available
        window.enhancedAI = enhancedAI;
        
        // Phase 4.6.1: Enhanced generation with format handling
        const originalGenerate = window.generateDesign;
        if (originalGenerate) {
            window.generateDesign = async function() {
                // Enhance prompt before generation
                const promptEl = document.getElementById('designPrompt');
                const formatRadios = document.querySelectorAll('input[name="outputFormat"]');
                const selectedFormat = Array.from(formatRadios).find(r => r.checked)?.value || 'scad';
                
                if (promptEl && enhancedAI) {
                    const enhanced = enhancedAI.getEnhancedPrompt(promptEl.value);
                    if (enhanced !== promptEl.value) {
                        console.log('Enhanced prompt:', enhanced);
                        // Temporarily update prompt for generation
                        const original = promptEl.value;
                        promptEl.value = enhanced;
                    }
                }
                
                // Call original generation
                const result = await originalGenerate.apply(this, arguments);
                
                // Phase 4.6.1: Handle STL format after successful generation
                if (selectedFormat === 'stl' && result && window.generatedCode) {
                    const designName = document.getElementById('designName')?.value || 'AI Generated Design';
                    enhancedAI.showSTLExportModal(window.generatedCode, designName);
                }
                
                // Auto-focus output panel and move suggestions below
                setTimeout(() => {
                    const outputSection = document.getElementById('resultSection');
                    const suggestionsEl = document.getElementById('ai-suggestions');
                    
                    if (outputSection && !outputSection.classList.contains('hidden')) {
                        outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        
                        // Move suggestions below output on mobile
                        if (window.innerWidth <= 1024 && suggestionsEl) {
                            const rightCol = document.getElementById('ai-right-col');
                            if (rightCol) {
                                rightCol.appendChild(suggestionsEl);
                            }
                        }
                    }
                }, 100);
                
                return result;
            };
        }
    }
});

// Export for global use
window.EnhancedAIGenerator = EnhancedAIGenerator;