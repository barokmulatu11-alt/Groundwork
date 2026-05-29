import { AppText as Text } from '@/components/ui/AppText';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useTheme } from '@/lib/ThemeContext';
import {
  WEEKDAY_LABELS_MON,
  buildMondayFirstMonthWeeks,
  toLocalDateStr,
} from '@/lib/calendarGrid';
import type { Habit } from '@/lib/db';
import { habitCompletedOnDate } from '@/lib/habitUtils';
import { format, isToday } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

interface HabitMonthCalendarProps {
  habit: Habit;
  month?: Date;
  title?: string;
}

export function HabitMonthCalendar({ habit, month = new Date(), title }: HabitMonthCalendarProps) {
  const { theme } = useTheme();
  const weeks = useMemo(() => buildMondayFirstMonthWeeks(month), [month.getMonth(), month.getFullYear()]);

  return (
    <View>
      <Text style={[styles.sectionLbl, { color: theme.secondaryText }]}>
        {(title ?? format(month, 'MMMM yyyy')).toUpperCase()}
      </Text>
      <AnimatedCard style={styles.calCard}>
        <View style={styles.weekRow}>
          {WEEKDAY_LABELS_MON.map((label, i) => (
            <View key={`hdr-${i}`} style={styles.cell}>
              <Text style={[styles.weekday, { color: theme.tertiaryText }]}>{label}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((day, dayIndex) => (
              <View key={`${weekIndex}-${dayIndex}`} style={styles.cell}>
                {day ? (
                  <DayCell habit={habit} day={day} theme={theme} />
                ) : (
                  <View style={styles.emptyDay} />
                )}
              </View>
            ))}
          </View>
        ))}
      </AnimatedCard>
    </View>
  );
}

function DayCell({
  habit,
  day,
  theme,
}: {
  habit: Habit;
  day: Date;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const dateStr = toLocalDateStr(day);
  const completed = habitCompletedOnDate(habit, dateStr);
  const isTodayCell = isToday(day);

  return (
    <View
      style={[
        styles.dayCircle,
        completed && { backgroundColor: theme.accent },
        isTodayCell && !completed && { borderWidth: 2, borderColor: theme.accent },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontFamily: 'Inter_700Bold',
          color: completed ? '#FFFFFF' : theme.primaryText,
        }}
      >
        {format(day, 'd')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLbl: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  calCard: { padding: 12, marginBottom: 8 },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 4,
  },
  weekday: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  emptyDay: {
    width: 34,
    height: 34,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
