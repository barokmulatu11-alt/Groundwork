import { AppText as Text } from '@/components/ui/AppText';
import { AddHabitSheet } from '@/components/AddHabitSheet';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NativeSheet } from '@/components/ui/NativeSheet';
import { TabHeader } from '@/components/ui/TabHeader';
import {
  HabitCategoryChips,
  HabitEmptyPlaceholder,
  HabitRowCard,
  HabitTodayHero,
} from '@/components/habits/HabitScreenUI';
import { useTheme } from '@/lib/ThemeContext';
import type { Habit } from '@/lib/db';
import { habitCompletedOnDate, isHabitDueOnDate } from '@/lib/habitUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { HabitDetailSheet } from '@/components/habits/HabitDetailSheet';
import { Flame, Lock, Pause, Play, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HabitsScreen() {
  const router = useRouter();
  const { habits, toggleHabit, addHabit, updateHabit, deleteHabit, loadHabits } = useStore();
  const { session } = useAuthStore();
  const { theme, showAlert } = useTheme();
  const confettiColors = [theme.accent, theme.accent + 'CC', theme.accent + '99', theme.accentLight, '#FFFFFF'];
  const insets = useSafeAreaInsets();

  const [isHabitSheetVisible, setHabitSheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [confettiHabitId, setConfettiHabitId] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDetailVisible, setDetailVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const [habitForAction, setHabitForAction] = useState<Habit | null>(null);

  const todayDateStr = format(new Date(), 'yyyy-MM-dd');

  useFocusEffect(
    useCallback(() => {
      if (session) loadHabits();
    }, [session, loadHabits])
  );

  const handleAddHabit = async (h: Parameters<typeof addHabit>[0]) => {
    try {
      await addHabit(h);
    } catch (e) {
      console.error('Failed to add habit:', e);
    }
  };

  const handleToggle = async (id: string, force = false) => {
    try {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;

      const wasCompleted = habitCompletedOnDate(habit, todayDateStr);
      if (!force && !wasCompleted && !isHabitDueOnDate(habit.frequency)) {
        showAlert({
          title: 'Not scheduled today',
          message: 'This habit is not on your schedule for today. Open the habit to mark it done anyway.',
          primaryButton: { text: 'OK', onPress: () => {} },
        });
        return;
      }

      await toggleHabit(id, todayDateStr);
      if (selectedHabit?.id === id) {
        const fresh = useStore.getState().habits.find(h => h.id === id);
        if (fresh) setSelectedHabit(fresh);
      }
      if (!wasCompleted) {
        setConfettiHabitId(id);
        setTimeout(() => setConfettiHabitId(null), 1000);
      }
    } catch (e) {
      console.error('Failed to toggle habit:', e);
    }
  };

  // Keep detail sheet in sync after toggle / sync
  useEffect(() => {
    if (!selectedHabit) return;
    const fresh = habits.find(h => h.id === selectedHabit.id);
    if (fresh && fresh.updated_at !== selectedHabit.updated_at) {
      setSelectedHabit(fresh);
    }
  }, [habits, selectedHabit?.id, selectedHabit?.updated_at]);

  const activeHabits = habits.filter(h => !h.is_paused).length;
  const bestStreakEver = habits.length > 0 ? Math.max(0, ...habits.map(h => h.best_streak)) : 0;
  const completedToday = habits.filter(h => habitCompletedOnDate(h, todayDateStr)).length;
  const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  const filteredHabits = habits.filter(h => {
    if (selectedCategory === 'All') return true;
    const habitCat = (h.category || '').trim().toLowerCase();
    const selectedCat = selectedCategory.trim().toLowerCase();
    return habitCat === selectedCat || habitCat.includes(selectedCat);
  });

  if (!session) {
    return (
      <BackgroundGradient>
        <View style={styles.loginWrap}>
          <View style={[styles.loginIcon, { backgroundColor: theme.accentLight }]}>
            <Lock size={40} color={theme.accent} />
          </View>
          <Text style={[styles.loginTitle, { color: theme.primaryText }]}>Login Required</Text>
          <Text style={[styles.loginSub, { color: theme.secondaryText }]}>
            Sign in to track and sync your habits across devices.
          </Text>
          <AnimatedButton title="Sign In or Sign Up" onPress={() => router.push('/login' as any)} />
        </View>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <View style={styles.screen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 24,
          paddingTop: insets.top + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TabHeader title="Habits" subtitle={format(new Date(), 'EEEE, MMM d')} showBack />

        <HabitTodayHero
          completedToday={completedToday}
          totalHabits={habits.length}
          completionRate={completionRate}
          bestStreak={bestStreakEver}
          activeCount={activeHabits}
        />

        <HabitCategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />

        {habits.length > 0 && (
          <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>YOUR HABITS</Text>
        )}

        {habits.length === 0 ? (
          <HabitEmptyPlaceholder variant="none" />
        ) : filteredHabits.length === 0 ? (
          <HabitEmptyPlaceholder variant="filter" />
        ) : (
          filteredHabits.map(habit => (
            <HabitRowCard
              key={habit.id}
              habit={habit}
              todayDateStr={todayDateStr}
              confetti={confettiHabitId === habit.id}
              confettiColors={confettiColors}
              onPress={() => {
                setSelectedHabit(habit);
                setDetailVisible(true);
              }}
              onLongPress={() => {
                setHabitForAction(habit);
                setActionSheetVisible(true);
              }}
              onToggle={() => handleToggle(habit.id)}
            />
          ))
        )}

        <Text style={[styles.hint, { color: theme.tertiaryText }]}>Long-press a habit for pause or delete</Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            borderTopColor: theme.cardBorder,
            backgroundColor: theme.background + 'F2',
          },
        ]}
      >
        <AnimatedButton
          title="New Habit"
          onPress={() => setHabitSheetVisible(true)}
          style={{ alignSelf: 'stretch', width: '100%' }}
        />
      </View>
      </View>

      <HabitDetailSheet
        visible={isDetailVisible}
        habit={selectedHabit}
        todayDateStr={todayDateStr}
        onClose={() => setDetailVisible(false)}
        onToggleToday={() => selectedHabit && handleToggle(selectedHabit.id, true)}
        onRequestDelete={(h) => {
          setHabitToDelete(h);
          setDetailVisible(false);
          setTimeout(() => setDeleteDialogVisible(true), 300);
        }}
      />

      <NativeSheet visible={isActionSheetVisible} onClose={() => setActionSheetVisible(false)} height={280}>
        <View style={{ padding: 24, flex: 1, backgroundColor: theme.card }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: theme.primaryText, marginBottom: 20 }}>
            {habitForAction?.title}
          </Text>
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => {
                if (habitForAction) updateHabit(habitForAction.id, { is_paused: !habitForAction.is_paused });
                setActionSheetVisible(false);
              }}
              style={[styles.actionRow, { borderColor: theme.cardBorder }]}
            >
              {habitForAction?.is_paused ? <Play size={20} color={theme.accent} /> : <Pause size={20} color={theme.accent} />}
              <Text style={[styles.actionText, { color: theme.primaryText }]}>
                {habitForAction?.is_paused ? 'Resume habit' : 'Pause habit'}
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
              style={[styles.actionRow, { borderColor: theme.cardBorder }]}
            >
              <Trash2 size={20} color={theme.danger} />
              <Text style={[styles.actionText, { color: theme.danger }]}>Delete habit</Text>
            </Pressable>
          </View>
        </View>
      </NativeSheet>

      <AddHabitSheet visible={isHabitSheetVisible} onClose={() => setHabitSheetVisible(false)} onAddHabit={handleAddHabit} />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title="Delete Habit"
        message={`Delete "${habitToDelete?.title}"? Your streak history will be removed.`}
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
  screen: { flex: 1 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loginWrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  loginIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  loginTitle: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', marginBottom: 12, textAlign: 'center' },
  loginSub: { fontSize: 15, fontFamily: 'Inter_500Medium', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 12 },
  hint: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  actionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
