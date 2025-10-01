// site/js/template-wizards.js - Template parameter wizards for Phase 4.6
import { showModal, hideModal, esc } from './modals.js';

// Template configurations
const templateConfigs = {
  'Arduino Uno Case': {
    id: 'arduino-case',
    fields: [
      {
        name: 'board_type',
        label: 'Board Type',
        type: 'select',
        options: ['Uno', 'Nano', 'Mega'],
        default: 'Uno'
      },
      {
        name: 'case_height',
        label: 'Case Height (mm)',
        type: 'number',
        min: 10,
        max: 50,
        default: 25
      },
      {
        name: 'screen_window',
        label: 'Screen Window',
        type: 'checkbox',
        default: false
      },
      {
        name: 'fan_mount',
        label: 'Fan Mount',
        type: 'checkbox', 
        default: false
      },
      {
        name: 'port_clearance',
        label: 'Port Clearance',
        type: 'checkbox',
        default: true
      }
    ]
  },
  
  'Phone Case': {
    id: 'phone-case',
    fields: [
      {
        name: 'phone_model',
        label: 'Phone Model',
        type: 'select',
        options: ['iPhone 14', 'iPhone 15', 'Samsung S23', 'Custom'],
        default: 'iPhone 14'
      },
      {
        name: 'case_thickness',
        label: 'Case Thickness (mm)',
        type: 'number',
        min: 1,
        max: 8,
        default: 3
      },
      {
        name: 'camera_cutout',
        label: 'Camera Cutout',
        type: 'checkbox',
        default: true
      },
      {
        name: 'kickstand',
        label: 'Kickstand',
        type: 'checkbox',
        default: false
      }
    ]
  },

  'Desk Organizer': {
    id: 'desk-organizer', 
    fields: [
      {
        name: 'width',
        label: 'Width (mm)',
        type: 'number',
        min: 50,
        max: 200,
        default: 120
      },
      {
        name: 'depth', 
        label: 'Depth (mm)',
        type: 'number',
        min: 50,
        max: 150,
        default: 80
      },
      {
        name: 'compartments',
        label: 'Compartments',
        type: 'number',
        min: 1,
        max: 6,
        default: 3
      },
      {
        name: 'pen_holder',
        label: 'Pen Holder',
        type: 'checkbox',
        default: true
      }
    ]
  }
};

// Initialize wizard system
export function initTemplateWizards() {
  // Find template cards and add wizard buttons
  const templateCards = document.querySelectorAll('.template-card, .card');
  
  templateCards.forEach(card => {
    const title = card.querySelector('h3, .card-title')?.textContent?.trim();
    if (!title || !templateConfigs[title]) return;
    
    // Find or create action area
    let actionArea = card.querySelector('.template-actions, .card-actions');
    if (!actionArea) {
      actionArea = document.createElement('div');
      actionArea.className = 'template-actions';
      card.appendChild(actionArea);
    }
    
    // Add wizard button if not exists
    if (!actionArea.querySelector('.wizard-btn')) {
      const wizardBtn = document.createElement('button');
      wizardBtn.className = 'btn btn-primary wizard-btn';
      wizardBtn.textContent = 'Customize';
      wizardBtn.onclick = () => openTemplateWizard(title);
      actionArea.appendChild(wizardBtn);
    }
  });
}

function openTemplateWizard(templateName) {
  const config = templateConfigs[templateName];
  if (!config) {
    alert(`No wizard configuration for ${templateName}`);
    return;
  }

  const formHTML = generateWizardForm(templateName, config);
  showModal(formHTML);
}

