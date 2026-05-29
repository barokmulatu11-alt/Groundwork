import { AppText as Text } from '@/components/ui/AppText';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { HabitMonthCalendar } from '@/components/habits/HabitMonthCalendar';
import { NativeSheet } from '@/components/ui/NativeSheet';
import { useTheme } from '@/lib/ThemeContext';
import type { Habit } from '@/lib/db';
import { habitCompletedOnDate } from '@/lib/habitUtils';
import { Flame, Star, Trash2, Trophy, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HabitDetailSheetProps {
  visible: boolean;
  habit: Habit | null;
  todayDateStr: string;
  onClose: () => void;
  onToggleToday: () => void;
  onRequestDelete: (habit: Habit) => void;
}

export function HabitDetailSheet({
  visible,
  habit,
  todayDateStr,
  onClose,
  onToggleToday,
  onRequestDelete,
}: HabitDetailSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!habit) return null;

  const doneToday = habitCompletedOnDate(habit, todayDateStr);
  const isPersonalBest = habit.streak > 0 && habit.streak === habit.best_streak;

  return (
    <NativeSheet visible={visible} onClose={onClose} height="88%">
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.primaryText }]} numberOfLines={3}>
                {habit.title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                {habit.category} · {habit.frequency}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <X size={20} color={theme.primaryText} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => onRequestDelete(habit)}
            style={[styles.deleteRow, { borderColor: theme.cardBorder }]}
          >
            <Trash2 size={16} color={theme.danger} />
            <Text style={[styles.deleteText, { color: theme.danger }]}>Delete habit</Text>
          </Pressable>

          <View style={styles.statsRow}>
            <AnimatedCard style={styles.statCard}>
              <Flame size={20} color={theme.accent} />
              <Text style={[styles.statVal, { color: theme.primaryText }]}>{habit.streak}</Text>
              <Text style={[styles.statLbl, { color: theme.secondaryText }]}>Current streak</Text>
            </AnimatedCard>
            <AnimatedCard style={styles.statCard}>
              <Star size={20} color={theme.accent} />
              <Text style={[styles.statVal, { color: theme.primaryText }]}>{habit.best_streak}</Text>
              <Text style={[styles.statLbl, { color: theme.secondaryText }]}>Best streak</Text>
            </AnimatedCard>
          </View>

          {isPersonalBest && (
            <View style={[styles.pbBanner, { backgroundColor: theme.accentLight, borderColor: theme.accentBorder }]}>
              <Trophy size={16} color={theme.accent} />
              <Text style={[styles.pbText, { color: theme.accent }]}>Personal best — you're on fire!</Text>
            </View>
          )}

          <HabitMonthCalendar habit={habit} />
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopColor: theme.cardBorder,
              backgroundColor: theme.background,
            },
          ]}
        >
          <AnimatedButton
            title={doneToday ? 'Completed Today' : 'Mark Done Today'}
            onPress={onToggleToday}
            style={{ alignSelf: 'stretch', width: '100%' }}
            variant={doneToday ? 'secondary' : 'primary'}
          />
        </View>
      </View>
    </NativeSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  headerText: { flex: 1, paddingRight: 4 },
  title: { fontSize: 22, fontFamily: 'Inter_800ExtraBold', lineHeight: 28 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 6 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  deleteText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, padding: 16, alignItems: 'center' },
  statVal: { fontSize: 26, fontFamily: 'Inter_800ExtraBold', marginTop: 8 },
  statLbl: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 4, textAlign: 'center' },
  pbBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  pbText: { fontSize: 13, fontFamily: 'Inter_700Bold', flex: 1 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
