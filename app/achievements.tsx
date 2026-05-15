import { AppText as Text } from '@/components/ui/AppText';
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  ChevronLeft, 
  Award,
  Trophy,
  Star,
  Zap,
  Target
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  date: string;
  points: number;
}

export default function AchievementsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Mock state for achievements
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeInUp.duration(600)} 
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
        <Award size={48} color={theme.tertiaryText} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No Achievements Yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
        Complete tasks and build habits to earn your first badges!
      </Text>
    </Animated.View>
  );

  const renderAchievementItem = ({ item, index }: { item: Achievement; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 100)}>
      <AnimatedCard style={[styles.achievementCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.iconBox, { backgroundColor: theme.accentLight }]}>
          {React.createElement(item.icon, { size: 24, color: theme.accent })}
        </View>
        <View style={styles.info}>
          <Text style={[styles.itemTitle, { color: theme.primaryText }]}>{item.title}</Text>
          <Text style={[styles.itemDesc, { color: theme.secondaryText }]}>{item.description}</Text>
          <Text style={[styles.itemDate, { color: theme.tertiaryText }]}>{item.date} • {item.points} pts</Text>
        </View>
      </AnimatedCard>
    </Animated.View>
  );

  return (
    <BackgroundGradient>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable 
          onPress={() => router.back()} 
          style={[styles.iconBoxStandard, { backgroundColor: theme.accentLight }]}
        >
          <ChevronLeft size={20} color={theme.accent} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Achievements</Text>
      </View>

      <View style={styles.content}>
        {achievements.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={achievements}
            renderItem={renderAchievementItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    top: 28,
    zIndex: 10,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginRight: 40, // Balance the back button
  },
  iconBoxStandard: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 6,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