function generateWizardForm(templateName, config) {
  const fieldsHTML = config.fields.map(field => {
    const fieldId = `wizard-${field.name}`;
    
    let inputHTML = '';
    switch (field.type) {
      case 'select':
        inputHTML = `
          <select id="${fieldId}" class="wizard-input">
            ${field.options.map(opt => `
              <option value="${opt}" ${opt === field.default ? 'selected' : ''}>${opt}</option>
            `).join('')}
          </select>
        `;
        break;
        
      case 'number':
        inputHTML = `
          <input type="number" 
                 id="${fieldId}" 
                 class="wizard-input"
                 min="${field.min || 0}" 
                 max="${field.max || 1000}"
                 value="${field.default || 0}">
        `;
        break;
        
      case 'checkbox':
        inputHTML = `
          <label class="wizard-checkbox">
            <input type="checkbox" 
                   id="${fieldId}"
                   ${field.default ? 'checked' : ''}>
            <span class="checkmark"></span>
          </label>
        `;
        break;
        
      default:
        inputHTML = `<input type="text" id="${fieldId}" class="wizard-input" value="${field.default || ''}">`;
    }
    
    return `
      <div class="wizard-field">
        <label class="wizard-label" for="${fieldId}">${esc(field.label)}</label>
        ${inputHTML}
      </div>
    `;
  }).join('');

  return `
    <div class="wizard-container">
      <h3 class="wizard-title">Customize ${esc(templateName)}</h3>
      <form id="wizard-form" class="wizard-form">
        ${fieldsHTML}
        <div class="wizard-actions">
          <button type="button" class="btn btn-secondary" onclick="hideModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Generate / View Code</button>
        </div>
      </form>
    </div>
    
    <script>
      document.getElementById('wizard-form').addEventListener('submit', function(e) {
        e.preventDefault();
        generateTemplateCode('${templateName}', '${config.id}');
      });
    </script>
  `;
}

