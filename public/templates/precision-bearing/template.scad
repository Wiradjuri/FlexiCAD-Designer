/*
 * ================================================================
 * PARAMETRIC PRECISION BEARING
 * Custom ball bearing with configurable races and tolerances
 * ================================================================
 */

/* ----------------------------- USER PARAMETERS ----------------------------- */

// Bearing Dimensions
inner_diameter = 15;       // Inner race diameter (mm)
outer_diameter = 35;       // Outer race diameter (mm)  
bearing_width = 11;        // Bearing width (mm)
ball_count = 8;            // Number of ball bearings

// Precision Settings
bearing_tolerance = 0.1;   // Bearing clearance (mm)
race_depth = 2;            // Ball race groove depth (mm)
surface_finish = "smooth"; // "smooth", "polished", "textured"

// Advanced Features
sealed_bearing = true;     // Include dust seals
lubrication_ports = true; // Add grease fittings
cage_material = "PETG";    // Cage material type

/* ----------------------------- MAIN GEOMETRY ----------------------------- */

module precision_bearing() {
    // Inner race
    inner_race();
    
    // Outer race
    outer_race();
    
    // Ball cage
    translate([0, 0, bearing_width/2])
        ball_cage();
    
    // Seals
    if (sealed_bearing) {
        translate([0, 0, -1])
            bearing_seal();
        translate([0, 0, bearing_width + 1])
            bearing_seal();
    }
}

module inner_race() {
    difference() {
        cylinder(d=inner_diameter + 8, h=bearing_width);
        
        // Center hole
        translate([0, 0, -1])
            cylinder(d=inner_diameter, h=bearing_width + 2);
        
        // Ball race groove
        translate([0, 0, bearing_width/2])
            rotate_extrude()
                translate([inner_diameter/2 + 4, 0])
                    circle(d=race_depth * 2);
    }
}

module outer_race() {
    difference() {
        cylinder(d=outer_diameter, h=bearing_width);
        
        // Inner cutout
        translate([0, 0, -1])
            cylinder(d=outer_diameter - 8, h=bearing_width + 2);
        
        // Ball race groove
        translate([0, 0, bearing_width/2])
            rotate_extrude()
                translate([outer_diameter/2 - 4, 0])
                    circle(d=race_depth * 2);
        
        // Lubrication port
        if (lubrication_ports) {
            translate([outer_diameter/2 - 2, 0, bearing_width/2])
                rotate([0, 90, 0])
                    cylinder(d=2, h=4);
        }
    }
}

module ball_cage() {
    difference() {
        cylinder(d=(inner_diameter + outer_diameter)/2, h=2, center=true);
        
        // Ball pockets
        for (i = [0:ball_count-1]) {
            rotate([0, 0, i * 360/ball_count])
                translate([(inner_diameter + outer_diameter)/4, 0, 0])
                    sphere(d=race_depth * 1.5);
        }
    }
}

module bearing_seal() {
    difference() {
        cylinder(d=outer_diameter - 2, h=1);
        cylinder(d=inner_diameter + 2, h=3, center=true);
    }
}

precision_bearing();