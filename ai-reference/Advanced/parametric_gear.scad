// parametric_gear.scad - Advanced Parametric Gear Example
// This shows advanced techniques: parametric design, loops, mathematical calculations

// Gear parameters
teeth = 20;           // Number of teeth
module_size = 2;      // Size of gear teeth
pressure_angle = 20;  // Pressure angle in degrees
thickness = 5;        // Gear thickness
bore_diameter = 8;    // Center hole diameter

// Calculate gear dimensions
pitch_diameter = teeth * module_size;
outer_diameter = pitch_diameter + 2 * module_size;
root_diameter = pitch_diameter - 2.5 * module_size;

// Main gear
difference() {
    // Gear body
    cylinder(d = outer_diameter, h = thickness);
    
    // Center bore
    cylinder(d = bore_diameter, h = thickness + 2, center = true);
    
    // Gear teeth (subtractive method)
    for (i = [0:teeth-1]) {
        rotate([0, 0, i * 360/teeth]) {
            translate([pitch_diameter/2, 0, -1])
                gear_tooth_cutout();
        }
    }
}

// Module for individual tooth cutout
module gear_tooth_cutout() {
    // Create tooth profile using involute curve approximation
    linear_extrude(height = thickness + 2) {
        polygon([
            [-module_size/2, -module_size],
            [module_size/2, -module_size], 
            [module_size/3, module_size],
            [-module_size/3, module_size]
        ]);
    }
}

// Optional: Add hub reinforcement
difference() {
    cylinder(d = bore_diameter + 6, h = thickness);
    cylinder(d = bore_diameter, h = thickness + 2, center = true);
}