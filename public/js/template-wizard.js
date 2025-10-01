// Template Wizard System for FlexiCAD Designer - Phase 4.6/4.7
// Interactive template customization and guided creation

class TemplateWizard {
    constructor() {
        this.currentTemplate = null;
        this.wizardStep = 0;
        this.wizardData = {};
        this.initializeWizards();
    }

    initializeWizards() {
        // Add wizard triggers to existing template cards
        document.addEventListener('DOMContentLoaded', () => {
            this.setupWizardButtons();
        });
    }

    setupWizardButtons() {
        // Find all template cards and add wizard buttons
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach((card, index) => {
            const actionsDiv = card.querySelector('.template-actions');
            if (actionsDiv && !actionsDiv.querySelector('.wizard-btn')) {
                const wizardBtn = document.createElement('button');
                wizardBtn.className = 'btn btn-outline wizard-btn';
                wizardBtn.innerHTML = '🧙‍♂️ Customize';
                wizardBtn.onclick = () => this.startWizard(this.getTemplateFromCard(card));
                actionsDiv.appendChild(wizardBtn);
            }
        });
    }

    getTemplateFromCard(card) {
        const titleEl = card.querySelector('h3, .template-title, .card-title');
        const title = titleEl ? titleEl.textContent.trim() : 'Unknown Template';
        
        // Map titles to template configurations
        const templateConfigs = {
            'Arduino Uno Case': {
                id: 'arduino-case',
                name: 'Arduino Uno Case',
                description: 'Customizable protective case for Arduino Uno board',
                baseCode: `// Customizable Arduino Uno Case
wall_thickness = {WALL_THICKNESS};
board_length = {BOARD_LENGTH};
board_width = {BOARD_WIDTH};
board_thickness = 1.6;
clearance = {CLEARANCE};
lid_type = "{LID_TYPE}"; // "snap", "screw", "slide"

module arduino_case() {
    difference() {
        // Outer shell
        cube([board_length + 2*wall_thickness + 2*clearance, 
              board_width + 2*wall_thickness + 2*clearance, 
              10 + wall_thickness]);
        
        // Inner cavity
        translate([wall_thickness, wall_thickness, wall_thickness])
            cube([board_length + 2*clearance, 
                  board_width + 2*clearance, 
                  10]);
        
        // USB cutout
        translate([-1, 7, wall_thickness + 2])
            cube([wall_thickness + 2, 12, 5]);
    }
}

arduino_case();`,
                parameters: [
                    {
                        name: 'WALL_THICKNESS',
                        label: 'Wall Thickness (mm)',
                        type: 'number',
                        min: 1,
                        max: 5,
                        default: 2,
                        step: 0.5
                    },
                    {
                        name: 'BOARD_LENGTH',
                        label: 'Board Length (mm)',
                        type: 'number',
                        min: 50,
                        max: 80,
                        default: 68.6,
                        step: 0.1
                    },
                    {
                        name: 'BOARD_WIDTH',
                        label: 'Board Width (mm)',
                        type: 'number',
                        min: 40,
                        max: 60,
                        default: 53.4,
                        step: 0.1
                    },
                    {
                        name: 'CLEARANCE',
                        label: 'Board Clearance (mm)',
                        type: 'number',
                        min: 0.5,
                        max: 3,
                        default: 1,
                        step: 0.1
                    },
                    {
                        name: 'LID_TYPE',
                        label: 'Lid Type',
                        type: 'select',
                        options: ['snap', 'screw', 'slide'],
                        default: 'snap'
                    }
                ]
            },
            'Phone Case': {
                id: 'phone-case',
                name: 'Phone Case',
                description: 'Custom phone case with optional features',
                baseCode: `// Customizable Phone Case
phone_length = {PHONE_LENGTH};
phone_width = {PHONE_WIDTH};
phone_thickness = {PHONE_THICKNESS};
wall_thickness = {WALL_THICKNESS};
corner_radius = {CORNER_RADIUS};
camera_cutout = {CAMERA_CUTOUT}; // true/false
kickstand = {KICKSTAND}; // true/false

module phone_case() {
    difference() {
        // Main body with rounded corners
        minkowski() {
            cube([phone_length + 2*wall_thickness - 2*corner_radius, 
                  phone_width + 2*wall_thickness - 2*corner_radius, 
                  phone_thickness + wall_thickness - corner_radius]);
            sphere(r=corner_radius);
        }
        
        // Phone cavity
        translate([wall_thickness, wall_thickness, wall_thickness])
            cube([phone_length, phone_width, phone_thickness + 1]);
        
        // Camera cutout
        if (camera_cutout) {
            translate([phone_length - 20, phone_width - 20, -1])
                cube([25, 25, wall_thickness + 2]);
        }
        
        // Charging port
        translate([-1, phone_width/2 - 5, wall_thickness + 2])
            cube([wall_thickness + 2, 10, 4]);
    }
    
    // Optional kickstand
    if (kickstand) {
        translate([phone_length/2, 0, 0])
            kickstand_module();
    }
}

module kickstand_module() {
    // Simple kickstand implementation
    translate([0, -2, 2])
    rotate([-30, 0, 0])
        cube([20, 2, 15]);
}

phone_case();`,
                parameters: [
                    {
                        name: 'PHONE_LENGTH',
                        label: 'Phone Length (mm)',
                        type: 'number',
                        min: 120,
                        max: 180,
                        default: 150,
                        step: 1
                    },
                    {
                        name: 'PHONE_WIDTH',
                        label: 'Phone Width (mm)',
                        type: 'number',
                        min: 60,
                        max: 90,
                        default: 75,
                        step: 1
                    },
                    {
                        name: 'PHONE_THICKNESS',
                        label: 'Phone Thickness (mm)',
                        type: 'number',
                        min: 6,
                        max: 15,
                        default: 8,
                        step: 0.5
                    },
                    {
                        name: 'WALL_THICKNESS',
                        label: 'Case Wall Thickness (mm)',
                        type: 'number',
                        min: 1,
                        max: 4,
                        default: 2,
                        step: 0.5
                    },
                    {
                        name: 'CORNER_RADIUS',
                        label: 'Corner Radius (mm)',
                        type: 'number',
                        min: 1,
                        max: 8,
                        default: 3,
                        step: 0.5
                    },
                    {
                        name: 'CAMERA_CUTOUT',
                        label: 'Camera Cutout',
                        type: 'boolean',
                        default: true
                    },
                    {
                        name: 'KICKSTAND',
                        label: 'Include Kickstand',
                        type: 'boolean',
                        default: false
                    }
                ]
            },
            'Desk Organizer': {
                id: 'desk-organizer',
                name: 'Desk Organizer',
                description: 'Modular desk organizer with customizable compartments',
                baseCode: `// Customizable Desk Organizer
base_length = {BASE_LENGTH};
base_width = {BASE_WIDTH};
base_thickness = {BASE_THICKNESS};
wall_thickness = {WALL_THICKNESS};
compartments_x = {COMPARTMENTS_X};
compartments_y = {COMPARTMENTS_Y};
height = {HEIGHT};
pen_holder = {PEN_HOLDER}; // true/false

module desk_organizer() {
    // Base
    cube([base_length, base_width, base_thickness]);
    
    // Compartment walls
    for (i = [0:compartments_x]) {
        translate([i * base_length / compartments_x - wall_thickness/2, 0, 0])
            cube([wall_thickness, base_width, height]);
    }
    
    for (j = [0:compartments_y]) {
        translate([0, j * base_width / compartments_y - wall_thickness/2, 0])
            cube([base_length, wall_thickness, height]);
    }
    
    // Optional pen holder
    if (pen_holder) {
        translate([base_length - 25, base_width - 25, 0])
            pen_holder_module();
    }
}

module pen_holder_module() {
    difference() {
        cylinder(h=height * 1.5, d=20);
        translate([0, 0, base_thickness])
            cylinder(h=height * 1.5, d=16);
    }
}

desk_organizer();`,
                parameters: [
                    {
                        name: 'BASE_LENGTH',
                        label: 'Base Length (mm)',
                        type: 'number',
                        min: 80,
                        max: 200,
                        default: 120,
                        step: 10
                    },
                    {
                        name: 'BASE_WIDTH',
                        label: 'Base Width (mm)',
                        type: 'number',
                        min: 60,
                        max: 150,
                        default: 80,
                        step: 10
                    },
                    {
                        name: 'BASE_THICKNESS',
                        label: 'Base Thickness (mm)',
                        type: 'number',
                        min: 2,
                        max: 8,
                        default: 3,
                        step: 1
                    },
                    {
                        name: 'WALL_THICKNESS',
                        label: 'Wall Thickness (mm)',
                        type: 'number',
                        min: 1,
                        max: 4,
                        default: 2,
                        step: 0.5
                    },
                    {
                        name: 'COMPARTMENTS_X',
                        label: 'Compartments (Length)',
                        type: 'number',
                        min: 1,
                        max: 5,
                        default: 3,
                        step: 1
                    },
                    {
                        name: 'COMPARTMENTS_Y',
                        label: 'Compartments (Width)',
                        type: 'number',
                        min: 1,
                        max: 4,
                        default: 2,
                        step: 1
                    },
                    {
                        name: 'HEIGHT',
                        label: 'Compartment Height (mm)',
                        type: 'number',
                        min: 15,
                        max: 50,
                        default: 25,
                        step: 5
                    },
                    {
                        name: 'PEN_HOLDER',
                        label: 'Include Pen Holder',
                        type: 'boolean',
                        default: true
                    }
                ]
            }
        };

        return templateConfigs[title] || {
            id: 'generic',
            name: title,
            description: 'Generic template',
            baseCode: '// Generic template\ncube([10, 10, 10]);',
            parameters: []
        };
    }

