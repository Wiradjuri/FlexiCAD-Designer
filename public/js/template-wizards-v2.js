// Template Wizards v2 - Phase 4.7.3 (Functional)
// Parameter-driven creation workflows for templates

class TemplateWizards {
    constructor() {
        this.init();
        this.templateDefinitions = {
            arduino_case: {
                key: "arduino_case",
                title: "Arduino Case",
                inputs: [
                    { 
                        id: "board_type", 
                        label: "Board type", 
                        type: "select", 
                        options: ["Uno", "Nano", "Mega"], 
                        required: true 
                    },
                    { 
                        id: "screen_cutout", 
                        label: "Screen cutout window", 
                        type: "boolean" 
                    },
                    { 
                        id: "fan_hole", 
                        label: "Fan mounting hole", 
                        type: "boolean" 
                    },
                    { 
                        id: "auto_ports", 
                        label: "Automatic port clearance", 
                        type: "boolean", 
                        default: true 
                    }
                ],
                derived: [
                    { id: "case_height", from: "board_type", fn: "autoCaseHeight" }
                ],
                summaryBullets: [
                    "Support for Uno, Nano, and Mega boards",
                    "Adjustable case height",
                    "Optional screen cutout window",
                    "Optional fan mounting hole",
                    "Automatic port clearance"
                ],
                defaultsPrompt: "If user description is vague, generate a standard protective case for the selected board with mm units."
            },
            
            desk_organizer: {
                key: "desk_organizer",
                title: "Desk Organizer",
                inputs: [
                    {
                        id: "large_compartments",
                        label: "Large compartments",
                        type: "boolean",
                        default: true
                    },
                    {
                        id: "small_compartments",
                        label: "Small compartments",
                        type: "boolean",
                        default: true
                    },
                    {
                        id: "pen_holes",
                        label: "Pen holes",
                        type: "boolean",
                        default: true
                    },
                    {
                        id: "compartment_count",
                        label: "Number of compartments",
                        type: "number",
                        min: 2,
                        max: 8,
                        default: 4
                    }
                ],
                summaryBullets: [
                    "Customizable compartment layout",
                    "Dedicated pen/pencil holders",
                    "Various compartment sizes",
                    "Modular design"
                ],
                defaultsPrompt: "Parametric desk organizer with mixed compartments and pen holders"
            },
            
            car_dash_fascia: {
                key: "car_dash_fascia",
                title: "Car Dash Fascia",
                inputs: [
                    {
                        id: "vehicle",
                        label: "Vehicle model",
                        type: "text",
                        placeholder: "e.g., VW Golf R Mk7.5",
                        default: "VW Golf R Mk7.5"
                    },
                    {
                        id: "include_mib2",
                        label: "Include MIB2 unit cutout",
                        type: "boolean",
                        default: true
                    },
                    {
                        id: "aircon_controls",
                        label: "Aircon control cutouts",
                        type: "boolean",
                        default: true
                    }
                ],
                summaryBullets: [
                    "Custom vehicle fitment",
                    "MIB2 unit integration",
                    "Climate control cutouts",
                    "Professional finish"
                ],
                defaultsPrompt: "Fascia for aircon + MIB2 unit integration"
            },
            
            phone_stand: {
                key: "phone_stand",
                title: "Phone Stand",
                inputs: [
                    {
                        id: "device",
                        label: "Device model",
                        type: "text",
                        placeholder: "e.g., Samsung Galaxy S25 Ultra",
                        default: "Samsung Galaxy S25 Ultra"
                    },
                    {
                        id: "tilt_adjust",
                        label: "Adjustable tilt",
                        type: "boolean",
                        default: true
                    },
                    {
                        id: "cable_management",
                        label: "Cable management",
                        type: "boolean",
                        default: false
                    },
                    {
                        id: "landscape_portrait",
                        label: "Support both orientations",
                        type: "boolean",
                        default: true
                    }
                ],
                summaryBullets: [
                    "Device-specific sizing",
                    "Adjustable viewing angle",
                    "Landscape and portrait modes",
                    "Optional cable management"
                ],
                defaultsPrompt: "Adjustable tilt phone stand with device-specific dimensions"
            },
            
            control_panel: {
                key: "control_panel",
                title: "Control Panel",
                inputs: [
                    {
                        id: "gang",
                        label: "Number of switches",
                        type: "number",
                        min: 1,
                        max: 8,
                        default: 4
                    },
                    {
                        id: "panel_w",
                        label: "Panel width (mm)",
                        type: "number",
                        default: 134
                    },
                    {
                        id: "panel_h",
                        label: "Panel height (mm)",
                        type: "number",
                        default: 40
                    },
                    {
                        id: "switch_type",
                        label: "Switch type",
                        type: "select",
                        options: ["Toggle", "Rocker", "Push Button"],
                        default: "Toggle"
                    }
                ],
                summaryBullets: [
                    "Configurable switch layout",
                    "Custom panel dimensions",
                    "Multiple switch types",
                    "Professional mounting"
                ],
                defaultsPrompt: "Multi-gang switch panel with precise mounting holes"
            },
            
            cup_holder_insert: {
                key: "cup_holder_insert",
                title: "Cup Holder Insert",
                inputs: [
                    {
                        id: "fit",
                        label: "Fit type",
                        type: "select",
                        options: ["Standard", "Large", "XL"],
                        default: "Standard"
                    },
                    {
                        id: "compartments",
                        label: "Number of compartments",
                        type: "number",
                        min: 1,
                        max: 4,
                        default: 2
                    },
                    {
                        id: "coin_holder",
                        label: "Include coin holder",
                        type: "boolean",
                        default: true
                    }
                ],
                summaryBullets: [
                    "Universal cup holder fit",
                    "Multiple compartment options",
                    "Coin and small item storage",
                    "Easy installation"
                ],
                defaultsPrompt: "Universal vehicle cup holder insert with compartments"
            }
        };
        
        this.defaults = {};
        this.loadDefaults();
    }
    
