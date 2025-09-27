// ============================================================================
// Arduino Protection Case
// Purpose: Board-specific snug case with optional screen cutout and fan mount.
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
board_type = "Uno";       // Board type: "Uno", "Nano", or "Mega"
case_height = 20;         // case height (mm)
wall_thickness = 2;       // wall thickness (mm)
port_clearance = 2;       // extra space around board (mm)
include_screen_cutout = false; // add screen window on top
include_fan_mount = false;     // add fan mounting hole on top
clearance = 0.35;         // fit tolerance

/* ------------------------- Board Dimensions (Built-in) ------------------------ */
// Arduino Uno dimensions
board_length = board_type == "Uno" ? 68.6 : 
               board_type == "Nano" ? 45.0 : 
               board_type == "Mega" ? 101.5 : 68.6;
               
board_width = board_type == "Uno" ? 53.4 : 
              board_type == "Nano" ? 18.0 : 
              board_type == "Mega" ? 53.3 : 53.4;

/* ------------------------- Assertions & Limits ---------------------------- */
assert(board_length > 0 && board_width > 0, "Board dims > 0");
assert(case_height >= 12, "Case height should be ≥ 12mm");
assert(wall_thickness >= 1.6, "Wall thickness ≥ 1.6mm recommended");

/* ------------------------- Derived Measurements --------------------------- */
inner_length = board_length + 2*port_clearance;
inner_width  = board_width  + 2*port_clearance;

/* ------------------------------ Modules ---------------------------------- */
module arduino_case() {
  difference() {
    // Outer shell
    cube([inner_length + 2*wall_thickness, inner_width + 2*wall_thickness, case_height], center=false);

    // Hollow
    translate([wall_thickness, wall_thickness, wall_thickness])
      cube([inner_length, inner_width, case_height - wall_thickness], center=false);

    // Simple side port cutout (USB side)
    translate([0, (inner_width/2) + wall_thickness, case_height/2])
      rotate([90,0,0])
      cube([12 + clearance, 6 + clearance, wall_thickness + 1], center=true);

    // Screen window (top)
    if (include_screen_cutout) {
      translate([ (inner_length/2) + wall_thickness, (inner_width/2) + wall_thickness, case_height + 0.5 ])
        rotate([90,0,0])
        cylinder(d=18 + clearance, h=wall_thickness + 1, $fn=64);
    }

    // Fan mount (top)
    if (include_fan_mount) {
      translate([ (inner_length/2) + wall_thickness, (inner_width/2) + wall_thickness, case_height + 0.5 ])
        rotate([90,0,0])
        cylinder(d=30 + clearance, h=wall_thickness + 1, $fn=96);
    }
  }
}

/* --------------------------------- Call ---------------------------------- */
arduino_case();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Bottom down on build plate (opening facing up)
// Supports: None needed
// Layer height: 0.2mm for good detail
// Infill: 20% for protection strength
// Print speed: Normal (50mm/s)
// Post-processing: Test fit board, may need light filing of port opening