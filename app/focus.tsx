import { BackgroundGradient as BG } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AppText as Text } from '@/components/ui/AppText';
import { CenterModal } from '@/components/ui/CenterModal';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { CustomTimePicker } from '@/components/ui/CustomTimePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { TabHeader } from '@/components/ui/TabHeader';
import { getFocusMetrics } from '@/lib/analytics/AnalyticsEngine';
import { hapticSuccess } from '@/lib/haptics';
import {
    cancelFocusCompleteNotification,
    scheduleFocusCompleteNotification,
} from '@/lib/notifications';
import { isPro } from '@/lib/subscriptionService';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import { useFocusEffect } from '@react-navigation/native';
import {
    eachDayOfInterval,
    endOfWeek,
    format,
    isSameDay,
    isToday,
    startOfWeek,
} from 'date-fns';
import { Brain, Flame, Target, Trophy, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    AppState,
    AppStateStatus,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Sub-components ───────────────────────────────────────────────────────────

const ModePill = ({ label, active, onPress, theme }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      styles.modePill,
      {
        backgroundColor: active ? theme.accent : 'transparent',
        borderColor: active ? 'transparent' : theme.cardBorder,
      },
    ]}
  >
    <Text style={[styles.modePillText, { color: active ? 'white' : theme.primaryText }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const AnimatedVisualizer = ({ active, theme }: { active: boolean; theme: any }) => {
  const bars = Array.from({ length: 15 });
  return (
    <View style={styles.visualizerContainer}>
      {bars.map((_, i) => (
        <VisualizerBar key={i} index={i} active={active} theme={theme} />
      ))}
    </View>
  );
};

const VisualizerBar = ({ index, active, theme }: any) => {
  const height = useSharedValue(10);

  useEffect(() => {
    if (active) {
      height.value = withRepeat(
        withTiming(15 + Math.random() * 25, { duration: 400 + Math.random() * 300 }),
        -1,
        true,
      );
    } else {
      height.value = withSpring(10);
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: theme.accent,
    opacity: 0.6,
  }));

  return <Animated.View style={[styles.visualizerBar, style]} />;
};

// ─── Pro Analytics Card ───────────────────────────────────────────────────────

const formatMinutes = (mins: number) => {
  if (!mins || mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const FocusAnalyticsCard = ({ metrics, theme }: { metrics: any; theme: any }) => {
  if (!metrics) return null;
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View style={[styles.analyticsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.analyticsTitle, { color: theme.secondaryText }]}>
          FOCUS ANALYTICS · 30 DAYS
        </Text>

        {/* Score + stats */}
        <View style={styles.analyticsRow}>
          <View style={[styles.scoreCircle, { backgroundColor: theme.accent + '20' }]}>
            <Text style={[styles.scoreNum, { color: theme.accent }]}>
              {metrics.focusScore ?? 0}
            </Text>
            <Text style={[styles.scoreLabel, { color: theme.tertiaryText }]}>/100</Text>
          </View>
          <View style={styles.analyticsStats}>
            {[
              { icon: Flame, label: 'This week', value: formatMinutes(metrics.totalFocusTimeThisWeek ?? 0), color: '#FF9500' },
              { icon: Brain, label: 'Avg session', value: formatMinutes(metrics.averageSessionLength ?? 0), color: '#AF52DE' },
              { icon: Target, label: 'Distraction', value: `${metrics.distractionRate ?? 0}%`, color: '#FF3B30' },
            ].map((item) => (
              <View key={item.label} style={styles.analyticsStat}>
                <item.icon size={13} color={item.color} />
                <Text style={[styles.analyticsStatVal, { color: theme.primaryText }]}>
                  {item.value}
                </Text>
                <Text style={[styles.analyticsStatLbl, { color: theme.tertiaryText }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Best focus hours */}
        {metrics.bestFocusHours?.length > 0 && (
          <View style={styles.peakSection}>
            <Text style={[styles.peakLabel, { color: theme.tertiaryText }]}>
              PEAK HOURS
            </Text>
            <View style={styles.peakRow}>
              {metrics.bestFocusHours.slice(0, 4).map((h: any, i: number) => (
                <View key={i} style={[styles.peakBadge, { backgroundColor: theme.accent + '20' }]}>
                  <Text style={[styles.peakTime, { color: theme.accent }]}>
                    {h.hour < 12
                      ? `${h.hour === 0 ? 12 : h.hour}AM`
                      : `${h.hour === 12 ? 12 : h.hour - 12}PM`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const { tasks, loadAllTasks, focusSessions, addFocusSession, loadFocusSessions } = useStore();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const userId = session?.user?.id || 'guest';
  const userIsPro = isPro();

  const [focusMetrics, setFocusMetrics] = useState<any>(null);

  const {
    focusTimerActive,
    focusTimerTimeLeft,
    focusTimerMode,
    focusTimerDurationMinutes,
    focusTimerSelectedTaskId,
    focusTimerStartTime,
    setFocusTimerActive,
    setFocusTimerTimeLeft,
    setFocusTimerMode,
    setFocusTimerDurationMinutes,
    setFocusTimerSelectedTaskId,
    setFocusTimerStartTime,
  } = useSettingsStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(focusTimerSelectedTaskId);
  const [mode, setMode] = useState<'Study' | 'Quick Sprint' | 'Deep Work' | 'Custom'>(focusTimerMode);
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(focusTimerDurationMinutes);
  const [timeLeft, setTimeLeft] = useState(focusTimerTimeLeft);
  const [isActive, setIsActive] = useState(focusTimerActive);
  const [isEditSheetVisible, setEditSheetVisible] = useState(false);
  const [completionAlertVisible, setCompletionAlertVisible] = useState(false);
  const [tempHours, setTempHours] = useState('0');
  const [tempMinutes, setTempMinutes] = useState('25');

  // Restore elapsed time when app comes back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && focusTimerActive && focusTimerStartTime) {
        const elapsedSeconds = Math.floor((Date.now() - focusTimerStartTime) / 1000);
        const newTimeLeft = Math.max(0, focusTimerTimeLeft - elapsedSeconds);
        setTimeLeft(newTimeLeft);
        setFocusTimerTimeLeft(newTimeLeft);
        if (newTimeLeft === 0) {
          setIsActive(false);
          setFocusTimerActive(false);
          setFocusTimerStartTime(null);
          handleTimerCompletion();
        }
      }
    });
    return () => subscription.remove();
  }, [focusTimerActive, focusTimerStartTime, focusTimerTimeLeft]);

  // Main countdown interval
  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) { clearInterval(interval); return 0; }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Sync local → store
  useEffect(() => {
    if (timeLeft === 0 && isActive) handleTimerCompletion();
    if (focusTimerTimeLeft !== timeLeft) setFocusTimerTimeLeft(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (focusTimerActive !== isActive) setFocusTimerActive(isActive);
  }, [isActive]);

  useEffect(() => {
    if (focusTimerMode !== mode) setFocusTimerMode(mode);
    if (focusTimerDurationMinutes !== defaultDurationMinutes) setFocusTimerDurationMinutes(defaultDurationMinutes);
  }, [mode, defaultDurationMinutes]);

  useEffect(() => {
    if (focusTimerSelectedTaskId !== selectedTaskId) setFocusTimerSelectedTaskId(selectedTaskId);
  }, [selectedTaskId]);

  useEffect(() => {
    if (isEditSheetVisible) {
      setTempHours(String(Math.floor(defaultDurationMinutes / 60)));
      setTempMinutes(String(defaultDurationMinutes % 60));
    }
  }, [isEditSheetVisible]);

  const handleTimerCompletion = async () => {
    setIsActive(false);
    setFocusTimerActive(false);
    setFocusTimerStartTime(null);
    await cancelFocusCompleteNotification();
    addFocusSession({
      duration_minutes: defaultDurationMinutes,
      task_id: selectedTaskId || undefined,
      date: new Date().toISOString().split('T')[0],
      mode,
    });
    Vibration.vibrate([0, 500, 200, 500]);
    hapticSuccess();
    setCompletionAlertVisible(true);
  };

  const handleStartPause = async () => {
    if (isActive) {
      setIsActive(false);
      setFocusTimerActive(false);
      setFocusTimerStartTime(null);
      await cancelFocusCompleteNotification();
    } else {
      setIsActive(true);
      setFocusTimerActive(true);
      setFocusTimerStartTime(Date.now());
      const task = tasks.find((t) => t.id === selectedTaskId);
      await scheduleFocusCompleteNotification(timeLeft / 60, task?.title);
    }
  };

  const handleReset = async () => {
    const secondsSpent = defaultDurationMinutes * 60 - timeLeft;
    const minutesSpent = Math.floor(secondsSpent / 60);
    if (minutesSpent > 0 && isActive) {
      addFocusSession({
        duration_minutes: minutesSpent,
        task_id: selectedTaskId || undefined,
        date: new Date().toISOString().split('T')[0],
        mode: `${mode} (Partial)`,
      });
    }
    setIsActive(false);
    setFocusTimerActive(false);
    setFocusTimerStartTime(null);
    setTimeLeft(defaultDurationMinutes * 60);
    setFocusTimerTimeLeft(defaultDurationMinutes * 60);
    await cancelFocusCompleteNotification();
  };

  useFocusEffect(
    useCallback(() => {
      loadAllTasks();
      loadFocusSessions();
      if (userIsPro) {
        try { setFocusMetrics(getFocusMetrics(userId, 30)); } catch (_) {}
      }
    }, [userId, userIsPro]),
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = focusSessions.filter((s) => s.date === todayStr);

  const applyCustomDuration = () => {
    const h = parseInt(tempHours) || 0;
    const m = parseInt(tempMinutes) || 0;
    const totalMins = h * 60 + m;
    if (totalMins > 0) {
      setMode('Custom');
      setDefaultDurationMinutes(totalMins);
      setTimeLeft(totalMins * 60);
      setEditSheetVisible(false);
    } else {
      Alert.alert('Invalid Time', 'Please select a duration greater than 0.');
    }
  };

  return (
    <BG>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, paddingTop: insets.top + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TabHeader title="Focus Timer" subtitle="Stay in the zone" showBack />

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          <ModePill label="Study" active={mode === 'Study'} onPress={() => { setMode('Study'); setDefaultDurationMinutes(25); setTimeLeft(25 * 60); }} theme={theme} />
          <ModePill label="Deep Work" active={mode === 'Deep Work'} onPress={() => { setMode('Deep Work'); setDefaultDurationMinutes(45); setTimeLeft(45 * 60); }} theme={theme} />
          <ModePill label="Sprint" active={mode === 'Quick Sprint'} onPress={() => { setMode('Quick Sprint'); setDefaultDurationMinutes(15); setTimeLeft(15 * 60); }} theme={theme} />
          <ModePill label="Custom" active={mode === 'Custom'} onPress={() => setEditSheetVisible(true)} theme={theme} />
        </View>

        {/* Timer circle */}
        <View style={styles.timerContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => !isActive && setEditSheetVisible(true)}
            style={[styles.timerCircle, { borderColor: isActive ? theme.accent : theme.card, borderWidth: isActive ? 4 : 2 }]}
          >
            <Text style={[styles.timerText, { color: theme.primaryText, fontSize: timeLeft >= 3600 ? 40 : 48, fontFamily: 'Inter_800ExtraBold' }]}>
              {timeLeft >= 3600
                ? `${Math.floor(timeLeft / 3600)}:${String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`
                : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`}
            </Text>
            <Text style={[styles.timerMode, { color: theme.secondaryText }]}>{mode}</Text>
          </TouchableOpacity>

          <AnimatedVisualizer active={isActive} theme={theme} />

          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={handleReset}
              style={[styles.controlBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.card }]}
            >
              <Text style={{ color: theme.primaryText, fontFamily: 'Inter_600SemiBold' }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStartPause} style={[styles.playBtn, { backgroundColor: theme.accent }]}>
              <Text style={styles.playBtnText}>{isActive ? 'Pause' : 'Start Focus'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Focus History */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Focus History</Text>
          <AnimatedCard style={styles.historyCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Flame color="#FF9500" size={20} />
                <Text style={[styles.statValue, { color: theme.primaryText }]}>{todaySessions.length}</Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Today</Text>
              </View>
              <View style={styles.statItem}>
                <Zap color="#FFD60A" size={20} />
                <Text style={[styles.statValue, { color: theme.primaryText }]}>
                  {formatMinutes(todaySessions.reduce((acc, s) => acc + (Number(s.duration_minutes) || 0), 0))}
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Focused</Text>
              </View>
            </View>
            <View style={styles.dayStrip}>
              {eachDayOfInterval({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }).map((day, i) => {
                const hasSession = focusSessions.some((s) => isSameDay(new Date(s.date), day));
                return (
                  <View key={i} style={styles.dayItem}>
                    <Text style={[styles.dayName, { color: theme.secondaryText }]}>{format(day, 'E')[0]}</Text>
                    <View style={[styles.dayDot, {
                      backgroundColor: hasSession ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                      borderWidth: isToday(day) ? 1 : 0,
                      borderColor: theme.accent,
                    }]} />
                  </View>
                );
              })}
            </View>
          </AnimatedCard>
        </View>

        {/* Pro: Focus Analytics */}
        {userIsPro && focusMetrics && (
          <View style={styles.section}>
            <FocusAnalyticsCard metrics={focusMetrics} theme={theme} />
          </View>
        )}

        {/* Focus Goal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Focus Goal</Text>
          {tasks.filter((t) => !t.completed).length > 0 ? (
            tasks.filter((t) => !t.completed).map((task) => (
              <Pressable
                key={task.id}
                onPress={() => setSelectedTaskId(task.id)}
                style={({ pressed }) => [
                  styles.taskCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: selectedTaskId === task.id ? theme.accent : theme.cardBorder,
                    borderWidth: selectedTaskId === task.id ? 2 : 1,
                    borderRadius: 14,
                    opacity: pressed ? 0.75 : 1,
                    marginBottom: 12,
                  },
                ]}
              >
                <View style={[styles.taskRadio, { borderColor: selectedTaskId === task.id ? theme.accent : theme.secondaryText }]}>
                  {selectedTaskId === task.id && <View style={[styles.taskRadioInner, { backgroundColor: theme.accent }]} />}
                </View>
                <Text style={[styles.taskTitle, { color: theme.primaryText }]}>{task.title}</Text>
              </Pressable>
            ))
          ) : (
            <EmptyState
              icon={Trophy}
              title="No tasks to link"
              subtitle="Add a task first, or start an open focus session without linking one."
            />
          )}
        </View>
      </ScrollView>

      {/* Custom timer modal */}
      <CenterModal visible={isEditSheetVisible} onClose={() => setEditSheetVisible(false)} maxWidth={380}>
        <View style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: theme.primaryText }]}>Set Timer</Text>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerItem}>
              <CustomTimePicker items={Array.from({ length: 13 }, (_, i) => String(i))} selectedValue={tempHours} onValueChange={setTempHours} />
              <Text style={[styles.pickerLabel, { color: theme.primaryText }]}>hours</Text>
            </View>
            <Text style={[styles.pickerSeparator, { color: theme.primaryText }]}>:</Text>
            <View style={styles.pickerItem}>
              <CustomTimePicker items={Array.from({ length: 60 }, (_, i) => String(i))} selectedValue={tempMinutes} onValueChange={setTempMinutes} />
              <Text style={[styles.pickerLabel, { color: theme.primaryText }]}>mins</Text>
            </View>
          </View>
          <TouchableOpacity onPress={applyCustomDuration} style={[styles.applyBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.applyBtnText}>Apply Duration</Text>
          </TouchableOpacity>
        </View>
      </CenterModal>

      <CustomAlert
        visible={completionAlertVisible}
        type="success"
        title="Session Complete!"
        message="Amazing work! You've successfully completed your focus block."
        onConfirm={() => setCompletionAlertVisible(false)}
      />
    </BG>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modeSelector: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 15, paddingHorizontal: 20 },
  modePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  modePillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  timerContainer: { alignItems: 'center', marginBottom: 25 },
  timerCircle: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 48, fontFamily: 'Inter_800ExtraBold' },
  timerMode: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 4, opacity: 0.6 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 25 },
  controlBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  playBtn: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: 14 },
  playBtnText: { color: 'white', fontFamily: 'Inter_700Bold', fontSize: 16 },
  section: { paddingHorizontal: 0, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', marginBottom: 16 },
  historyCard: { padding: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'Inter_700Bold', marginTop: 8 },
  statLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  dayItem: { alignItems: 'center' },
  dayName: { fontSize: 10, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  taskCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
  taskRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  taskRadioInner: { width: 10, height: 10, borderRadius: 5 },
  taskTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sheetContent: { padding: 24, alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontFamily: 'Inter_800ExtraBold', marginBottom: 24 },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 200, marginBottom: 24 },
  pickerItem: { flex: 1, alignItems: 'center' },
  pickerLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 8, textTransform: 'uppercase' },
  pickerSeparator: { fontSize: 32, fontFamily: 'Inter_700Bold', marginHorizontal: 10, marginBottom: 20 },
  applyBtn: { paddingHorizontal: 50, paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center' },
  applyBtnText: { color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' },
  visualizerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 40, marginTop: 20 },
  visualizerBar: { width: 4, borderRadius: 2 },
  // Pro analytics card
  analyticsCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 0 },
  analyticsTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  scoreCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  scoreNum: { fontSize: 26, fontFamily: 'Inter_800ExtraBold' },
  scoreLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 10 },
  analyticsStats: { flex: 1, gap: 8 },
  analyticsStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyticsStatVal: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  analyticsStatLbl: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  peakSection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)', paddingTop: 12 },
  peakLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  peakRow: { flexDirection: 'row', gap: 8 },
  peakBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  peakTime: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});
