// phone_case.scad - Parametric Phone Case Example
// This example shows how to create a customizable phone case with camera cutouts

// Parameters - users can modify these
phone_width = 75;      // Width of phone in mm
phone_height = 150;    // Height of phone in mm  
phone_thickness = 8;   // Thickness of phone in mm
case_thickness = 2;    // Wall thickness of case
camera_diameter = 20;  // Diameter of camera cutout
corner_radius = 5;     // Rounded corner radius

// Main phone case
difference() {
    // Outer case with rounded corners
    hull() {
        translate([corner_radius, corner_radius, 0])
            cylinder(r=corner_radius, h=phone_thickness + case_thickness);
        translate([phone_width + case_thickness - corner_radius, corner_radius, 0])
            cylinder(r=corner_radius, h=phone_thickness + case_thickness);
        translate([corner_radius, phone_height + case_thickness - corner_radius, 0])
            cylinder(r=corner_radius, h=phone_thickness + case_thickness);
        translate([phone_width + case_thickness - corner_radius, phone_height + case_thickness - corner_radius, 0])
            cylinder(r=corner_radius, h=phone_thickness + case_thickness);
    }
    
    // Inner phone cavity
    translate([case_thickness, case_thickness, case_thickness])
        cube([phone_width, phone_height, phone_thickness + 1]);
    
    // Camera cutout (top center)
    translate([phone_width/2 + case_thickness, phone_height - 25 + case_thickness, -1])
        cylinder(h=case_thickness + 2, d=camera_diameter);
    
    // Charging port cutout (bottom center)
    translate([phone_width/2 + case_thickness - 15, -1, case_thickness + phone_thickness/2])
        cube([30, case_thickness + 2, 8]);
}

// Optional: Add phone case grip rings
translate([phone_width/2 + case_thickness, phone_height/2 + case_thickness, 0]) {
    difference() {
        cylinder(d=25, h=3);
        cylinder(d=15, h=4);
    }
}