// ============================================================================
// Car Dashboard Fascia Panel
// Purpose: Parametric fascia with round vent and N button cutouts (strict, no defaults).
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
panel_width = 200;        // overall width (mm)
panel_height = 100;       // overall height (mm)
panel_thickness = 15;     // panel depth (mm)
vent_count = 3;           // number of AC vents
vent_diameter = 30;       // AC vent diameter (mm)
button_count = 3;         // number of button holes
button_diameter = 12;     // button hole diameter (mm)

corner_radius = 3;        // small fixed fillet for safety
button_row_y = panel_height * 0.35; // fraction down from top
vent_center_y = panel_height * 0.70; // vent position from bottom
clearance = 0.35;         // fit tolerance

/* ------------------------- Assertions & Limits ---------------------------- */
assert(panel_width  > 0, "panel_width must be > 0");
assert(panel_height > 0, "panel_height must be > 0");
assert(panel_thickness >= 2, "panel_thickness should be ≥ 2mm");
assert(button_count >= 1, "At least one button");
assert(vent_count >= 2, "At least 2 vents");
assert(vent_diameter > 0 && button_diameter > 0, "diameters must be > 0");

/* ------------------------- Derived Measurements --------------------------- */
button_pitch = button_diameter * 1.8; // spacing guideline
buttons_total_span = (button_count - 1) * button_pitch;
buttons_start_x = (panel_width - buttons_total_span) / 2;

vent_pitch = vent_diameter * 1.5; // spacing between vents
vents_total_span = (vent_count - 1) * vent_pitch;
vents_start_x = (panel_width - vents_total_span) / 2;

/* ------------------------------ Modules ---------------------------------- */
module rounded_panel(w, h, t, r) {
  minkowski() {
    cube([w - 2*r, h - 2*r, t], center=false);
    cylinder(r=r, h=0.01, $fn=64);
  }
}

module car_fascia_panel() {
  difference() {
    // Base panel
    rounded_panel(panel_width, panel_height, panel_thickness, corner_radius);

    // Row of vents (3 vents centered horizontally)
    for (i = [0:vent_count-1]) {
      translate([vents_start_x + i * vent_pitch, vent_center_y, -0.5])
        cylinder(d=vent_diameter + clearance, h=panel_thickness + 1, $fn=96);
    }

    // Row of buttons
    for (i = [0:button_count-1]) {
      translate([buttons_start_x + i * button_pitch, button_row_y, -0.5])
        cylinder(d=button_diameter + clearance, h=panel_thickness + 1, $fn=96);
    }
  }
}

// 1:1 paper test (toggle by removing leading //)
// projection(cut=true) rounded_panel(panel_width, panel_height, 0.8, corner_radius);

/* --------------------------------- Call ---------------------------------- */
car_fascia_panel();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Face down (buttons facing build plate)
// Supports: None needed for this orientation
// Layer height: 0.2-0.3mm recommended
// Infill: 15-20% for strength
// Print speed: Normal (50-60mm/s)
// Post-processing: Light sanding of button holes for smooth fit