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

    // Fix the specific hardcoded pattern found in multiple files
    // backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' -> backgroundColor: colors.card
    content = content.replace(/backgroundColor:\s*isDark\s*\?\s*['"]#1C1C1E['"]\s*:\s*['"]#FFFFFF['"]/g, "backgroundColor: colors.card");
    
    // Fix backgroundcolor lowercase
    content = content.replace(/backgroundcolor/g, "backgroundColor");

    // Fix shadowcolor lowercase (one more time)
    content = content.replace(/shadowcolor/g, "shadowColor");

    // Replace any remaining #FFFFFF or #fff as backgroundColor in styles, except in ThemeContext
    if (!filePath.includes('ThemeContext.tsx')) {
        // Only if it's inside a style object
        content = content.replace(/backgroundColor:\s*['"](#FFFFFF|#fff|white)['"]\s*,/gi, "backgroundColor: colors.card,");
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

walk(directory);
console.log('Design system sync complete.');
