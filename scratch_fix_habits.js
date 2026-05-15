const fs = require('fs');

const file = './app/habits.tsx';

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace theme.accentLight with 'transparent' in icon boxes
  content = content.replace(/backgroundColor:\s*theme\.accentLight/g, "backgroundColor: 'transparent'");
  
  // Replace nested theme.card with transparent in habits.tsx action sheet buttons
  content = content.replace(/padding:\s*16,\s*backgroundColor:\s*theme\.card,\s*borderRadius:\s*16,\s*borderWidth:\s*1,\s*borderColor:\s*theme\.cardBorder/g, 
    "padding: 16, backgroundColor: 'transparent', borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder");
    
  // Replace any other theme.accentLight in ternary operators like `isCompletedToday ? theme.accent : theme.accentLight`
  content = content.replace(/isCompletedToday\s*\?\s*theme\.accent\s*:\s*theme\.accentLight/g, "isCompletedToday ? theme.accent : 'transparent'");
  
  // In the calendar grid (lines ~288): 
  // backgroundColor: completed ? theme.accent : (isToday ? theme.accentLight : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')),
  content = content.replace(/isToday\s*\?\s*theme\.accentLight/g, "isToday ? 'transparent'");
  
  fs.writeFileSync(file, content, 'utf8');
  console.log("Modified habits.tsx");
} else {
  console.log("File not found");
}
