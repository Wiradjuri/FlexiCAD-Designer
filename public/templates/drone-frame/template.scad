/*
 * ================================================================
 * PARAMETRIC DRONE FRAME GENERATOR
 * Professional quadcopter frame with customizable motor mounts
 * ================================================================
 * 
 * Author: FlexiCAD Designer
 * Category: Aerospace/Drones
 * Complexity: Advanced
 * Print Time: 3-5 hours
 * Material: PETG, Carbon Fiber PLA, or ABS
 * 
 * Description:
 * Custom drone frame with parametric motor spacing, arm thickness,
 * camera mount, and battery compartment. Optimized for strength
 * and minimal weight.
 */

/* ----------------------------- USER PARAMETERS ----------------------------- */

// Frame Dimensions
frame_width = 450;          // Distance between front and rear motors (mm)
frame_length = 450;         // Distance between left and right motors (mm)
center_plate_size = 80;     // Size of central mounting plate (mm)
center_plate_thickness = 3; // Thickness of center plate (mm)

// Arm Configuration  
arm_width = 20;             // Width of motor arms (mm)
arm_thickness = 5;          // Thickness of motor arms (mm)
arm_angle = 45;             // Angle of arms from center (degrees)

// Motor Mount
motor_mount_diameter = 28;  // Diameter of motor mount (mm)
motor_hole_spacing = 19;    // Distance between motor screw holes (mm)
motor_screw_diameter = 3;   // Diameter of motor mounting screws (mm)

// Electronics Bay
battery_bay_length = 120;   // Length of battery compartment (mm)
battery_bay_width = 35;     // Width of battery compartment (mm)
electronics_mount_holes = true; // Include mounting holes for flight controller

// Landing Gear
include_landing_gear = true; // Add landing gear legs
landing_gear_height = 30;   // Height of landing legs (mm)

// Advanced Features
camera_mount = true;        // Include front camera mount
led_strip_channels = true;  // Include channels for LED strips
wire_management = true;     // Include wire management clips

/* ----------------------------- ASSERTIONS ----------------------------- */

assert(frame_width >= 200, "Frame width must be at least 200mm for stability");
assert(frame_length >= 200, "Frame length must be at least 200mm for stability");
assert(arm_thickness >= 3, "Arm thickness must be at least 3mm for strength");
assert(motor_mount_diameter >= 20, "Motor mount diameter must be at least 20mm");

/* ----------------------------- MAIN GEOMETRY ----------------------------- */

module drone_frame() {
    difference() {
        union() {
            // Center plate
            center_plate();
            
            // Motor arms
            for (i = [0, 1, 2, 3]) {
                rotate([0, 0, i * 90 + arm_angle]) {
                    translate([0, 0, center_plate_thickness/2])
                        motor_arm();
                }
            }
            
            // Landing gear
            if (include_landing_gear) {
                for (i = [0, 1, 2, 3]) {
                    rotate([0, 0, i * 90 + arm_angle]) {
                        translate([frame_width/2 - 10, 0, 0])
                            landing_leg();
                    }
                }
            }
            
            // Camera mount
            if (camera_mount) {
                translate([frame_length/2 - 15, 0, center_plate_thickness])
                    camera_gimbal_mount();
            }
        }
        
        // Battery bay cutout
        translate([0, 0, -1])
            battery_compartment();
        
        // Electronics mounting holes
        if (electronics_mount_holes) {
            electronics_holes();
        }
        
        // Weight reduction holes
        weight_reduction_pattern();
    }
    
    // Wire management clips
    if (wire_management) {
        for (i = [0, 1, 2, 3]) {
            rotate([0, 0, i * 90]) {
                translate([15, 0, center_plate_thickness])
                    wire_clip();
            }
        }
    }
}

module center_plate() {
    hull() {
        for (i = [0, 1, 2, 3]) {
            rotate([0, 0, i * 90 + arm_angle]) {
                translate([center_plate_size/3, 0, 0])
                    cylinder(d=center_plate_size/2, h=center_plate_thickness);
            }
        }
    }
}

