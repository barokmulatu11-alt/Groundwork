const fs = require('fs');
const filePath = 'c:/Barok/Projects/Groundwork/app/notification-settings.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
const oldImports = `import { useSettingsStore } from '@/store/useSettingsStore';`;
const newImports = `import { useSettingsStore } from '@/store/useSettingsStore';
import {
  displayTestNotification,
  testTaskReminderNotification,
  testHabitStreakNotification,
  testFocusCompleteNotification,
  testDailySummaryNotification,
} from '@/lib/notifications';
import { Send, Play, Sparkles, Check } from 'lucide-react-native';`;

content = content.replace(oldImports, newImports);

// 2. Add state inside component
const compStart = `export default function NotificationSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = theme.accent;`;

const compStartWithState = `export default function NotificationSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = theme.accent;
  const [testingStatus, setTestingStatus] = React.useState<string | null>(null);

  const handleTestNotification = async (type: string, fn: () => Promise<void>) => {
    try {
      setTestingStatus(type);
      await fn();
      setTimeout(() => setTestingStatus(null), 2500);
    } catch (e: any) {
      setTestingStatus(null);
      showAlert({
        title: "Test Failed",
        message: e?.message || "Could not trigger notification. Ensure notifications are enabled in device settings.",
        primaryButton: { text: "OK", onPress: () => {} },
      });
    }
  };

  const handleTestAllNotifications = async () => {
    try {
      setTestingStatus("all");
      await displayTestNotification();
      await new Promise(r => setTimeout(r, 600));
      await testTaskReminderNotification("Review Design Audit");
      await new Promise(r => setTimeout(r, 600));
      await testHabitStreakNotification("Morning Workout");
      await new Promise(r => setTimeout(r, 600));
      await testFocusCompleteNotification();
      await new Promise(r => setTimeout(r, 600));
      await testDailySummaryNotification();
      setTimeout(() => setTestingStatus(null), 2500);
    } catch (e: any) {
      setTestingStatus(null);
      showAlert({
        title: "Test Failed",
        message: e?.message || "Could not trigger notifications.",
        primaryButton: { text: "OK", onPress: () => {} },
      });
    }
  };`;

content = content.replace(compStart.replace(/\r?\n/g, '\r\n'), compStartWithState.replace(/\r?\n/g, '\r\n'))
                 .replace(compStart.replace(/\r?\n/g, '\n'), compStartWithState.replace(/\r?\n/g, '\n'));

// 3. Add TEST NOTIFICATIONS section right after CHANNELS section
const channelsEnd = `              </Card>
            </Animated.View>
          </>`;

const testSection = `              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).duration(500)}>
              {/* ── TEST NOTIFICATIONS ────────────────── */}
              <SectionLabel label="TEST NOTIFICATIONS" theme={theme} />
              <Card theme={theme}>
                <TouchableOpacity
                  onPress={handleTestAllNotifications}
                  activeOpacity={0.8}
                  style={[
                    styles.primaryTestBtn,
                    { backgroundColor: accentColor, marginBottom: 12 }
                  ]}
                >
                  <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryTestBtnText}>
                    {testingStatus === "all" ? "Triggering All 5 Notifications..." : "Test Every Notification"}
                  </Text>
                  {testingStatus === "all" && <Check size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>

                <View style={[styles.separator, { backgroundColor: theme.separator }]} />

                <SettingRow
                  icon={Send}
                  title="Quick System Alert"
                  subtitle="Immediate verification banner"
                  theme={theme}
                  onPress={() => handleTestNotification("quick", displayTestNotification)}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: accentColor }}>
                    {testingStatus === "quick" ? "Sent ✓" : "Test"}
                  </Text>
                </SettingRow>

                <View style={[styles.separator, { backgroundColor: theme.separator }]} />

                <SettingRow
                  icon={Zap}
                  title="Task Reminder"
                  subtitle="Simulate task due alert (15 mins prior)"
                  theme={theme}
                  onPress={() => handleTestNotification("task", () => testTaskReminderNotification("Finish Design Audit"))}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: accentColor }}>
                    {testingStatus === "task" ? "Sent ✓" : "Test"}
                  </Text>
                </SettingRow>

                <View style={[styles.separator, { backgroundColor: theme.separator }]} />

                <SettingRow
                  icon={CheckCircle2}
                  title="Habit Streak Alert"
                  subtitle="Simulate evening streak protection"
                  theme={theme}
                  onPress={() => handleTestNotification("habit", () => testHabitStreakNotification("Daily Meditation"))}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: accentColor }}>
                    {testingStatus === "habit" ? "Sent ✓" : "Test"}
                  </Text>
                </SettingRow>

                <View style={[styles.separator, { backgroundColor: theme.separator }]} />

                <SettingRow
                  icon={Clock}
                  title="Focus Timer Complete"
                  subtitle="Simulate 25-minute deep focus end"
                  theme={theme}
                  onPress={() => handleTestNotification("focus", testFocusCompleteNotification)}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: accentColor }}>
                    {testingStatus === "focus" ? "Sent ✓" : "Test"}
                  </Text>
                </SettingRow>

                <View style={[styles.separator, { backgroundColor: theme.separator }]} />

                <SettingRow
                  icon={Calendar}
                  title="Daily Morning Summary"
                  subtitle="Simulate morning agenda notification"
                  theme={theme}
                  onPress={() => handleTestNotification("summary", testDailySummaryNotification)}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: accentColor }}>
                    {testingStatus === "summary" ? "Sent ✓" : "Test"}
                  </Text>
                </SettingRow>
              </Card>
            </Animated.View>
          </>`;

content = content.replace(channelsEnd.replace(/\r?\n/g, '\r\n'), testSection.replace(/\r?\n/g, '\r\n'))
                 .replace(channelsEnd.replace(/\r?\n/g, '\n'), testSection.replace(/\r?\n/g, '\n'));

// 4. Add styles for primaryTestBtn
const styleTarget = `  card: {`;
const newStyle = `  primaryTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  primaryTestBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  card: {`;

content = content.replace(styleTarget, newStyle);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched app/notification-settings.tsx with Test Notifications section');
