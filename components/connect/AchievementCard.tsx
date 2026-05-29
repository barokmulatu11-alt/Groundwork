import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { AchievementItem } from '@/hooks/connect/useAchievements';
import * as Icons from 'lucide-react-native';

interface Props {
  item: AchievementItem;
  newlyUnlocked?: boolean;
  onPress?: () => void;
}

export const AchievementCard: React.FC<Props> = ({ item, newlyUnlocked = false, onPress }) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (newlyUnlocked) {
      scale.value = withSequence(
        withSpring(1.05, { damping: 12, stiffness: 120 }),
        withSpring(1, { damping: 12, stiffness: 120 })
      );
    }
  }, [newlyUnlocked]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Resolve secret/hidden locked state
  const isSecretLocked = item.secret && !item.unlocked;
  const displayTitle = isSecretLocked ? 'Secret Achievement' : item.name;
  const displayDesc = isSecretLocked ? 'Keep exploring to unlock this hidden achievement.' : item.description;
  const displayIcon = isSecretLocked ? 'Lock' : item.icon;

  const IconComponent = (Icons as any)[displayIcon] || Icons.Award;

  // Visual states: Fully greyed out and muted if locked
  const cardBg = item.unlocked 
    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)')
    : (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)');
  
  const cardBorder = item.unlocked 
    ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') 
    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)');

  const accentColor = item.unlocked ? item.color : '#8E8E93';

  return (
    <Animated.View
      style={[
        styles.card,
        { 
          backgroundColor: cardBg, 
          borderColor: cardBorder,
          opacity: item.unlocked ? 1 : 0.45
        },
        item.unlocked && styles.unlockedCard,
        animStyle,
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.touchable}>
        {/* Left Section: Icon Container */}
        <View style={styles.leftSection}>
          <View style={[styles.iconCircle, { backgroundColor: item.unlocked ? item.color + '15' : 'rgba(142,142,147,0.08)' }]}>
            <IconComponent size={22} color={accentColor} strokeWidth={2} />
          </View>
        </View>

        {/* Center Section: Title, Description, and progress */}
        <View style={styles.centerSection}>
          <Text style={[styles.name, { color: item.unlocked ? theme.primaryText : theme.secondaryText }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={[styles.desc, { color: theme.tertiaryText }]} numberOfLines={2}>
            {displayDesc}
          </Text>
          
          {/* Subtle Progress Bar */}
          {!item.unlocked && item.progress > 0 && !isSecretLocked && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: '#8E8E93' }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.tertiaryText }]}>{item.progress}%</Text>
            </View>
          )}
        </View>

        {/* Right Section: Lock/Unlock Indicator */}
        <View style={styles.rightSection}>
          {item.unlocked ? (
            <View style={[styles.badgeCircle, { backgroundColor: item.color + '12' }]}>
              <Icons.Check size={14} color={item.color} strokeWidth={3} />
            </View>
          ) : (
            <View style={[styles.badgeCircle, { backgroundColor: 'rgba(142,142,147,0.06)' }]}>
              <Icons.Lock size={12} color="#8E8E93" strokeWidth={2.5} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  unlockedCard: {
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftSection: {
    marginRight: 14,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  desc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  rightSection: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
