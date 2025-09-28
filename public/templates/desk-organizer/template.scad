// Parametric Desk Organizer
// A customizable desk organizer with multiple compartments

// ============================== PARAMETERS ==============================
// Main dimensions
organizer_width = 200;        // Total width of organizer
organizer_depth = 100;        // Total depth of organizer
organizer_height = 60;        // Height of compartments
wall_thickness = 2;           // Wall thickness

// Compartment configuration
large_compartments = 2;       // Number of large compartments
small_compartments = 4;       // Number of small compartments
pen_holes = 6;                // Number of pen holes
pen_hole_diameter = 12;       // Diameter of pen holes

// ============================== MODULES ==============================

module desk_organizer() {
    difference() {
        // Main body
        cube([organizer_width, organizer_depth, organizer_height]);
        
        // Large compartments
        translate([wall_thickness, wall_thickness, wall_thickness])
        for (i = [0:large_compartments-1]) {
            translate([i * (organizer_width/large_compartments), 0, 0])
            cube([
                (organizer_width/large_compartments) - wall_thickness,
                (organizer_depth/2) - wall_thickness,
                organizer_height
            ]);
        }
        
        // Small compartments
        translate([wall_thickness, organizer_depth/2, wall_thickness])
        for (i = [0:small_compartments-1]) {
            translate([i * (organizer_width/small_compartments), 0, 0])
            cube([
                (organizer_width/small_compartments) - wall_thickness,
                (organizer_depth/2) - wall_thickness,
                organizer_height/2
            ]);
        }
        
        // Pen holes
        for (i = [0:pen_holes-1]) {
            translate([
                wall_thickness + (i * (organizer_width - 2*wall_thickness)/(pen_holes-1)),
                organizer_depth - wall_thickness - pen_hole_diameter/2 - 5,
                wall_thickness
            ])
            cylinder(d=pen_hole_diameter, h=organizer_height, $fn=32);
        }
    }
}

// ============================== MAIN ==============================
desk_organizer();

// ============================== PRINT NOTES ==============================
// Print upright as shown
// No supports needed
// Layer height: 0.2mm
// Infill: 15-20%