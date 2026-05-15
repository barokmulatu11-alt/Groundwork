import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Confetti } from '@/components/ui/Confetti';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { WeeklyBarChart } from '@/components/WeeklyBarChart';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { TabHeader } from '@/components/ui/TabHeader';

// ─── Daily Recap Message ─────────────────────────────────────────────────────

interface RecapMessageData {
  badge: string;
  headline: string;
  subline: string;
  detail: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
}

function getRecapMessage(completionPercentage: number, completedTasks: number, totalTasks: number, theme: any): RecapMessageData {
  if (totalTasks === 0) {
    return {
      badge: '',
      headline: "Nothing planned yet",
      subline: "Add some tasks to kick off your day!",
      detail: "Every great day starts with a plan. What do you want to accomplish? ",
      accentColor: '#636366',
      bgLight: 'rgba(99,99,102,0.08)',
      bgDark: 'rgba(99,99,102,0.15)' };
  }
  if (completionPercentage === 100) {
    return {
      badge: '',
      headline: ' Incredible work today! ',
      subline: "You've completed 100% of your tasks ",
      detail: " You stayed focused, consistent, and finished everything you planned.\n Amazing job — take a well-deserved break!\n\n See you next time!",
      accentColor: '#34C759',
      bgLight: 'rgba(52,199,89,0.10)',
      bgDark: 'rgba(52,199,89,0.16)' };
  }
  if (completionPercentage === 0) {
    return {
      badge: '',
      headline: "Today was a slow start — that's okay",
      subline: "Every champion has off days.",
      detail: "Rest, reset, and come back stronger tomorrow.\nYou've still got this. Let's make tomorrow count ",
      accentColor: '#FF9500',
      bgLight: 'rgba(255,149,0,0.09)',
      bgDark: 'rgba(255,149,0,0.16)' };
  }
  // Partial
  const emoji = completionPercentage >= 75 ? '' : completionPercentage >= 50 ? '' : '';
  return {
    badge: emoji,
    headline: "Great progress today!",
    subline: `You completed ${completedTasks} out of ${totalTasks} tasks `,
    detail: completionPercentage >= 75
      ? "You're almost there — finish strong and close it out! "
      : completionPercentage >= 50
      ? "You're over halfway — keep the momentum rolling "
      : "Every step forward matters. Keep going — you're building momentum ",
    accentColor: theme.accent,
    bgLight: `${theme.accent}15`,
    bgDark: `${theme.accent}25` };
}

const RecapMessageCard = ({
  completionPercentage,
  completedTasks,
  totalTasks,
  isDark,
  theme }: {
  completionPercentage: number;
  completedTasks: number;
  totalTasks: number;
  isDark: boolean;
  theme: any;
}) => {
  const msg = getRecapMessage(completionPercentage, completedTasks, totalTasks, theme);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(80)}>
      <View
        style={{
          backgroundColor: isDark ? msg.bgDark : msg.bgLight,
          borderRadius: 22,
          padding: 22,
          marginBottom: 24 }}
      >
        {/* Badge row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: msg.accentColor + '22',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14 }}
          >
            <Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold' }}>{msg.badge}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Inter_700Bold',
                color: msg.accentColor,
                marginBottom: 2 }}
            >
              {msg.headline}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Inter_600SemiBold',
                color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)' }}
            >
              {msg.subline}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: msg.accentColor + '22',
            marginBottom: 12 }}
        />

        {/* Detail lines */}
        <Text
          style={{
            fontSize: 13,
            fontFamily: 'Inter_600SemiBold',
            color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)',
            lineHeight: 20 }}
        >
          {msg.detail}
        </Text>
      </View>
    </Animated.View>
  );
};

const StatBox = ({ title, value, label, onPress, theme, isDark }: { title: string, value: string | number, label: string, onPress: () => void, theme: any, isDark: boolean }) => {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Pressable 
      onPress={onPress}
      onPressIn={() => scale.value = withSpring(0.95)}
      onPressOut={() => scale.value = withSpring(1)}
      style={{ flex: 1 }}
    >
      <Animated.View style={[
        { 
          backgroundColor: theme.card, 
          borderRadius: 20, 
          padding: 14,
          alignItems: 'center',
          minHeight: 80,
          justifyContent: 'center' },
        animatedStyle
      ]}>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: isDark ? theme.primaryText : theme.secondaryText, marginBottom: 2 }}>{value}</Text>
        <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: theme.secondaryText, letterSpacing: 0.5, textAlign: 'center' }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

