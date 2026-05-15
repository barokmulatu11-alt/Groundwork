const fs = require('fs');
let code = fs.readFileSync('./app/habits.tsx', 'utf8');

const brokenLine = "                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'transparent', borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder }}";
const nextLine = "        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginLeft: -24, paddingLeft: 24 }} contentContainerStyle={{ paddingRight: 80 }}>";

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

code = code.replace(brokenLine + "\n" + nextLine, brokenLine + "\n" + missingCode + "\n" + nextLine);
fs.writeFileSync('./app/habits.tsx', code, 'utf8');
