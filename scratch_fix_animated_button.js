const fs = require('fs');

const file = './components/ui/AnimatedButton.tsx';

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/isPrimary && { backgroundColor: theme\.accent, shadowColor: theme\.accent, shadowOffset: \{ width: 0, height: 4 \}, shadowOpacity: 0\.3, shadowRadius: 12, elevation: 6 },/, "isPrimary && { backgroundColor: theme.accent },");
  content = content.replace(/isSecondary && { backgroundColor: theme\.accentLight, borderWidth: 1, borderColor: theme\.accentBorder },/, "isSecondary && { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.accentBorder },");
  
  fs.writeFileSync(file, content, 'utf8');
  console.log("Modified AnimatedButton.tsx");
} else {
  console.log("File not found");
}
