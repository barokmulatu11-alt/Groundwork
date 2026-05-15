const fs = require('fs');

const files = [
  './app/productivity-settings.tsx',
  './app/privacy-settings.tsx',
  './app/notification-settings.tsx',
  './app/data-settings.tsx',
  './app/account-settings.tsx',
  './app/appearance-settings.tsx',
  './app/support-settings.tsx',
  './app/(tabs)/index.tsx',
  './components/ui/ActionRow.tsx',
  './app/(tabs)/courses.tsx',
  './app/(tabs)/connect.tsx'
];

let totalModifications = 0;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace theme.accentLight in styles.iconBox or styles.iconContainer
    let newContent = content.replace(/backgroundColor:\s*(destructive\s*\?\s*theme\.dangerLight\s*:\s*)?theme\.accentLight/g, "backgroundColor: 'transparent'");
    
    // Also remove theme.dangerLight if it was alone
    newContent = newContent.replace(/backgroundColor:\s*theme\.dangerLight/g, "backgroundColor: 'transparent'");
    
    // appearance-settings.tsx segmented active button
    if (file.includes('appearance-settings.tsx')) {
       newContent = newContent.replace(/active && { backgroundColor: theme\.card,/, "active && { backgroundColor: 'transparent',");
       newContent = newContent.replace(/backgroundColor: theme\.cardBorder \+ '40'/, "backgroundColor: 'transparent'");
    }
    
    // app/(tabs)/courses.tsx and connect.tsx
    if (file.includes('courses.tsx') || file.includes('connect.tsx')) {
       newContent = newContent.replace(/backgroundColor: theme\.cardBorder/g, "backgroundColor: 'transparent'");
    }
    
    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      totalModifications++;
      console.log(`Modified: ${file}`);
    }
  }
});

console.log(`Finished. Modified ${totalModifications} files.`);
