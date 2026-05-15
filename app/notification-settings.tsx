import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { TabHeader } from '@/components/ui/TabHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Bell, 
  BellOff, 
  Moon, 
  Volume2, 
  Clock, 
  Calendar,
  MessageSquare,
  Zap,
  CheckCircle2
} from 'lucide-react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

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
  subtitle?: string;
  theme: any;
  children?: React.ReactNode;
  onPress?: () => void;
}

function SettingRow({ icon: Icon, title, subtitle, theme, children, onPress }: SettingRowProps) {
  const content = (
    <View style={styles.settingRowContainer}>
      <View style={styles.settingHeader}>
        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
          <Icon size={18} color={theme.accent} />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, { color: theme.primaryText }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>}
        </View>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NotificationSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = '#007AFF';

  const { 
    notificationsEnabled, setNotificationsEnabled,
    defaultReminderTime, setDefaultReminderTime 
  } = useSettingsStore();

  return (
    <BackgroundGradient>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 24 }}>
        <TabHeader title="Notifications" subtitle="Manage how you stay updated" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          {/* ── ALERTS ─────────────────────────────── */}
          <SectionLabel label="ALERTS" theme={theme} />
          <Card theme={theme}>
            <SettingRow 
              icon={notificationsEnabled ? Bell : BellOff} 
              title="Allow Notifications" 
              subtitle="Enable system alerts and banners" 
              theme={theme}
            >
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ true: accentColor, false: theme.switchTrackFalse }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              />
            </SettingRow>

            {notificationsEnabled && (
              <>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                <SettingRow 
                  icon={Clock} 
                  title="Daily Reminder" 
                  subtitle={`Remind me ${defaultReminderTime} mins before tasks`} 
                  theme={theme}
                >
                  <Slider
                    style={{ width: 120, height: 40 }}
                    minimumValue={0}
                    maximumValue={60}
                    step={5}
                    value={defaultReminderTime}
                    onSlidingComplete={setDefaultReminderTime}
                    minimumTrackTintColor={accentColor}
                    maximumTrackTintColor={theme.separator}
                    thumbTintColor={Platform.OS === 'android' ? accentColor : '#fff'}
                  />
                </SettingRow>
              </>
            )}
          </Card>
        </Animated.View>

        {notificationsEnabled && (
          <>
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              {/* ── PREFERENCES ────────────────────────── */}
              <SectionLabel label="PREFERENCES" theme={theme} />
              <Card theme={theme}>
                <SettingRow 
                  icon={Volume2} 
                  title="Notification Sounds" 
                  subtitle="System default" 
                  theme={theme}
                  onPress={() => showAlert({
                    title: "Sound Setup",
                    message: "Custom notification sounds will be available in the next update.",
                    primaryButton: { text: "OK", onPress: () => {} }
                  })}
                />
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                <SettingRow 
                  icon={Moon} 
                  title="Quiet Hours" 
                  subtitle="Do not disturb between 10PM - 7AM" 
                  theme={theme}
                >
                   <Switch
                    value={true}
                    onValueChange={() => {}}
                    trackColor={{ true: accentColor, false: theme.switchTrackFalse }}
                    thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                  />
                </SettingRow>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              {/* ── CHANNELS ────────────────────────── */}
              <SectionLabel label="NOTIFICATION CHANNELS" theme={theme} />
              <Card theme={theme}>
                <SettingRow 
                  icon={Zap} 
                  title="Task Reminders" 
                  theme={theme}
                >
                  <Switch value={true} onValueChange={() => {}} trackColor={{ true: accentColor }} />
                </SettingRow>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                <SettingRow 
                  icon={CheckCircle2} 
                  title="Habit Streaks" 
                  theme={theme}
                >
                  <Switch value={true} onValueChange={() => {}} trackColor={{ true: accentColor }} />
                </SettingRow>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                <SettingRow 
                  icon={MessageSquare} 
                  title="App Updates" 
                  theme={theme}
                >
                  <Switch value={false} onValueChange={() => {}} trackColor={{ true: accentColor }} />
                </SettingRow>
              </Card>
            </Animated.View>
          </>
        )}

        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: theme.secondaryText }]}>
            groundwork. respects your time. We only send essential notifications to help you stay focused.
          </Text>
        </View>

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
    paddingVertical: 8,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    marginTop: 2,
  },
  separator: {
    height: 1,
    marginVertical: 12,
    opacity: 0.05,
  },
  footerNote: {
    marginTop: 32,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.6,
  }
});
