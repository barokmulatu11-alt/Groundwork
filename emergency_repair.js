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

    // Fix double array brackets in styles: style={[[...]]}
    content = content.replace(/style=\{\[\[/g, "style={[");
    content = content.replace(/\]\]\}/g, "]}");

    // Fix corrupted style objects: { ... , { backgroundColor: 'transparent' } }
    content = content.replace(/,\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]\s*\]\}/g, ", { backgroundColor: 'transparent' }]}");
    
    // Fix specific pattern found in CustomAlert: { borderColor: colors.cardBorder , { backgroundColor: 'transparent' }
    content = content.replace(/borderColor:\s*colors\.[a-zA-Z]+\s*,\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}/g, (match) => {
        return match.replace(/,\s*\{/, "}, {");
    });

    // Fix shadowColor: colors.primaryText (missing quotes or invalid property)
    // Actually shadowColor: colors.primaryText is fine if colors is defined.
    
    // Fix duplicated properties in style objects
    // Example: { ..., fontFamily: 'System', ..., fontFamily: 'System' }
    // Handled by previous cleanup but let's be sure
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

walk(directory);
console.log('Emergency syntax repair complete.');
