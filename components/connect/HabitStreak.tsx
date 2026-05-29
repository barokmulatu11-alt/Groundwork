import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { DesignTokens } from '@/constants/designTokens';
import * as Icons from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface Props {
  currentStreak: number;
  longestStreak: number;
  weeklyActivity?: boolean[]; // 7 boolean indicators
}

export const HabitStreak: React.FC<Props> = ({
  currentStreak,
  longestStreak,
  weeklyActivity = [false, false, false, false, false, false, false],
}) => {
  const { theme, isDark } = useTheme();

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  const [modalVisible, setModalVisible] = useState(false);

  // Consistency Label Calculator
  const getConsistencyDetails = () => {
    if (currentStreak >= 15) {
      return {
        label: 'Master Consistency',
        color: DesignTokens.colors.master,
        desc: 'You have attained absolute mastery over your routines! Keep it up.',
      };
    } else if (currentStreak >= 7) {
      return {
        label: 'Elite Consistency',
        color: DesignTokens.colors.elite,
        desc: 'Top-tier dedication. You are studying like a champion.',
      };
    } else if (currentStreak >= 3) {
      return {
        label: 'Strong Consistency',
        color: DesignTokens.colors.strong,
        desc: 'A solid foundation built. Keep pushing to elite ranks.',
      };
    } else {
      return {
        label: 'Beginner Consistency',
        color: DesignTokens.colors.beginner,
        desc: 'Just starting your consistency path. Check-in daily!',
      };
    }
  };

  const { label, color: labelColor, desc } = getConsistencyDetails();

  const handleTooltipPress = () => {
    setModalVisible(true);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icons.Zap size={18} color="#FF9500" strokeWidth={2.5} />
          <Text style={[styles.title, { color: theme.primaryText }]}>Streak & Habits</Text>
        </View>
        <TouchableOpacity
          onPress={handleTooltipPress}
          style={[styles.tooltipBtn, { backgroundColor: labelColor + '15', borderColor: labelColor + '30' }]}
        >
          <Text style={[styles.tooltipText, { color: labelColor }]}>{label}</Text>
          <Icons.Info size={12} color={labelColor} />
        </TouchableOpacity>
      </View>

      {/* Grid containing Streak Numbers & Details */}
      <View style={styles.contentRow}>
        <View style={styles.streakCountBox}>
          <Text style={[styles.streakNumber, { color: theme.primaryText }]}>{currentStreak}</Text>
          <Text style={[styles.streakSub, { color: theme.secondaryText }]}>Current Streak</Text>
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.streakCountBox}>
          <Text style={[styles.streakNumber, { color: theme.primaryText }]}>{longestStreak}</Text>
          <Text style={[styles.streakSub, { color: theme.secondaryText }]}>Best Streak</Text>
        </View>
      </View>

      {/* Weekly Activity Grid */}
      <View style={[styles.weeklyGridCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)', borderColor: cardBorder }]}>
        <Text style={[styles.weeklyTitle, { color: theme.secondaryText }]}>WEEKLY CONSISTENCY LOG</Text>
        <View style={styles.dotsRow}>
          {daysOfWeek.map((day, idx) => {
            const completed = weeklyActivity[idx] || false;
            return (
              <View key={day} style={styles.dotContainer}>
                <View
                  style={[
                    styles.activityDot,
                    {
                      backgroundColor: completed
                        ? '#34C759'
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                    completed && { shadowColor: '#34C759', shadowOpacity: 0.3, shadowRadius: 3 },
                  ]}
                />
                <Text style={[styles.dotLabel, { color: theme.secondaryText }]}>{day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Premium Consistency Detail Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setModalVisible(false)}
        >
          <BlurView 
            intensity={isDark ? 30 : 60} 
            tint={isDark ? 'dark' : 'light'} 
            style={StyleSheet.absoluteFill} 
          />
          <Pressable 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: labelColor + '40',
                shadowColor: labelColor,
              }
            ]}
            onPress={() => {}} // prevent overlay close on inner press
          >
            {/* Header Icon with Glow */}
            <View style={[styles.modalIconOuter, { backgroundColor: labelColor + '15', borderColor: labelColor + '30' }]}>
              <Icons.Zap size={32} color={labelColor} strokeWidth={2.5} />
            </View>

            {/* Badge Title */}
            <View style={[styles.modalBadge, { backgroundColor: labelColor }]}>
              <Text style={styles.modalBadgeText}>{label}</Text>
            </View>

            {/* Description */}
            <Text style={[styles.modalDesc, { color: theme.secondaryText }]}>
              {desc}
            </Text>

            {/* Streak Stats Side-by-Side Cards */}
            <View style={styles.modalStatsRow}>
              <View style={[styles.modalStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.cardBorder }]}>
                <Icons.Flame size={20} color="#FF9500" />
                <Text style={[styles.modalStatVal, { color: theme.primaryText }]}>{currentStreak}</Text>
                <Text style={[styles.modalStatSub, { color: theme.secondaryText }]}>Current Streak</Text>
              </View>
              <View style={[styles.modalStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: theme.cardBorder }]}>
                <Icons.Trophy size={20} color="#FFD700" />
                <Text style={[styles.modalStatVal, { color: theme.primaryText }]}>{longestStreak}</Text>
                <Text style={[styles.modalStatSub, { color: theme.secondaryText }]}>Best Streak</Text>
              </View>
            </View>

            {/* Info Message */}
            <View style={styles.modalFooterInfo}>
              <Icons.Award size={14} color={theme.accent} />
              <Text style={[styles.modalFooterInfoText, { color: theme.secondaryText }]}>
                Check-in daily to grow your streak tier!
              </Text>
            </View>

            {/* Action button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: labelColor }]}
            >
              <Text style={styles.modalCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: DesignTokens.fonts.bold,
  },
  tooltipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tooltipText: {
    fontSize: 9,
    fontFamily: DesignTokens.fonts.bold,
    textTransform: 'uppercase',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  streakCountBox: {
    alignItems: 'center',
    flex: 1,
  },
  streakNumber: {
    fontSize: 34,
    fontFamily: DesignTokens.fonts.bold,
  },
  streakSub: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    opacity: 0.7,
  },
  verticalDivider: {
    width: 1,
    height: 40,
  },
  weeklyGridCard: {
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    padding: 12,
  },
  weeklyTitle: {
    fontSize: 9,
    fontFamily: DesignTokens.fonts.bold,
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
    opacity: 0.7,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dotContainer: {
    alignItems: 'center',
    gap: 6,
  },
  activityDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotLabel: {
    fontSize: 9,
    fontFamily: DesignTokens.fonts.medium,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: DesignTokens.fonts.medium,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  modalStatVal: {
    fontSize: 20,
    fontFamily: DesignTokens.fonts.bold,
    marginTop: 2,
  },
  modalStatSub: {
    fontSize: 8,
    fontFamily: DesignTokens.fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  modalFooterInfoText: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.medium,
  },
  modalCloseBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  modalCloseBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: DesignTokens.fonts.bold,
  },
});
