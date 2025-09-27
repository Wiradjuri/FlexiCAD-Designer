/*
 * ================================================================
 * PARAMETRIC ROBOTIC GRIPPER
 * Servo-actuated gripper with customizable finger geometry
 * ================================================================
 */

/* ----------------------------- USER PARAMETERS ----------------------------- */

// Gripper Dimensions
grip_width = 80;           // Maximum grip opening (mm)
finger_length = 60;        // Length of gripper fingers (mm)
finger_thickness = 8;      // Thickness of fingers (mm)
base_width = 50;           // Width of gripper base (mm)
base_height = 40;          // Height of gripper base (mm)

// Servo Configuration
servo_type = "SG90";       // Servo type: "SG90", "MG996R", "Custom"
servo_mount_spacing = 23;  // Distance between servo mounting holes (mm)
servo_horn_diameter = 25;  // Diameter of servo horn (mm)

// Finger Design
finger_tip_shape = "pointed"; // "pointed", "flat", "rounded", "custom"
grip_surface = "textured";    // "smooth", "textured", "ridged"
finger_angle = 15;            // Angle of finger taper (degrees)

// Mechanical Features
gear_ratio = 2;            // Mechanical advantage ratio
jaw_force = 10;            // Target gripping force (N)
include_sensors = true;    // Add pressure sensor mounts
quick_release = true;      // Include quick-release mechanism

/* ----------------------------- MAIN GEOMETRY ----------------------------- */

module robotic_gripper() {
    union() {
        // Base assembly
        gripper_base();
        
        // Servo mount
        translate([0, -base_width/2 - 10, base_height/2])
            rotate([90, 0, 0])
                servo_mount();
        
        // Gripper arms
        translate([0, 0, base_height])
            gripper_mechanism();
    }
}

module gripper_base() {
    difference() {
        cube([base_width, base_width, base_height], center=true);
        
        // Servo cutout
        translate([0, -base_width/2 + 5, 5])
            cube([25, 15, 25], center=true);
        
        // Wiring channel
        translate([0, 0, -base_height/2 + 2])
            cylinder(d=8, h=4);
    }
}

module servo_mount() {
    difference() {
        cube([40, 20, 30], center=true);
        
        // Servo body cutout
        cube([23, 12, 28], center=true);
        
        // Mounting holes
        for (x = [-servo_mount_spacing/2, servo_mount_spacing/2]) {
            translate([x, 0, -12])
                cylinder(d=2, h=8);
        }
    }
}

module gripper_mechanism() {
    // Left finger assembly
    translate([-grip_width/4, 0, 0])
        gripper_finger("left");
    
    // Right finger assembly  
    translate([grip_width/4, 0, 0])
        gripper_finger("right");
    
    // Linkage mechanism
    gripper_linkage();
}

module gripper_finger(side) {
    rotate([0, 0, side == "left" ? finger_angle : -finger_angle]) {
        difference() {
            // Main finger body
            cube([finger_thickness, finger_length, 15], center=true);
            
            // Grip surface texture
            if (grip_surface == "textured") {
                for (i = [0:3:finger_length-5]) {
                    translate([0, -finger_length/2 + i, 6])
                        cube([finger_thickness+1, 2, 2], center=true);
                }
            }
        }
        
        // Finger tip
        translate([0, finger_length/2, 0])
            finger_tip();
        
        // Pressure sensor mount
        if (include_sensors) {
            translate([0, finger_length/3, 8])
                cube([12, 8, 3], center=true);
        }
    }
}

module finger_tip() {
    if (finger_tip_shape == "pointed") {
        cylinder(d1=finger_thickness, d2=2, h=10, center=true);
    } else if (finger_tip_shape == "flat") {
        cube([finger_thickness, 3, 15], center=true);
    } else if (finger_tip_shape == "rounded") {
        sphere(d=finger_thickness);
    }
}

module gripper_linkage() {
    // Connecting rods
    for (side = [-1, 1]) {
        translate([side * 15, -20, 0]) {
            rotate([0, 90, 0])
                cylinder(d=4, h=20, center=true);
        }
    }
    
    // Servo connection
    translate([0, -30, 0])
        cylinder(d=servo_horn_diameter, h=5, center=true);
}

robotic_gripper();