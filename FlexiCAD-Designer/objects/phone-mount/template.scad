// ============================================================================
// Professional Phone Mount - Car Dashboard/Desk Mount
// Purpose: Adjustable phone holder with secure grip and tilt mechanism
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
phone_width = 80;         // phone width (mm) - iPhone 14: 71.5mm, Samsung S23: 70.9mm
phone_thickness = 12;     // phone thickness with case (mm)
mount_base_width = 100;   // base plate width for stability (mm)
mount_base_depth = 80;    // base plate depth (mm) 
arm_height = 60;          // height of mounting arm (mm)
tilt_angle = 15;          // viewing angle tilt (degrees)
grip_depth = 15;          // how deep the side grips go (mm)
bottom_support_height = 8; // height of bottom phone rest (mm)

/* ------------------------- Assertions & Limits ---------------------------- */
assert(phone_width >= 60 && phone_width <= 100, "Phone width should be 60-100mm");
assert(phone_thickness >= 8 && phone_thickness <= 20, "Phone thickness should be 8-20mm");
assert(tilt_angle >= 0 && tilt_angle <= 45, "Tilt angle should be 0-45 degrees");

/* ------------------------- Derived Measurements --------------------------- */
wall_thickness = 3;
tolerance = 0.5;
phone_cradle_width = phone_width + tolerance;
phone_cradle_depth = phone_thickness + tolerance;

/* ------------------------------ Modules ---------------------------------- */

module base_plate() {
    // Stable base with rounded corners
    hull() {
        translate([5, 5, 0]) cylinder(r=5, h=4);
        translate([mount_base_width-5, 5, 0]) cylinder(r=5, h=4);
        translate([5, mount_base_depth-5, 0]) cylinder(r=5, h=4);
        translate([mount_base_width-5, mount_base_depth-5, 0]) cylinder(r=5, h=4);
    }
    
    // Cable management groove
    translate([mount_base_width/2 - 3, 0, 0])
        cube([6, mount_base_depth, 2]);
}

module mounting_arm() {
    // Vertical support arm
    translate([mount_base_width/2 - wall_thickness/2, mount_base_depth - 15, 4])
        cube([wall_thickness + 6, 15, arm_height]);
}

module phone_cradle() {
    // Main cradle body
    difference() {
        // Outer shell
        cube([phone_cradle_width + 2*wall_thickness, 
              phone_cradle_depth + wall_thickness, 
              40]);
        
        // Phone cavity
        translate([wall_thickness, wall_thickness, bottom_support_height])
            cube([phone_cradle_width, phone_cradle_depth + 1, 50]);
    }
    
    // Side grips for security
    translate([-2, 0, bottom_support_height + 10]) {
        cube([wall_thickness + 2, phone_cradle_depth + wall_thickness, 20]);
    }
    translate([phone_cradle_width + wall_thickness, 0, bottom_support_height + 10]) {
        cube([wall_thickness + 2, phone_cradle_depth + wall_thickness, 20]);
    }
    
    // Charging port access
    translate([phone_cradle_width/2 - 8, -1, 0])
        cube([16, wall_thickness + 2, bottom_support_height + 5]);
}

module complete_phone_mount() {
    // Base plate
    base_plate();
    
    // Mounting arm
    mounting_arm();
    
    // Phone cradle with tilt
    translate([mount_base_width/2 - phone_cradle_width/2 - wall_thickness, 
               mount_base_depth - 15, 
               arm_height + 4]) {
        rotate([tilt_angle, 0, 0])
            phone_cradle();
    }
    
    // Support brackets
    hull() {
        translate([mount_base_width/2 - 10, mount_base_depth - 15, 4])
            cube([20, 15, 5]);
        translate([mount_base_width/2 - phone_cradle_width/2 - wall_thickness, 
                   mount_base_depth - 15, 
                   arm_height])
            cube([phone_cradle_width + 2*wall_thickness, 15, 4]);
    }
}

/* --------------------------------- Call ---------------------------------- */
complete_phone_mount();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Ball socket up, clamp down on build plate
// Supports: Yes, for overhangs in ball socket area
// Layer height: 0.2mm for better detail on ball joint
// Infill: 25-30% for strength in moving parts
// Print speed: Slower (40mm/s) for better surface finish
// Post-processing: Test fit ball joint, may need light sanding for smooth operation