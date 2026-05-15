import { AppText as Text } from '@/components/ui/AppText';
import { AddHabitSheet } from '@/components/AddHabitSheet';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NativeSheet } from '@/components/ui/NativeSheet';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import type { Habit } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import { eachDayOfInterval, endOfMonth, format, isToday, startOfMonth, subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Flame, Lock, Pause, Play, Star, Trash2, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = ["All", "Health", "Learning", "Mind", "Work", "Personal"];

function ConfettiPiece({ index }: { index: number }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const angle = (Math.PI * 2 * index) / 12;
    const dist = 40 + Math.random() * 40;
    tx.value = withSpring(Math.cos(angle) * dist);
    ty.value = withSpring(Math.sin(angle) * dist);
    opacity.value = withTiming(0, { duration: 800 });
    scale.value = withTiming(0, { duration: 800 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    opacity: opacity.value,
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ['#007AFF', '#58A5FF', '#A3D0FF', '#005BBF', '#CCE5FF'][index % 5]
  }));

  return <Animated.View style={style} />;
}

export default function HabitsScreen() {
  const router = useRouter();
  const { habits, toggleHabit, addHabit, updateHabit, deleteHabit } = useStore();
  const { session } = useAuthStore();
  const { theme, isDark } = useTheme();
  const { habitsLayout } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [isHabitSheetVisible, setHabitSheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [confettiHabitId, setConfettiHabitId] = useState<string | null>(null);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string, title: string } | null>(null);

  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const [habitForAction, setHabitForAction] = useState<Habit | null>(null);

  const handleAddHabit = async (h: any) => {
    try {
      await addHabit(h);
    } catch (e) {
      console.error("Failed to add habit:", e);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const habit = habits.find(h => h.id === id);
      const wasCompleted = habit?.dates_completed.includes(todayDate);

      await toggleHabit(id, todayDate);

      if (!wasCompleted) {
        setConfettiHabitId(id);
        setTimeout(() => setConfettiHabitId(null), 1000);
      }
    } catch (e) {
      console.error("Failed to toggle habit:", e);
    }
  };

  const openDetail = (habit: Habit) => {
    setSelectedHabit(habit);
    setDetailVisible(true);
  };

  const activeHabits = habits.filter(h => !h.is_paused).length;
  const bestStreakEver = habits.length > 0 ? Math.max(0, ...habits.map(h => h.best_streak)) : 0;
  const todayDateStr = new Date().toISOString().split('T')[0];
  const completionRate = habits.length > 0 ? Math.round((habits.filter(h => h.dates_completed.includes(todayDateStr)).length / habits.length) * 100) : 0;

  const filteredHabits = habits.filter(h => {
    if (selectedCategory === 'All') return true;
    const habitCat = (h.category || '').trim().toLowerCase();
    const selectedCat = selectedCategory.trim().toLowerCase();
    return habitCat === selectedCat || habitCat.includes(selectedCat);
  });

  if (!session) {
    return (
      <BackgroundGradient>
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.iconBox, { width: 80, height: 80, borderRadius: 24, backgroundColor: 'transparent', marginBottom: 24 }]}>
            <Lock size={40} color={theme.accent} />
          </View>
          <Text style={{ fontSize: 28, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginBottom: 12, textAlign: 'center' }}>Login Required</Text>
          <Text style={{ fontSize: 15, fontFamily: 'Inter_500Medium', color: theme.secondaryText, textAlign: 'center', marginBottom: 32, lineHeight: 22 }}>
            You must be logged in to track and sync your Habits.
          </Text>
          <AnimatedButton title="Sign In or Sign Up" onPress={() => router.push('/login' as any)} />
        </View>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 100,
          paddingTop: insets.top + 24
        }}
        showsVerticalScrollIndicator={false}
      >
        <TabHeader
          title="Habits"
          subtitle="Keep the flame alive"
        />

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Active', value: activeHabits, icon: Play },
            { label: 'Best Streak', value: `${bestStreakEver}d`, icon: Trophy },
            { label: 'Today', value: `${completionRate}%`, icon: Star },
          ].map(stat => (
            <AnimatedCard key={stat.label} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
              <View style={[styles.statIconBox, { backgroundColor: 'transparent' }]}>
                <stat.icon size={16} color={theme.accent} />
              </View>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: theme.secondaryText, marginTop: 4 }}>{stat.label.toUpperCase()}</Text>
            </AnimatedCard>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, marginLeft: -24, paddingLeft: 24 }} contentContainerStyle={{ paddingRight: 80 }}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: selectedCategory === cat ? theme.accent : theme.pillInactive,
                marginRight: 10,
                borderWidth: 1,
                borderColor: selectedCategory === cat ? theme.accent : theme.pillInactiveBorder,
                minWidth: 80,
                alignItems: 'center'
              }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: selectedCategory === cat ? 'white' : theme.pillInactiveText }}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filteredHabits.length === 0 ? (
          <AnimatedCard style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: theme.secondaryText, textAlign: 'center' }}>
              No habits found in this category.
            </Text>
          </AnimatedCard>
        ) : (
          filteredHabits.map((habit) => {
            const isCompletedToday = habit.dates_completed.includes(todayDateStr);

            return (
              <AnimatedCard key={habit.id} style={{ padding: 0, marginBottom: 16, backgroundColor: habit.is_paused ? (isDark ? 'rgba(255,255,255,0.02)' : '#F2F2F7') : undefined }}>
                <Pressable
                  onPress={() => openDetail(habit)}
                  onLongPress={() => {
                    setHabitForAction(habit);
                    setActionSheetVisible(true);
                  }}
                  style={{ padding: 20 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); handleToggle(habit.id); }}
                      style={[styles.habitIconBox, { backgroundColor: isCompletedToday ? theme.accent : 'transparent' }]}
                    >
                      {isCompletedToday ? <CheckCircle2 size={24} color="white" /> : <Flame size={24} color={theme.accent} />}
                      {confettiHabitId === habit.id && (
                        <View style={{ position: 'absolute' }}>
                          {Array.from({ length: 12 }).map((_, i) => <ConfettiPiece key={i} index={i} />)}
                        </View>
                      )}
                    </Pressable>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: habit.is_paused ? theme.secondaryText : theme.primaryText }}>{habit.title}</Text>
                        {habit.is_paused && <View style={{ marginLeft: 8, backgroundColor: theme.secondaryText, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, fontFamily: 'Inter_800ExtraBold', color: 'white' }}>PAUSED</Text></View>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: theme.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 }}>
                          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: 'white' }}>{habit.difficulty}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText }}>{habit.category}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Flame size={14} color={theme.accent} />
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: theme.primaryText, marginLeft: 4 }}>{habit.streak}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Star size={14} color={theme.accent} />
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: theme.secondaryText, marginLeft: 4 }}>{habit.best_streak}</Text>
                      </View>
                    </View>
                  </View>

                  {/* 7-Day Dots */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = subDays(new Date(), 6 - i);
                      const dateStr = date.toISOString().split('T')[0];
                      const completed = habit.dates_completed.includes(dateStr);
                      const isTodayDate = i === 6;

                      return (
                        <View key={i} style={{ alignItems: 'center' }}>
                          <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: completed ? theme.accent : (isTodayDate ? 'transparent' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')),
                            marginBottom: 4
                          }} />
                          <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: theme.secondaryText }}>{format(date, 'EE')[0]}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Pressable>
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>

      {/* Habit Detail Sheet */}
      <NativeSheet visible={isDetailVisible} onClose={() => setDetailVisible(false)} height="85%">
        {selectedHabit && (
          <ScrollView style={{ flex: 1, padding: 24, backgroundColor: theme.background }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <View>
                <Text style={{ fontSize: 24, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }}>{selectedHabit.title}</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: theme.secondaryText }}>{selectedHabit.category} • {selectedHabit.frequency}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <Pressable onPress={() => {
                  setHabitToDelete(selectedHabit);
                  setDetailVisible(false);
                  setTimeout(() => setDeleteDialogVisible(true), 300);
                }}>
                  <Trash2 size={20} color={theme.danger} />
                </Pressable>
                <Pressable onPress={() => setDetailVisible(false)}>
                  <ChevronLeft size={24} color={theme.primaryText} />
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
              <AnimatedCard style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <Flame size={20} color={theme.accent} />
                <Text style={{ fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginTop: 8 }}>{selectedHabit.streak}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: theme.secondaryText }}>CURRENT</Text>
              </AnimatedCard>
              <AnimatedCard style={{ flex: 1, padding: 16, alignItems: 'center' }}>
                <Star size={20} color={theme.accent} />
                <Text style={{ fontSize: 20, fontFamily: 'Inter_800ExtraBold', color: theme.primaryText, marginTop: 8 }}>{selectedHabit.best_streak}</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: theme.secondaryText }}>BEST EVER</Text>
              </AnimatedCard>
              {selectedHabit.streak === selectedHabit.best_streak && selectedHabit.streak > 0 && (
                <AnimatedCard style={{ flex: 1, padding: 16, backgroundColor: 'transparent', alignItems: 'center', borderColor: theme.accent, borderWidth: 1 }}>
                  <Trophy size={20} color={theme.accent} />
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: theme.accent, marginTop: 12, textAlign: 'center' }}>PERSONAL BEST</Text>
                </AnimatedCard>
              )}
            </View>

            <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: theme.secondaryText, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>History</Text>
            <AnimatedCard style={{ padding: 16, marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                {(() => {
                  const start = startOfMonth(new Date());
                  const end = endOfMonth(new Date());
                  const days = eachDayOfInterval({ start, end });
                  return days.map(day => {
                    const dateStr = day.toISOString().split('T')[0];
                    const completed = selectedHabit.dates_completed.includes(dateStr);
                    const isCurToday = isToday(day);
                    return (
                      <View key={dateStr} style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <View style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: completed ? theme.accent : 'transparent',
                          borderWidth: isCurToday ? 1.5 : 0,
                          borderColor: theme.accent,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: completed ? 'white' : theme.primaryText }}>{format(day, 'd')}</Text>
                        </View>
                      </View>
                    );
                  });
                })()}
              </View>
            </AnimatedCard>

            <AnimatedButton
              title={selectedHabit.dates_completed.includes(new Date().toISOString().split('T')[0]) ? "Completed Today" : "Mark Done Today"}
              onPress={() => handleToggle(selectedHabit.id)}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </NativeSheet>

      {/* Action Sheet */}
      <NativeSheet visible={isActionSheetVisible} onClose={() => setActionSheetVisible(false)} height={300}>
        <View style={{ padding: 24, flex: 1, backgroundColor: theme.card }}>
          <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: theme.primaryText, marginBottom: 24 }}>{habitForAction?.title}</Text>
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={() => {
                if (habitForAction) updateHabit(habitForAction.id, { is_paused: !habitForAction.is_paused });
                setActionSheetVisible(false);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'transparent', borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder }}
            >
              {habitForAction?.is_paused ? <Play size={20} color={theme.accent} /> : <Pause size={20} color={theme.accent} />}
              <Text style={{ marginLeft: 12, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: theme.primaryText }}>
                {habitForAction?.is_paused ? 'Resume Habit' : 'Pause Habit'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (habitForAction) {
                  setHabitToDelete(habitForAction);
                  setDeleteDialogVisible(true);
                }
                setActionSheetVisible(false);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'transparent', borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder }}
            >
              <Trash2 size={20} color={theme.accent} />
              <Text style={{ marginLeft: 12, fontSize: 16, fontFamily: 'Inter_600SemiBold', color: theme.primaryText }}>Delete Habit</Text>
            </Pressable>
          </View>
        </View>
      </NativeSheet>

      <View style={{ position: 'absolute', bottom: 40, left: 24, right: 24 }}>
        <AnimatedButton
          title="+ New Habit"
          onPress={() => setHabitSheetVisible(true)}
        />
      </View>

      <AddHabitSheet
        visible={isHabitSheetVisible}
        onClose={() => setHabitSheetVisible(false)}
        onAddHabit={handleAddHabit}
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Habit"
        message={`Are you sure you want to delete "${habitToDelete?.title}"? This will erase your streak.`}
        confirmText="Delete"
        confirmButtonColor={theme.danger}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={async () => {
          if (habitToDelete) {
            await deleteHabit(habitToDelete.id);
            setDeleteDialogVisible(false);
          }
        }}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  statIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  habitIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
