const fs = require('fs');

const file = './components/tasks/TaskCard.tsx';

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/container:\s*{\s*borderRadius:\s*20,\s*padding:\s*16,\s*marginBottom:\s*12,\s*overflow:\s*'hidden',\s*shadowColor:\s*'#000',\s*shadowOffset:\s*{\s*width:\s*0,\s*height:\s*2\s*},\s*shadowOpacity:\s*0\.05,\s*shadowRadius:\s*10,\s*elevation:\s*2,\s*}/, 
    "container: { \n    borderRadius: 16, \n    padding: 16, \n    marginBottom: 12, \n    overflow: 'hidden',\n    borderWidth: 1,\n  }");
  
  // also verify that TaskCard itself has borderWidth inside its inline style if needed, but we added it here. Wait, actually we added it to styles.container.
  // Wait, in TaskCard it says:
  // <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder } ]}>
  // since we added borderWidth: 1 to container, it will pick up borderColor from the inline style.
  
  fs.writeFileSync(file, content, 'utf8');
  console.log("Modified TaskCard.tsx");
} else {
  console.log("File not found");
}
