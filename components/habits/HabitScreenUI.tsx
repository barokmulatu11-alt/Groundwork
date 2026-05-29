import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import type { Habit } from '@/lib/db';
import { buildCurrentWeekDays, toLocalDateStr, WEEKDAY_LABELS_MON } from '@/lib/calendarGrid';
import { habitCompletedOnDate } from '@/lib/habitUtils';
import { format } from 'date-fns';
import { Check, Flame, Sparkles, Star, Trophy } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CATEGORIES = ['All', 'Health', 'Learning', 'Mind', 'Work', 'Personal'] as const;

function formatFrequency(freq: string): string {
  if (freq.startsWith('Custom:')) return 'Custom schedule';
  return freq;
}

// ─── Today hero ───────────────────────────────────────────────────────────────

interface HabitTodayHeroProps {
  completedToday: number;
  totalHabits: number;
  completionRate: number;
  bestStreak: number;
  activeCount: number;
}

export function HabitTodayHero({
  completedToday,
  totalHabits,
  completionRate,
  bestStreak,
  activeCount,
}: HabitTodayHeroProps) {
  const { theme, isDark } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(completionRate / 100, { damping: 18, stiffness: 90 });
  }, [completionRate]);

  const size = 108;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : theme.accentLight,
          borderColor: isDark ? theme.cardBorder : theme.accentBorder,
        },
      ]}
    >
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Sparkles size={14} color={theme.accent} />
            <Text style={[styles.heroEyebrow, { color: theme.accent }]}>TODAY</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.primaryText }]}>
            {totalHabits === 0 ? 'Start a streak' : `${completedToday} of ${totalHabits} done`}
          </Text>
          <Text style={[styles.heroSub, { color: theme.secondaryText }]}>
            {totalHabits === 0
              ? 'Add habits you can repeat daily'
              : completionRate === 100
                ? 'Perfect day — keep it going'
                : 'Tap the ring on each habit to check in'}
          </Text>
        </View>

        <View style={styles.ringWrap}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={stroke}
              fill="none"
            />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.accent}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              animatedProps={ringProps}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPct, { color: theme.primaryText }]}>{completionRate}%</Text>
          </View>
        </View>
      </View>

      <View style={[styles.heroStats, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        {[
          { label: 'Active', value: String(activeCount), icon: Flame },
          { label: 'Best', value: `${bestStreak}d`, icon: Trophy },
          { label: 'Streak avg', value: totalHabits > 0 ? `${Math.round(completionRate)}%` : '—', icon: Star },
        ].map((s, i) => (
          <View key={s.label} style={[styles.heroStat, i > 0 && styles.heroStatBorder, { borderLeftColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <s.icon size={14} color={theme.accent} />
            <Text style={[styles.heroStatVal, { color: theme.primaryText }]}>{s.value}</Text>
            <Text style={[styles.heroStatLbl, { color: theme.secondaryText }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Category chips ─────────────────────────────────────────────────────────────

interface HabitCategoryChipsProps {
  selected: string;
  onSelect: (cat: string) => void;
}

export function HabitCategoryChips({ selected, onSelect }: HabitCategoryChipsProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.chipsWrap}>
      {CATEGORIES.map(cat => {
        const active = selected === cat;
        return (
          <Pressable
            key={cat}
            onPress={() => onSelect(cat)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.accent : theme.card,
                borderColor: active ? theme.accent : theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#FFF' : theme.secondaryText }]}>{cat}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Week strip ─────────────────────────────────────────────────────────────────

export function HabitWeekStrip({ habit, todayDateStr }: { habit: Habit; todayDateStr: string }) {
  const { theme, isDark } = useTheme();
  const weekDays = buildCurrentWeekDays();

  return (
    <View style={styles.weekRow}>
      {weekDays.map((date, i) => {
        const dateStr = toLocalDateStr(date);
        const done = habitCompletedOnDate(habit, dateStr);
        const isTodayCell = dateStr === todayDateStr;
        return (
          <View key={dateStr} style={styles.weekCell}>
            <View
              style={[
                styles.weekDot,
                done && { backgroundColor: theme.accent },
                isTodayCell && !done && { borderWidth: 2, borderColor: theme.accent },
                !done && !isTodayCell && {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            />
            <Text style={[styles.weekLbl, { color: theme.tertiaryText }]}>
              {WEEKDAY_LABELS_MON[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Habit card ─────────────────────────────────────────────────────────────────

interface HabitRowCardProps {
  habit: Habit;
  todayDateStr: string;
  confetti: boolean;
  confettiColors: string[];
  onPress: () => void;
  onLongPress: () => void;
  onToggle: () => void;
}

function ConfettiPiece({ index, colors }: { index: number; colors: string[] }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    const angle = (Math.PI * 2 * index) / 10;
    const dist = 36 + Math.random() * 28;
    tx.value = withSpring(Math.cos(angle) * dist);
    ty.value = withSpring(Math.sin(angle) * dist);
    opacity.value = withTiming(0, { duration: 700 });
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors[index % colors.length],
  }));
  return <Animated.View style={style} />;
}

export function HabitRowCard({
  habit,
  todayDateStr,
  confetti,
  confettiColors,
  onPress,
  onLongPress,
  onToggle,
}: HabitRowCardProps) {
  const { theme, isDark } = useTheme();
  const done = habitCompletedOnDate(habit, todayDateStr);
  const diffColor =
    habit.difficulty === 'Hard' ? '#FF9500' : habit.difficulty === 'Easy' ? '#34C759' : theme.accent;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: done ? theme.accent + '50' : theme.cardBorder,
          opacity: habit.is_paused ? 0.65 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={[
            styles.checkRing,
            done
              ? { backgroundColor: theme.accent, borderColor: theme.accent }
              : { borderColor: theme.accent, backgroundColor: 'transparent' },
          ]}
        >
          {done ? <Check size={22} color="#FFF" strokeWidth={3} /> : <Flame size={20} color={theme.accent} />}
          {confetti && Array.from({ length: 10 }).map((_, i) => <ConfettiPiece key={i} index={i} colors={confettiColors} />)}
        </Pressable>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]} numberOfLines={1}>
              {habit.title}
            </Text>
            {habit.is_paused && (
              <View style={[styles.pausedTag, { backgroundColor: theme.secondaryText }]}>
                <Text style={styles.pausedTagText}>PAUSED</Text>
              </View>
            )}
          </View>
          <View style={styles.cardMeta}>
            <View style={[styles.diffPill, { backgroundColor: diffColor + '22' }]}>
              <Text style={[styles.diffText, { color: diffColor }]}>{habit.difficulty}</Text>
            </View>
            <Text style={[styles.catText, { color: theme.secondaryText }]}>{habit.category}</Text>
            <Text style={[styles.freqText, { color: theme.tertiaryText }]}>· {formatFrequency(habit.frequency)}</Text>
          </View>
        </View>

        <View style={[styles.streakPill, { backgroundColor: theme.accentLight, borderColor: theme.accentBorder }]}>
          <Flame size={14} color={theme.accent} />
          <Text style={[styles.streakNum, { color: theme.accent }]}>{habit.streak}</Text>
        </View>
      </View>

      <HabitWeekStrip habit={habit} todayDateStr={todayDateStr} />
    </Pressable>
  );
}

// ─── Empty (no duplicate CTA) ───────────────────────────────────────────────────

export function HabitEmptyPlaceholder({ variant }: { variant: 'none' | 'filter' }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentLight }]}>
        <Flame size={32} color={theme.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
        {variant === 'none' ? 'No habits yet' : 'Nothing in this category'}
      </Text>
      <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
        {variant === 'none'
          ? 'Tap New Habit at the bottom of the screen to get started.'
          : 'Switch categories or tap New Habit below to add one.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroEyebrow: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1 },
  heroTitle: { fontSize: 22, fontFamily: 'Inter_800ExtraBold', marginBottom: 4 },
  heroSub: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 18 },
  ringWrap: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 22, fontFamily: 'Inter_800ExtraBold' },
  heroStats: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroStatBorder: { borderLeftWidth: 1 },
  heroStatVal: { fontSize: 16, fontFamily: 'Inter_800ExtraBold' },
  heroStatLbl: { fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  weekRow: { flexDirection: 'row', marginTop: 14, width: '100%' },
  weekCell: { alignItems: 'center', flex: 1 },
  weekDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 4 },
  weekLbl: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1, paddingTop: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', flex: 1 },
  pausedTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pausedTagText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', color: '#FFF' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  diffPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold' },
  catText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  freqText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  streakNum: { fontSize: 15, fontFamily: 'Inter_800ExtraBold' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 20 },
});
