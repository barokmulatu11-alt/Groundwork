import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { G, Line, Rect } from 'react-native-svg';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 88; // Accounting for padding
const CHART_HEIGHT = 160;

interface WeeklyBarChartProps {
  data: { day: string; value: number }[];
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const { theme, isDark } = useTheme();
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = 24;
  const gap = (CHART_WIDTH - (barWidth * data.length)) / (data.length - 1);

  return (
    <Animated.View entering={FadeIn.duration(800)} style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.4)' }]}>
      <Text style={[styles.title, { color: theme.secondaryText }]}>WEEKLY PRODUCTIVITY</Text>
      
      <View style={styles.chartArea}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75].map((p, i) => (
            <Line
              key={i}
              x1="0"
              y1={CHART_HEIGHT * (1 - p)}
              x2={CHART_WIDTH}
              y2={CHART_HEIGHT * (1 - p)}
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              strokeWidth="1"
            />
          ))}

          {data.map((d, i) => {
            const barHeight = (d.value / maxVal) * (CHART_HEIGHT - 20);
            const x = i * (barWidth + gap);
            const y = CHART_HEIGHT - barHeight;

            return (
              <G key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={d.value === maxVal ? theme.accent : theme.accentBorder}
                />
              </G>
            );
          })}
        </Svg>
      </View>

      <View style={[styles.labels, { width: CHART_WIDTH }]}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.labelText, { color: theme.secondaryText }]}>{d.day}</Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 20,
  },
  chartArea: {
    height: CHART_HEIGHT,
    marginBottom: 8,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  labelText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    width: 24,
    textAlign: 'center',
  }
});
