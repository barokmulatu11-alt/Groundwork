import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { DesignTokens } from '@/constants/designTokens';

interface Props {
  level: number;
  xp: number;
  nextXp: number;
  levelTitle: string;
  nextLevelTitle: string;
  progress: number;
}

export const XPBar: React.FC<Props> = ({ level, xp, nextXp, levelTitle, nextLevelTitle, progress }) => {
  const { theme, isDark } = useTheme();
  const widthVal = useSharedValue(0);

  useEffect(() => {
    widthVal.value = withSpring(progress * 100, { damping: 15, stiffness: 90 });
  }, [progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(4, Math.min(100, widthVal.value))}%`,
  }));

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.levelGroup}>
          <Text style={[styles.levelNum, { color: theme.primaryText }]}>Level {level}</Text>
          <Text style={[styles.levelTitleText, { color: theme.secondaryText }]}>{levelTitle}</Text>
        </View>
        
        <View style={styles.xpGroup}>
          <Text style={[styles.xpCount, { color: theme.accent }]}>
            {xp} <Text style={[styles.nextXp, { color: theme.secondaryText }]}>/ {nextXp === Infinity ? 'MAX' : nextXp} XP</Text>
          </Text>
        </View>
      </View>

      {/* Animated Gradient Progress Bar */}
      <View style={[styles.barContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <Animated.View style={[styles.barFill, fillStyle]}>
          <LinearGradient
            colors={[DesignTokens.colors.gradientStart, DesignTokens.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>

      {/* Next Level Indicator */}
      <View style={styles.bottomRow}>
        <Text style={[styles.nextLevelLabel, { color: theme.secondaryText }]}>Next Rank:</Text>
        <Text style={[styles.nextTitleText, { color: theme.secondaryText }]}>
          {nextXp === Infinity ? 'Max Level' : `${nextLevelTitle} (Lvl ${level + 1})`}
        </Text>
      </View>
      
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: DesignTokens.borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    ...DesignTokens.shadows.soft,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelGroup: {
    flexDirection: 'column',
  },
  levelNum: {
    fontSize: 16,
    fontFamily: DesignTokens.fonts.bold,
  },
  levelTitleText: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.medium,
    marginTop: 1,
  },
  xpGroup: {
    alignItems: 'flex-end',
  },
  xpCount: {
    fontSize: 14,
    fontFamily: DesignTokens.fonts.bold,
  },
  nextXp: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.medium,
  },
  barContainer: {
    height: 8,
    borderRadius: DesignTokens.borderRadius.round,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: DesignTokens.borderRadius.round,
    overflow: 'hidden',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextLevelLabel: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.regular,
  },
  nextTitleText: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.medium,
  },
});
