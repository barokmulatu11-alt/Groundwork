const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const badFiles = [];

walk('.', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Regex to find fontFamily passed as a prop to any component
    // Looking for fontFamily= but NOT inside a style object {{ ... }}
    // A simpler way: just find fontFamily=" or fontFamily=' or fontFamily={
    // and see if it's NOT preceded by "style: " or "style : "
    
    const lines = content.split('\n');
    lines.forEach((line, i) => {
       if (line.includes('fontFamily=') || (line.includes('fontFamily') && !line.includes(':') && !line.includes('style'))) {
         // This is a bit loose, let's refine
       }
       
       // Better regex: match fontFamily prop on a component
       // <Component ... fontFamily="..." ... />
       // The regex should look for fontFamily="..." or fontFamily={'...'}
       const propRegex = /\sfontFamily=["'{]/g;
       let match;
       while ((match = propRegex.exec(line)) !== null) {
         // Check if this is inside a style object
         // Very rough check: is there a {{ before it on the same line?
         const before = line.substring(0, match.index);
         if (!before.includes('style={{') && !before.includes('style: {') && !before.includes('style:[')) {
            badFiles.push(`${filePath}:${i + 1}: ${line.trim()}`);
         }
       }
    });
  }
});

console.log(badFiles.join('\n'));
