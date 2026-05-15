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

    // Fix the mess: style={[{ ... , { backgroundColor: 'transparent' }] }
    // Strategy: Find any style={...} that contains { backgroundColor: 'transparent' } 
    // and attempt to rebuild it or fix the obvious corruption.
    
    // Pattern 1: Nested object missing closing brace before transparency
    // Example: { marginLeft: 16, padding: 8 , { backgroundColor: 'transparent' }
    content = content.replace(/\{([^{}]*?),\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}/g, "{$1}, { backgroundColor: 'transparent' }");

    // Pattern 2: Duplicated array brackets style={[[...]]}
    content = content.replace(/style=\{\[\[/g, "style={[");
    content = content.replace(/\]\]\}/g, "]}");

    // Pattern 3: Excessive closing brackets style={[...]]]}
    content = content.replace(/\]\]\]\}/g, "]}");
    content = content.replace(/\]\]\}/g, "]}");
    
    // Pattern 4: Style with a single object that was turned into an array but poorly
    // Example: style={[{ ... , { backgroundColor: 'transparent' }] }
    // Let's fix the tail end
    content = content.replace(/,\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]\s*\]\}/g, ", { backgroundColor: 'transparent' }]}");
    
    // Fix specific cases like more.tsx which is really messed up
    // style={[({ pressed , { backgroundColor: 'transparent' }]}) => [
    content = content.replace(/style=\{\[\(\{ pressed\s*,\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]\}\)/g, "style={({ pressed })");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

walk(directory);
console.log('Deep style repair complete.');
