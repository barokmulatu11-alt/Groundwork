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
import { useFocusEffect, useRouter } from 'expo-router';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { NotificationSheet } from '@/components/NotificationSheet';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { BellRing as Bell, BarChart, Calendar, ChevronRight, Clock, FileText, Info, LayoutGrid, AlignJustify as ListIcon, Settings, Shield, Quote as QuoteIcon, X } from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { DailyQuoteBanner } from '@/components/DailyQuoteBanner';
import { DailyQuestCard } from '@/components/DailyQuestCard';
import { getPersonalizedGreetingParts } from '@/lib/GreetingUtils';
import { hapticLight } from '@/lib/haptics';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { profile, session } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const { tasks, habits, notes, focusSessions, loadAllTasks, loadHabits, loadNotes, loadFocusSessions, isSyncing, syncFromCloud, lastSyncedAt } = useStore();
  const { tasksLayout, setTasksLayout, notificationsEnabled } = useSettingsStore();
  const [greetingHeadline, setGreetingHeadline] = useState('');
  const [greetingSubline, setGreetingSubline] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  // Fetch logic omitted here... (it's handled in the hook above)


  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          
          // Migrate any tasks mistakenly saved as 'guest' during the bug
          const { useAuthStore } = require('@/store/useAuthStore');
          const { migrateGuestData } = require('@/lib/db');
          const session = useAuthStore.getState().session;
          if (session?.user?.id) {
            migrateGuestData('guest', session.user.id);
          }

          await loadAllTasks();
          await loadHabits();
          await loadNotes();
          await loadFocusSessions();
          
          if (!isActive) return;
          const currentHabits = useStore.getState().habits;
          const currentStreak = currentHabits.reduce((acc, h) => acc + h.streak, 0);
          
          const { rescheduleAll } = require('@/lib/notifications');
          if (notificationsEnabled) {
            await rescheduleAll(true, currentStreak);
          }

          setIsLoading(false);
        } catch (e) {
          console.error("Failed to load dashboard data:", e);
          if (isActive) setIsLoading(false);
        }
      };
      fetchData();
      return () => { isActive = false; };
    }, [loadAllTasks, loadHabits, loadNotes, loadFocusSessions, notificationsEnabled])
  );

  useEffect(() => {
    // Check for unread notifications
    const checkUnread = async () => {
      const { session } = useAuthStore.getState();
      if (!session?.user?.id) return;
      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      setHasUnread((count || 0) > 0);
    };
    checkUnread();

    // Subscribe to new notifications
    const { session } = useAuthStore.getState();
    let subscription: any;
    if (session?.user?.id) {
      const channelName = `user_notifications_changes_${session.user.id}_${Math.random().toString(36).substring(5)}`;
      subscription = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'user_notifications',
          filter: `user_id=eq.${session.user.id}`
        }, () => {
          setHasUnread(true);
        })
        .subscribe();
    }

    const today = new Date().toISOString().split('T')[0];
    const todayTasks = useStore.getState().tasks.filter((t) => t.date === today && !t.deleted_at);
    const completedToday = todayTasks.filter((t) => t.completed).length;
    const streak = useStore.getState().habits.reduce((acc, h) => acc + h.streak, 0);
    const displayName =
      profile?.full_name ||
      profile?.username ||
      session?.user?.user_metadata?.full_name ||
      session?.user?.email?.split('@')[0] ||
      null;
    const { headline, subline } = getPersonalizedGreetingParts({
      displayName,
      totalStreak: streak,
      tasksCompletedToday: completedToday,
      tasksTotalToday: todayTasks.length,
    });
    setGreetingHeadline(headline);
    setGreetingSubline(subline);

    // Request notification permissions
    const { requestPermissionsAsync } = require('@/lib/notifications');
    requestPermissionsAsync();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const handleSync = async () => {
    await syncFromCloud();
  };

  const totalTasksCount = (tasks || []).length;
  
  // Calculate max streak across all habits
  const totalStreak = (habits || []).reduce((acc, h) => acc + h.streak, 0);

  const completedTasks = (tasks || []).filter(t => t.completed).length;
  const completionPercentage = (tasks || []).length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  const isGrid = tasksLayout === 'grid';

  const renderCard = (type: string, title: string, count: string | number, Icon: any, color: string, route: string) => {
    if (isGrid || isDesktop) {
      return (
        <AnimatedCard 
          onPress={() => router.push(route as any)} 
          style={{ width: isDesktop ? '31%' : '48.5%', minHeight: 120, padding: 16, marginBottom: 14 }}
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
          paddingTop: insets.top + 24,
          maxWidth: isDesktop ? 1000 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: isDesktop ? '100%' : undefined,
        }}
        showsVerticalScrollIndicator={false}
      >

        
        <Animated.View entering={FadeIn.duration(300)} style={styles.headerBlock}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.dateText, { color: theme.secondaryText }]}>{todayDateStr}</Text>
            <View style={styles.headerIcons}>
            <Pressable 
              style={[styles.iconBox, { backgroundColor: 'transparent' }]} 
              onPress={() => { hapticLight(); setNotificationsVisible(true); }}
            >
              <View>
                <Bell size={18} color={theme.accent} />
                {hasUnread && <View style={[styles.badge, { backgroundColor: theme.danger }]} />}
              </View>
            </Pressable>
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
          </View>
          <Text style={[styles.greetingText, { color: theme.primaryText }]}>{greetingHeadline}</Text>
          {greetingSubline ? (
            <Text style={[styles.greetingSubline, { color: theme.secondaryText }]}>{greetingSubline}</Text>
          ) : null}
        </Animated.View>

        <AnnouncementBanner />
        <DailyQuoteBanner />
        {!isLoading && <DailyQuestCard />}

        {/* Sync Status Indicator */}
        {lastSyncedAt && (
          <Animated.View entering={FadeIn.delay(100).duration(200)} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, color: theme.secondaryText, fontFamily: 'Inter_600SemiBold' }}>
              Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeIn.delay(200).duration(300)} style={[styles.cardsWrapper, (!isGrid && !isDesktop) && { flexDirection: 'column' }]}>
          {isLoading ? (
            <>
              <AnimatedCard style={[styles.cardContainer, { width: (isGrid || isDesktop) ? (isDesktop ? '31%' : '48%') : '100%', marginBottom: 16, padding: 16, minHeight: (isGrid || isDesktop) ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: (isGrid || isDesktop) ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: (isGrid || isDesktop) ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
              <AnimatedCard style={[styles.cardContainer, { width: (isGrid || isDesktop) ? (isDesktop ? '31%' : '48%') : '100%', marginBottom: 16, padding: 16, minHeight: (isGrid || isDesktop) ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: (isGrid || isDesktop) ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: (isGrid || isDesktop) ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
              <AnimatedCard style={[styles.cardContainer, { width: (isGrid || isDesktop) ? (isDesktop ? '31%' : '48%') : '100%', marginBottom: 16, padding: 16, minHeight: (isGrid || isDesktop) ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: (isGrid || isDesktop) ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: (isGrid || isDesktop) ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
              <AnimatedCard style={[styles.cardContainer, { width: (isGrid || isDesktop) ? (isDesktop ? '31%' : '48%') : '100%', marginBottom: 16, padding: 16, minHeight: (isGrid || isDesktop) ? 140 : 80 }]}>
                <Skeleton width={42} height={42} borderRadius={14} style={{ marginBottom: (isGrid || isDesktop) ? 12 : 0 }} />
                <Skeleton width="70%" height={16} style={{ marginTop: (isGrid || isDesktop) ? 0 : 12, marginBottom: 4 }} />
                <Skeleton width="40%" height={12} />
              </AnimatedCard>
            </>

          ) : (
            <>
              {renderCard("tasks", "Tasks", totalTasksCount, Calendar, theme.accent, { pathname: '/tasks', params: { date: undefined } } as any)}
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

        <NotificationSheet visible={notificationsVisible} onClose={() => {
          setNotificationsVisible(false);
          setHasUnread(false); // Optimistically clear dot
        }} />

      </ScrollView>



    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 40,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexShrink: 0,
  },
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
    lineHeight: 32,
  },
  greetingSubline: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 6,
    lineHeight: 20,
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
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'transparent'
  }
});
