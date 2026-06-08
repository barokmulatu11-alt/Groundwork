/**
 * HabitHeatmap — 90-day GitHub-style activity heatmap (Pro)
 *
 * Data is sourced from AnalyticsEngine.getHabitHeatmapData(), not raw habit dates.
 * Renders 13 columns × 7 rows (most recent 91 days).
 */
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AppText as Text } from '@/components/ui/AppText';
import { getHabitHeatmapData } from '@/lib/analytics/AnalyticsEngine';
import { isPro } from '@/lib/subscriptionService';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { format, parseISO, subDays } from 'date-fns';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface HabitHeatmapProps {
  habitId?: string; // if provided, filters to a single habit
  daysBack?: number;
}

// Map count → intensity level 0–4
const getLevel = (count: number, maxCount: number): number => {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
};

const LEVEL_OPACITIES = [0.08, 0.25, 0.5, 0.75, 1.0];

export function HabitHeatmap({ habitId, daysBack = 91 }: HabitHeatmapProps) {
  const { theme, isDark } = useTheme();
  const { session } = useAuthStore();
  const userId = session?.user?.id || 'guest';
  const userIsPro = isPro();

  const heatmapData = useMemo(() => {
    try {
      return getHabitHeatmapData(userId, daysBack, habitId);
    } catch {
      return [];
    }
  }, [userId, daysBack, habitId]);

  // Build a map for quick lookup
  const dataMap = useMemo(() => {
    const m: Record<string, number> = {};
    heatmapData.forEach((d) => { m[d.date] = d.count; });
    return m;
  }, [heatmapData]);

  const maxCount = useMemo(
    () => Math.max(1, ...heatmapData.map((d) => d.count)),
    [heatmapData],
  );

  // Build 91-day grid: 13 cols × 7 rows, oldest left → newest right
  const today = new Date();
  const cells = useMemo(() => {
    const arr: Array<{ date: string; count: number; level: number } | null> = [];
    // Pad so row 0 = Mon (weekday index 1; shift by day-of-week)
    const startDay = subDays(today, daysBack - 1);
    // Pad front so grid starts on Monday
    const dowStart = startDay.getDay(); // 0=Sun
    const padFront = dowStart === 0 ? 6 : dowStart - 1; // Monday-first padding
    for (let i = 0; i < padFront; i++) arr.push(null);

    for (let i = 0; i < daysBack; i++) {
      const date = subDays(today, daysBack - 1 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = dataMap[dateStr] || 0;
      arr.push({ date: dateStr, count, level: getLevel(count, maxCount) });
    }
    return arr;
  }, [dataMap, maxCount, daysBack]);

  // Split into weeks (columns of 7)
  const weeks = useMemo(() => {
    const w: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7));
    }
    return w;
  }, [cells]);

  // Month labels — show label at the first week of each month
  const monthLabels = useMemo(() => {
    const labels: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      const firstCell = week.find((c) => c !== null);
      if (!firstCell) return;
      try {
        const month = parseISO(firstCell.date).getMonth();
        if (month !== lastMonth) {
          labels.push({ col: colIdx, label: format(parseISO(firstCell.date), 'MMM') });
          lastMonth = month;
        }
      } catch {}
    });
    return labels;
  }, [weeks]);

  const totalCompletions = heatmapData.reduce((s, d) => s + d.count, 0);
  const activeDays = heatmapData.filter((d) => d.count > 0).length;

  const CELL_SIZE = 11;
  const CELL_GAP = 3;

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <AnimatedCard style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>
            90-Day Activity
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryNum, { color: theme.accent }]}>
              {totalCompletions}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.tertiaryText }]}>
              {' '}completions · {activeDays} active days
            </Text>
          </View>
        </View>

        {/* Month labels */}
        <View style={styles.monthRow}>
          {monthLabels.map(({ col, label }) => (
            <View
              key={`ml-${col}`}
              style={{
                position: 'absolute',
                left: col * (CELL_SIZE + CELL_GAP),
              }}
            >
              <Text style={[styles.monthLabel, { color: theme.tertiaryText }]}>
                {label}
              </Text>
            </View>
          ))}
          {/* Spacer to reserve height for month labels */}
          <View style={{ height: 14 }} />
        </View>

        {/* Heatmap grid */}
        <View style={styles.gridWrapper}>
          <View style={styles.grid}>
            {weeks.map((week, colIdx) => (
              <View key={colIdx} style={styles.col}>
                {week.map((cell, rowIdx) => (
                  <View
                    key={rowIdx}
                    style={[
                      styles.cell,
                      {
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        marginBottom: CELL_GAP,
                        marginRight: CELL_GAP,
                        borderRadius: 2,
                        backgroundColor: cell
                          ? cell.count === 0
                            ? isDark
                              ? 'rgba(255,255,255,0.07)'
                              : 'rgba(0,0,0,0.07)'
                            : theme.accent + Math.round(LEVEL_OPACITIES[cell.level] * 255).toString(16).padStart(2, '0')
                          : 'transparent',
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <Text style={[styles.legendLabel, { color: theme.tertiaryText }]}>Less</Text>
          {[0, 1, 2, 3, 4].map((level) => (
            <View
              key={level}
              style={[
                styles.legendCell,
                {
                  backgroundColor:
                    level === 0
                      ? isDark
                        ? 'rgba(255,255,255,0.07)'
                        : 'rgba(0,0,0,0.07)'
                      : theme.accent + Math.round(LEVEL_OPACITIES[level] * 255).toString(16).padStart(2, '0'),
                },
              ]}
            />
          ))}
          <Text style={[styles.legendLabel, { color: theme.tertiaryText }]}>More</Text>
        </View>
      </AnimatedCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryNum: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  monthRow: {
    position: 'relative',
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
  },
  gridWrapper: {
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
  },
  cell: {},
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  legendCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
  },
});
