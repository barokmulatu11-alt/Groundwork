import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { CenterModal } from '@/components/ui/CenterModal';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import {
    addMonths,
    addWeeks,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    getDay,
    isFuture,
    isToday,
    startOfMonth,
    startOfWeek,
    subMonths,
    subWeeks
} from 'date-fns';
import { useRouter } from 'expo-router';
import {
    Award,
    CheckCircle2,
    ChevronLeft, ChevronRight,
    Flame,
    Pencil
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, LayoutAnimation, Pressable, ScrollView, StatusBar, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Components ──────────────────────────────────────────────────────────────

const ProductivityRing = ({ percentage, size = 40, strokeWidth = 4, color = '#007AFF' }: { percentage: number, size?: number, strokeWidth?: number, color?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(128,128,128,0.1)" strokeWidth={strokeWidth} fill="none"
        />
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    tasks, habits, focusSessions, dayNotes, 
    loadAllTasks, loadHabits, loadFocusSessions, loadDayNotes, saveDayNote 
  } = useStore();
  const { theme, isDark } = useTheme();
  
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailVisible, setDetailVisible] = useState(false);
  const [dayNoteInput, setDayNoteInput] = useState('');

  useEffect(() => {
    loadAllTasks();
    loadHabits();
    loadFocusSessions();
    loadDayNotes();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setDayNoteInput(dayNotes[dateStr] || '');
    }
  }, [selectedDate, dayNotes]);

  // ─── Calculations ──────────────────────────────────────────────────────────

  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate) }), [currentDate]);

  const weekDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate) }), [currentDate]);

  const getDayData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const dayHabits = habits.filter(h => h.dates_completed.includes(dateStr));
    const daySessions = focusSessions.filter(s => s.completed_at && s.completed_at.startsWith(dateStr));
    
    const taskCompletion = dayTasks.length > 0 ? (dayTasks.filter(t => t.completed).length / dayTasks.length) * 100 : 0;
    const habitCompletion = habits.length > 0 ? (dayHabits.length / habits.length) * 100 : 0;
    const score = Math.round((taskCompletion * 0.7) + (habitCompletion * 0.3));

    return {
      score,
      tasks: dayTasks,
      habits: dayHabits,
      sessions: daySessions,
      hasTasks: dayTasks.length > 0,
      hasHabits: dayHabits.length > 0,
      hasSessions: daySessions.length > 0,
      isPerfect: score === 100 && dayTasks.length > 0 && dayHabits.length === habits.length
    };
  };

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    setDetailVisible(true);
  };

  const renderMonthDay = (day: Date) => {
    const data = getDayData(day);
    const isTodayDay = isToday(day);
    const isFutureDay = isFuture(day);
    const dateStr = format(day, 'yyyy-MM-dd');

    return (
      <Pressable 
        key={dateStr}
        style={{ width: `${100/7}%`, height: 75, alignItems: 'center', paddingVertical: 8, opacity: isFutureDay ? 0.4 : 1 }}
        onPress={() => handleDatePress(day)}
      >
        <View style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: data.isPerfect ? theme.accent : 'transparent',
          borderWidth: isTodayDay ? 2 : 0,
          borderColor: theme.accent,
          alignItems: 'center', justifyContent: 'center', marginBottom: 4
        }}>
          <Text style={{ 
            fontSize: 14, fontFamily: 'Inter_700Bold', 
            color: data.isPerfect ? 'white' : theme.primaryText 
          }}>
            {format(day, 'd')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {(data.hasTasks || data.hasHabits || data.hasSessions) && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.accent }} />}
        </View>
      </Pressable>
    );
  };

  const renderWeekDay = (day: Date) => {
    const data = getDayData(day);
    const isTodayDay = isToday(day);
    const dateStr = format(day, 'yyyy-MM-dd');

    return (
      <Pressable 
        key={dateStr}
        style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}
        onPress={() => handleDatePress(day)}
      >
        <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: theme.secondaryText, marginBottom: 8 }}>
          {format(day, 'EEE')[0]}
        </Text>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: isTodayDay ? `${theme.accent}20` : 'transparent',
          borderWidth: isTodayDay ? 1 : 0,
          borderColor: theme.accent,
          alignItems: 'center', justifyContent: 'center', marginBottom: 12
        }}>
          <Text style={{ fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>
            {format(day, 'd')}
          </Text>
        </View>
        <ProductivityRing percentage={data.score} size={32} strokeWidth={3} color={theme.accent} />
      </Pressable>
    );
  };

  // ─── Insights Logic ────────────────────────────────────────────────────────

  const monthlyConsistency = useMemo(() => {
    const productiveDays = monthDays.filter(d => getDayData(d).score > 0).length;
    return Math.round((productiveDays / monthDays.length) * 100);
  }, [monthDays]);

  const longestStreak = useMemo(() => {
    let max = 0;
    let current = 0;
    monthDays.forEach(d => {
      if (getDayData(d).score > 0) current++;
      else { max = Math.max(max, current); current = 0; }
    });
    return Math.max(max, current);
  }, [monthDays]);

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <BackgroundGradient>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <TabHeader title="Calendar" subtitle={format(currentDate, 'MMMM yyyy')} />
        
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 24 }}>
          {/* Mode Switcher */}
          <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 20, padding: 4, borderWidth: 1, borderColor: theme.cardBorder }}>
            <Pressable 
              onPress={() => { LayoutAnimation.easeInEaseOut(); setViewMode('monthly'); }}
              style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: viewMode === 'monthly' ? theme.accent : 'transparent' }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: viewMode === 'monthly' ? 'white' : theme.secondaryText }}>Monthly</Text>
            </Pressable>
            <Pressable 
              onPress={() => { LayoutAnimation.easeInEaseOut(); setViewMode('weekly'); }}
              style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: viewMode === 'weekly' ? theme.accent : 'transparent' }}
            >
              <Text style={{ fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: viewMode === 'weekly' ? 'white' : theme.secondaryText }}>Weekly</Text>
            </Pressable>
          </View>
        </View>

        {/* Month/Week Navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 22, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>
            {format(currentDate, viewMode === 'monthly' ? 'MMMM yyyy' : "'Week' w, MMMM")}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable 
              onPress={() => setCurrentDate(viewMode === 'monthly' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))}
              style={[styles.iconBox, { backgroundColor: theme.card }]}
            >
              <ChevronLeft size={20} color={theme.primaryText} />
            </Pressable>
            <Pressable 
              onPress={() => setCurrentDate(viewMode === 'monthly' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))}
              style={[styles.iconBox, { backgroundColor: theme.card }]}
            >
              <ChevronRight size={20} color={theme.primaryText} />
            </Pressable>
          </View>
        </View>

        {/* Calendar View */}
        <AnimatedCard style={{ padding: 16, marginBottom: 24 }}>
          {viewMode === 'monthly' ? (
            <View>
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontFamily: 'Inter_800ExtraBold', color: theme.secondaryText }}>{d}</Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: (getDay(startOfMonth(currentDate)) + 6) % 7 }).map((_, i) => (
                  <View key={`blank-${i}`} style={{ width: `${100/7}%`, height: 75 }} />
                ))}
                {monthDays.map(renderMonthDay)}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row' }}>
              {weekDays.map(renderWeekDay)}
            </View>
          )}
        </AnimatedCard>

        {/* Legend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.accent }} />
            <Text style={{ fontSize: 10, fontFamily: 'Inter_800ExtraBold', color: theme.secondaryText }}>Activity Indicators</Text>
          </View>
        </View>

        {/* Insights Section */}
        <Text style={{ fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginBottom: 20 }}>Productivity Insights</Text>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <AnimatedCard style={{ flex: 1, padding: 20, alignItems: 'center', backgroundColor: theme.card }}>
              <ProductivityRing percentage={monthlyConsistency} size={60} strokeWidth={6} color={theme.accent} />
              <Text style={{ fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginTop: 12 }}>{monthlyConsistency}%</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_800ExtraBold', color: theme.secondaryText, marginTop: 4 }}>CONSISTENCY</Text>
            </AnimatedCard>
            <AnimatedCard style={{ flex: 1, padding: 20, alignItems: 'center', backgroundColor: theme.card }}>
              <Flame size={32} color={theme.accent} />
              <Text style={{ fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginTop: 12 }}>{longestStreak}d</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_800ExtraBold', color: theme.secondaryText, marginTop: 4 }}>LONGEST STREAK</Text>
            </AnimatedCard>
          </View>
          
          <AnimatedCard style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconBox, { backgroundColor: theme.accentLight, marginRight: 16 }]}>
              <Award size={24} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>Best Performance</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: theme.secondaryText }}>You perform best on Mondays</Text>
            </View>
          </AnimatedCard>
        </View>

        {/* Day Detail — Centered Modal */}
        <CenterModal visible={isDetailVisible} onClose={() => setDetailVisible(false)} maxWidth={420}>
          {selectedDate && (() => {
            const data = getDayData(selectedDate);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            return (
              <ScrollView
                style={{ maxHeight: SCREEN_HEIGHT * 0.78 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <View>
                    <Text style={{ fontSize: 22, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>{format(selectedDate, 'MMMM do')}</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: theme.secondaryText }}>{format(selectedDate, 'EEEE, yyyy')}</Text>
                  </View>
                  {data.isPerfect && (
                    <View style={{ backgroundColor: '#FFD60A20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#B29400' }}>Perfect Day</Text>
                    </View>
                  )}
                </View>

                {/* Day Stats */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                  <View style={{ flex: 1, backgroundColor: theme.card, padding: 12, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: theme.accent }}>{data.tasks.filter(t => t.completed).length}/{data.tasks.length}</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_800ExtraBold', color: theme.secondaryText }}>TASKS</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: theme.card, padding: 12, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: theme.accent }}>{data.habits.length}</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_800ExtraBold', color: theme.secondaryText }}>HABITS</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: theme.card, padding: 12, borderRadius: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontFamily: 'Inter_800ExtraBold', color: theme.accent }}>{Math.round(data.sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / 60)}h</Text>
                    <Text style={{ fontSize: 9, fontFamily: 'Inter_800ExtraBold', color: theme.secondaryText }}>FOCUS</Text>
                  </View>
                </View>

                {/* Day Note */}
                <View style={{ marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Pencil size={16} color={theme.accent} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>Day Note</Text>
                  </View>
                  <TextInput
                    style={{ 
                      backgroundColor: theme.card, borderRadius: 16, padding: 14,
                      color: theme.primaryText, fontSize: 13, fontFamily: 'Inter_600SemiBold', minHeight: 80, textAlignVertical: 'top'
                    }}
                    placeholder="How was your day? Reflections, wins, thoughts..."
                    placeholderTextColor={theme.secondaryText}
                    multiline
                    value={dayNoteInput}
                    onChangeText={(t) => { setDayNoteInput(t); saveDayNote(dateStr, t); }}
                  />
                </View>

                {/* Tasks List */}
                <Text style={{ fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginBottom: 12 }}>Planned Tasks</Text>
                {data.tasks.length === 0 ? (
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: theme.secondaryText, fontStyle: 'italic', marginBottom: 20 }}>No tasks planned for this day.</Text>
                ) : (
                  <View style={{ gap: 10, marginBottom: 20 }}>
                    {data.tasks.map(t => (
                      <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CheckCircle2 size={18} color={t.completed ? theme.accent : theme.card} />
                        <Text style={{ marginLeft: 10, fontSize: 13, fontFamily: 'Inter_600SemiBold', color: t.completed ? theme.secondaryText : theme.primaryText, textDecorationLine: t.completed ? 'line-through' : 'none' }}>{t.title}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Habits */}
                <Text style={{ fontSize: 14, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginBottom: 12 }}>Habit Check-ins</Text>
                {data.habits.length === 0 ? (
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: theme.secondaryText, fontStyle: 'italic', marginBottom: 20 }}>No habits completed this day.</Text>
                ) : (
                  <View style={{ gap: 10, marginBottom: 20 }}>
                    {data.habits.map(h => (
                      <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Flame size={14} color={theme.accent} />
                        <Text style={{ marginLeft: 10, fontSize: 13, fontFamily: 'Inter_700Bold', color: theme.accent }}>{h.title}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <AnimatedButton 
                  title="+ Plan Task" 
                  onPress={() => { setDetailVisible(false); router.push({ pathname: '/tasks', params: { date: dateStr } } as any); }} 
                />
              </ScrollView>
            );
          })()}
        </CenterModal>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
