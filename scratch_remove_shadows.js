const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove shadows and elevations globally
  let newContent = content.replace(/shadowColor:\s*[^,}]+,?/g, '');
  newContent = newContent.replace(/shadowOffset:\s*\{\s*width:\s*\d+,\s*height:\s*\d+\s*\},?/g, '');
  newContent = newContent.replace(/shadowOpacity:\s*[\d.]+,?/g, '');
  newContent = newContent.replace(/shadowRadius:\s*[\d.]+,?/g, '');
  newContent = newContent.replace(/elevation:\s*[\d.]+,?/g, '');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir('./app');
walkDir('./components');
