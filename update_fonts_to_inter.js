const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('./app').concat(walkSync('./components'));

files.forEach(file => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;

  let content = fs.readFileSync(file, 'utf8');

  // Replace System with Inter based on weight
  content = content.replace(/fontWeight:\s*['"]500['"](?: as const)?,\s*fontFamily:\s*['"]System['"](?: as const)?/g, "fontFamily: 'Inter_500Medium'");
  content = content.replace(/fontWeight:\s*['"]600['"](?: as const)?,\s*fontFamily:\s*['"]System['"](?: as const)?/g, "fontFamily: 'Inter_600SemiBold'");
  content = content.replace(/fontWeight:\s*['"]700['"](?: as const)?,\s*fontFamily:\s*['"]System['"](?: as const)?/g, "fontFamily: 'Inter_700Bold'");
  content = content.replace(/fontWeight:\s*['"]800['"](?: as const)?,\s*fontFamily:\s*['"]System['"](?: as const)?/g, "fontFamily: 'Inter_700Bold'");
  
  // Handle reversed order
  content = content.replace(/fontFamily:\s*['"]System['"](?: as const)?,\s*fontWeight:\s*['"]500['"](?: as const)?/g, "fontFamily: 'Inter_500Medium'");
  content = content.replace(/fontFamily:\s*['"]System['"](?: as const)?,\s*fontWeight:\s*['"]600['"](?: as const)?/g, "fontFamily: 'Inter_600SemiBold'");
  content = content.replace(/fontFamily:\s*['"]System['"](?: as const)?,\s*fontWeight:\s*['"]700['"](?: as const)?/g, "fontFamily: 'Inter_700Bold'");
  content = content.replace(/fontFamily:\s*['"]System['"](?: as const)?,\s*fontWeight:\s*['"]800['"](?: as const)?/g, "fontFamily: 'Inter_700Bold'");

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Fonts updated to Inter successfully');
