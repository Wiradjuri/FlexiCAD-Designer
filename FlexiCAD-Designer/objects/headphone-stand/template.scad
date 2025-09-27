// ============================================================================
// Professional Gaming Headphone Stand with RGB
// Purpose: Premium headphone display with cable management and customization
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
headphone_width = 180;    // headphone width (mm)
stand_height = 280;       // stand height (mm)
base_diameter = 140;      // base diameter for stability (mm)
post_diameter = 20;       // post diameter (mm)
rgb_enabled = true;       // include RGB LED channel
cable_management = true;  // include cable routing
usb_hub = true;          // include USB hub cavity
weight_cavity = true;     // hollow base for added weight
hook_angle = 15;         // hook forward angle (degrees)

/* ------------------------- Assertions & Limits ---------------------------- */
assert(stand_height >= 200 && stand_height <= 350, "Stand height should be 200-350mm");
assert(headphone_width >= 120 && headphone_width <= 220, "Headphone width should be 120-220mm");
assert(hook_angle >= 0 && hook_angle <= 30, "Hook angle should be 0-30 degrees");

/* ------------------------- Derived Measurements --------------------------- */
hook_depth = (headphone_width / 2) + 20;
base_height = 15;
hook_width = 80;
cable_channel_width = 8;

/* ------------------------------ Modules ---------------------------------- */

module weighted_base() {
    difference() {
        // Main base with rounded edges
        hull() {
            cylinder(d=base_diameter, h=base_height, $fn=64);
            translate([0, 0, base_height-2])
                cylinder(d=base_diameter-10, h=2, $fn=64);
        }
        
        // Weight cavity
        if (weight_cavity) {
            translate([0, 0, 3])
                cylinder(d=base_diameter-20, h=base_height-5, $fn=64);
        }
        
        // USB hub cavity
        if (usb_hub) {
            translate([base_diameter/2-15, -20, 2])
                cube([25, 40, 8]);
        }
        
        // Cable exit slots
        if (cable_management) {
            translate([base_diameter/2-2, -cable_channel_width/2, 0])
                cube([8, cable_channel_width, base_height]);
        }
    }
    
    // Non-slip feet
    for(i = [0:2]) {
        rotate([0, 0, i * 120])
            translate([base_diameter/2-8, 0, 0])
                cylinder(d=12, h=2, $fn=16);
    }
}

module support_post() {
    difference() {
        // Main post with slight taper
        translate([0, 0, base_height])
            cylinder(d1=post_diameter+2, d2=post_diameter, h=stand_height-base_height-30, $fn=32);
        
        // RGB LED channel
        if (rgb_enabled) {
            translate([0, 0, base_height+5])
                cylinder(d=6, h=stand_height-base_height-40, $fn=16);
        }
        
        // Cable routing channel
        if (cable_management) {
            translate([-cable_channel_width/2, post_diameter/2-2, base_height])
                cube([cable_channel_width, 4, stand_height-base_height-30]);
        }
    }
}

module headphone_hook() {
    translate([0, 0, stand_height-25]) {
        // Main hook arm
        rotate([hook_angle, 0, 0]) {
            difference() {
                // Hook shape
                hull() {
                    cylinder(d=post_diameter, h=10, $fn=32);
                    translate([hook_depth, 0, 0])
                        cylinder(d=15, h=10, $fn=32);
                }
                
                // Headphone rest groove
                translate([10, 0, 5])
                    rotate([0, 90, 0])
                        cylinder(d=8, h=hook_depth-5, $fn=16);
            }
            
            // Hook end with padding area
            translate([hook_depth, 0, 0]) {
                difference() {
                    cylinder(d=18, h=10, $fn=32);
                    translate([0, 0, -1])
                        cylinder(d=10, h=12, $fn=16);
                }
                // Soft padding ring area
                translate([0, 0, 8])
                    torus(12, 2);
            }
        }
        
        // Support strut
        hull() {
            cylinder(d=post_diameter/2, h=5, $fn=16);
            rotate([hook_angle, 0, 0])
                translate([hook_depth/2, 0, 0])
                    cylinder(d=8, h=5, $fn=16);
        }
    }
}

module torus(major_r, minor_r) {
    rotate_extrude($fn=32)
        translate([major_r, 0, 0])
            circle(r=minor_r, $fn=16);
}

module cable_organizer() {
    if (cable_management) {
        // Spiral cable guide on post
        for(i = [0:10]) {
            height = base_height + 20 + (i * 15);
            rotate([0, 0, i * 36])
                translate([post_diameter/2 + 2, 0, height])
                    sphere(d=4, $fn=12);
        }
        
        // Cable clips at base
        for(i = [0:1]) {
            rotate([0, 0, i * 180])
                translate([base_diameter/2-8, 0, base_height])
                    difference() {
                        cylinder(d=8, h=6, $fn=16);
                        translate([0, 0, 2])
                            cylinder(d=5, h=5, $fn=16);
                        translate([-2.5, -6, 2])
                            cube([5, 12, 5]);
                    }
        }
    }
}

module complete_headphone_stand() {
    weighted_base();
    support_post();
    headphone_hook();
    cable_organizer();
    
    // Brand/customization text area
    translate([0, -base_diameter/2+5, 1])
        linear_extrude(1)
            text("FLEXICAD", size=8, halign="center", font="Arial:style=Bold");
}

/* --------------------------------- Call ---------------------------------- */
complete_headphone_stand();

/* ============================== PRINT SETTINGS ============================== */
// Print orientation: Base down (as oriented)
// Layer height: 0.2mm
// Infill: 25% for base, 15% for post
// Supports: None needed
// Material: PETG or ABS for durability
// Post-processing: Add felt padding to hook, optional RGB LED strip
    difference() {
      cylinder(d=post_diameter + 10, h=hook_depth, $fn=96);
      translate([0,0,-0.5]) cylinder(d=post_diameter + 2, h=hook_depth + 1, $fn=96);
    }

  // Cable manager notch
  if (cable_manager) {
    translate([0, base_diameter/2 - 8, 6])
      cube([14, 6, 6], center=true);
  }
}

/* --------------------------------- Call ---------------------------------- */
headphone_stand();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Base down on build plate
// Supports: Yes, needed for horizontal hook overhang
// Layer height: 0.2mm for smooth finish
// Infill: 25% for stability, 100% if weighted_base is false
// Print speed: Normal (50mm/s)
// Post-processing: Remove supports carefully from hook area