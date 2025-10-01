// Enhanced AI Generator - Phase 4.6/4.7 with Modal Integration
// Smart suggestions and context-aware generation

import { showModal, hideModal } from './modals.js';

class EnhancedAIGenerator {
    constructor() {
        this.selectedContexts = [];
        this.activeSuggestions = new Set();
        this.suggestionCategories = {
            dimensions: [
                { text: "with dimensions 100mm × 60mm × 40mm", description: "Standard small box size" },
                { text: "parametric sizing", description: "Adjustable dimensions" },
                { text: "scaled for 3D printing", description: "Print bed optimized" },
                { text: "with tolerance ±0.1mm", description: "Precision fitting" }
            ],
            features: [
                { text: "with rounded corners", description: "Smooth edges" },
                { text: "with mounting holes", description: "Easy attachment" },
                { text: "with cable management", description: "Wire routing" },
                { text: "with ventilation slots", description: "Airflow design" },
                { text: "with removable lid", description: "Access panel" },
                { text: "with snap-fit joints", description: "Click assembly" }
            ],
            materials: [
                { text: "designed for PLA printing", description: "Easy to print material" },
                { text: "with support-free design", description: "No supports needed" },
                { text: "optimized for PETG", description: "Strong material" },
                { text: "with minimal infill", description: "Material efficient" }
            ],
            advanced: [
                { text: "with living hinges", description: "Flexible joints" },
                { text: "with threaded connections", description: "Screw assembly" },
                { text: "with interlocking parts", description: "Puzzle fit" },
                { text: "with magnetic closures", description: "Neodymium magnets" }
            ]
        };
        
        this.initializeEnhancements();
    }

