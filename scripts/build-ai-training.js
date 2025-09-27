#!/usr/bin/env node

/**
 * FlexiCAD AI Training Script
 * Processes all OpenSCAD examples and creates a comprehensive knowledge base
 */

const fs = require('fs');
const path = require('path');

const AI_REFERENCE_DIR = path.join(__dirname, '../ai-reference');
const OUTPUT_FILE = path.join(AI_REFERENCE_DIR, 'ai_training_data.json');

console.log('🤖 FlexiCAD AI Training Script');
console.log('================================');

async function processScadFile(filePath) {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const stats = await fs.promises.stat(filePath);
        
        // Extract key information from the file
        const lines = content.split('\n');
        const comments = lines.filter(line => line.trim().startsWith('//')).map(line => line.trim());
        const parameters = lines.filter(line => /^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(line.trim()));
        const modules = lines.filter(line => line.includes('module ')).map(line => line.trim());
        const functions = lines.filter(line => line.includes('function ')).map(line => line.trim());
        
        return {
            filename: path.basename(filePath),
            path: path.relative(AI_REFERENCE_DIR, filePath),
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
            content: content,
            analysis: {
                description: comments.find(c => c.includes('-')) || comments[0] || '',
                parameters: parameters.length,
                modules: modules.length,
                functions: functions.length,
                lines: lines.length,
                concepts: extractConcepts(content),
                complexity: calculateComplexity(content)
            }
        };
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return null;
    }
}

function extractConcepts(content) {
    const concepts = [];
    const conceptPatterns = {
        'cube': /cube\s*\(/g,
        'sphere': /sphere\s*\(/g,
        'cylinder': /cylinder\s*\(/g,
        'difference': /difference\s*\(\s*\)/g,
        'union': /union\s*\(\s*\)/g,
        'intersection': /intersection\s*\(\s*\)/g,
        'translate': /translate\s*\(/g,
        'rotate': /rotate\s*\(/g,
        'scale': /scale\s*\(/g,
        'linear_extrude': /linear_extrude\s*\(/g,
        'rotate_extrude': /rotate_extrude\s*\(/g,
        'hull': /hull\s*\(\s*\)/g,
        'text': /text\s*\(/g,
        'children': /children\s*\(/g,
        'for_loop': /for\s*\(/g,
        'if_condition': /if\s*\(/g,
        'module_definition': /module\s+\w+/g,
        'function_definition': /function\s+\w+/g
    };
    
    for (const [concept, pattern] of Object.entries(conceptPatterns)) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
            concepts.push({
                name: concept,
                count: matches.length
            });
        }
    }
    
    return concepts;
}

function calculateComplexity(content) {
    let score = 0;
    
    // Basic shapes = low complexity
    score += (content.match(/cube|sphere|cylinder/g) || []).length * 1;
    
    // Operations = medium complexity  
    score += (content.match(/difference|union|intersection/g) || []).length * 2;
    
    // Transformations = medium complexity
    score += (content.match(/translate|rotate|scale/g) || []).length * 2;
    
    // Advanced features = high complexity
    score += (content.match(/linear_extrude|rotate_extrude|hull/g) || []).length * 3;
    score += (content.match(/children|module|function/g) || []).length * 4;
    score += (content.match(/for|if|recursion/g) || []).length * 5;
    
    if (score < 10) return 'beginner';
    if (score < 30) return 'intermediate';
    if (score < 60) return 'advanced';
    return 'expert';
}

async function scanDirectory(dirPath, category = '') {
    const items = [];
    try {
        const entries = await fs.promises.readdir(dirPath);
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const stats = await fs.promises.stat(fullPath);
            
            if (stats.isDirectory()) {
                console.log(`📁 Scanning directory: ${entry}`);
                const subItems = await scanDirectory(fullPath, entry);
                items.push(...subItems);
            } else if (entry.endsWith('.scad')) {
                console.log(`📄 Processing: ${entry}`);
                const fileData = await processScadFile(fullPath);
                if (fileData) {
                    fileData.category = category || 'General';
                    items.push(fileData);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error scanning directory ${dirPath}:`, error.message);
    }
    
    return items;
}

async function generateTrainingData() {
    console.log(`🔍 Scanning ${AI_REFERENCE_DIR}...`);
    
    const examples = await scanDirectory(AI_REFERENCE_DIR);
    
    // Load enhanced manifest if it exists
    let enhancedManifest = {};
    try {
        const manifestPath = path.join(AI_REFERENCE_DIR, 'enhanced_manifest.json');
        const manifestContent = await fs.promises.readFile(manifestPath, 'utf8');
        enhancedManifest = JSON.parse(manifestContent);
        console.log('✅ Loaded enhanced manifest');
    } catch (error) {
        console.log('ℹ️  No enhanced manifest found, using basic processing');
    }
    
    const trainingData = {
        metadata: {
            generated_at: new Date().toISOString(),
            total_examples: examples.length,
            categories: [...new Set(examples.map(e => e.category))],
            complexity_distribution: examples.reduce((acc, e) => {
                acc[e.analysis.complexity] = (acc[e.analysis.complexity] || 0) + 1;
                return acc;
            }, {})
        },
        enhanced_manifest: enhancedManifest,
        examples: examples,
        learning_index: {
            by_category: examples.reduce((acc, e) => {
                if (!acc[e.category]) acc[e.category] = [];
                acc[e.category].push(e.filename);
                return acc;
            }, {}),
            by_complexity: examples.reduce((acc, e) => {
                if (!acc[e.analysis.complexity]) acc[e.analysis.complexity] = [];
                acc[e.analysis.complexity].push(e.filename);
                return acc;
            }, {}),
            by_concept: examples.reduce((acc, e) => {
                e.analysis.concepts.forEach(concept => {
                    if (!acc[concept.name]) acc[concept.name] = [];
                    acc[concept.name].push({
                        file: e.filename,
                        usage_count: concept.count
                    });
                });
                return acc;
            }, {})
        }
    };
    
    // Save training data
    await fs.promises.writeFile(OUTPUT_FILE, JSON.stringify(trainingData, null, 2));
    
    console.log('\\n📊 Training Data Summary:');
    console.log('==========================');
    console.log(`Total Examples: ${examples.length}`);
    console.log(`Categories: ${trainingData.metadata.categories.join(', ')}`);
    console.log('Complexity Distribution:', trainingData.metadata.complexity_distribution);
    console.log(`\\n💾 Training data saved to: ${OUTPUT_FILE}`);
    
    return trainingData;
}

// Run the training
generateTrainingData()
    .then(() => {
        console.log('\\n🎉 AI Training Complete!');
        console.log('The AI now has comprehensive knowledge of OpenSCAD patterns and examples.');
    })
    .catch(error => {
        console.error('❌ Training failed:', error);
        process.exit(1);
    });