import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Play, Pause, RotateCcw, Check, Sparkles, Clock, Target } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { Svg, Circle } from 'react-native-svg';
import { getLocalDateString } from '@/lib/dateUtils';

const PRESET_DURATIONS = [15, 25, 45, 60];

export default function FocusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const { tasks, loadAllTasks, focusSessions, addFocusSession, loadFocusSessions } = useStore();
  const { session } = useAuthStore();
  const userId = session?.user?.id || 'guest';

  const {
    focusTimerActive,
    focusTimerTimeLeft,
    focusTimerDurationMinutes,
    focusTimerSelectedTaskId,
    focusTimerStartTime,
    pomodoroBreakDuration,
    setFocusTimerActive,
    setFocusTimerTimeLeft,
    setFocusTimerDurationMinutes,
    setFocusTimerSelectedTaskId,
    setFocusTimerStartTime,
  } = useSettingsStore();

  const [selectedDuration, setSelectedDuration] = useState<number>(focusTimerDurationMinutes || 25);
  const [isCustom, setIsCustom] = useState<boolean>(!PRESET_DURATIONS.includes(selectedDuration));
  const [customMinutesInput, setCustomMinutesInput] = useState<string>(selectedDuration.toString());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(focusTimerSelectedTaskId);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number>(
    focusTimerTimeLeft > 0 ? focusTimerTimeLeft : selectedDuration * 60
  );
  const [isRunning, setIsRunning] = useState<boolean>(focusTimerActive);
  const isRecordingRef = useRef(false);

  // Load data
  useEffect(() => {
    loadAllTasks();
    if (loadFocusSessions) loadFocusSessions();
  }, [loadAllTasks, loadFocusSessions]);

  // Recalculate remaining time when app returns from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && focusTimerActive && focusTimerStartTime) {
        const elapsedSec = Math.floor((Date.now() - focusTimerStartTime) / 1000);
        const newLeft = Math.max(0, focusTimerTimeLeft - elapsedSec);
        setTimeLeft(newLeft);
        setFocusTimerTimeLeft(newLeft);
        if (newLeft === 0) {
          handleSessionFinished();
        }
      }
    });
    return () => sub.remove();
  }, [focusTimerActive, focusTimerStartTime, focusTimerTimeLeft]);

  // Timer interval
  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          setFocusTimerTimeLeft(next);
          if (next <= 0) {
            clearInterval(interval);
            handleSessionFinished();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleSessionFinished = async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    setIsRunning(false);
    setFocusTimerActive(false);
    setFocusTimerStartTime(null);
    hapticSuccess();

    try {
      const durationCompleted = selectedDuration;
      await addFocusSession({
        duration_minutes: durationCompleted,
        task_id: selectedTaskId || undefined,
        user_id: userId,
        completed_at: new Date().toISOString(),
      });
      if (loadFocusSessions) await loadFocusSessions();
    } catch (e) {
      console.warn('[FocusScreen] Failed to save focus session:', e);
    } finally {
      isRecordingRef.current = false;
    }
  };

  const handleStart = () => {
    hapticLight();
    const durationToUse = isCustom
      ? Math.max(1, parseInt(customMinutesInput, 10) || 25)
      : selectedDuration;
    const initialSeconds = timeLeft > 0 ? timeLeft : durationToUse * 60;
    setTimeLeft(initialSeconds);
    setIsRunning(true);
    setFocusTimerActive(true);
    setFocusTimerStartTime(Date.now());
    setFocusTimerDurationMinutes(durationToUse);
    setFocusTimerTimeLeft(initialSeconds);
  };

  const handlePause = () => {
    hapticLight();
    setIsRunning(false);
    setFocusTimerActive(false);
    setFocusTimerStartTime(null);
    setFocusTimerTimeLeft(timeLeft);
  };

  const handleReset = () => {
    hapticLight();
    setIsRunning(false);
    setFocusTimerActive(false);
    setFocusTimerStartTime(null);
    const durationToUse = isCustom
      ? Math.max(1, parseInt(customMinutesInput, 10) || 25)
      : selectedDuration;
    const initialSeconds = durationToUse * 60;
    setTimeLeft(initialSeconds);
    setFocusTimerTimeLeft(initialSeconds);
  };

  const handleSelectPreset = (mins: number) => {
    if (isRunning) return;
    hapticLight();
    setIsCustom(false);
    setSelectedDuration(mins);
    setTimeLeft(mins * 60);
    setFocusTimerDurationMinutes(mins);
    setFocusTimerTimeLeft(mins * 60);
  };

  const handleSetCustom = (text: string) => {
    setCustomMinutesInput(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val > 0 && !isRunning) {
      setSelectedDuration(val);
      setTimeLeft(val * 60);
      setFocusTimerDurationMinutes(val);
      setFocusTimerTimeLeft(val * 60);
    }
  };

  // Timer formatted MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalSeconds = selectedDuration * 60;
  const progressRatio = totalSeconds > 0 ? Math.max(0, Math.min(1, (totalSeconds - timeLeft) / totalSeconds)) : 0;

  const timerState: 'idle' | 'running' | 'paused' | 'completed' = (() => {
    if (isRunning) return 'running';
    if (timeLeft === 0) return 'completed';
    if (timeLeft < totalSeconds) return 'paused';
    return 'idle';
  })();

  const ringSize = 250;
  const strokeWidth = 3;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Today's session totals using local calendar date
  const todayStr = getLocalDateString();
  const todaySessions = (focusSessions || []).filter((s) => {
    if (!s.completed_at) return false;
    return s.completed_at.split('T')[0] === todayStr;
  });
  const todayTotalMinutes = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

  const activeTasksList = (tasks || []).filter((t) => !t.deleted_at && !t.completed);
  const selectedTaskObj = activeTasksList.find((t) => t.id === selectedTaskId);

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <BrandHeader showBack showMoreMenu onRightPress={() => router.push('/settings' as any)} />
      </View>

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 32 : 20,
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom, 16) + 80,
          maxWidth: isDesktop ? 640 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <Text style={styles.pageHeading}>Focus.</Text>
        <Text style={styles.pageSubline}>Give your mind single direction.</Text>

        <View style={styles.thinDivider} />

        {/* ── Central Focal Point: Serif Timer & Restrained Progress Ring ── */}
        <View style={styles.timerCenterWrap}>
          <View style={styles.ringWrapper}>
            <Svg width={ringSize} height={ringSize} style={styles.svgRing}>
              {/* Subtle background track */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Accurate progress track */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={theme.accent}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>

            {/* Inner Ring Content */}
            <View style={styles.innerRingContent}>
              <View
                style={[
                  styles.stateBadge,
                  timerState === 'running' && styles.stateBadgeRunning,
                  timerState === 'paused' && styles.stateBadgePaused,
                  timerState === 'completed' && styles.stateBadgeCompleted,
                ]}
              >
                <Text
                  style={[
                    styles.stateBadgeText,
                    timerState === 'running' && { color: theme.accent },
                    timerState === 'paused' && { color: '#EAB308' },
                    timerState === 'completed' && { color: '#10B981' },
                  ]}
                >
                  {timerState === 'running'
                    ? 'IN FOCUS'
                    : timerState === 'paused'
                    ? 'PAUSED'
                    : timerState === 'completed'
                    ? 'COMPLETED'
                    : 'READY'}
                </Text>
              </View>

              <Text style={styles.serifTimerDisplay}>{timeFormatted}</Text>

              <Text style={styles.breakInfoText} numberOfLines={1}>
                {selectedTaskObj ? selectedTaskObj.title : `Break: ${pomodoroBreakDuration || 5}m after`}
              </Text>
            </View>
          </View>

          {/* Primary Controls */}
          <View style={styles.controlsRow}>
            {!isRunning ? (
              <TouchableOpacity
                onPress={handleStart}
                style={styles.primaryPillBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={timeLeft < selectedDuration * 60 ? 'Resume timer' : 'Start focus'}
              >
                <Play size={16} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryPillBtnText}>
                  {timeLeft < selectedDuration * 60 ? 'Resume' : 'Start focus'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handlePause}
                style={styles.secondaryPillBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Pause timer"
              >
                <Pause size={16} color={theme.text} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryPillBtnText}>Pause</Text>
              </TouchableOpacity>
            )}

            {(timeLeft < selectedDuration * 60 || isRunning) && (
              <TouchableOpacity
                onPress={handleReset}
                style={styles.resetBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Reset timer"
              >
                <RotateCcw size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.thinDivider} />

        {/* ── Secondary Controls: Intention & Duration ── */}
        <View style={styles.taskSelectionBox}>
          <Text style={styles.fieldLabel}>INTENTION</Text>
          <TouchableOpacity
            onPress={() => setTaskPickerOpen(!taskPickerOpen)}
            style={styles.taskPickerTrigger}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select intention task"
          >
            <View style={styles.taskPickerLeft}>
              <Target size={18} color="#0066FF" strokeWidth={2} />
              <Text style={styles.selectedTaskTitle} numberOfLines={1}>
                {selectedTaskObj ? selectedTaskObj.title : 'Free focus (no task linked)'}
              </Text>
            </View>
            <Text style={styles.changeActionText}>
              {taskPickerOpen ? 'Done' : 'Change'}
            </Text>
          </TouchableOpacity>

          {taskPickerOpen && (
            <View style={styles.taskDropdownWrap}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedTaskId(null);
                  setFocusTimerSelectedTaskId(null);
                  setTaskPickerOpen(false);
                }}
                style={[
                  styles.taskDropdownItem,
                  !selectedTaskId && styles.taskDropdownItemActive,
                ]}
              >
                <Text style={styles.taskDropdownText}>Free focus (no task linked)</Text>
                {!selectedTaskId && <Check size={16} color="#0066FF" />}
              </TouchableOpacity>

              {activeTasksList.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    setSelectedTaskId(t.id);
                    setFocusTimerSelectedTaskId(t.id);
                    setTaskPickerOpen(false);
                  }}
                  style={[
                    styles.taskDropdownItem,
                    selectedTaskId === t.id && styles.taskDropdownItemActive,
                  ]}
                >
                  <Text style={styles.taskDropdownText} numberOfLines={1}>
                    {t.title}
                  </Text>
                  {selectedTaskId === t.id && <Check size={16} color="#0066FF" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 14 }} />

        {/* Duration Presets */}
        <Text style={styles.fieldLabel}>DURATION</Text>
        <View style={styles.presetsRow}>
          {PRESET_DURATIONS.map((dur) => {
            const active = !isCustom && selectedDuration === dur;
            return (
              <TouchableOpacity
                key={dur}
                onPress={() => handleSelectPreset(dur)}
                disabled={isRunning}
                style={[
                  styles.presetPill,
                  active && styles.presetPillActive,
                  isRunning && { opacity: 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${dur} minutes duration`}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    active && styles.presetPillTextActive,
                  ]}
                >
                  {dur}m
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => {
              if (isRunning) return;
              setIsCustom(true);
            }}
            disabled={isRunning}
            style={[
              styles.presetPill,
              isCustom && styles.presetPillActive,
              isRunning && { opacity: 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Custom minutes duration"
          >
            <Text
              style={[
                styles.presetPillText,
                isCustom && styles.presetPillTextActive,
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {isCustom && !isRunning && (
          <View style={styles.customInputRow}>
            <Text style={styles.customInputLabel}>Minutes:</Text>
            <TextInput
              value={customMinutesInput}
              onChangeText={handleSetCustom}
              keyboardType="number-pad"
              maxLength={3}
              style={styles.customTextInput}
              accessibilityLabel="Custom duration in minutes"
            />
          </View>
        )}

        {/* Daily Totals & Session History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.fieldLabel}>TODAY'S RHYTHM</Text>
            <Text style={styles.dailyTotalStat}>
              {todayTotalMinutes}m focused · {todaySessions.length} sessions
            </Text>
          </View>

          {todaySessions.length === 0 ? (
            <View style={styles.emptyHistoryBox}>
              <Text style={styles.emptyHistoryText}>
                No sessions recorded yet today. Start your first session to build momentum.
              </Text>
            </View>
          ) : (
            <View style={styles.sessionsListWrap}>
              {todaySessions.slice(0, 5).map((session, idx) => (
                <View key={session.id || idx} style={styles.sessionItemRow}>
                  <View style={styles.sessionItemLeft}>
                    <Clock size={15} color={theme.accent} />
                    <Text style={styles.sessionItemTitle}>
                      {session.duration_minutes}m focused session
                    </Text>
                  </View>
                  <Text style={styles.sessionItemTime}>
                    {session.completed_at
                      ? new Date(session.completed_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Today'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    pageHeading: {
      fontSize: 44,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: -1,
      color: theme.text,
      marginBottom: 4,
    },
    pageSubline: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
      marginBottom: 20,
    },
    thinDivider: {
      height: 1,
      backgroundColor: theme.separator,
      marginVertical: 18,
    },
    fieldLabel: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      marginBottom: 10,
    },

    // Intention / Task Picker
    taskSelectionBox: {
      width: '100%',
    },
    taskPickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    taskPickerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    selectedTaskTitle: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
    },
    changeActionText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
    taskDropdownWrap: {
      borderWidth: 1,
      borderColor: theme.separator,
      borderRadius: 8,
      marginTop: 6,
      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
      overflow: 'hidden',
    },
    taskDropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    taskDropdownItemActive: {
      backgroundColor: isDark ? 'rgba(0, 102, 255, 0.12)' : 'rgba(0, 102, 255, 0.08)',
    },
    taskDropdownText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
      flex: 1,
    },

    // Presets
    presetsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    presetPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    presetPillActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    presetPillText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.textSecondary,
    },
    presetPillTextActive: {
      color: '#FFFFFF',
    },
    customInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 6,
      marginBottom: 10,
    },
    customInputLabel: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: theme.textSecondary,
    },
    customTextInput: {
      width: 60,
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.separator,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      textAlign: 'center',
      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
    },

    // Large Serif Timer
    timerCenterWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    ringWrapper: {
      width: 250,
      height: 250,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      position: 'relative',
    },
    svgRing: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    innerRingContent: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    stateBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      marginBottom: 6,
    },
    stateBadgeRunning: {
      backgroundColor: 'rgba(0, 102, 255, 0.12)',
    },
    stateBadgePaused: {
      backgroundColor: 'rgba(234, 179, 8, 0.12)',
    },
    stateBadgeCompleted: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    stateBadgeText: {
      fontSize: 10,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.2,
      color: theme.textSecondary,
    },
    serifTimerDisplay: {
      fontSize: 54,
      fontFamily: 'PlayfairDisplay_700Bold',
      letterSpacing: -1,
      color: theme.text,
      lineHeight: 60,
      fontVariant: ['tabular-nums'],
    },
    breakInfoText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
      marginTop: 4,
      textAlign: 'center',
      maxWidth: 200,
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    primaryPillBtn: {
      backgroundColor: theme.accent,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 999,
    },
    primaryPillBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
    },
    secondaryPillBtn: {
      backgroundColor: isDark ? '#1E1E1E' : '#EDEAE3',
      borderWidth: 1,
      borderColor: theme.separator,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 999,
    },
    secondaryPillBtnText: {
      color: theme.text,
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    resetBtnText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
    },

    // History & Rhythm
    historySection: {
      width: '100%',
      paddingVertical: 6,
    },
    historyHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 12,
    },
    dailyTotalStat: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.textSecondary,
    },
    emptyHistoryBox: {
      paddingVertical: 12,
    },
    emptyHistoryText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
      lineHeight: 20,
    },
    sessionsListWrap: {
      width: '100%',
    },
    sessionItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    sessionItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sessionItemTitle: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
    },
    sessionItemTime: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
    },
  });
}
