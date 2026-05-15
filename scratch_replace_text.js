const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.expo') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./components'));
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (file.includes('AppText.tsx')) return;
  
  const regex = /import\s+{([^}]*?)\bText\b([^}]*?)}\s+from\s+['"]react-native['"]/g;
  if (regex.test(content)) {
    if (content.includes('AppText')) return;
    
    const newContent = content.replace(regex, (match, p1, p2) => {
      let parts = [p1, p2].join(',').split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length === 0) return `// import Text removed`;
      return `import { ${parts.join(', ')} } from 'react-native'`;
    });
    
    const finalContent = `import { AppText as Text } from '@/components/ui/AppText';\n` + newContent;
    fs.writeFileSync(file, finalContent);
    modifiedCount++;
  }
});

console.log('Modified ' + modifiedCount + ' files.');
