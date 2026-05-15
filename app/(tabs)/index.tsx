import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { ActionRow } from '@/components/ui/ActionRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { BarChart, Calendar, ChevronRight, Clock, FileText, Info, LayoutGrid, AlignJustify as ListIcon, Settings, Shield, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks, habits, notes, focusSessions, loadAllTasks, loadHabits, loadNotes, loadFocusSessions, isSyncing, syncFromCloud, lastSyncedAt } = useStore();
  const { tasksLayout, setTasksLayout, notificationsEnabled } = useSettingsStore();
  const [greeting, setGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        await loadAllTasks();
        await loadHabits();
        await loadNotes();
        await loadFocusSessions();
        
        const currentHabits = useStore.getState().habits;
        const currentStreak = currentHabits.reduce((acc, h) => acc + h.streak, 0);
        
        const { rescheduleAll } = require('@/lib/notifications');
        if (notificationsEnabled) {
          await rescheduleAll(true, currentStreak);
        }

        setIsLoading(false);
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
        setIsLoading(false);
      }
    };
    fetchData();

    // Use randomized greeting
    const { getRandomGreeting } = require('@/lib/GreetingUtils');
    setGreeting(getRandomGreeting());

    // Request notification permissions
    const { requestPermissionsAsync } = require('@/lib/notifications');
    requestPermissionsAsync();
  }, []);

  const handleSync = async () => {
    await syncFromCloud();
  };

  const pendingTasksCount = (tasks || []).filter(t => !t.completed).length;
  
  // Calculate max streak across all habits
  const totalStreak = (habits || []).reduce((acc, h) => acc + h.streak, 0);

  const completedTasks = (tasks || []).filter(t => t.completed).length;
  const completionPercentage = (tasks || []).length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  const isGrid = tasksLayout === 'grid';

  const renderCard = (type: string, title: string, count: string | number, Icon: any, color: string, route: string) => {
    if (isGrid) {
      return (
        <AnimatedCard 
          onPress={() => router.push(route as any)} 
          style={{ width: '48.5%', minHeight: 120, padding: 16, marginBottom: 14 }}
        >
          <View style={[styles.iconBox, { backgroundColor: 'transparent', marginBottom: 12 }]}>
            <Icon size={22} color={theme.accent} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: theme.primaryText }}>{title}</Text>
            <Text style={{ fontSize: 13, color: theme.secondaryText, marginTop: 2, fontFamily: 'Inter_600SemiBold' }}>{count} {type}</Text>
          </View>
        </AnimatedCard>
      );
    }

    return (
      <ActionRow 
        Icon={Icon}
        title={title}
        subtitle={`${count} ${type}`}
        onPress={() => router.push(route as any)}
      />
    );
  };

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
        
        <Animated.View entering={FadeIn.duration(300)} style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.dateText, { color: theme.secondaryText }]}>{todayDateStr}</Text>
            <Text style={[styles.greetingText, { color: theme.primaryText }]} numberOfLines={2}>{greeting}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Pressable 
              style={[styles.iconBox, { backgroundColor: 'transparent' }]} 
              onPress={() => router.push('/calendar')}
            >
              <Calendar size={18} color={theme.accent} />
            </Pressable>
            <Pressable 
              style={[styles.iconBox, { backgroundColor: 'transparent' }]} 
              onPress={() => setTasksLayout(isGrid ? 'list' : 'grid')}
            >
              {isGrid ? (
                <ListIcon size={18} color={theme.accent} />
              ) : (
                <LayoutGrid size={18} color={theme.accent} />
              )}
            </Pressable>
            <Pressable 
              style={[styles.iconBox, { backgroundColor: 'transparent' }]} 
              onPress={() => router.push('/settings')}
            >
              <Settings size={18} color={theme.accent} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Sync Status Indicator */}
        {lastSyncedAt && (
          <Animated.View entering={FadeIn.delay(100).duration(200)} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: theme.secondaryText, fontFamily: 'Inter_600SemiBold' }}>
              Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeIn.delay(200).duration(300)} style={[styles.cardsWrapper, !isGrid && { flexDirection: 'column' }]}>
          {isLoading ? (
            <>
              <AnimatedCard style={[styles.cardContainer, { width: isGrid ? '48%' : '100%', marginBottom: 16, padding: 16, minHeight: isGrid ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: isGrid ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: isGrid ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
              <AnimatedCard style={[styles.cardContainer, { width: isGrid ? '48%' : '100%', marginBottom: 16, padding: 16, minHeight: isGrid ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: isGrid ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: isGrid ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
              <AnimatedCard style={[styles.cardContainer, { width: isGrid ? '48%' : '100%', marginBottom: 16, padding: 16, minHeight: isGrid ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: isGrid ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: isGrid ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
              <AnimatedCard style={[styles.cardContainer, { width: isGrid ? '48%' : '100%', marginBottom: 16, padding: 16, minHeight: isGrid ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: isGrid ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: isGrid ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
            </>
          ) : (
            <>
              {renderCard("tasks", "Tasks", pendingTasksCount, Calendar, theme.accent, { pathname: '/tasks', params: { date: undefined } } as any)}
              {renderCard("streaks", "Habits", totalStreak, Shield, theme.accent, '/habits')}
              {renderCard("sessions", "Focus", focusSessions.length, Clock, theme.accent, '/focus')}
              {renderCard("notes", "Notes", notes.length, FileText, theme.accent, '/notes')}
              {renderCard("recap", "Daily Recap", `${completionPercentage}%`, BarChart, theme.accent, '/recap')}
            </>
          )}
        </Animated.View>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: theme.secondaryText, fontFamily: 'Inter_600SemiBold' }}>v{Constants.expoConfig?.version || '1.0.2-beta'}</Text>
        </View>

      </ScrollView>



    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40 },
  dateText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  greetingText: {
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 8
  },
  subtitleText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium'
  },
  settingsButton: {
    padding: 12,
    borderRadius: 20,
    marginBottom: 0 },
  cardsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 10 },
  cardContainer: {
    // Style applied inline
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center' },
  textContainer: {
    justifyContent: 'center',
    width: '100%' },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  }
});
