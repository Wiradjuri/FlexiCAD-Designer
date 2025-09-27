// ============================================================================
// Professional Workshop Tool Organizer with Magnetic Base
// Purpose: Multi-size tool organization with labels and magnetic mounting
// Units: millimetres (mm)
// ============================================================================

/* ----------------------------- USER PARAMETERS -------------------------------- */
screwdriver_count = 6;    // number of screwdriver slots
hex_key_count = 8;        // number of hex key slots
drill_bit_count = 12;     // number of drill bit slots
holder_width = 200;       // holder width (mm)
holder_depth = 80;        // holder depth (mm)
holder_height = 50;       // holder height (mm)
magnetic_base = true;     // include neodymium magnet slots
tool_labels = true;       // include tool size labels
angle_cut = 15;           // front angle for better access (degrees)

/* ------------------------- Assertions & Limits ---------------------------- */
assert(screwdriver_count >= 1 && screwdriver_count <= 12, "Screwdriver count 1-12");
assert(hex_key_count >= 1 && hex_key_count <= 15, "Hex key count 1-15");
assert(drill_bit_count >= 1 && drill_bit_count <= 20, "Drill bit count 1-20");
assert(angle_cut >= 0 && angle_cut <= 30, "Angle cut should be 0-30 degrees");

/* ------------------------- Derived Measurements --------------------------- */
wall_thickness = 3;
section_width = holder_width / 3;  // Three sections: screwdrivers, hex keys, drill bits
magnet_diameter = 12;              // Standard 12mm neodymium magnets
magnet_thickness = 3;

/* ------------------------------ Modules ---------------------------------- */

module base_body() {
    difference() {
        // Main body with angled front
        hull() {
            cube([holder_width, holder_depth, holder_height]);
            translate([0, holder_depth - tan(angle_cut) * holder_height, 0])
                cube([holder_width, 1, holder_height]);
        }
        
        // Magnetic slots in base
        if (magnetic_base) {
            for(x = [20:40:holder_width-20]) {
                for(y = [15, holder_depth-15]) {
                    translate([x, y, -1])
                        cylinder(d=magnet_diameter, h=magnet_thickness+1, $fn=24);
                }
            }
        }
        
        // Cable management slot
        translate([holder_width-15, 0, holder_height-10])
            cube([10, holder_depth/3, 15]);
    }
    
    // Section dividers
    translate([section_width, 0, 0])
        cube([2, holder_depth, holder_height]);
    translate([2*section_width, 0, 0])
        cube([2, holder_depth, holder_height]);
}

module screwdriver_section() {
    // Different sized slots for various screwdriver types
    sizes = [8, 6, 4, 8, 6, 4];  // Alternating large/small
    spacing = (section_width - 20) / screwdriver_count;
    
    for(i = [0:screwdriver_count-1]) {
        if(i < len(sizes)) {
            x_pos = 10 + i * spacing;
            tool_diameter = sizes[i];
            
            translate([x_pos, holder_depth/2, holder_height])
                cylinder(d=tool_diameter, h=holder_height + 5, $fn=16);
            
            // Size labels
            if (tool_labels) {
                label_size = (tool_diameter >= 6) ? "L" : "S";
                translate([x_pos, holder_depth-8, holder_height-2])
                    linear_extrude(1)
                        text(label_size, size=4, halign="center", font="Arial:style=Bold");
            }
        }
    }
}

module hex_key_section() {
    // Graduated slots for hex keys (1.5mm to 10mm)
    spacing = (section_width - 20) / hex_key_count;
    
    for(i = [0:hex_key_count-1]) {
        x_pos = section_width + 10 + i * spacing;
        tool_diameter = 2 + (i * 0.7);  // Graduating sizes
        
        translate([x_pos, holder_depth * 0.7, holder_height])
            cylinder(d=tool_diameter, h=holder_height + 5, $fn=12);
        
        // Hex size labels
        if (tool_labels) {
            size_mm = round((1.5 + i * 0.6) * 10) / 10;
            translate([x_pos, holder_depth-5, holder_height-2])
                linear_extrude(1)
                    text(str(size_mm), size=3, halign="center", font="Arial");
        }
    }
    
    // Hex key holder clip
    translate([section_width + 5, holder_depth * 0.8, holder_height-5])
        difference() {
            cube([section_width-10, 8, 5]);
            translate([2, 2, -1])
                cube([section_width-14, 4, 7]);
        }
}

module drill_bit_section() {
    // Small holes for drill bits in a grid pattern
    bit_spacing = (section_width - 20) / 4;
    rows = 3;
    
    for(row = [0:rows-1]) {
        for(col = [0:3]) {
            if(row * 4 + col < drill_bit_count) {
                x_pos = 2*section_width + 10 + col * bit_spacing;
                y_pos = 15 + row * 15;
                
                translate([x_pos, y_pos, holder_height])
                    cylinder(d=3.2, h=holder_height + 5, $fn=12);
                
                // Bit size labels
                if (tool_labels) {
                    bit_size = 1 + (row * 4 + col) * 0.5;
                    translate([x_pos, y_pos-8, holder_height-2])
                        linear_extrude(1)
                            text(str(bit_size), size=2.5, halign="center", font="Arial");
                }
            }
        }
    }
}

module corner_feet() {
    // Rubber feet positions
    feet_positions = [[5, 5], [holder_width-5, 5], [5, holder_depth-5], [holder_width-5, holder_depth-5]];
    
    for(pos = feet_positions) {
        translate([pos[0], pos[1], -2])
            cylinder(d=8, h=2, $fn=16);
    }
}

module complete_tool_holder() {
    difference() {
        base_body();
        
        // Tool slots
        screwdriver_section();
        hex_key_section();
        drill_bit_section();
    }
    
    // Add corner feet
    corner_feet();
    
    // Brand label
    translate([holder_width/2, 5, holder_height-1])
        linear_extrude(1)
            text("FLEXICAD TOOLS", size=6, halign="center", font="Arial:style=Bold");
}

/* --------------------------------- Call ---------------------------------- */
complete_tool_holder();

/* ============================== PRINT SETTINGS ============================== */
// Print orientation: Base down (as oriented)
// Layer height: 0.2mm
// Infill: 20%
// Supports: None needed
// Material: PETG for durability
// Post-processing: Insert 12mm x 3mm neodymium magnets in base slots

    // Vertical holes for tools
    for (i = [0:tool_count-1]) {
      translate([slots_start_x + i * slot_pitch, holder_depth/2, holder_height])
        rotate([90,0,0])
        cylinder(d=tool_diameter + clearance, h=holder_depth + 1, $fn=64);
    }
  }
}

/* --------------------------------- Call ---------------------------------- */
tool_holder();

/* ============================== HOW TO PRINT / ORIENT ============================== */
// Print orientation: Front face down on build plate (holes facing sideways)
// Supports: None needed in this orientation
// Layer height: 0.2-0.3mm
// Infill: 20-25% for workshop durability
// Print speed: Normal (50mm/s)
// Post-processing: Test fit tools, may need light drilling for perfect fit