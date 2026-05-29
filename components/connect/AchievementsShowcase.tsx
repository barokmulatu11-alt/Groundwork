import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { DesignTokens } from '@/constants/designTokens';
import { ACHIEVEMENTS, AchievementConfig } from '@/lib/connect/achievementEngine';
import * as Icons from 'lucide-react-native';

interface Props {
  unlockedKeys: Set<string>;
  onViewAllPress: () => void;
}

export const AchievementsShowcase: React.FC<Props> = ({ unlockedKeys, onViewAllPress }) => {
  const { theme, isDark, showAlert } = useTheme();

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  // We showcase up to 8 select achievements
  const showcaseList = ACHIEVEMENTS.slice(0, 8);

  const handlePress = (ach: AchievementConfig, isUnlocked: boolean) => {
    showAlert({
      title: ach.name,
      message: `${ach.description}\n\nStatus: ${isUnlocked ? 'Completed' : 'Locked'}\nReward: +${ach.xpReward} XP`,
      primaryButton: {
        text: 'Great',
        onPress: () => {},
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.primaryText }]}>Achievements</Text>
        <TouchableOpacity onPress={onViewAllPress} activeOpacity={0.7}>
          <Text style={[styles.viewAll, { color: theme.accent }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {showcaseList.map((ach) => {
          const isUnlocked = unlockedKeys.has(ach.key);
          const isRare = ach.xpReward >= 40;
          const IconComponent = (Icons as any)[ach.icon] || Icons.Award;
          const activeColor = isUnlocked ? ach.color : '#8E8E93';

          return (
            <TouchableOpacity
              key={ach.key}
              style={[
                styles.achCard,
                { borderColor: cardBorder },
                isUnlocked && isRare && [styles.rareBorder, { borderColor: '#FFD700' }],
              ]}
              onPress={() => handlePress(ach, isUnlocked)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: isUnlocked ? ach.color + '18' : 'rgba(150, 150, 150, 0.08)' },
                  isUnlocked && isRare && { shadowColor: '#FFD700', shadowOpacity: 0.15, shadowRadius: 4 },
                ]}
              >
                <IconComponent
                  size={20}
                  color={activeColor}
                  strokeWidth={2}
                  style={!isUnlocked && { opacity: 0.4 }}
                />
              </View>
              
              <Text
                style={[
                  styles.name,
                  { color: isUnlocked ? theme.primaryText : theme.secondaryText },
                  !isUnlocked && { opacity: 0.5 },
                ]}
                numberOfLines={1}
              >
                {ach.name}
              </Text>
              
              <View style={[styles.badge, { backgroundColor: isUnlocked ? '#34C7591A' : 'rgba(150, 150, 150, 0.08)' }]}>
                <Text style={[styles.badgeText, { color: isUnlocked ? '#34C759' : theme.secondaryText }]}>
                  {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: DesignTokens.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...DesignTokens.shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: DesignTokens.fonts.bold,
  },
  viewAll: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.semiBold,
  },
  scrollContent: {
    gap: 10,
    paddingRight: 10,
  },
  achCard: {
    width: 100,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rareBorder: {
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.bold,
    textAlign: 'center',
    marginBottom: 6,
    width: '100%',
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 7,
    fontFamily: DesignTokens.fonts.bold,
    letterSpacing: 0.2,
  },
});
