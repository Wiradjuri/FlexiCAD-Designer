// ============================================================================
// Desktop Pen Organizer
// Purpose: Cylindrical body with radial pen slots.
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
outer_diameter = 80;      // holder outer diameter (mm)
holder_height = 60;       // holder height (mm)
slot_count = 8;           // number of pen slots
pen_diameter = 10;        // pen diameter (mm)
center_compartment_enabled = true; // add center storage
wall_thickness = 3;       // wall thickness (mm)
clearance = 0.3;          // fit tolerance

/* ------------------------- Assertions & Limits ---------------------------- */
assert(outer_diameter > 0 && holder_height > 0, "Holder dims > 0");
assert(slot_count >= 1, "At least one slot");

/* ------------------------- Derived Measurements --------------------------- */
inner_diameter = outer_diameter - 2*wall_thickness;
slot_radius = (outer_diameter/2) - wall_thickness - (pen_diameter/2) - 2;

/* ------------------------------ Modules ---------------------------------- */
module pen_holder_rotary() {
  difference() {
    // Outer cylinder
    cylinder(d=outer_diameter, h=holder_height, $fn=128);

    // Hollow body
    if (wall_thickness > 0) {
      translate([0,0,2])
        cylinder(d=inner_diameter, h=holder_height - 2, $fn=128);
    }

    // Radial pen slots
    for (i = [0:slot_count-1]) {
      angle = 360/slot_count * i;
      translate([slot_radius * cos(angle), slot_radius * sin(angle), -0.5])
        cylinder(d=pen_diameter + clearance, h=holder_height + 1, $fn=64);
    }

    // Optional center compartment
    if (center_compartment_enabled && wall_thickness > 0) {
      translate([0,0,2])
        cylinder(d=(inner_diameter/2), h=holder_height - 4, $fn=96);
    }
  }
}

/* --------------------------------- Call ---------------------------------- */
pen_holder_rotary();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Bottom down on build plate
// Supports: None needed
// Layer height: 0.2mm for smooth surfaces
// Infill: 15-20% sufficient for desk use
// Print speed: Normal (50mm/s)
// Post-processing: Test fit pens, smooth interior if needed