import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { subscribeToConnectEvents } from '@/lib/connect/xpSystem';
import { useTheme } from '@/lib/ThemeContext';
import { useAchievements, AchievementItem } from '@/hooks/connect/useAchievements';
import { AchievementCard } from '@/components/connect/AchievementCard';
import * as Icons from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

// ─── Category Definitions ────────────────────────────────────────────────────
const CATEGORIES: {
  key: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Icons;
  color: string;
}[] = [
  {
    key: 'all',
    label: 'All Achievements',
    subtitle: 'Every milestone across all categories',
    icon: 'LayoutGrid',
    color: '#007AFF',
  },
  {
    key: 'notes',
    label: 'Notes Core',
    subtitle: 'Note creation, space organization, and rich capture',
    icon: 'PenTool',
    color: '#007AFF',
  },
  {
    key: 'study',
    label: 'Study & Revision',
    subtitle: 'Active recall sessions, revision scores, and focus hours',
    icon: 'BookOpen',
    color: '#AF52DE',
  },
  {
    key: 'productivity',
    label: 'Productivity',
    subtitle: 'Tasks, focus, and deep work milestones',
    icon: 'CheckSquare',
    color: '#34C759',
  },
  {
    key: 'consistency',
    label: 'Consistency',
    subtitle: 'Streaks, habits, and daily discipline',
    icon: 'Flame',
    color: '#FF9500',
  },
  {
    key: 'social',
    label: 'Social',
    subtitle: 'Connections, followers, and community',
    icon: 'Users',
    color: '#5AC8FA',
  },
  {
    key: 'leaderboard',
    label: 'Leaderboards',
    subtitle: 'Rankings, XP gains, and competition',
    icon: 'Trophy',
    color: '#FFCC00',
  },
  {
    key: 'profile',
    label: 'Profile',
    subtitle: 'Identity, customization, and setup',
    icon: 'UserCircle',
    color: '#AF52DE',
  },
  {
    key: 'special',
    label: 'Special',
    subtitle: 'Rare milestones and hidden secrets',
    icon: 'Sparkles',
    color: '#FF2D55',
  },
  {
    key: 'pro',
    label: 'PRO',
    subtitle: 'Exclusive premium member achievements',
    icon: 'Crown',
    color: '#FFD700',
  },
];

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  item,
  onClose,
  theme,
  isDark,
}: {
  item: AchievementItem | null;
  onClose: () => void;
  theme: any;
  isDark: boolean;
}) {
  if (!item) return null;

  const isSecretLocked = item.secret && !item.unlocked;
  const displayTitle = isSecretLocked ? 'Secret Achievement' : item.name;
  const displayDesc = isSecretLocked
    ? 'Keep exploring to unlock this hidden achievement.'
    : item.description;
  const displayIcon = isSecretLocked ? 'Lock' : item.icon;
  const DetailIcon = (Icons as any)[displayIcon] || Icons.Award;

  const readableDate = item.unlockedAt
    ? new Date(item.unlockedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Icons.X size={18} color={theme.secondaryText} />
          </TouchableOpacity>

          <View style={styles.modalIconContainer}>
            <View
              style={[
                styles.modalIconCircle,
                {
                  backgroundColor: item.unlocked
                    ? item.color + '18'
                    : 'rgba(142,142,147,0.1)',
                },
              ]}
            >
              <DetailIcon
                size={40}
                color={item.unlocked ? item.color : '#8E8E93'}
                strokeWidth={2.2}
              />
            </View>
            {item.unlocked ? (
              <View style={[styles.lockStatusBadge, { backgroundColor: '#34C759' }]}>
                <Icons.Check size={11} color="#FFF" strokeWidth={3.5} />
              </View>
            ) : (
              <View style={[styles.lockStatusBadge, { backgroundColor: '#8E8E93' }]}>
                <Icons.Lock size={11} color="#FFF" strokeWidth={3} />
              </View>
            )}
          </View>

          <View
            style={[
              styles.modalXpBadge,
              {
                backgroundColor: item.unlocked
                  ? item.color + '15'
                  : 'rgba(142,142,147,0.1)',
              },
            ]}
          >
            <Text style={[styles.modalXpText, { color: item.unlocked ? item.color : '#8E8E93' }]}>
              {item.unlocked ? `+${item.xpReward} XP REWARD` : `${item.xpReward} XP TARGET`}
            </Text>
          </View>

          <Text style={[styles.modalName, { color: theme.primaryText }]}>{displayTitle}</Text>

          <View
            style={[
              styles.modalCategoryBadge,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
          >
            <Text style={[styles.modalCategoryText, { color: theme.secondaryText }]}>
              {item.category.toUpperCase()} CATEGORY
            </Text>
          </View>

          <Text style={[styles.modalDesc, { color: theme.secondaryText }]}>{displayDesc}</Text>

          <View
            style={[
              styles.statusBox,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
            ]}
          >
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: theme.tertiaryText }]}>Status</Text>
              <Text
                style={[styles.statusValue, { color: item.unlocked ? '#34C759' : theme.secondaryText }]}
              >
                {item.unlocked ? 'Unlocked' : 'Locked'}
              </Text>
            </View>
            {item.unlocked && readableDate && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: theme.tertiaryText }]}>Completed On</Text>
                <Text style={[styles.statusValue, { color: theme.primaryText }]}>{readableDate}</Text>
              </View>
            )}
            {!isSecretLocked && (
              <View style={{ marginTop: 4, gap: 6 }}>
                <View style={styles.statusRow}>
                  <Text style={[styles.statusLabel, { color: theme.tertiaryText }]}>Progress</Text>
                  <Text
                    style={[styles.progressValueText, { color: item.unlocked ? item.color : '#8E8E93' }]}
                  >
                    {item.progress}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.modalProgressBar,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                  ]}
                >
                  <View
                    style={[
                      styles.modalProgressFill,
                      {
                        width: `${item.progress}%`,
                        backgroundColor: item.unlocked ? item.color : '#8E8E93',
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[styles.modalDoneBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.modalDoneText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const { theme, isDark } = useTheme();
  const { items, unlockedCount, totalCount, refresh } = useAchievements();

  // null = category home; string = active category key
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  // Refresh on tab focus
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [])
  );

  // Auto-refresh when any achievement is unlocked so cards un-grey instantly
  useEffect(() => {
    const unsub = subscribeToConnectEvents((event) => {
      if (event.type === 'ACHIEVEMENT_UNLOCKED') {
        refresh();
      }
    });
    return unsub;
  }, []);

  const totalProgress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  // ── Category Home ────────────────────────────────────────────────────────
  const renderCategoryHome = () => (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.homeContent}
      nestedScrollEnabled={true}
    >
      {/* Overall Progress Bar */}
      <View
        style={[
          styles.progressCard,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        <View style={styles.progressRow}>
          <View>
            <Text style={[styles.progressTitle, { color: theme.primaryText }]}>
              Overall Progress
            </Text>
            <Text style={[styles.progressSub, { color: theme.secondaryText }]}>
              {unlockedCount} of {totalCount} unlocked
            </Text>
          </View>
          <View style={[styles.progressBadge, { backgroundColor: theme.accent + '20' }]}>
            <Text style={[styles.progressBadgeText, { color: theme.accent }]}>
              {Math.round(totalProgress)}%
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.trackBar,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
          ]}
        >
          <View
            style={[styles.trackBarFill, { width: `${totalProgress}%`, backgroundColor: theme.accent }]}
          />
        </View>
      </View>

      {/* Heading */}
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>CATEGORIES</Text>

      {/* Category List */}
      {CATEGORIES.map(cat => {
        const catItems = cat.key === 'all' ? items : items.filter(i => i.category === cat.key);
        const catUnlocked = catItems.filter(i => i.unlocked).length;
        const catTotal = catItems.length;
        const catPct = catTotal > 0 ? Math.round((catUnlocked / catTotal) * 100) : 0;
        const CatIcon = (Icons as any)[cat.icon] || Icons.Award;

        return (
          <TouchableOpacity
            key={cat.key}
            activeOpacity={0.8}
            onPress={() => setActiveCategory(cat.key)}
            style={[
              styles.categoryRow,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              },
            ]}
          >
            {/* Icon */}
            <View style={[styles.catIconBox, { backgroundColor: cat.color + '15' }]}>
              <CatIcon size={22} color={cat.color} strokeWidth={2.2} />
            </View>

            {/* Info */}
            <View style={styles.catInfo}>
              <View style={styles.catNameRow}>
                <Text style={[styles.catLabel, { color: theme.primaryText }]}>{cat.label}</Text>
                {cat.key === 'pro' && (
                  <View style={[styles.proBadge, { backgroundColor: '#FFD700' + '20' }]}>
                    <Icons.Crown size={10} color="#FFD700" strokeWidth={2.5} />
                    <Text style={styles.proBadgeText}>EXCLUSIVE</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.catSubtitle, { color: theme.secondaryText }]}>
                {cat.subtitle}
              </Text>

              {/* Mini progress bar */}
              <View style={styles.catProgressRow}>
                <View
                  style={[
                    styles.catProgressBar,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                  ]}
                >
                  <View
                    style={[
                      styles.catProgressFill,
                      { width: `${catPct}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
                <Text style={[styles.catProgressText, { color: theme.tertiaryText }]}>
                  {catUnlocked}/{catTotal}
                </Text>
              </View>
            </View>

            {/* Arrow */}
            <Icons.ChevronRight size={18} color={theme.tertiaryText} strokeWidth={2} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── Achievement List View ─────────────────────────────────────────────────
  const renderAchievementList = () => {
    const cat = CATEGORIES.find(c => c.key === activeCategory)!;
    const filteredItems =
      activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);
    const catUnlocked = filteredItems.filter(i => i.unlocked).length;
    const CatIcon = (Icons as any)[cat.icon] || Icons.Award;

    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={[
            styles.listHeader,
            {
              borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveCategory(null)}
            activeOpacity={0.7}
            style={styles.backBtn}
          >
            <Icons.ChevronLeft size={22} color={theme.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={[styles.listHeaderIcon, { backgroundColor: cat.color + '15' }]}>
            <CatIcon size={18} color={cat.color} strokeWidth={2.2} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.listHeaderTitle, { color: theme.primaryText }]}>{cat.label}</Text>
            <Text style={[styles.listHeaderSub, { color: theme.secondaryText }]}>
              {catUnlocked} of {filteredItems.length} unlocked
            </Text>
          </View>
        </View>

        {/* Achievement cards */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.achievementListContent}
          nestedScrollEnabled={true}
        >
          {filteredItems.map(item => (
            <AchievementCard
              key={item.key}
              item={item}
              onPress={() => setSelectedAchievement(item)}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {activeCategory === null ? renderCategoryHome() : renderAchievementList()}

      <DetailModal
        item={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Home ──
  homeContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    gap: 12,
  },
  progressCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  progressSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
  },
  trackBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  catIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catInfo: {
    flex: 1,
    gap: 3,
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catLabel: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter_800ExtraBold',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  catSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  catProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  catProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  catProgressText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    minWidth: 28,
    textAlign: 'right',
  },

  // ── Achievement List ──
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  listHeaderSub: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  achievementListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 80,
    gap: 10,
  },

  // ── Detail Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalIconContainer: {
    position: 'relative',
    marginBottom: 12,
    marginTop: 8,
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalXpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalXpText: {
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  modalName: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 12,
  },
  modalCategoryText: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  modalDesc: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  statusBox: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  statusValue: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  progressValueText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
  modalProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  modalDoneBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
