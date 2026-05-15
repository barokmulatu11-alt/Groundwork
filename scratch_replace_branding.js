const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Avoid replacing groundwork://
  // Replace GroundWork or Groundwork with groundwork.
  // We use a negative lookahead to avoid matching groundwork:// or groundwork.app
  let newContent = content.replace(/(?<!\/)Ground[Ww]ork(?!:\/\/|\.app)/g, 'groundwork.');
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
