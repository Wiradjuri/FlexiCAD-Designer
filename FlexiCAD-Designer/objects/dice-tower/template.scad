// ============================================================================
// Tabletop Dice Tower
// Purpose: Multi-ramp randomizer with optional tray.
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
tower_height = 120;       // tower height (mm)
base_width = 80;          // base width (mm)
ramp_angle = 30;          // ramp angle (degrees)
levels = 4;               // number of levels
wall_thickness = 2;       // wall thickness (mm)
include_tray = true;      // include dice collection tray
clearance = 0.3;          // fit tolerance

/* ------------------------- Assertions & Limits ---------------------------- */
assert(tower_height > 0 && base_width > 0, "tower/base > 0");
assert(levels >= 2, "At least two levels");
assert(ramp_angle >= 10 && ramp_angle <= 70, "ramp angle reasonable");

/* ------------------------- Derived Measurements --------------------------- */
inner_width = base_width - 2*wall_thickness;
level_step = tower_height / levels;

/* ------------------------------ Modules ---------------------------------- */
module dice_tower() {
  // Tower shell
  difference() {
    cube([base_width, base_width, tower_height], center=false);
    if (wall_thickness > 0) {
      translate([wall_thickness, wall_thickness, wall_thickness])
        cube([inner_width, inner_width, tower_height - wall_thickness], center=false);
    }
  }

  // Ramps (simple planes)
  for (i = [0:levels-1]) {
    z = (i+0.5) * level_step;
    translate([wall_thickness + 2, wall_thickness + 2, z])
      rotate([ramp_angle, 0, (i%2==0) ? 0 : 180])
      cube([inner_width - 4, 2, inner_width - 4], center=false);
  }

  // Output tray
  if (include_tray) {
    translate([0, base_width + 2, 0])
      difference() {
        cube([base_width, base_width * 0.6, 22], center=false);
        translate([wall_thickness, wall_thickness, 2])
          cube([base_width - 2*wall_thickness, base_width * 0.6 - 2*wall_thickness, 18], center=false);
      }
  }
}

/* --------------------------------- Call ---------------------------------- */
dice_tower();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Base down on build plate
// Supports: Yes, needed for ramp overhangs
// Layer height: 0.2mm for good detail
// Infill: 20-25% for gaming durability
// Print speed: Normal (50mm/s)
// Post-processing: Remove supports carefully, test dice flow through tower