    startWizard(template) {
        this.currentTemplate = template;
        this.wizardStep = 0;
        this.wizardData = {};
        this.showWizardModal();
    }

    showWizardModal() {
        // Create modal overlay
        const modalHTML = `
            <div class="wizard-modal-overlay" id="wizardModal">
                <div class="wizard-modal">
                    <div class="wizard-header">
                        <h2>🧙‍♂️ Template Wizard: ${this.currentTemplate.name}</h2>
                        <button class="wizard-close" onclick="templateWizard.closeWizard()">&times;</button>
                    </div>
                    <div class="wizard-body">
                        <div class="wizard-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 0%"></div>
                            </div>
                            <span class="progress-text">Step 1 of 2: Parameters</span>
                        </div>
                        <div class="wizard-content" id="wizardContent">
                            ${this.generateParameterStep()}
                        </div>
                    </div>
                    <div class="wizard-footer">
                        <button class="btn btn-outline" onclick="templateWizard.closeWizard()">Cancel</button>
                        <div class="wizard-nav">
                            <button class="btn btn-secondary" id="wizardPrev" onclick="templateWizard.previousStep()" style="display: none;">Previous</button>
                            <button class="btn btn-primary" id="wizardNext" onclick="templateWizard.nextStep()">Next: Preview</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existing = document.getElementById('wizardModal');
        if (existing) existing.remove();

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    generateParameterStep() {
        let html = `
            <div class="wizard-step-content">
                <h3>Customize Parameters</h3>
                <p class="step-description">${this.currentTemplate.description}</p>
                <div class="parameter-grid">
        `;

        this.currentTemplate.parameters.forEach(param => {
            html += `<div class="parameter-item">`;
            html += `<label class="parameter-label">${param.label}</label>`;
            
            if (param.type === 'number') {
                html += `
                    <input type="number" 
                           class="parameter-input" 
                           id="param-${param.name}"
                           min="${param.min}" 
                           max="${param.max}" 
                           step="${param.step}" 
                           value="${param.default}"
                           oninput="templateWizard.updateParameter('${param.name}', this.value)">
                    <div class="parameter-info">Range: ${param.min} - ${param.max}</div>
                `;
            } else if (param.type === 'select') {
                html += `<select class="parameter-input" id="param-${param.name}" onchange="templateWizard.updateParameter('${param.name}', this.value)">`;
                param.options.forEach(option => {
                    const selected = option === param.default ? 'selected' : '';
                    html += `<option value="${option}" ${selected}>${option}</option>`;
                });
                html += `</select>`;
            } else if (param.type === 'boolean') {
                const checked = param.default ? 'checked' : '';
                html += `
                    <label class="checkbox-label">
                        <input type="checkbox" 
                               class="parameter-checkbox" 
                               id="param-${param.name}"
                               ${checked}
                               onchange="templateWizard.updateParameter('${param.name}', this.checked)">
                        <span class="checkbox-text">Enable</span>
                    </label>
                `;
            }
            
            html += `</div>`;
        });

        html += `</div></div>`;
        return html;
    }

    updateParameter(paramName, value) {
        this.wizardData[paramName] = value;
    }

    generatePreviewStep() {
        const code = this.generateCustomizedCode();
        return `
            <div class="wizard-step-content">
                <h3>Preview & Download</h3>
                <p class="step-description">Review your customized template below:</p>
                
                <div class="code-preview-container">
                    <div class="code-preview-header">
                        <span>Generated OpenSCAD Code</span>
                        <button class="btn btn-sm btn-outline" onclick="templateWizard.copyCode()">📋 Copy</button>
                    </div>
                    <pre class="code-preview" id="generatedCode">${this.escapeHtml(code)}</pre>
                </div>
                
                <div class="wizard-actions">
                    <button class="btn btn-success" onclick="templateWizard.downloadCode()">
                        💾 Download .scad File
                    </button>
                    <button class="btn btn-primary" onclick="templateWizard.saveToMyDesigns()">
                        📂 Save to My Designs
                    </button>
                </div>
            </div>
        `;
    }

    generateCustomizedCode() {
        let code = this.currentTemplate.baseCode;
        
        // Replace parameter placeholders
        this.currentTemplate.parameters.forEach(param => {
            const value = this.wizardData[param.name] ?? param.default;
            const placeholder = `{${param.name}}`;
            
            if (param.type === 'boolean') {
                code = code.replace(new RegExp(placeholder, 'g'), value ? 'true' : 'false');
            } else if (param.type === 'select') {
                code = code.replace(new RegExp(placeholder, 'g'), value);
            } else {
                code = code.replace(new RegExp(placeholder, 'g'), value.toString());
            }
        });

        return code;
    }

    nextStep() {
        if (this.wizardStep === 0) {
            // Initialize default parameters if not set
            this.currentTemplate.parameters.forEach(param => {
                if (!(param.name in this.wizardData)) {
                    this.wizardData[param.name] = param.default;
                }
            });

            this.wizardStep = 1;
            this.updateWizardContent();
        } else if (this.wizardStep === 1) {
            // Finish wizard
            this.closeWizard();
        }
    }

    previousStep() {
        if (this.wizardStep > 0) {
            this.wizardStep--;
            this.updateWizardContent();
        }
    }

    updateWizardContent() {
        const content = document.getElementById('wizardContent');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        const prevBtn = document.getElementById('wizardPrev');
        const nextBtn = document.getElementById('wizardNext');

        if (this.wizardStep === 0) {
            content.innerHTML = this.generateParameterStep();
            progressFill.style.width = '50%';
            progressText.textContent = 'Step 1 of 2: Parameters';
            prevBtn.style.display = 'none';
            nextBtn.textContent = 'Next: Preview';
        } else if (this.wizardStep === 1) {
            content.innerHTML = this.generatePreviewStep();
            progressFill.style.width = '100%';
            progressText.textContent = 'Step 2 of 2: Preview';
            prevBtn.style.display = 'inline-block';
            nextBtn.textContent = 'Finish';
        }
    }

    copyCode() {
        const code = this.generateCustomizedCode();
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification('Code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy code:', err);
            this.showNotification('Failed to copy code', 'error');
        });
    }

    downloadCode() {
        const code = this.generateCustomizedCode();
        const filename = `${this.currentTemplate.id}-customized.scad`;
        
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showNotification(`Downloaded: ${filename}`);
    }

    async saveToMyDesigns() {
        try {
            const code = this.generateCustomizedCode();
            const designName = `${this.currentTemplate.name} (Customized)`;
            
            // This would call your existing save-design API
            const response = await fetch('/api/save-design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: designName,
                    description: `Customized template: ${this.currentTemplate.description}`,
                    code: code,
                    tags: ['template', 'wizard', this.currentTemplate.id]
                })
            });

            if (response.ok) {
                this.showNotification('Saved to My Designs!');
                setTimeout(() => {
                    window.location.href = 'my-designs.html';
                }, 1500);
            } else {
                throw new Error('Failed to save design');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Failed to save design', 'error');
        }
    }

    closeWizard() {
        const modal = document.getElementById('wizardModal');
        if (modal) modal.remove();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `wizard-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize wizard system
window.templateWizard = new TemplateWizard();