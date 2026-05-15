const fs = require('fs');

let tasks = fs.readFileSync('./app/tasks/index.tsx', 'utf8');
tasks = tasks.replace(
  /<TaskProgressBar percentage=\{completionRate\} \/>\s*\{\(\['Today', 'Upcoming', 'All'\] as ViewType\[\]\)\.map/s,
  `<TaskProgressBar percentage={completionRate} />

        <View style={[styles.viewToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Animated.View style={[styles.viewIndicator, indicatorStyle, { width: (width - 56) / 3, backgroundColor: theme.accent, }]} />
          {(['Today', 'Upcoming', 'All'] as ViewType[]).map`
);

fs.writeFileSync('./app/tasks/index.tsx', tasks, 'utf8');