// Global function for template generation (called from modal)
window.generateTemplateCode = async function(templateName, templateId) {
  const formData = new FormData(document.getElementById('wizard-form'));
  const params = {};
  
  // Collect form data
  const config = templateConfigs[templateName];
  config.fields.forEach(field => {
    const input = document.getElementById(`wizard-${field.name}`);
    if (input) {
      if (field.type === 'checkbox') {
        params[field.name] = input.checked;
      } else {
        params[field.name] = input.value;
      }
    }
  });

  try {
    // Show loading
    const submitBtn = document.querySelector('.wizard-actions .btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Generating...';
    submitBtn.disabled = true;

    // Generate OpenSCAD code based on template and parameters
    const scadCode = generateOpenSCADCode(templateId, params);
    
    // Show result in modal
    const resultHTML = `
      <div class="code-result">
        <h3>Generated OpenSCAD Code</h3>
        <div class="code-actions">
          <button class="btn btn-secondary" onclick="copyToClipboard()">Copy Code</button>
          <button class="btn btn-primary" onclick="downloadCode('${templateId}')">Download .scad</button>
        </div>
        <pre class="code-view"><code>${esc(scadCode)}</code></pre>
      </div>
      
      <script>
        window.generatedCode = ${JSON.stringify(scadCode)};
        
        function copyToClipboard() {
          navigator.clipboard.writeText(window.generatedCode).then(() => {
            alert('Code copied to clipboard!');
          });
        }
        
        function downloadCode(templateId) {
          const blob = new Blob([window.generatedCode], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = templateId + '-customized.scad';
          a.click();
          URL.revokeObjectURL(url);
        }
      </script>
    `;
    
    showModal(resultHTML);

  } catch (error) {
    alert('Failed to generate template: ' + error.message);
  }
};

function generateOpenSCADCode(templateId, params) {
  // Generate OpenSCAD code based on template and parameters
  switch (templateId) {
    case 'arduino-case':
      return generateArduinoCaseCode(params);
    case 'phone-case':
      return generatePhoneCaseCode(params);
    case 'desk-organizer':
      return generateDeskOrganizerCode(params);
    default:
      return `// Generated code for ${templateId}\n// Parameters: ${JSON.stringify(params, null, 2)}\n\ncube([10, 10, 10]);`;
  }
}

function generateArduinoCaseCode(params) {
  return `// Arduino ${params.board_type} Case
// Generated by FlexiCAD Designer Template Wizard

board_type = "${params.board_type}";
case_height = ${params.case_height};
screen_window = ${params.screen_window};
fan_mount = ${params.fan_mount};
port_clearance = ${params.port_clearance};

// Board dimensions
board_dims = board_type == "Uno" ? [68.6, 53.4, 1.6] :
             board_type == "Nano" ? [43.2, 18.5, 1.6] :
             [101.52, 53.3, 1.6]; // Mega

wall_thickness = 2;
clearance = 1;

module arduino_case() {
    difference() {
        // Main case body
        cube([
            board_dims[0] + 2*wall_thickness + 2*clearance,
            board_dims[1] + 2*wall_thickness + 2*clearance,
            case_height + wall_thickness
        ]);
        
        // Internal cavity
        translate([wall_thickness, wall_thickness, wall_thickness])
            cube([
                board_dims[0] + 2*clearance,
                board_dims[1] + 2*clearance,
                case_height
            ]);
        
        // USB port cutout
        if (port_clearance) {
            translate([-1, 7, wall_thickness + 2])
                cube([wall_thickness + 2, 12, 5]);
        }
        
        // Screen window
        if (screen_window) {
            translate([15, 10, -1])
                cube([20, 15, wall_thickness + 2]);
        }
    }
    
    // Fan mount
    if (fan_mount) {
        translate([board_dims[0]/2, board_dims[1] + wall_thickness + clearance + 1, wall_thickness])
            fan_mount_holes();
    }
}

module fan_mount_holes() {
    for (i = [-7.5, 7.5]) {
        for (j = [-7.5, 7.5]) {
            translate([i, 0, j + 7.5])
                rotate([90, 0, 0])
                    cylinder(h=5, d=3, center=true);
        }
    }
}

arduino_case();`;
}

function generatePhoneCaseCode(params) {
  const phoneSpecs = {
    'iPhone 14': [146.7, 71.5, 7.8],
    'iPhone 15': [147.6, 71.6, 7.8], 
    'Samsung S23': [146.3, 70.9, 7.6],
    'Custom': [150, 75, 8]
  };
  
  const dims = phoneSpecs[params.phone_model] || phoneSpecs['Custom'];
  
  return `// ${params.phone_model} Case
// Generated by FlexiCAD Designer Template Wizard

phone_length = ${dims[0]};
phone_width = ${dims[1]};
phone_thickness = ${dims[2]};
case_thickness = ${params.case_thickness};
camera_cutout = ${params.camera_cutout};
kickstand = ${params.kickstand};

module phone_case() {
    difference() {
        // Main case body
        minkowski() {
            cube([
                phone_length + 2*case_thickness - 4,
                phone_width + 2*case_thickness - 4,
                phone_thickness + case_thickness - 2
            ]);
            sphere(r=2);
        }
        
        // Phone cavity
        translate([case_thickness, case_thickness, case_thickness])
            cube([phone_length, phone_width, phone_thickness + 1]);
        
        // Camera cutout
        if (camera_cutout) {
            translate([phone_length - 25, phone_width - 25, -1])
                cube([30, 30, case_thickness + 2]);
        }
        
        // Charging port
        translate([-1, phone_width/2 - 8, case_thickness + 2])
            cube([case_thickness + 2, 16, 4]);
    }
    
    // Kickstand
    if (kickstand) {
        translate([phone_length/2, -2, case_thickness + 2])
            kickstand_module();
    }
}

module kickstand_module() {
    rotate([-15, 0, 0])
        cube([25, 3, 20]);
}

phone_case();`;
}

function generateDeskOrganizerCode(params) {
  return `// Desk Organizer
// Generated by FlexiCAD Designer Template Wizard

width = ${params.width};
depth = ${params.depth}; 
compartments = ${params.compartments};
pen_holder = ${params.pen_holder};

base_thickness = 3;
wall_thickness = 2;
height = 25;

module desk_organizer() {
    // Base
    cube([width, depth, base_thickness]);
    
    // Compartment walls
    compartment_width = width / compartments;
    
    for (i = [1:compartments-1]) {
        translate([i * compartment_width - wall_thickness/2, 0, base_thickness])
            cube([wall_thickness, depth, height]);
    }
    
    // Side walls
    translate([0, 0, base_thickness])
        cube([wall_thickness, depth, height]);
    translate([width - wall_thickness, 0, base_thickness])
        cube([wall_thickness, depth, height]);
    
    // Front and back walls
    translate([0, 0, base_thickness])
        cube([width, wall_thickness, height]);
    translate([0, depth - wall_thickness, base_thickness])
        cube([width, wall_thickness, height]);
    
    // Pen holder
    if (pen_holder) {
        translate([width - 25, depth - 25, base_thickness])
            pen_holder_module();
    }
}

module pen_holder_module() {
    difference() {
        cylinder(h=height + 10, d=20);
        translate([0, 0, base_thickness])
            cylinder(h=height + 10, d=16);
    }
}

desk_organizer();`;
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTemplateWizards);
} else {
  initTemplateWizards();
}