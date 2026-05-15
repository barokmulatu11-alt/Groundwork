import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable, Switch, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Clock, 
  Calendar, 
  Filter, 
  Timer, 
  Coffee, 
  Target, 
  Sparkles,
  Zap,
  Bell,
  Minus,
  Plus
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useSettingsStore } from '@/store/useSettingsStore';
import Animated, { FadeInDown } from 'react-native-reanimated';

// ─── Sub-Components ──────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
      {label}
    </Text>
  );
}

function Card({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      {children}
    </View>
  );
}

interface SettingRowProps {
  icon: any;
  title: string;
  subtitle: string;
  theme: any;
  children: React.ReactNode;
}

function SettingRow({ icon: Icon, title, subtitle, theme, children }: SettingRowProps) {
  return (
    <View style={styles.settingRowContainer}>
      <View style={styles.settingHeader}>
        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
          <Icon size={18} color={theme.accent} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.primaryText }]}>{title}</Text>
          <Text style={[styles.settingSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.controlContainer}>
        {children}
      </View>
    </View>
  );
}

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: any) => void;
  theme: any;
  accentColor: string;
}

function SegmentedControl({ options, value, onChange, theme, accentColor }: SegmentedControlProps) {
  return (
    <View style={[styles.segmentedTrack, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segmentButton,
              active && { backgroundColor: theme.cardSolid,      },
            ]}
          >
            <Text style={[
              styles.segmentLabel,
              { color: active ? accentColor : theme.secondaryText },
              active && { fontFamily: 'Inter_700Bold' },
            ]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProductivitySettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = '#007AFF';

  const settings = useSettingsStore();

  return (
    <BackgroundGradient>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={accentColor} />
          <Text style={[styles.backText, { color: accentColor }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primaryText }]}>Productivity</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Customise your workflow</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          {/* ── TASKS ─────────────────────────────── */}
          <SectionLabel label="TASKS" theme={theme} />
          <Card theme={theme}>
            <SettingRow 
              icon={Zap} 
              title="Default Priority" 
              subtitle="Applied to new tasks" 
              theme={theme}
            >
              <SegmentedControl
                theme={theme}
                accentColor={accentColor}
                value={settings.defaultTaskPriority}
                onChange={settings.setDefaultTaskPriority}
                options={[
                  { label: 'Low', value: 'Low' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'High', value: 'High' },
                ]}
              />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={Bell} 
              title="Reminder Offset" 
              subtitle={`${settings.defaultReminderTime} mins before`} 
              theme={theme}
            >
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={60}
                step={5}
                value={settings.defaultReminderTime}
                onSlidingComplete={settings.setDefaultReminderTime}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={theme.separator}
                thumbTintColor={Platform.OS === 'android' ? accentColor : '#fff'}
              />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={Filter} 
              title="Auto-sort Tasks" 
              subtitle="Keep list organized by priority" 
              theme={theme}
            >
              <Switch
                value={settings.autoSortTasks}
                onValueChange={settings.setAutoSortTasks}
                trackColor={{ true: accentColor, false: theme.switchTrackFalse }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </SettingRow>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          {/* ── FOCUS & POMODORO ──────────────────────── */}
          <SectionLabel label="FOCUS & POMODORO" theme={theme} />
          <Card theme={theme}>
            <SettingRow 
              icon={Timer} 
              title="Focus Duration" 
              subtitle={`${settings.pomodoroFocusDuration} mins session`} 
              theme={theme}
            >
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={10}
                maximumValue={90}
                step={5}
                value={settings.pomodoroFocusDuration}
                onSlidingComplete={settings.setPomodoroFocusDuration}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={theme.separator}
                thumbTintColor={Platform.OS === 'android' ? accentColor : '#fff'}
              />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={Coffee} 
              title="Break Duration" 
              subtitle={`${settings.pomodoroBreakDuration} mins rest`} 
              theme={theme}
            >
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={3}
                maximumValue={20}
                step={1}
                value={settings.pomodoroBreakDuration}
                onSlidingComplete={settings.setPomodoroBreakDuration}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor={theme.separator}
                thumbTintColor={Platform.OS === 'android' ? accentColor : '#fff'}
              />
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={Clock} 
              title="Auto-start Breaks" 
              subtitle="Skip confirmation after session" 
              theme={theme}
            >
              <Switch
                value={settings.pomodoroAutoStartBreaks}
                onValueChange={settings.setPomodoroAutoStartBreaks}
                trackColor={{ true: accentColor, false: theme.switchTrackFalse }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </SettingRow>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          {/* ── GOALS & CALENDAR ──────────────────────── */}
          <SectionLabel label="GOALS & CALENDAR" theme={theme} />
          <Card theme={theme}>
            <SettingRow 
              icon={Target} 
              title="Daily Goal" 
              subtitle={`${settings.dailyGoal} tasks per day`} 
              theme={theme}
            >
              <View style={styles.stepper}>
                <TouchableOpacity 
                  onPress={() => settings.setDailyGoal(Math.max(1, settings.dailyGoal - 1))}
                  style={[styles.stepperBtn, { backgroundColor: 'transparent' }]}
                >
                  <Minus size={18} color={accentColor} />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, { color: theme.primaryText }]}>{settings.dailyGoal}</Text>
                <TouchableOpacity 
                  onPress={() => settings.setDailyGoal(settings.dailyGoal + 1)}
                  style={[styles.stepperBtn, { backgroundColor: 'transparent' }]}
                >
                  <Plus size={18} color={accentColor} />
                </TouchableOpacity>
              </View>
            </SettingRow>

            <View style={[styles.separator, { backgroundColor: theme.separator }]} />

            <SettingRow 
              icon={Calendar} 
              title="Week Start" 
              subtitle="Calendar view preference" 
              theme={theme}
            >
              <SegmentedControl
                theme={theme}
                accentColor={accentColor}
                value={settings.weekStartDay}
                onChange={settings.setWeekStartDay}
                options={[
                  { label: 'Sunday', value: 'Sunday' },
                  { label: 'Monday', value: 'Monday' },
                ]}
              />
            </SettingRow>

          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          {/* ── AI TOOLS ──────────────────────── */}
          <SectionLabel label="AI TOOLS" theme={theme} />
          <Card theme={theme}>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Sparkles size={24} color={theme.accent} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText }}>Coming real soon...</Text>
            </View>
          </Card>
        </Animated.View>

      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    
    
    
    
    
  },
  settingRowContainer: {
    paddingVertical: 4,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
    marginTop: 1,
  },
  controlContainer: {
    width: '100%',
  },
  separator: {
    height: 1,
    marginVertical: 16,
    opacity: 0.1,
  },
  // ── Segmented Control ────────
  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  // ── Stepper ──────────────────
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 4,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  }
});
