// ============================================================================
// Custom Plant Pot
// Purpose: Tapered pot with drainage; optional saucer.
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
outer_diameter = 120;     // pot outer diameter (mm)
pot_height = 100;         // pot height (mm)
wall_thickness = 3;       // wall thickness (mm)
drain_hole_count = 5;     // number of drainage holes
drain_hole_diameter = 8;  // drainage hole diameter (mm)
include_saucer = true;    // include matching saucer
clearance = 0.3;          // fit tolerance

/* ------------------------- Assertions & Limits ---------------------------- */
assert(outer_diameter > 0 && pot_height > 0, "pot dims > 0");
assert(wall_thickness >= 0, "wall_thickness ≥ 0");

/* ------------------------- Derived Measurements --------------------------- */
inner_diameter = outer_diameter - 2*wall_thickness;

/* ------------------------------ Modules ---------------------------------- */
module plant_pot() {
  // Tapered outer
  difference() {
    cylinder(d1=outer_diameter * 0.9, d2=outer_diameter, h=pot_height, $fn=128);

    // Hollow
    if (wall_thickness > 0) {
      translate([0,0,2])
        cylinder(d1=inner_diameter * 0.9, d2=inner_diameter, h=pot_height - 2, $fn=128);
    }

    // Drainage holes on bottom
    if (drain_hole_count > 0 && drain_hole_diameter > 0) {
      radius = (outer_diameter/2) * 0.5;
      for (i = [0:drain_hole_count-1]) {
        angle = 360/drain_hole_count * i;
        translate([radius * cos(angle), radius * sin(angle), -0.5])
          cylinder(d=drain_hole_diameter + clearance, h=3, $fn=48);
      }
    }
  }

  // Saucer
  if (include_saucer) {
    translate([0, 0, -8])
      difference() {
        cylinder(d=outer_diameter + 10, h=8, $fn=128);
        translate([0,0,2])
          cylinder(d=outer_diameter + 2, h=6, $fn=128);
      }
  }
}

/* --------------------------------- Call ---------------------------------- */
plant_pot();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Right-side up (bottom on build plate)
// Supports: None needed
// Layer height: 0.2-0.3mm
// Infill: 15-20% sufficient for planters
// Print speed: Normal (50mm/s)
// Post-processing: Test drainage holes are clear, drill if needed