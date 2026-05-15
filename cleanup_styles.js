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

    // Fix: [styles.x, backgroundColor: 'transparent' }] -> [styles.x]
    // Fix: [styles.x, backgroundColor: 'transparent' } ] -> [styles.x]
    content = content.replace(/style=\{\[([^\]]*?),\s*backgroundColor:\s*['"]transparent['"]\s*\}?\s*\]\}/g, "style={[$1]}");
    
    // Fix: [styles.x, { ... , backgroundColor: 'transparent' }]
    content = content.replace(/,\s*backgroundColor:\s*['"]transparent['"]\s*\}/g, "}");

    // Fix: [styles.x}, { backgroundColor: 'transparent' }] -> [styles.x]
    content = content.replace(/style=\{\[([^\]]*?)\},\s*\{\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]\}/g, "style={[$1]}");

    // Fix: more.tsx specific
    content = content.replace(/style=\{\[\(\{ pressed , backgroundColor: 'transparent' \}\]\}\) =\> \[/g, "style={({ pressed }) => [");

    // Fix: [styles.x, backgroundColor: 'transparent' } ] -> [styles.x]
    content = content.replace(/style=\{\[([^\]]*?),\s*backgroundColor:\s*['"]transparent['"]\s*\}\s*\]\}/g, "style={[$1]}");
    
    // Fix any double brackets
    content = content.replace(/style=\{\[\[/g, "style={[");
    content = content.replace(/\]\]\}/g, "]}");

    // Fix the PermissionPromptModal specific one
    content = content.replace(/style=\{\[styles\.secondaryButton,\s*backgroundColor:\s*['"]transparent['"]\s*\]\}/g, "style={styles.secondaryButton}");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
    }
}

walk(directory);
console.log('Cleanup complete.');
