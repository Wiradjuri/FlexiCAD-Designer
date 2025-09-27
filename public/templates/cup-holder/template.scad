// ============================================================================
// Universal Car Cup Holder Insert 
// Purpose: Adjustable insert with spring-loaded grips and multiple cup sizes
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
cup_diameter_min = 65;    // minimum cup diameter to hold (mm)
cup_diameter_max = 85;    // maximum cup diameter to hold (mm)
insert_height = 80;       // total height of insert (mm)
grip_count = 4;           // number of spring grips (3-6)
grip_thickness = 3;       // thickness of grip arms (mm)
base_diameter = 90;       // outer diameter of base (fits car holder)
base_height = 15;         // height of base section (mm)
spring_flex = 8;          // how much grips can flex inward (mm)

/* ------------------------- Assertions & Limits ---------------------------- */
assert(cup_diameter_min > 0 && cup_diameter_max > cup_diameter_min, "Cup diameters invalid");
assert(grip_count >= 3 && grip_count <= 8, "Grip count should be 3-8");
assert(insert_height > base_height, "Insert height must be > base height");

/* ------------------------- Derived Measurements --------------------------- */
wall_thickness = 2.5;
grip_start_diameter = cup_diameter_max + 2*spring_flex;
grip_end_diameter = cup_diameter_min;
grip_angle = 360 / grip_count;

/* ------------------------------ Modules ---------------------------------- */

module base_section() {
    // Stable base that fits in car cup holder
    difference() {
        cylinder(d=base_diameter, h=base_height, $fn=64);
        
        // Weight reduction holes
        for(i = [0:5]) {
            rotate([0, 0, i * 60])
                translate([base_diameter/3, 0, -1])
                    cylinder(d=8, h=base_height + 2, $fn=16);
        }
    }
    
    // Center spigot for cup centering
    translate([0, 0, base_height])
        cylinder(d=20, h=5, $fn=32);
}

module flexible_grip(angle) {
    rotate([0, 0, angle]) {
        // Grip arm with taper
        hull() {
            translate([grip_end_diameter/2, 0, base_height])
                cylinder(d=grip_thickness, h=insert_height - base_height - 10, $fn=8);
            translate([grip_start_diameter/2, 0, base_height])
                cylinder(d=grip_thickness + 1, h=5, $fn=8);
        }
        
        // Grip tip with rubber contact area
        translate([grip_end_diameter/2, 0, insert_height - 15])
            sphere(d=grip_thickness + 2, $fn=16);
    }
}

module cup_stabilizer_rings() {
    // Multiple diameter rings for different cup sizes
    for(i = [0:2]) {
        ring_diameter = cup_diameter_min + (i * 8);
        ring_height = base_height + 20 + (i * 15);
        
        difference() {
            translate([0, 0, ring_height])
                cylinder(d=ring_diameter + 4, h=2, $fn=32);
            translate([0, 0, ring_height - 1])
                cylinder(d=ring_diameter, h=4, $fn=32);
        }
    }
}

module complete_cup_holder() {
    // Main base
    base_section();
    
    // Spring grips
    for(i = [0:grip_count-1]) {
        flexible_grip(i * grip_angle);
    }
    
    // Support rings for stability
    cup_stabilizer_rings();
    
    // Connecting structure
    for(i = [0:grip_count-1]) {
        rotate([0, 0, i * grip_angle]) {
            hull() {
                translate([15, 0, base_height])
                    cylinder(d=2, h=5, $fn=8);
                translate([grip_start_diameter/2 - 5, 0, base_height])
                    cylinder(d=2, h=5, $fn=8);
            }
        }
    }
}

/* --------------------------------- Call ---------------------------------- */
complete_cup_holder();

/* ============================== PRINT SETTINGS ============================== */
// Print orientation: Base down (as oriented)
// Supports: None needed - designed for support-free printing
// Layer height: 0.15-0.2mm for grip flexibility
// Infill: 15-20% for flexibility in grips
// Print speed: 40mm/s for grip details
// Material: PETG or PLA+ recommended for flexibility