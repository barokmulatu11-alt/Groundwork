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
    let changed = false;

    // Fix shadowcolor -> shadowColor
    if (content.includes('shadowcolor')) {
        content = content.replace(/shadowcolor/g, 'shadowColor');
        changed = true;
    }

    // Fix missing commas in styles
    content = content.replace(/(fontSize:\s*\d+)\s*(fontFamily:)/g, "$1, $2");
    content = content.replace(/(fontFamily:\s*['"]System['"])\s*(color:|fontWeight:|fontSize:|marginTop:|marginBottom:|marginLeft:|marginRight:|padding:)/g, "$1, $2");

    // Remove ANY remaining hardcoded white-ish backgrounds in nested Views
    // Except for the main BackgroundGradient or specific UI elements like icons
    const colorsToRemove = ['#FAF7F2', '#FFFFFF', '#FFF', '#F0EBE3'];
    colorsToRemove.forEach(color => {
        // Only remove if it's inside a style object and not a top-level theme definition
        if (!filePath.includes('ThemeContext.tsx')) {
            const regex = new RegExp(`backgroundColor:\\s*['"]${color}['"]\\s*,?`, 'gi');
            if (regex.test(content)) {
                content = content.replace(regex, "");
                changed = true;
            }
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

walk(directory);
console.log('Final cleanup and shadow fix complete.');