    init() {
        // Setup event handlers for Create buttons
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventHandlers();
        });
    }
    
    setupEventHandlers() {
        // Bind click events to create-template buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.create-template') || e.target.closest('[onclick*="showCreateWizard"]')) {
                e.preventDefault();
                const templateId = e.target.dataset.template || 
                                  e.target.getAttribute('onclick')?.match(/showCreateWizard\('([^']+)'\)/)?.[1];
                if (templateId) {
                    this.showCreateWizard(templateId);
                }
            }
        });
    }
    
    async loadDefaults() {
        try {
            // Try to load defaults from templates-defaults.jsonl
            const response = await fetch('/templates/templates-defaults.jsonl');
            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n').filter(line => line.trim());
                
                lines.forEach(line => {
                    try {
                        const data = JSON.parse(line);
                        if (data.template) {
                            this.defaults[data.template] = data.defaults || {};
                        }
                    } catch (e) {
                        console.warn('Invalid JSON line in defaults:', line);
                    }
                });
            }
        } catch (error) {
            console.log('No defaults file found, using built-in defaults');
        }
    }
    
    showCreateWizard(templateId) {
        const definition = this.templateDefinitions[templateId];
        if (!definition) {
            alert(`No wizard available for template: ${templateId}`);
            return;
        }
        
        this.renderWizardModal(definition);
    }
    
    renderWizardModal(definition) {
        const modalHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <h2>Create ${definition.title}</h2>
                    <button class="modal-close" onclick="window.hideModal()">&times;</button>
                </div>
                
                <div class="wizard-content">
                    <p class="wizard-description">Configure your ${definition.title.toLowerCase()} parameters:</p>
                    
                    <form id="wizardForm" class="wizard-form" onsubmit="return false;">
                        <div class="wizard-inputs">
                            ${definition.inputs.map(input => this.renderInput(input, definition.key)).join('')}
                        </div>
                        
                        <div class="wizard-summary">
                            <h4>Features Included:</h4>
                            <ul class="feature-list">
                                ${definition.summaryBullets.map(bullet => `<li>${bullet}</li>`).join('')}
                            </ul>
                        </div>
                    </form>
                </div>
                
                <div class="wizard-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.hideModal()">Cancel</button>
                    <button type="button" class="btn btn-outline" onclick="window.templateWizards.previewFromWizard('${definition.key}')">
                        👁️ Preview
                    </button>
                    <button type="button" class="btn btn-primary" onclick="window.templateWizards.generateFromWizard('${definition.key}')">
                        🚀 Generate in AI
                    </button>
                </div>
            </div>
        `;
        
        if (window.showModal) {
            window.showModal(modalHTML);
            
            // Setup form validation
            setTimeout(() => {
                this.setupFormValidation(definition.key);
            }, 100);
        } else {
            alert('Modal system not available. Please refresh the page.');
        }
    }
    
    renderInput(input, templateKey) {
        const templateDefaults = this.defaults[templateKey] || {};
        const defaultValue = templateDefaults[input.id] || input.default || '';
        const fieldId = `${templateKey}_${input.id}`;
        
        switch (input.type) {
            case 'select':
                return `
                    <div class="form-group">
                        <label for="${fieldId}" class="form-label">
                            ${input.label}${input.required ? ' <span class="required">*</span>' : ''}
                        </label>
                        <select id="${fieldId}" name="${input.id}" class="form-select" ${input.required ? 'required' : ''}>
                            ${input.options.map(opt => 
                                `<option value="${opt}" ${opt === defaultValue ? 'selected' : ''}>${opt}</option>`
                            ).join('')}
                        </select>
                        <div class="field-error" id="${fieldId}_error"></div>
                    </div>
                `;
                
            case 'boolean':
                return `
                    <div class="form-group checkbox-group">
                        <label class="checkbox-label" for="${fieldId}">
                            <input type="checkbox" id="${fieldId}" name="${input.id}" ${defaultValue ? 'checked' : ''}>
                            <span class="checkbox-indicator"></span>
                            <span class="checkbox-text">${input.label}</span>
                        </label>
                        <div class="field-error" id="${fieldId}_error"></div>
                    </div>
                `;
                
            case 'number':
                return `
                    <div class="form-group">
                        <label for="${fieldId}" class="form-label">
                            ${input.label}${input.required ? ' <span class="required">*</span>' : ''}
                        </label>
                        <input 
                            type="number" 
                            id="${fieldId}"
                            name="${input.id}"
                            class="form-input" 
                            value="${defaultValue}"
                            ${input.min !== undefined ? `min="${input.min}"` : ''}
                            ${input.max !== undefined ? `max="${input.max}"` : ''}
                            ${input.step !== undefined ? `step="${input.step}"` : ''}
                            ${input.placeholder ? `placeholder="${input.placeholder}"` : ''}
                            ${input.required ? 'required' : ''}
                        >
                        <div class="field-error" id="${fieldId}_error"></div>
                    </div>
                `;
                
            default: // text
                return `
                    <div class="form-group">
                        <label for="${fieldId}" class="form-label">
                            ${input.label}${input.required ? ' <span class="required">*</span>' : ''}
                        </label>
                        <input 
                            type="text" 
                            id="${fieldId}"
                            name="${input.id}"
                            class="form-input" 
                            value="${defaultValue}"
                            placeholder="${input.placeholder || ''}"
                            ${input.required ? 'required' : ''}
                        >
                        <div class="field-error" id="${fieldId}_error"></div>
                    </div>
                `;
        }
    }
    
    setupFormValidation(templateKey) {
        const form = document.getElementById('wizardForm');
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.validateField(input, templateKey));
            input.addEventListener('blur', () => this.validateField(input, templateKey));
        });
    }
    
    validateField(field, templateKey) {
        const errorDiv = document.getElementById(field.id + '_error');
        if (!errorDiv) return true;
        
        errorDiv.textContent = '';
        field.classList.remove('error');
        
        // Required validation
        if (field.hasAttribute('required') && !field.value.trim()) {
            this.showFieldError(field, errorDiv, 'This field is required');
            return false;
        }
        
        // Number validation
        if (field.type === 'number') {
            const value = parseFloat(field.value);
            const min = field.getAttribute('min');
            const max = field.getAttribute('max');
            
            if (isNaN(value)) {
                this.showFieldError(field, errorDiv, 'Please enter a valid number');
                return false;
            }
            
            if (min !== null && value < parseFloat(min)) {
                this.showFieldError(field, errorDiv, `Minimum value is ${min}`);
                return false;
            }
            
            if (max !== null && value > parseFloat(max)) {
                this.showFieldError(field, errorDiv, `Maximum value is ${max}`);
                return false;
            }
        }
        
        return true;
    }
    
    showFieldError(field, errorDiv, message) {
        field.classList.add('error');
        errorDiv.textContent = message;
    }
    
    async previewFromWizard(templateKey) {
        const values = this.collectFormValues(templateKey);
        if (!values) return; // Validation failed
        
        const definition = this.templateDefinitions[templateKey];
        const prompt = this.buildPrompt(definition, values);
        
        try {
            // Show loading in the preview button
            const previewBtn = document.querySelector('.btn[onclick*="previewFromWizard"]');
            if (previewBtn) {
                previewBtn.innerHTML = '⏳ Generating...';
                previewBtn.disabled = true;
            }
            
            // Call AI generation for preview
            const response = await fetch('/.netlify/functions/generate-template', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.flexicadAuth?.session?.access_token || ''}`
                },
                body: JSON.stringify({
                    prompt,
                    designName: definition.title,
                    preview: true
                })
            });
            
            if (!response.ok) {
                throw new Error('Preview generation failed');
            }
            
            const result = await response.json();
            const code = result.code || result.openscad_code;
            
            // Show preview modal
            this.showPreviewModal(definition.title, code, prompt);
            
        } catch (error) {
            console.error('Preview error:', error);
            this.showToast('Preview generation failed. Please try again.', 'error');
        } finally {
            // Reset preview button
            const previewBtn = document.querySelector('.btn[onclick*="previewFromWizard"]');
            if (previewBtn) {
                previewBtn.innerHTML = '👁️ Preview';
                previewBtn.disabled = false;
            }
        }
    }
    
    showPreviewModal(title, code, prompt) {
        const previewHTML = `
            <div class="preview-modal">
                <div class="preview-header">
                    <h2>Preview: ${title}</h2>
                    <button class="modal-close" onclick="window.hideModal()">&times;</button>
                </div>
                
                <div class="preview-content">
                    <div class="code-container">
                        <div class="code-header">
                            <span class="code-filename">${title.toLowerCase().replace(/\s+/g, '_')}.scad</span>
                            <div class="code-actions">
                                <button class="btn btn-small btn-secondary" onclick="window.templateWizards.copyCode()">
                                    📋 Copy Code
                                </button>
                                <button class="btn btn-small btn-secondary" onclick="window.templateWizards.downloadCode('${title}')">
                                    📥 Download .scad
                                </button>
                            </div>
                        </div>
                        <pre class="code-block" id="previewCode">${code}</pre>
                    </div>
                </div>
                
                <div class="preview-actions">
                    <button class="btn btn-secondary" onclick="window.hideModal()">Close</button>
                    <button class="btn btn-primary" onclick="window.templateWizards.sendToAI('${encodeURIComponent(prompt)}', '${encodeURIComponent(title)}')">
                        🚀 Send to AI Generator
                    </button>
                </div>
            </div>
        `;
        
        window.showModal(previewHTML);
    }
    
    copyCode() {
        const codeBlock = document.getElementById('previewCode');
        if (codeBlock) {
            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                this.showToast('Code copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Failed to copy code', 'error');
            });
        }
    }
    
    downloadCode(title) {
        const codeBlock = document.getElementById('previewCode');
        if (codeBlock) {
            const filename = title.toLowerCase().replace(/\s+/g, '_') + '.scad';
            const blob = new Blob([codeBlock.textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showToast('File downloaded!', 'success');
        }
    }
    
    sendToAI(encodedPrompt, encodedTitle) {
        window.hideModal();
        window.location.href = `ai.html?prompt=${encodedPrompt}&name=${encodedTitle}&auto=true`;
    }
    
    async generateFromWizard(templateKey) {
        const values = this.collectFormValues(templateKey);
        if (!values) return; // Validation failed
        
        const definition = this.templateDefinitions[templateKey];
        const prompt = this.buildPrompt(definition, values);
        
        // Hide modal
        window.hideModal();
        
        // Always redirect to AI generator with pre-filled prompt and auto-run
        const encodedPrompt = encodeURIComponent(prompt);
        const designName = encodeURIComponent(definition.title);
        window.location.href = `ai.html?prompt=${encodedPrompt}&name=${designName}&auto=true`;
    }
    
    collectFormValues(templateKey) {
        const definition = this.templateDefinitions[templateKey];
        if (!definition) return null;
        
        const form = document.getElementById('wizardForm');
        let isValid = true;
        const values = {};
        
        // Collect and validate form values
        definition.inputs.forEach(input => {
            const fieldId = `${templateKey}_${input.id}`;
            const element = document.getElementById(fieldId);
            
            if (element) {
                if (!this.validateField(element, templateKey)) {
                    isValid = false;
                    return;
                }
                
                if (input.type === 'boolean') {
                    values[input.id] = element.checked;
                } else if (input.type === 'number') {
                    values[input.id] = parseFloat(element.value) || input.default || 0;
                } else {
                    values[input.id] = element.value.trim() || input.default || '';
                }
            }
        });
        
        if (!isValid) {
            this.showToast('Please fix the errors in the form', 'error');
            return null;
        }
        
        // Process derived values
        if (definition.derived) {
            definition.derived.forEach(derived => {
                values[derived.id] = this.computeDerived(derived, values);
            });
        }
        
        return values;
    }
    
    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 1px solid var(--border);
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        if (type === 'error') {
            toast.style.borderColor = '#ef4444';
            toast.style.backgroundColor = '#fef2f2';
            toast.style.color = '#dc2626';
        } else if (type === 'success') {
            toast.style.borderColor = '#10b981';
            toast.style.backgroundColor = '#f0fdf4';
            toast.style.color = '#059669';
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
    
    buildPrompt(definition, values) {
        let prompt = `Create a ${definition.title.toLowerCase()} with the following specifications:\n\n`;
        
        // Add parameter values to prompt
        definition.inputs.forEach(input => {
            const value = values[input.id];
            if (value !== undefined && value !== null && value !== '') {
                if (input.type === 'boolean') {
                    if (value) {
                        prompt += `- ${input.label}: Yes\n`;
                    }
                } else {
                    prompt += `- ${input.label}: ${value}\n`;
                }
            }
        });
        
        // Add derived values
        if (definition.derived) {
            definition.derived.forEach(derived => {
                const value = values[derived.id];
                if (value !== undefined) {
                    prompt += `- ${derived.id.replace('_', ' ')}: ${value}\n`;
                }
            });
        }
        
        prompt += `\n${definition.defaultsPrompt}`;
        
        return prompt;
    }
    
    computeDerived(derived, values) {
        // Simple derived value computation
        switch (derived.fn) {
            case 'autoCaseHeight':
                const boardType = values[derived.from];
                switch (boardType) {
                    case 'Nano': return 15;
                    case 'Uno': return 25;
                    case 'Mega': return 30;
                    default: return 25;
                }
            default:
                return values[derived.from];
        }
    }
}

// Initialize template wizards
window.templateWizards = new TemplateWizards();

// Export for module use
export { TemplateWizards };