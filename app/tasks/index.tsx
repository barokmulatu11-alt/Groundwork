import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AddTaskSheet, AddTaskSheetRef } from '@/components/tasks/AddTaskSheet';
import { EditTaskSheetRef } from '@/components/tasks/EditTaskSheet';
import { EmptyTaskState } from '@/components/tasks/EmptyTaskState';
import { SwipeableTaskCard } from '@/components/tasks/SwipeableTaskCard';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskProgressBar } from '@/components/tasks/TaskProgressBar';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTasks } from '@/hooks/useTasks';
import { useTaskStats } from '@/hooks/useTaskStats';
import { useRouter } from 'expo-router';
import { Activity, CheckCircle2, ChevronLeft, Clock, LayoutGrid, AlignJustify as ListIcon } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import Animated, { FadeInUp, FadeOutDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type ViewType = 'Today' | 'Upcoming' | 'All';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark, showAlert } = useTheme();
  
  const todayDate = new Date().toISOString().split('T')[0];
  const { 
    tasks, pendingTasks, completedTasks, completionRate, 
    addTask, updateTask, deleteTask, toggleComplete, 
    reorderTasks, duplicateTask, getOverdue,
    loadTasks, loadUpcomingTasks, loadAllTasks, loading 
  } = useTasks(todayDate);
  const { stats } = useTaskStats(todayDate);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const { tasksLayout } = useSettingsStore();
  const isGrid = tasksLayout === 'grid';

  const [activeView, setActiveView] = useState<ViewType>('Today');
  
  const addTaskRef = useRef<AddTaskSheetRef>(null);
  const editTaskRef = useRef<EditTaskSheetRef>(null);
  const confettiRef = useRef<any>(null);

  const [completedCount, setCompletedCount] = useState(completedTasks.length);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setOverdueTasks(getOverdue());
  }, [tasks, getOverdue]);

  useEffect(() => {
    if (tasks.length > 0 && completedTasks.length === tasks.length && completedCount < tasks.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
    setCompletedCount(completedTasks.length);
  }, [completedTasks.length, tasks.length]);

  const handleDeleteTask = (id: string) => {
    showAlert({
      title: "Delete Task",
      message: "Are you sure? This cannot be undone and will permanently remove this task.",
      primaryButton: { 
        text: "Delete", 
        destructive: true, 
        onPress: () => deleteTask(id) 
      },
      secondaryButton: { 
        text: "Cancel", 
        onPress: () => {} 
      }
    });
  };

  const viewIndicatorX = useSharedValue(0);
  const tabWidth = (width - 72) / 3;

  useEffect(() => {
    viewIndicatorX.value = withSpring(
      activeView === 'Today' ? 0 : activeView === 'Upcoming' ? tabWidth : tabWidth * 2,
      { damping: 30, stiffness: 150, mass: 1 }
    );
  }, [activeView, viewIndicatorX, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: viewIndicatorX.value }]
  }));

  const getGreeting = () => {
    if (tasks.length === 0) return "Let's get it done";
    if (completionRate === 0) return "Let's get it done";
    if (completionRate < 50) return "You're on a roll";
    if (completionRate < 80) return "Almost there, finish strong";
    if (completionRate < 100) return "So close! One more";
    return "You crushed it today";
  };

  const renderToday = () => {
    if (tasks.length === 0) {
      return (
        <EmptyTaskState 
          onQuickAdd={(title) => addTask({ title, date: todayDate })}
          yesterdayTasks={overdueTasks}
          onAddYesterdayTasks={() => {
            overdueTasks.forEach(t => updateTask(t.id, { date: todayDate }));
            setOverdueTasks([]);
          }}
        />
      );
    }

    return (
      <View style={{ flex: 1, paddingHorizontal: 32 }}>
        <DraggableFlatList
          data={pendingTasks}
          onDragEnd={({ data }) => reorderTasks(data)}
          keyExtractor={(item) => item.id}
          renderItem={({ item, drag, isActive }) => (
            <ScaleDecorator>
              <Pressable onLongPress={drag} disabled={isActive} style={{ backgroundColor: 'transparent' }}>
                <SwipeableTaskCard 
                  task={item as any}
                  onComplete={() => toggleComplete(item.id)}
                  onUpdate={(u) => updateTask(item.id, u)}
                  onDelete={() => handleDeleteTask(item.id)}
                  onDuplicate={() => duplicateTask(item.id)}
                />
              </Pressable>
            </ScaleDecorator>
          )}
          contentContainerStyle={{ paddingBottom: 160 }}
          ListHeaderComponent={
            <>
              {overdueTasks.length > 0 && (
                <View style={styles.overdueSection}>
                  <Text style={[styles.overdueHeader, { color: theme.accent }]}>OVERDUE ({overdueTasks.length})</Text>
                  {overdueTasks.map(t => (
                    <Animated.View key={t.id} style={styles.overdueCard}>
                      <TaskCard 
                        task={t as any}
                        onToggleComplete={() => toggleComplete(t.id)}
                        onUpdate={(u) => updateTask(t.id, u)}
                        onDelete={() => handleDeleteTask(t.id)}
                        onDuplicate={() => duplicateTask(t.id)}
                      />
                      <Pressable style={[styles.moveToTodayBtn, { backgroundColor: theme.accent, }]} onPress={() => updateTask(t.id, { date: todayDate })}>
                        <Text style={styles.moveToTodayText}>Add to Today</Text>
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              )}
              {pendingTasks.length > 0 && (
                <Text style={[styles.sectionHeader, { color: theme.secondaryText }]}>PENDING ({pendingTasks.length})</Text>
              )}
            </>
          }
          ListFooterComponent={
            <>
              {completedTasks.length > 0 && (
                <View style={styles.completedSection}>
                  <Text style={[styles.sectionHeader, { color: theme.secondaryText }]}>COMPLETED ({completedTasks.length})</Text>
                  {completedTasks.map(t => (
                    <TaskCard 
                      key={t.id}
                      task={t as any}
                      onToggleComplete={() => toggleComplete(t.id)}
                      onUpdate={(u) => updateTask(t.id, u)}
                      onDelete={() => deleteTask(t.id)}
                      onDuplicate={() => duplicateTask(t.id)}
                    />
                  ))}
                </View>
              )}

              {stats.total > 0 && (
                <AnimatedCard style={styles.statsCard}>
                  <Text style={[styles.sectionHeader, { color: theme.secondaryText, marginTop: 0 }]}>TODAY'S STATS</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBox, { backgroundColor: 'transparent' }]}>
                        <CheckCircle2 size={18} color={theme.accent} />
                      </View>
                      <Text style={[styles.statValue, { color: theme.primaryText }]}>{stats.completed}/{stats.total}</Text>
                      <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Completed</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBox, { backgroundColor: 'transparent' }]}>
                        <Clock size={18} color={theme.accent} />
                      </View>
                      <Text style={[styles.statValue, { color: theme.primaryText }]}>{stats.avgTimeMinutes}m</Text>
                      <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Avg Time</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={[styles.statIconBox, { backgroundColor: 'transparent' }]}>
                        <Activity size={18} color={theme.accent} />
                      </View>
                      <Text style={[styles.statValue, { color: theme.primaryText }]}>{stats.streak}</Text>
                      <Text style={[styles.statLabel, { color: theme.secondaryText }]}>Day Streak</Text>
                    </View>
                  </View>
                </AnimatedCard>
              )}
            </>
          }
        />
      </View>
    );
  };

  useEffect(() => {
    if (activeView === 'Today') loadTasks();
    else if (activeView === 'Upcoming') loadUpcomingTasks();
    else if (activeView === 'All') loadAllTasks();
  }, [activeView, loadTasks, loadUpcomingTasks, loadAllTasks]);

  const renderUpcoming = () => {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 32 }} showsVerticalScrollIndicator={false}>
        {tasks.length === 0 ? (
          <View style={[styles.emptyView, { marginTop: 60 }]}>
            <Text style={{ color: theme.primaryText, fontSize: 16, fontFamily: 'Inter_700Bold' }}>No upcoming tasks</Text>
            <Text style={{ color: theme.secondaryText, marginTop: 4, fontFamily: 'Inter_500Medium' }}>Plan ahead by adding tasks for later.</Text>
          </View>
        ) : (
          tasks.map(t => (
            <TaskCard 
              key={t.id}
              task={t as any}
              onToggleComplete={() => toggleComplete(t.id)}
              onUpdate={(u) => updateTask(t.id, u)}
              onDelete={() => handleDeleteTask(t.id)}
              onDuplicate={() => duplicateTask(t.id)}
            />
          ))
        )}
      </ScrollView>
    );
  };

  const renderAll = () => {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 32 }} showsVerticalScrollIndicator={false}>
        {tasks.length === 0 ? (
          <View style={[styles.emptyView, { marginTop: 60 }]}>
            <Text style={{ color: theme.primaryText, fontSize: 16, fontFamily: 'Inter_700Bold' }}>Your task list is empty</Text>
          </View>
        ) : (
          tasks.map(t => (
            <TaskCard 
              key={t.id}
              task={t as any}
              onToggleComplete={() => toggleComplete(t.id)}
              onUpdate={(u) => updateTask(t.id, u)}
              onDelete={() => handleDeleteTask(t.id)}
              onDuplicate={() => duplicateTask(t.id)}
            />
          ))
        )}
      </ScrollView>
    );
  };

  return (
    <BackgroundGradient>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <TabHeader 
          title={getGreeting()}
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
          showBack={true}
        />
        <TaskProgressBar percentage={completionRate} />
        <View style={[styles.viewToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Animated.View style={[styles.viewIndicator, indicatorStyle, { width: tabWidth, backgroundColor: theme.accent, }]} />
          {(['Today', 'Upcoming', 'All'] as ViewType[]).map(v => (
            <Pressable key={v} style={styles.viewBtn} onPress={() => setActiveView(v)}>
              <Text style={[styles.viewText, activeView === v ? { color: 'white', fontFamily: 'Inter_700Bold' } : { color: theme.secondaryText }]}>{v}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.content}>
        {activeView === 'Today' && renderToday()}
        {activeView === 'Upcoming' && renderUpcoming()}
        {activeView === 'All' && renderAll()}
      </View>
      <Animated.View style={[styles.fabContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable 
          style={[styles.fab, { backgroundColor: theme.accent, }]} 
          onPress={() => addTaskRef.current?.open()}
        >
          <Text style={styles.fabText}>+ Add Task</Text>
        </Pressable>
      </Animated.View>
      <AddTaskSheet 
        ref={addTaskRef} 
        onAdd={(task) => addTask(task as any)} 
      />
      {showConfetti && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon
            count={50}
            origin={{ x: width / 2, y: -20 }}
            autoStart={true}
            fadeOut={true}
            colors={[theme.accent, '#58A5FF', '#A3D0FF', '#FFFFFF']}
          />
        </View>
      )}
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 32, paddingBottom: 16 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  viewToggle: { flexDirection: 'row', borderRadius: 20, padding: 4, marginTop: 16, position: 'relative' },
  viewIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 16 },
  viewBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, zIndex: 1 },
  viewText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  content: { flex: 1 },
  sectionHeader: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 1, marginBottom: 12, marginTop: 24 },
  overdueSection: { marginBottom: 16 },
  overdueHeader: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 12 },
  overdueCard: { marginBottom: 8 },
  moveToTodayBtn: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
  moveToTodayText: { color: 'white', fontSize: 12, fontFamily: 'Inter_700Bold' },
  completedSection: { opacity: 0.8 },
  statsCard: { marginTop: 24, marginBottom: 40, padding: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold', marginVertical: 4 },
  statLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  fabContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 32},
  fab: { paddingVertical: 16, borderRadius: 100, alignItems: 'center' },
  fabText: { color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptyView: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
