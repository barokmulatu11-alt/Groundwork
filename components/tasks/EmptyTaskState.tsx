import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { Task } from '@/lib/taskDatabase';
import { Plus, ClipboardList } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AnimatedCard } from '../ui/AnimatedCard';

interface Props {
  onQuickAdd: (title: string) => void;
  yesterdayTasks: Task[];
  onAddYesterdayTasks: () => void;
}

export const EmptyTaskState = ({ onQuickAdd, yesterdayTasks, onAddYesterdayTasks }: Props) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <ClipboardList size={48} color={theme.secondaryText} style={{ marginBottom: 16 }} />
      <Text style={[styles.title, { color: theme.primaryText }]}>Nothing planned yet</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Add your first task for today and get the ball rolling</Text>

      <View style={styles.suggestions}>
        {['Study session', 'Exercise', 'Read'].map((title, i) => (
          <Pressable key={i} style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => onQuickAdd(title)}>
            <Text style={[styles.chipText, { color: theme.primaryText }]}>{title}</Text>
          </Pressable>
        ))}
      </View>

      {yesterdayTasks.length > 0 && (
        <AnimatedCard style={styles.yesterdayCard}>
          <Text style={[styles.yesterdayTitle, { color: theme.primaryText }]}>Continue from yesterday</Text>
          <Text style={[styles.yesterdaySub, { color: theme.secondaryText }]}>You had {yesterdayTasks.length} task{yesterdayTasks.length > 1 ? 's' : ''} yesterday you didn't finish. Add them to today?</Text>
          <Pressable style={[styles.addYesterdayBtn, { backgroundColor: theme.accent }]} onPress={onAddYesterdayTasks}>
            <Plus size={16} color="white" />
            <Text style={styles.addYesterdayBtnText}>Add All to Today</Text>
          </Pressable>
        </AnimatedCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24, marginTop: 40 },
  title: { fontSize: 20, fontFamily: 'System', fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'System', fontWeight: '500', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 32 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: 'System', fontWeight: '500' },
  yesterdayCard: { padding: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
  yesterdayTitle: { fontSize: 16, fontFamily: 'System', fontWeight: '600', marginBottom: 4 },
  yesterdaySub: { fontSize: 13, fontFamily: 'System', fontWeight: '500', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  addYesterdayBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  addYesterdayBtnText: { color: 'white', fontSize: 14, fontFamily: 'System', fontWeight: '600' }
});



