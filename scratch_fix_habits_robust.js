const fs = require('fs');
let code = fs.readFileSync('./app/habits.tsx', 'utf8');

// Use a more robust search
const part1 = "style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'transparent', borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder }}";
const part2 = "<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginLeft: -24, paddingLeft: 24 }} contentContainerStyle={{ paddingRight: 80 }}>";

const searchStr = part1 + "\n        " + part2;

const missingCode = `              >
                <Trash2 size={20} color={theme.accent} />
                <Text style={{ marginLeft: 12, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: theme.primaryText }}>Delete Habit</Text>
              </Pressable>
            </View>
          </View>
        </NativeSheet>
      </BackgroundGradient>
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
`;

if (code.includes(part1) && code.includes(part2)) {
    // Replace the first occurrence of part1 followed by part2
    // We handle the newline and indentation
    const lines = code.split('\n');
    let found = -1;
    for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].includes(part1) && lines[i+1].includes(part2)) {
            found = i;
            break;
        }
    }
    
    if (found !== -1) {
        lines.splice(found + 1, 0, missingCode);
        fs.writeFileSync('./app/habits.tsx', lines.join('\n'), 'utf8');
        console.log("Fixed habits.tsx!");
    } else {
        console.log("Could not find the sequence of lines.");
    }
} else {
    console.log("Could not find the parts.");
}
