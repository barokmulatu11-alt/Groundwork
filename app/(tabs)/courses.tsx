import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/lib/ThemeContext';
import { hapticSuccess } from '@/lib/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, Bell, Sparkles, Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WAITLIST_KEY = '@groundwork_courses_waitlist';

export default function CoursesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [onWaitlist, setOnWaitlist] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  useEffect(() => {
    AsyncStorage.getItem(WAITLIST_KEY).then((v) => setOnWaitlist(v === 'true'));
  }, []);

  const joinWaitlist = async () => {
    hapticSuccess();
    await AsyncStorage.setItem(WAITLIST_KEY, 'true');
    setOnWaitlist(true);
  };

  return (
    <BackgroundGradient>
      <View style={[styles.container, { 
        paddingTop: insets.top + 24,
        maxWidth: isDesktop ? 600 : undefined,
        alignSelf: isDesktop ? 'center' : undefined,
        width: isDesktop ? '100%' : undefined,
      }]}>

        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Courses</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Master your craft</Text>
        </Animated.View>

        <AnimatedCard style={styles.card}>
          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: theme.accentLight }]}>
              <BookOpen size={32} color={theme.accent} />
            </View>

            <View style={styles.textContainer}>
              <View style={[styles.badge, { backgroundColor: theme.accentLight }]}>
                <Sparkles size={12} color={theme.accent} />
                <Text style={[styles.badgeText, { color: theme.accent }]}>COMING SOON</Text>
              </View>

              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Something big is brewing</Text>
              <Text style={[styles.cardDescription, { color: theme.secondaryText }]}>
                Curated courses on productivity, focus, and life skills — built for students like you.
              </Text>
            </View>

            <View style={[styles.progressBar, { backgroundColor: theme.accentLight }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.accent, width: '70%' }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.tertiaryText }]}>In active development</Text>

            {onWaitlist ? (
              <View style={[styles.waitlistDone, { backgroundColor: theme.successLight }]}>
                <Check size={18} color={theme.success} />
                <Text style={[styles.waitlistDoneText, { color: theme.success }]}>You're on the waitlist</Text>
              </View>
            ) : (
              <AnimatedButton
                title="Notify me at launch"
                onPress={joinWaitlist}
                style={{ marginTop: 8, width: '100%' }}
              />
            )}
            <View style={styles.hintRow}>
              <Bell size={14} color={theme.secondaryText} />
              <Text style={[styles.hint, { color: theme.secondaryText }]}>
                Early access + launch bonus XP for waitlist members
              </Text>
            </View>
          </Animated.View>
        </AnimatedCard>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 40 },
  title: { fontSize: 34, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  card: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', width: '100%' },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  textContainer: { alignItems: 'center', marginBottom: 32 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
  },
  badgeText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1 },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 20 },
  waitlistDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    justifyContent: 'center',
  },
  waitlistDoneText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  hint: { fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 17 },
});
