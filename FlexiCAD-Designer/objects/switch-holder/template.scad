// ============================================================================
// Switch Holder
// Purpose: Panel-mount switch housing for electronic projects
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
switch_diameter = 16;       // switch shaft diameter (mm)
panel_thickness = 3;        // panel thickness to mount in (mm)
holder_height = 20;         // total holder height (mm)
wall_thickness = 2;         // wall thickness (mm)
mounting_tabs = true;       // include mounting tabs
tab_width = 8;              // mounting tab width (mm)
tab_thickness = 2;          // mounting tab thickness (mm)

/* ------------------------- Assertions & Limits ---------------------------- */
assert(switch_diameter > 0, "Switch diameter must be > 0");
assert(panel_thickness > 0, "Panel thickness must be > 0");
assert(wall_thickness >= 1, "Wall thickness should be ≥ 1mm");

/* ------------------------- Derived Measurements --------------------------- */
outer_diameter = switch_diameter + 2*wall_thickness;
total_height = holder_height;

/* ------------------------------ Modules ---------------------------------- */
module switch_holder() {
    difference() {
        // Main body
        cylinder(d=outer_diameter, h=total_height, $fn=64);
        
        // Switch hole
        translate([0, 0, -0.5]) {
            cylinder(d=switch_diameter, h=total_height + 1, $fn=64);
        }
        
        // Panel cutout
        translate([0, 0, total_height - panel_thickness]) {
            cylinder(d=outer_diameter + 2, h=panel_thickness + 1, $fn=64);
        }
    }
    
    // Mounting tabs
    if (mounting_tabs) {
        for (angle = [0, 120, 240]) {
            rotate([0, 0, angle]) {
                translate([outer_diameter/2, 0, total_height - panel_thickness - tab_thickness]) {
                    cube([tab_width, tab_width, tab_thickness], center=true);
                }
            }
        }
    }
}

/* --------------------------------- Call ---------------------------------- */
switch_holder();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Base down on build plate
// Supports: None needed for this design
// Layer height: 0.2mm for smooth fit
// Infill: 25-30% for mounting strength
// Print speed: Normal (50mm/s)
// Post-processing: Test fit switch before final assembly