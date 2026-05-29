import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { XP_VALUES } from '@/lib/connect/xpSystem';
import { useStore } from '@/store/useStore';
import { Target } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const QUEST_TASKS = 3;

export function DailyQuestCard() {
  const { theme } = useTheme();
  const { tasks } = useStore();

  const { completedToday, totalToday, done, progress } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = (tasks || []).filter((t) => t.date === today && !t.deleted_at);
    const completed = todayTasks.filter((t) => t.completed).length;
    const target = Math.min(QUEST_TASKS, Math.max(todayTasks.length, QUEST_TASKS));
    const prog = Math.min(1, completed / target);
    return {
      completedToday: completed,
      totalToday: todayTasks.length,
      done: completed >= target,
      progress: prog,
    };
  }, [tasks]);

  return (
    <Animated.View entering={FadeIn.delay(150).duration(300)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.accentLight }]}>
        <Target size={18} color={theme.accent} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.primaryText }]}>Daily quest</Text>
        <Text style={[styles.sub, { color: theme.secondaryText }]}>
          Complete {QUEST_TASKS} tasks today for +{XP_VALUES.DAILY_ALL_TASKS_DONE} XP bonus
        </Text>
        <View style={[styles.track, { backgroundColor: theme.accentLight }]}>
          <View style={[styles.fill, { backgroundColor: theme.accent, width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={[styles.meta, { color: theme.tertiaryText }]}>
          {done
            ? 'Quest complete — nice work!'
            : `${Math.min(completedToday, QUEST_TASKS)}/${QUEST_TASKS} tasks · ${totalToday} scheduled today`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 17,
    marginBottom: 10,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});
