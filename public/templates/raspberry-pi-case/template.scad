// ============================================================================
// Raspberry Pi Case
// Purpose: Protective enclosure for Raspberry Pi boards
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
board_type = "4B";           // "4B", "3B+", "Zero", "Pico"
include_lid = true;          // generate separate lid
wall_thickness = 2;          // case wall thickness (mm)
bottom_thickness = 2;        // case bottom thickness (mm)
clearance = 0.5;            // clearance around board (mm)
port_clearance = 1;         // extra clearance for ports (mm)
ventilation_holes = true;    // include cooling holes
mounting_posts = true;       // include board mounting posts

/* ------------------------- Board Dimensions (don't edit) ------------------------ */
// Raspberry Pi 4B dimensions
board_length_4B = 85;
board_width_4B = 56;
board_height_4B = 1.6;

// Raspberry Pi Zero dimensions  
board_length_Zero = 65;
board_width_Zero = 30;
board_height_Zero = 1.6;

/* ------------------------- Derived Measurements --------------------------- */
board_length = (board_type == "4B" || board_type == "3B+") ? board_length_4B : 
               (board_type == "Zero") ? board_length_Zero : board_length_4B;
board_width = (board_type == "4B" || board_type == "3B+") ? board_width_4B : 
              (board_type == "Zero") ? board_width_Zero : board_width_4B;

case_length = board_length + 2*clearance + 2*wall_thickness;
case_width = board_width + 2*clearance + 2*wall_thickness;
case_height = 25; // Sufficient for most Pi configurations

/* ------------------------------ Modules ---------------------------------- */
module pi_case_bottom() {
    difference() {
        // Outer shell
        cube([case_length, case_width, case_height]);
        
        // Inner cavity
        translate([wall_thickness, wall_thickness, bottom_thickness]) {
            cube([board_length + 2*clearance, board_width + 2*clearance, case_height]);
        }
        
        // Port cutouts for Pi 4B
        if (board_type == "4B" || board_type == "3B+") {
            // USB ports
            translate([case_length - wall_thickness - 1, 12, bottom_thickness + 3]) {
                cube([wall_thickness + 2, 16, 8]);
            }
            translate([case_length - wall_thickness - 1, 30, bottom_thickness + 3]) {
                cube([wall_thickness + 2, 16, 8]);
            }
            
            // Ethernet port
            translate([case_length - wall_thickness - 1, 48, bottom_thickness + 3]) {
                cube([wall_thickness + 2, 16, 12]);
            }
            
            // HDMI ports
            translate([15, -1, bottom_thickness + 2]) {
                cube([16, wall_thickness + 2, 8]);
            }
            translate([35, -1, bottom_thickness + 2]) {
                cube([16, wall_thickness + 2, 8]);
            }
            
            // Power port
            translate([2, -1, bottom_thickness + 2]) {
                cube([10, wall_thickness + 2, 6]);
            }
        }
        
        // Ventilation holes
        if (ventilation_holes) {
            for (x = [wall_thickness + 10 : 8 : case_length - wall_thickness - 10]) {
                for (y = [wall_thickness + 8 : 8 : case_width - wall_thickness - 8]) {
                    translate([x, y, -0.5]) {
                        cylinder(d=3, h=bottom_thickness + 1, $fn=16);
                    }
                }
            }
        }
    }
    
    // Mounting posts
    if (mounting_posts) {
        post_positions = (board_type == "4B" || board_type == "3B+") ? 
            [[3.5, 3.5], [61.5, 3.5], [3.5, 52.5], [61.5, 52.5]] :
            [[3.5, 3.5], [61.5, 3.5], [3.5, 26.5], [61.5, 26.5]];
            
        for (pos = post_positions) {
            translate([wall_thickness + clearance + pos[0], wall_thickness + clearance + pos[1], bottom_thickness]) {
                difference() {
                    cylinder(d=6, h=board_height_4B + 2, $fn=32);
                    translate([0, 0, board_height_4B + 1]) {
                        cylinder(d=2.5, h=2, $fn=16);
                    }
                }
            }
        }
    }
}

module pi_case_lid() {
    difference() {
        cube([case_length, case_width, wall_thickness + 3]);
        
        // Inner recess
        translate([1, 1, wall_thickness]) {
            cube([case_length - 2, case_width - 2, 4]);
        }
        
        // Ventilation holes
        if (ventilation_holes) {
            for (x = [10 : 8 : case_length - 10]) {
                for (y = [8 : 8 : case_width - 8]) {
                    translate([x, y, -0.5]) {
                        cylinder(d=3, h=wall_thickness + 1, $fn=16);
                    }
                }
            }
        }
    }
}

/* --------------------------------- Call ---------------------------------- */
pi_case_bottom();

if (include_lid) {
    translate([case_length + 10, 0, 0]) {
        pi_case_lid();
    }
}

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Bottom piece upright, lid face-down
// Supports: None needed
// Layer height: 0.2mm for good detail
// Infill: 20-25% sufficient
// Print speed: Normal (50mm/s)
// Post-processing: Test board fit before final assembly