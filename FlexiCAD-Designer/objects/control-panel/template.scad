// ============================================================================
// Multi-Purpose Control Panel
// Purpose: Flat panel with buttons & dials arrays.
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
panel_width = 150;        // panel width (mm)
panel_height = 80;        // panel height (mm)
panel_thickness = 5;      // panel thickness (mm)
button_count = 4;         // number of buttons
button_diameter = 12;     // button diameter (mm)
dial_count = 2;           // number of dials
dial_diameter = 20;       // dial diameter (mm)
corner_radius = 4;        // corner rounding
clearance = 0.35;         // fit tolerance

/* ------------------------- Assertions & Limits ---------------------------- */
assert(panel_width > 0 && panel_height > 0 && panel_thickness > 0, "panel dims > 0");
assert(button_count >= 0 && dial_count >= 0, "counts ≥ 0");

/* ------------------------- Derived Measurements --------------------------- */
button_pitch = (button_diameter > 0) ? button_diameter * 1.8 : 0;
dial_pitch   = (dial_diameter > 0)   ? dial_diameter   * 2.0 : 0;
buttons_span = (button_count > 0) ? (button_count - 1) * button_pitch : 0;
dials_span   = (dial_count   > 0) ? (dial_count   - 1) * dial_pitch   : 0;
buttons_y = panel_height * 0.35;
dials_y   = panel_height * 0.70;
buttons_start_x = (panel_width - buttons_span) / 2;
dials_start_x   = (panel_width - dials_span) / 2;

/* ------------------------------ Modules ---------------------------------- */
module rounded_panel(w, h, t, r) {
  minkowski() {
    cube([w - 2*r, h - 2*r, t], center=false);
    cylinder(r=r, h=0.01, $fn=64);
  }
}

module control_panel() {
  difference() {
    rounded_panel(panel_width, panel_height, panel_thickness, corner_radius);

    // Buttons
    if (button_count > 0 && button_diameter > 0) {
      for (i = [0:button_count-1]) {
        translate([buttons_start_x + i * button_pitch, buttons_y, -0.5])
          cylinder(d=button_diameter + clearance, h=panel_thickness + 1, $fn=96);
      }
    }

    // Dials
    if (dial_count > 0 && dial_diameter > 0) {
      for (i = [0:dial_count-1]) {
        translate([dials_start_x + i * dial_pitch, dials_y, -0.5])
          cylinder(d=dial_diameter + clearance, h=panel_thickness + 1, $fn=96);
      }
    }
  }
}

/* --------------------------------- Call ---------------------------------- */
control_panel();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Face down on build plate (holes facing up)
// Supports: None needed
// Layer height: 0.2mm for smooth holes
// Infill: 20-25% for control interface strength
// Print speed: Normal (50mm/s)
// Post-processing: Test fit controls, light drilling if needed for smooth operation