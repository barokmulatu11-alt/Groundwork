import { AchievementUnlockSheet } from '@/components/AchievementUnlockSheet';
import { Confetti } from '@/components/ui/Confetti';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { hapticSuccess, hapticLight } from '@/lib/haptics';
import {
  ConnectEvent,
  subscribeToConnectEvents,
} from '@/lib/connect/xpSystem';
import { ArrowUpCircle, Sparkles, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastPayload =
  | { type: 'LEVEL_UP'; level: number; title: string }
  | { type: 'ACHIEVEMENT_UNLOCKED'; achievement: any }
  | { type: 'XP_EARNED'; amount: number; reason: string };

export function XPToastProvider({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toastY = useSharedValue(-160);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievementSheet, setAchievementSheet] = useState<any>(null);

  useEffect(() => {
    const hide = () => {
      toastY.value = withSpring(-160, { damping: 14, stiffness: 90 });
      setTimeout(() => setToast(null), 300);
    };

    const show = (data: ToastPayload, duration = 3200) => {
      setToast(data);
      toastY.value = withSpring(insets.top + 8, { damping: 12, stiffness: 90 });
      const t = setTimeout(hide, duration);
      return () => clearTimeout(t);
    };

    const unsub = subscribeToConnectEvents((event: ConnectEvent) => {
      if (event.type === 'XP_UPDATED') return;

      if (event.type === 'LEVEL_UP') {
        hapticSuccess();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
        return show({ type: 'LEVEL_UP', level: event.level, title: event.title }, 4000);
      }

      if (event.type === 'ACHIEVEMENT_UNLOCKED') {
        hapticSuccess();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
        setAchievementSheet(event.achievement);
        return show({ type: 'ACHIEVEMENT_UNLOCKED', achievement: event.achievement }, 3500);
      }

      if (event.type === 'XP_EARNED') {
        hapticLight();
        return show({ type: 'XP_EARNED', amount: event.amount, reason: event.reason }, 2200);
      }
    });

    return unsub;
  }, [insets.top]);

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
  }));

  const badgeLabel = () => {
    if (!toast) return '';
    if (toast.type === 'LEVEL_UP') return `Lvl ${toast.level}`;
    if (toast.type === 'ACHIEVEMENT_UNLOCKED') return `+${toast.achievement?.xpReward || 0} XP`;
    return `+${toast.amount} XP`;
  };

  const accentColor =
    toast?.type === 'ACHIEVEMENT_UNLOCKED'
      ? toast.achievement?.color || theme.accent
      : toast?.type === 'LEVEL_UP'
        ? theme.success
        : theme.accent;

  return (
    <>
      {children}
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              backgroundColor: isDark ? 'rgba(24,24,28,0.96)' : 'rgba(255,255,255,0.96)',
              borderColor: accentColor + '35',
            },
            toastStyle,
          ]}
        >
          <View style={[styles.bar, { backgroundColor: accentColor }]} />
          <View style={[styles.icon, { backgroundColor: accentColor + '18' }]}>
            {toast.type === 'LEVEL_UP' ? (
              <ArrowUpCircle size={22} color={theme.success} />
            ) : toast.type === 'ACHIEVEMENT_UNLOCKED' ? (
              <Trophy size={22} color={accentColor} />
            ) : (
              <Sparkles size={22} color={theme.accent} />
            )}
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: theme.primaryText }]}>
              {toast.type === 'LEVEL_UP'
                ? 'Level up!'
                : toast.type === 'ACHIEVEMENT_UNLOCKED'
                  ? 'Achievement unlocked'
                  : 'XP earned'}
            </Text>
            <Text style={[styles.desc, { color: theme.secondaryText }]} numberOfLines={1}>
              {toast.type === 'LEVEL_UP'
                ? `Level ${toast.level} — ${toast.title}`
                : toast.type === 'ACHIEVEMENT_UNLOCKED'
                  ? toast.achievement?.name
                  : toast.reason}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: accentColor + '18' }]}>
            <Text style={[styles.badgeText, { color: accentColor }]}>{badgeLabel()}</Text>
          </View>
        </Animated.View>
      )}
      <AchievementUnlockSheet
        visible={!!achievementSheet}
        achievement={achievementSheet}
        onClose={() => setAchievementSheet(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 14,
    gap: 10,
    zIndex: 9999,
    elevation: 20,
    overflow: 'hidden',
  },
  bar: { width: 4, alignSelf: 'stretch', marginRight: 2 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  desc: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold' },
});