export default function RecapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tasks, habits, focusSessions, loadAllTasks, loadHabits, loadFocusSessions } = useStore();
  const { theme, isDark } = useTheme();

  const today = new Date().toISOString().split('T')[0];
  const [popup, setPopup] = useState<{ visible: boolean; title: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>({ visible: false, title: '', message: '', type: 'info' });
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await loadAllTasks();
        await loadHabits();
        await loadFocusSessions();
      } catch (e) {
        console.error("Failed to load recap data:", e);
      }
    };
    fetchData();
  }, []);

  const todayTasks = tasks.filter(t => t.date === today);
  const totalTasks = todayTasks.length;
  const completedTasks = todayTasks.filter(t => t.completed).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalStreak = habits.reduce((acc, h) => acc + h.streak, 0);

  useEffect(() => {
    if (completionPercentage === 100 && totalTasks > 0) {
      setShowConfetti(true);
    }
  }, [completionPercentage, totalTasks]);

  const todayFocusMinutes = focusSessions
    .filter(s => s.date === today)
    .reduce((acc, s) => acc + s.duration_minutes, 0);
  
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const focusDisplay = formatTime(todayFocusMinutes);

  // Generate weekly data
  const weeklyData = useMemo(() => {
    const data = [];
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const count = tasks.filter(t => t.date === dStr && t.completed).length;
      data.push({ day: days[d.getDay()], value: count });
    }
    return data;
  }, [tasks]);

  const openTasksPopup = () => {
    const msg = `You have completed ${completedTasks} of ${totalTasks} tasks today.`;
    setPopup({ visible: true, title: "Your Tasks Today", message: msg, type: 'info' });
  };

  const openFocusPopup = () => {
    const msg = `You've focused for ${focusDisplay} today.`;
    setPopup({ visible: true, title: "Your Focus Time", message: msg, type: 'info' });
  };

  const openStreakPopup = () => {
    const msg = `You have a ${totalStreak} day streak going.`;
    setPopup({ visible: true, title: "Your Streak", message: msg, type: 'success' });
  };

  const radius = 70;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  const progressScale = useSharedValue(1);
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }]
  }));

  const openProgressPopup = () => {
    const msg = `You've completed ${completionPercentage}% of your tasks today.`;
    setPopup({ visible: true, title: "Your Daily Progress", message: msg, type: 'success' });
  };

  return (
    <BackgroundGradient>
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 24 }} 
        contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <TabHeader title="Daily Recap" subtitle="How did today go? • v1.1.0" />

        <RecapMessageCard
          completionPercentage={completionPercentage}
          completedTasks={completedTasks}
          totalTasks={totalTasks}
          isDark={isDark}
          theme={theme}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 }}>
          <StatBox 
            title="Tasks" 
            value={`${completedTasks}/${totalTasks}`} 
            label="TASKS DONE" 
            onPress={openTasksPopup} 
            theme={theme}
            isDark={isDark}
          />
          <StatBox 
            title="Focus" 
            value={focusDisplay} 
            label="FOCUS TIME" 
            onPress={openFocusPopup} 
            theme={theme}
            isDark={isDark}
          />
          <StatBox 
            title="Streak" 
            value={` ${totalStreak}`} 
            label="STREAK" 
            onPress={openStreakPopup} 
            theme={theme}
            isDark={isDark}
          />
        </View>

        <WeeklyBarChart data={weeklyData} />

        <Pressable 
          onPress={openProgressPopup}
          onPressIn={() => progressScale.value = withSpring(0.95)}
          onPressOut={() => progressScale.value = withSpring(1)}
        >
          <Animated.View style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: 20, marginBottom: 40 }, progressAnimatedStyle]}>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Svg width={180} height={180} viewBox="0 0 180 180">
                <SvgCircle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke={theme.card}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <SvgCircle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke={theme.primaryText}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="90, 90"
                />
              </Svg>
              <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 32, fontFamily: 'Inter_700Bold', color: theme.primaryText, marginBottom: 2 }}>
                  {completionPercentage}%
                </Text>
                <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: theme.primaryText, letterSpacing: 0.8 }}>
                  COMPLETE
                </Text>
              </View>
            </View>
            
            <Text style={{ fontSize: 15, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText }}>
              {completedTasks} of {totalTasks} tasks completed
            </Text>
          </Animated.View>
        </Pressable>

        {tasks.filter(t => t.completed && t.date === today).length > 0 && (
          <AnimatedCard style={{ padding: 0, paddingVertical: 8 }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8}}>
              <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: theme.secondaryText, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                TODAY'S WINS
              </Text>
            </View>
            {tasks.filter(t => t.completed && t.date === today).map((task, index, arr) => (
              <View key={task.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20}}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                    <CheckCircle2 size={16} color="#fff" strokeWidth={3} />
                  </View>
                  <View style={{ flex: 1}}>
                    <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: theme.secondaryText, textDecorationLine: 'line-through', marginBottom: 4 }}>
                      {task.title}
                    </Text>
                  </View>
                </View>
                {index < arr.length - 1 && <View style={{ height: 1, backgroundColor: theme.card, marginHorizontal: 20 }} />}
              </View>
            ))}
          </AnimatedCard>
        )}
      </ScrollView>

      <CustomAlert 
        visible={popup.visible} 
        onConfirm={() => setPopup(prev => ({ ...prev, visible: false }))} 
        title={popup.title} 
        message={popup.message} 
        type={popup.type}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  }
});
