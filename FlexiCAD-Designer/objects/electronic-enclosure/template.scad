// ============================================================================
// Electronic Project Enclosure
// Purpose: Hollow box w/ vents and cable entry.
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
box_length = 100;         // enclosure length (mm)
box_width = 60;           // enclosure width (mm)
box_height = 30;          // enclosure height (mm)
wall_thickness = 2;       // wall thickness (mm)
vent_count = 6;           // number of ventilation holes
cable_diameter = 8;       // cable entry diameter (mm)
clearance = 0.3;          // fit tolerance

/* ------------------------- Assertions & Limits ---------------------------- */
assert(box_length > 0 && box_width > 0 && box_height > 0, "box dims > 0");
assert(wall_thickness >= 0, "wall_thickness ≥ 0");

/* ------------------------- Derived Measurements --------------------------- */
inner_length = box_length - 2*wall_thickness;
inner_width  = box_width  - 2*wall_thickness;
inner_height = box_height - wall_thickness;

/* ------------------------------ Modules ---------------------------------- */
module enclosure_box() {
  difference() {
    // Outer shell
    cube([box_length, box_width, box_height], center=false);

    // Hollow
    if (wall_thickness > 0) {
      translate([wall_thickness, wall_thickness, wall_thickness])
        cube([inner_length, inner_width, inner_height], center=false);
    }

    // Cable entry on one side
    if (cable_diameter > 0) {
      translate([box_length/2, -0.5, box_height/2])
        rotate([90,0,0])
        cylinder(d=cable_diameter + clearance, h=wall_thickness + 1, $fn=64);
    }

    // Top vents array
    if (vent_count > 0) {
      for (i = [0:vent_count-1]) {
        translate([ (i+0.5)*(box_length/vent_count), box_width/2, box_height + 0.5 ])
          rotate([90,0,0])
          cylinder(d=4 + clearance, h=wall_thickness + 1, $fn=48);
      }
    }
  }
}

/* --------------------------------- Call ---------------------------------- */
enclosure_box();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Bottom face down on build plate
// Supports: None needed
// Layer height: 0.2-0.3mm
// Infill: 15-20% sufficient for electronics housing
// Print speed: Normal (50mm/s)
// Post-processing: Test fit cables through entry hole, drill if needed