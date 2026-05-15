import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useTheme } from '@/lib/ThemeContext';
import { BookOpen, Sparkles } from 'lucide-react-native';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CoursesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <BackgroundGradient>
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Courses</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Master your craft</Text>
        </Animated.View>

        <AnimatedCard style={styles.card}>
          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: 'transparent' }]}>
              <BookOpen size={32} color={theme.accent} />
            </View>
            
            <View style={styles.textContainer}>
              <View style={[styles.badge, { backgroundColor: 'transparent' }]}>
                <Sparkles size={12} color={theme.accent} />
                <Text style={[styles.badgeText, { color: theme.accent }]}>COMING SOON</Text>
              </View>
              
              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Something big is brewing</Text>
              <Text style={[styles.cardDescription, { color: theme.secondaryText }]}>
                We're building a curated library of courses to help you level up your productivity, focus, and life skills.
              </Text>
            </View>

            <View style={[styles.progressBar, { backgroundColor: 'transparent' }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.accent, width: '70%' }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.tertiaryText }]}>70% Development complete</Text>
          </Animated.View>
        </AnimatedCard>
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  card: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
  },
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
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