    initializeEnhancements() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupSuggestions();
            this.setupContextTags();
            this.enhancePromptArea();
            this.setupSmartGeneration();
        });
    }

    setupSuggestions() {
        const suggestionsContainer = document.getElementById('suggestionsList');
        if (!suggestionsContainer) return;

        this.generateInitialSuggestions();
        
        // Update suggestions based on prompt input
        const promptArea = document.getElementById('designPrompt');
        if (promptArea) {
            promptArea.addEventListener('input', () => {
                this.updateSuggestions(promptArea.value);
            });
        }
    }

    generateInitialSuggestions() {
        const container = document.getElementById('suggestionsList');
        if (!container) return;

        // Generate enhanced suggestion categories
        const categoryIcons = {
            dimensions: '📏',
            features: '⚙️', 
            materials: '🔧',
            advanced: '🚀'
        };

        const html = Object.entries(this.suggestionCategories).map(([category, suggestions]) => `
            <div class="suggestion-category" data-category="${category}">
                <h5 class="category-title">
                    ${categoryIcons[category]} ${this.formatCategoryName(category)}
                </h5>
                <div class="suggestion-items">
                    ${suggestions.map((suggestion, index) => `
                        <div class="suggestion-item" 
                             data-category="${category}"
                             data-index="${index}"
                             data-text="${suggestion.text}"
                             title="${suggestion.description}">
                            <span class="suggestion-text">${suggestion.text}</span>
                            <span class="suggestion-icon">+</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        
        // Setup click handlers
        container.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                this.toggleSuggestion(suggestionItem);
            }
        });
    }

    updateSuggestions(promptText) {
        if (!promptText || promptText.length < 10) {
            this.generateInitialSuggestions();
            return;
        }

        // Analyze prompt and suggest improvements
        const suggestions = this.analyzePrompt(promptText);
        const container = document.getElementById('suggestionsList');
        
        if (container && suggestions.length > 0) {
            container.innerHTML = suggestions.map((suggestion, idx) => `
                <div class="suggestion-item"
                     data-category="${suggestion.category}"
                     data-text="${suggestion.text.replace(/"/g, '&quot;')}"
                     data-idx="${idx}">
                    <span class="suggestion-icon">${suggestion.icon}</span>
                    <span>${suggestion.text}</span>
                </div>
            `).join('');

            // Attach event listeners after rendering
            Array.from(container.querySelectorAll('.suggestion-item')).forEach(item => {
                item.addEventListener('click', () => {
                    const category = item.getAttribute('data-category');
                    const text = item.getAttribute('data-text');
                    this.applySuggestion(category, text);
                });
            });
        }
    }

    analyzePrompt(text) {
        const suggestions = [];
        const lowerText = text.toLowerCase();

        // Check for missing dimensions
        if (!(/\d+\s*(mm|cm|inch|in|\")/.test(lowerText))) {
            suggestions.push({
                icon: '📏',
                text: 'Add specific dimensions for better accuracy',
                category: 'dimensions'
            });
        }

        // Check for functional requirements
        if (lowerText.includes('case') && !lowerText.includes('cutout')) {
            suggestions.push({
                icon: '✂️',
                text: 'Consider cable/port cutouts',
                category: 'features'
            });
        }

        if (lowerText.includes('mount') && !lowerText.includes('hole')) {
            suggestions.push({
                icon: '🔩',
                text: 'Specify mounting hole size and pattern',
                category: 'features'
            });
        }

        // Check for material considerations
        if (!lowerText.includes('print') && !lowerText.includes('layer')) {
            suggestions.push({
                icon: '🏗️',
                text: 'Consider 3D printing requirements',
                category: 'materials'
            });
        }

        return suggestions.slice(0, 4); // Limit to 4 suggestions
    }

    applySuggestion(category, specificText = null) {
        const promptArea = document.getElementById('designPrompt');
        if (!promptArea) return;

        let suggestionText;
        if (specificText) {
            suggestionText = specificText;
        } else {
            const categoryItems = this.suggestionCategories[category];
            suggestionText = categoryItems[Math.floor(Math.random() * categoryItems.length)];
        }

        // Append to existing prompt
        const currentText = promptArea.value.trim();
        const newText = currentText 
            ? `${currentText}\n\nAdditional requirement: ${suggestionText}`
            : suggestionText;
        
        promptArea.value = newText;
        promptArea.focus();
        
        // Update suggestions again
        setTimeout(() => this.updateSuggestions(newText), 100);
    }

    setupContextTags() {
        const contextTags = document.querySelectorAll('.context-tag');
        contextTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const context = tag.dataset.context;
                this.toggleContext(context, tag);
            });
        });
    }

    toggleContext(context, tagElement) {
        if (this.selectedContexts.includes(context)) {
            this.selectedContexts = this.selectedContexts.filter(c => c !== context);
            tagElement.classList.remove('active');
        } else {
            this.selectedContexts.push(context);
            tagElement.classList.add('active');
        }

        // Update generation strategy based on selected contexts
        this.updateGenerationStrategy();
    }

    updateGenerationStrategy() {
        // This would influence the AI generation parameters
        console.log('Updated AI context:', this.selectedContexts);
        
        // Show context in UI
        const contextPanel = document.getElementById('contextPanel');
        if (contextPanel && this.selectedContexts.length > 0) {
            contextPanel.style.borderColor = 'var(--text-accent)';
            contextPanel.style.background = 'rgba(88, 166, 255, 0.05)';
        } else if (contextPanel) {
            contextPanel.style.borderColor = 'var(--border)';
            contextPanel.style.background = 'var(--bg-secondary)';
        }
    }

    enhancePromptArea() {
        const promptArea = document.getElementById('designPrompt');
        if (!promptArea) return;

        // Add character counter
        const formGroup = promptArea.parentNode;
        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.style.cssText = `
            text-align: right;
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-top: 0.5rem;
        `;
        
        const updateCounter = () => {
            const length = promptArea.value.length;
            const color = length > 500 ? 'var(--warning)' : 'var(--text-secondary)';
            counter.innerHTML = `${length} characters ${length > 200 ? '✅' : ''}`;
            counter.style.color = color;
        };

        promptArea.addEventListener('input', updateCounter);
        formGroup.appendChild(counter);
        updateCounter();

        // Add auto-resize
        promptArea.addEventListener('input', () => {
            promptArea.style.height = 'auto';
            promptArea.style.height = Math.min(promptArea.scrollHeight, 200) + 'px';
        });
    }

    setupSmartGeneration() {
        // Override the existing form submission to include context
        const form = document.getElementById('generateForm');
        if (!form) return;

        const originalSubmit = form.onsubmit;
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            // Enhance prompt with context before generation
            const enhancedPrompt = this.buildEnhancedPrompt();
            
            // Update the prompt field temporarily
            const promptArea = document.getElementById('designPrompt');
            const originalPrompt = promptArea.value;
            promptArea.value = enhancedPrompt;

            // Call original generation function
            try {
                await generateDesign(e);
            } catch (error) {
                console.error('Generation failed:', error);
                // Restore original prompt on error
                promptArea.value = originalPrompt;
            }
        };
    }

    buildEnhancedPrompt() {
        const promptArea = document.getElementById('designPrompt');
        const basePrompt = promptArea.value.trim();
        
        let enhancedPrompt = basePrompt;

        // Add context-based enhancements
        if (this.selectedContexts.length > 0) {
            const contextDescriptions = {
                functional: "Focus on practical functionality and usability",
                decorative: "Emphasize aesthetic appeal and visual design",
                mechanical: "Prioritize structural integrity and moving parts",
                electronic: "Include cable management and component housing",
                household: "Design for everyday home use and durability",
                automotive: "Consider automotive environment and mounting",
                miniature: "Optimize for small scale and fine details",
                "replacement-part": "Match existing part specifications exactly"
            };

            const activeContexts = this.selectedContexts
                .map(ctx => contextDescriptions[ctx])
                .filter(Boolean);

            if (activeContexts.length > 0) {
                enhancedPrompt += `\n\nDesign considerations: ${activeContexts.join('. ')}.`;
            }
        }

        // Add general 3D printing optimization
        if (!enhancedPrompt.toLowerCase().includes('print')) {
            enhancedPrompt += "\n\nOptimize for FDM 3D printing with minimal supports.";
        }

        return enhancedPrompt;
    }

    // Method to show generation progress with enhanced feedback
    showEnhancedProgress(stage) {
        const stages = [
            '🧠 Analyzing requirements...',
            '🎯 Applying design context...',  
            '🤖 Generating OpenSCAD code...',
            '✨ Optimizing for 3D printing...',
            '✅ Complete!'
        ];

        // This would integrate with existing progress display
        console.log(`Generation stage: ${stages[stage] || 'Processing...'}`);
    }
}

// Initialize enhanced AI generator
window.enhancedAI = new EnhancedAIGenerator();