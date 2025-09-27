/*
 * ================================================================
 * PARAMETRIC PROSTHETIC HAND
 * Functional prosthetic with tendon-driven fingers
 * ================================================================
 */

/* ----------------------------- USER PARAMETERS ----------------------------- */

// Hand Dimensions
hand_length = 180;         // Total hand length (mm)
palm_width = 85;           // Palm width (mm)
finger_count = 5;          // Number of fingers
thumb_included = true;     // Include opposable thumb

// Finger Configuration
finger_segments = 3;       // Segments per finger
segment_length = 30;       // Average segment length (mm)
joint_flexibility = 45;    // Joint bend angle (degrees)

// Mechanical System
actuation_type = "tendon";  // "tendon", "servo", "hybrid"
grip_strength = 15;         // Target grip strength (N)
wrist_attachment = "socket"; // "socket", "clamp", "custom"

/* ----------------------------- MAIN GEOMETRY ----------------------------- */

module prosthetic_hand() {
    // Palm assembly
    palm_base();
    
    // Fingers
    for (i = [0:finger_count-2]) {
        translate([palm_width/finger_count * (i - (finger_count-2)/2), hand_length * 0.7, 0])
            finger_assembly(i);
    }
    
    // Thumb
    if (thumb_included) {
        translate([palm_width/2 - 10, hand_length * 0.3, 15])
            rotate([0, 0, -45])
                thumb_assembly();
    }
    
    // Wrist connection
    translate([0, -20, 0])
        wrist_connector();
}

module palm_base() {
    difference() {
        hull() {
            translate([0, 0, 0])
                cube([palm_width, hand_length * 0.6, 15], center=true);
            translate([0, hand_length * 0.3, 0])
                cube([palm_width * 0.8, 20, 15], center=true);
        }
        
        // Tendon channels
        for (i = [0:finger_count-1]) {
            translate([palm_width/finger_count * (i - (finger_count-1)/2), -hand_length * 0.2, -5])
                cylinder(d=3, h=20);
        }
    }
}

module finger_assembly(finger_id) {
    for (segment = [0:finger_segments-1]) {
        translate([0, segment * segment_length * 1.1, 0])
            rotate([segment * joint_flexibility/finger_segments, 0, 0])
                finger_segment(segment);
    }
}

module finger_segment(segment_id) {
    difference() {
        // Main segment
        hull() {
            cube([12, segment_length, 10], center=true);
            translate([0, segment_length/2, 0])
                cube([10, 2, 10], center=true);
        }
        
        // Joint hole
        translate([0, -segment_length/2, 0])
            rotate([0, 90, 0])
                cylinder(d=2, h=15, center=true);
        
        // Tendon channel
        translate([0, 0, -3])
            cube([2, segment_length + 2, 8], center=true);
    }
    
    // Joint pin
    if (segment_id > 0) {
        translate([0, -segment_length/2, 0])
            rotate([0, 90, 0])
                cylinder(d=1.8, h=14, center=true);
    }
}

module thumb_assembly() {
    for (segment = [0:2]) {
        translate([0, segment * 25, 0])
            rotate([segment * 30, 0, 0])
                thumb_segment();
    }
}

module thumb_segment() {
    difference() {
        cube([15, 25, 12], center=true);
        
        // Tendon channel
        translate([0, 0, -4])
            cube([2, 27, 6], center=true);
    }
}

module wrist_connector() {
    if (wrist_attachment == "socket") {
        difference() {
            cylinder(d=50, h=30);
            translate([0, 0, 5])
                cylinder(d=45, h=30);
        }
    }
}

prosthetic_hand();