module motor_arm() {
    arm_length = sqrt(pow(frame_width/2, 2) + pow(frame_length/2, 2)) - center_plate_size/3;
    
    difference() {
        // Main arm structure
        hull() {
            cylinder(d=arm_width, h=arm_thickness);
            translate([arm_length, 0, 0])
                cylinder(d=motor_mount_diameter + 6, h=arm_thickness);
        }
        
        // Motor mount holes
        translate([arm_length, 0, -1]) {
            cylinder(d=motor_mount_diameter, h=arm_thickness + 2);
            
            // Motor screw holes
            for (angle = [0, 90, 180, 270]) {
                rotate([0, 0, angle])
                    translate([motor_hole_spacing/2, 0, 0])
                        cylinder(d=motor_screw_diameter, h=arm_thickness + 2);
            }
        }
        
        // LED strip channel
        if (led_strip_channels) {
            translate([5, 0, arm_thickness - 1])
                cube([arm_length - 10, 8, 2], center=true);
        }
    }
}

module battery_compartment() {
    translate([0, 0, 0])
        cube([battery_bay_length, battery_bay_width, center_plate_thickness + 2], center=true);
}

module electronics_holes() {
    hole_spacing = 30.5; // Standard flight controller mounting
    for (x = [-hole_spacing/2, hole_spacing/2]) {
        for (y = [-hole_spacing/2, hole_spacing/2]) {
            translate([x, y, -1])
                cylinder(d=3, h=center_plate_thickness + 2);
        }
    }
}

module weight_reduction_pattern() {
    for (i = [0, 1, 2, 3]) {
        rotate([0, 0, i * 90 + 22.5]) {
            for (r = [20:10:center_plate_size/2-10]) {
                translate([r, 0, -1])
                    cylinder(d=6, h=center_plate_thickness + 2);
            }
        }
    }
}

module landing_leg() {
    translate([0, 0, -landing_gear_height]) {
        difference() {
            cylinder(d=8, h=landing_gear_height + center_plate_thickness);
            translate([0, 0, -1])
                cylinder(d=4, h=landing_gear_height + center_plate_thickness + 2);
        }
        
        // Foot pad
        translate([0, 0, 0])
            cylinder(d=20, h=3);
    }
}

module camera_gimbal_mount() {
    difference() {
        cube([30, 25, 15], center=true);
        translate([0, 0, 2])
            cube([25, 20, 12], center=true);
        
        // Gimbal mounting holes
        for (x = [-10, 10]) {
            translate([x, 0, -5])
                cylinder(d=3, h=15);
        }
    }
}

module wire_clip() {
    difference() {
        cube([8, 6, 4], center=true);
        translate([0, 0, 1])
            cube([6, 3, 4], center=true);
    }
}

/* ----------------------------- ASSEMBLY ----------------------------- */

drone_frame();

/* ----------------------------- PRINTING GUIDANCE ----------------------------- */

/*
PRINTING RECOMMENDATIONS:

Material: PETG or Carbon Fiber PLA recommended
- PETG: Best balance of strength and flexibility
- Carbon Fiber PLA: Maximum strength, lighter weight
- ABS: Good alternative, requires heated bed

Settings:
- Layer Height: 0.2mm
- Infill: 30-40% (gyroid pattern recommended)
- Perimeters: 4-5 for maximum strength
- Print Speed: 40mm/s for quality
- Support: None needed with proper orientation

Orientation:
- Print with center plate flat on bed
- Arms will angle upward naturally
- No supports required

Post-Processing:
1. Remove any stringing between arms
2. Test fit motors before final assembly
3. Use threadlocker on motor screws
4. Balance propellers before first flight

Assembly Notes:
- Install flight controller in center bay
- Route ESC wires through arm channels
- Secure battery with velcro straps
- Calibrate motor directions and ESC settings

ESTIMATED PRINT TIME: 3-5 hours
MATERIAL USAGE: ~80-120g depending on infill
*/