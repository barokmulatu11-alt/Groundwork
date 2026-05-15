const fs = require('fs');
let code = fs.readFileSync('./app/habits.tsx', 'utf8');

const brokenSection = `      </BackgroundGradient>
    );
              <Text style={{ fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: theme.secondaryText, marginTop: 4 }}>{stat.label.toUpperCase()}</Text>
            </AnimatedCard>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginLeft: -24, paddingLeft: 24 }} contentContainerStyle={{ paddingRight: 80 }}>`;

const correctSection = `      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
          paddingTop: insets.top + 24
        }}
      >
        <TabHeader
          title="Habits"
          subtitle="Keep the flame alive"
        />

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Active', value: activeHabits, icon: Play },
            { label: 'Best Streak', value: \`\${bestStreakEver}d\`, icon: Trophy },
            { label: 'Today', value: \`\${completionRate}%\`, icon: Star },
          ].map(stat => (
            <AnimatedCard key={stat.label} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
              <View style={[styles.statIconBox, { backgroundColor: 'transparent' }]}>
                <stat.icon size={16} color={theme.accent} />
              </View>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: theme.secondaryText, marginTop: 4 }}>{stat.label.toUpperCase()}</Text>
            </AnimatedCard>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginLeft: -24, paddingLeft: 24 }} contentContainerStyle={{ paddingRight: 80 }}>`;

if (code.includes(brokenSection)) {
    code = code.replace(brokenSection, correctSection);
    fs.writeFileSync('./app/habits.tsx', code, 'utf8');
    console.log("Fixed habits.tsx!");
} else {
    console.log("Could not find the broken section exactly.");
}
