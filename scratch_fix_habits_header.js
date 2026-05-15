const fs = require('fs');

let habits = fs.readFileSync('./app/habits.tsx', 'utf8');
habits = habits.replace(
  /<TabHeader\s+title="Habits"\s+subtitle="Keep the flame alive"\s+onLayoutToggle=\{.*?\}\s+isGrid=\{isGrid\}\s+\/>/,
  `<TabHeader\n          title="Habits"\n          subtitle="Keep the flame alive"\n        />`
);

fs.writeFileSync('./app/habits.tsx', habits, 'utf8');
