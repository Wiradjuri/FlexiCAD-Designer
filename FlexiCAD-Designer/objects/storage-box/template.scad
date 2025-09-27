// ============================================================================
// Modular Storage Container
// Purpose: Box with optional dividers and stack lips.
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
box_length = 120;         // box length (mm)
box_width = 80;           // box width (mm)
box_height = 40;          // box height (mm)
wall_thickness = 2;       // wall thickness (mm)
dividers_enabled = true;  // include dividers
divider_count = 2;        // number of dividers
stackable = true;         // include stacking lips
clearance = 0.25;         // fit tolerance

/* ------------------------- Assertions & Limits ---------------------------- */
assert(box_length > 0 && box_width > 0 && box_height > 0, "box dims > 0");
assert(wall_thickness >= 0, "wall_thickness ≥ 0");
assert(divider_count >= 0, "divider_count ≥ 0");

/* ------------------------- Derived Measurements --------------------------- */
inner_length = box_length - 2*wall_thickness;
inner_width  = box_width  - 2*wall_thickness;
inner_height = box_height - wall_thickness;

/* ------------------------------ Modules ---------------------------------- */
module storage_box_modular() {
  difference() {
    // Outer shell
    cube([box_length, box_width, box_height], center=false);

    // Hollow
    if (wall_thickness > 0) {
      translate([wall_thickness, wall_thickness, wall_thickness])
        cube([inner_length, inner_width, inner_height], center=false);
    }

    // Stack lip (simple ledge)
    if (stackable) {
      translate([0,0,box_height - 2])
        difference() {
          cube([box_length, box_width, 2], center=false);
          translate([1.2,1.2,-0.5]) cube([box_length - 2.4, box_width - 2.4, 3], center=false);
        }
    }

    // Dividers (vertical in length direction)
    if (dividers_enabled && divider_count > 0 && inner_length > 10) {
      pitch = inner_length / (divider_count + 1);
      for (i = [1:divider_count]) {
        translate([wall_thickness + i*pitch - 0.5, wall_thickness, wall_thickness])
          cube([1.0, inner_width, inner_height], center=false);
      }
    }
  }
}

/* --------------------------------- Call ---------------------------------- */
storage_box_modular();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Bottom down on build plate
// Supports: None needed
// Layer height: 0.2-0.3mm
// Infill: 15-20% for light storage use
// Print speed: Normal (50mm/s)
// Post-processing: Test stacking fit if using stackable feature