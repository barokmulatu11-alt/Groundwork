const fs = require('fs');
const path = require('path');

const directory = './';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.expo' && file !== '.vscode' && file !== 'android' && file !== 'assets' && file !== 'dist') {
                walk(filePath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            processFile(filePath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Targeted fix for the corrupted pattern: }, { backgroundColor: 'transparent' }]
    // Should be: , { backgroundColor: 'transparent' }]
    content = content.replace(/\},\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]/g, ", { backgroundColor: 'transparent' }]");

    // Also fix the nested array issue: style={[{ ... , { backgroundColor: 'transparent' }] }
    content = content.replace(/\{([^{}]*?),\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]/g, "{$1, backgroundColor: 'transparent' }]");

    // Final cleanup of any duplicated arrays
    content = content.replace(/style=\{\[\[/g, "style={[");
    content = content.replace(/\]\]\}/g, "]}");
    
    // Fix more.tsx specific pattern
    content = content.replace(/style=\{\[\(\{ pressed \}\s*,\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]\}\)/g, "style={({ pressed })");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

walk(directory);
console.log('Targeted style fix complete.');
