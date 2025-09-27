// ============================================================================
// License Plate Frame
// Purpose: Custom license plate mounting frame
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
plate_width = 372;          // license plate width (standard 372mm)
plate_height = 135;         // license plate height (standard 135mm)
frame_border = 15;          // frame border width (mm)
frame_thickness = 3;        // frame thickness (mm)
mounting_hole_diameter = 6;  // mounting hole diameter (mm)
corner_radius = 5;          // corner rounding (mm)
back_support_height = 8;    // rear support lip height (mm)

/* ------------------------- Assertions & Limits ---------------------------- */
assert(plate_width > 0 && plate_height > 0, "Plate dimensions must be > 0");
assert(frame_border >= 5, "Frame border should be ≥ 5mm");
assert(frame_thickness >= 2, "Frame thickness should be ≥ 2mm");

/* ------------------------- Derived Measurements --------------------------- */
total_width = plate_width + 2*frame_border;
total_height = plate_height + 2*frame_border;
cutout_width = plate_width;
cutout_height = plate_height;

/* ------------------------------ Modules ---------------------------------- */
module rounded_rect(w, h, r) {
    if (r > 0) {
        minkowski() {
            square([w - 2*r, h - 2*r], center=true);
            circle(r=r, $fn=32);
        }
    } else {
        square([w, h], center=true);
    }
}

module license_plate_frame() {
    difference() {
        // Main frame
        linear_extrude(frame_thickness) {
            rounded_rect(total_width, total_height, corner_radius);
        }
        
        // License plate cutout
        translate([0, 0, -0.5]) {
            linear_extrude(frame_thickness + 1) {
                rounded_rect(cutout_width, cutout_height, max(0, corner_radius - frame_border/2));
            }
        }
        
        // Mounting holes - top corners
        translate([total_width/2 - frame_border/2, total_height/2 - frame_border/2, -0.5]) {
            cylinder(d=mounting_hole_diameter, h=frame_thickness + 1, $fn=32);
        }
        translate([-total_width/2 + frame_border/2, total_height/2 - frame_border/2, -0.5]) {
            cylinder(d=mounting_hole_diameter, h=frame_thickness + 1, $fn=32);
        }
        
        // Mounting holes - bottom corners
        translate([total_width/2 - frame_border/2, -total_height/2 + frame_border/2, -0.5]) {
            cylinder(d=mounting_hole_diameter, h=frame_thickness + 1, $fn=32);
        }
        translate([-total_width/2 + frame_border/2, -total_height/2 + frame_border/2, -0.5]) {
            cylinder(d=mounting_hole_diameter, h=frame_thickness + 1, $fn=32);
        }
    }
    
    // Back support lip
    if (back_support_height > 0) {
        translate([0, 0, frame_thickness]) {
            difference() {
                linear_extrude(back_support_height) {
                    difference() {
                        rounded_rect(cutout_width + 4, cutout_height + 4, corner_radius);
                        rounded_rect(cutout_width, cutout_height, corner_radius);
                    }
                }
            }
        }
    }
}

/* --------------------------------- Call ---------------------------------- */
license_plate_frame();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Face down on build plate
// Supports: None needed
// Layer height: 0.2-0.3mm
// Infill: 20-25% for durability
// Print speed: Normal (50mm/s)
// Post-processing: Light deburring of mounting holes