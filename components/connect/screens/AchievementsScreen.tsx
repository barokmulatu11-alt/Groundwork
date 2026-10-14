import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { ArrowLeft, ArrowRight, Check, Lock, X } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { subscribeToConnectEvents } from '@/lib/connect/xpSystem';
import { useTheme } from '@/lib/ThemeContext';
import { useAchievements, AchievementItem } from '@/hooks/connect/useAchievements';
import { useFocusEffect } from '@react-navigation/native';
import { hapticLight, hapticSelection } from '@/lib/haptics';

// ─── 3 Active Milestone Categories matching latest reference image ───────────
interface CategoryDef {
  index: string;
  key: string;
  label: string;
  subtitle: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    index: '01',
    key: 'productivity',
    label: 'Productivity',
    subtitle: 'Complete tasks and make steady progress.',
  },
  {
    index: '02',
    key: 'consistency',
    label: 'Consistency',
    subtitle: 'Show up regularly and build your rhythm.',
  },
  {
    index: '03',
    key: 'community',
    label: 'Community',
    subtitle: 'Connect with others and grow together.',
  },
];

// ─── Detail Dialog ────────────────────────────────────────────────────────────
function AchievementDetailModal({
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

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

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
              backgroundColor: isDark ? '#000000' : '#FFFFFF',
              borderColor: theme.separator,
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.modalCloseBtn, { borderColor: theme.separator }]}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={theme.secondaryText} />
          </TouchableOpacity>

          {/* Status icon badge */}
          <View
            style={[
              styles.modalStatusBadge,
              {
                backgroundColor: item.unlocked ? theme.accent + '1A' : theme.separator,
              },
            ]}
          >
            {item.unlocked ? (
              <Check size={28} color={theme.accent} strokeWidth={2.6} />
            ) : (
              <Lock size={26} color={theme.secondaryText} strokeWidth={2.2} />
            )}
          </View>

          {/* XP Reward Pill */}
          <View style={[styles.modalXpPill, { backgroundColor: theme.accent + '15' }]}>
            <Text style={[styles.modalXpText, { color: theme.accent }]}>
              +{item.xpReward} XP REWARD
            </Text>
          </View>

          {/* Title and Description */}
          <Text style={[styles.modalTitle, { color: theme.primaryText }]}>
            {item.name}
          </Text>
          <Text style={[styles.modalDescription, { color: theme.secondaryText }]}>
            {item.description}
          </Text>

          {/* Requirements & Progress box */}
          <View
            style={[
              styles.modalMetaBox,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: theme.separator,
              },
            ]}
          >
            <View style={styles.modalMetaRow}>
              <Text style={[styles.modalMetaLabel, { color: theme.secondaryText }]}>Status</Text>
              <Text
                style={[
                  styles.modalMetaValue,
                  { color: item.unlocked ? theme.accent : theme.secondaryText },
                ]}
              >
                {item.unlocked ? 'Unlocked' : 'In Progress'}
              </Text>
            </View>

            <View style={styles.modalMetaRow}>
              <Text style={[styles.modalMetaLabel, { color: theme.secondaryText }]}>Requirement</Text>
              <Text style={[styles.modalMetaValue, { color: theme.primaryText, flex: 1, textAlign: 'right', marginLeft: 12 }]}>
                {item.description}
              </Text>
            </View>

            {item.unlocked && readableDate && (
              <View style={styles.modalMetaRow}>
                <Text style={[styles.modalMetaLabel, { color: theme.secondaryText }]}>
                  Earned on
                </Text>
                <Text style={[styles.modalMetaValue, { color: theme.primaryText }]}>
                  {readableDate}
                </Text>
              </View>
            )}

            <View style={styles.modalMetaRow}>
              <Text style={[styles.modalMetaLabel, { color: theme.secondaryText }]}>
                Progress
              </Text>
              <Text style={[styles.modalMetaValue, { color: theme.primaryText }]}>
                {item.progress}%
              </Text>
            </View>

            <View style={[styles.modalProgressBarTrack, { backgroundColor: theme.separator }]}>
              <View
                style={[
                  styles.modalProgressBarFill,
                  {
                    width: `${Math.min(100, Math.max(item.progress, item.unlocked ? 100 : 0))}%`,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
            </View>
          </View>

          {/* Done button */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[styles.modalDoneBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.modalDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen Component ────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const { theme, isDark } = useTheme();
  const { items: rawItems, refresh } = useAchievements();

  // Filter out any legacy notes/study/subject achievements and map social -> community
  const items = React.useMemo(() => {
    return rawItems
      .filter((i) => {
        const cat = (i.category || '').toLowerCase();
        if (cat === 'notes' || cat === 'study' || cat === 'pro') return false;
        if (i.key.includes('note') || i.key.includes('revision')) {
          return false;
        }
        return cat === 'productivity' || cat === 'consistency' || cat === 'social' || cat === 'community';
      })
      .map((i) => ({
        ...i,
        category: (i.category === 'social' ? 'community' : i.category).toLowerCase(),
      }));
  }, [rawItems]);

  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [])
  );

  useEffect(() => {
    const unsub = subscribeToConnectEvents((event) => {
      if (event.type === 'ACHIEVEMENT_UNLOCKED') {
        refresh();
      }
    });
    return unsub;
  }, []);

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Selected Category
  const activeCategory = CATEGORIES.find((c) => c.key === activeCategoryKey);
  const activeCategoryItems = items.filter((i) => i.category === activeCategoryKey);
  const activeCategoryUnlocked = activeCategoryItems.filter((i) => i.unlocked).length;

  return (
    <View style={styles.root}>
      {activeCategoryKey && activeCategory ? (
        /* ── CATEGORY DETAIL VIEW ─────────────────────────────────────────── */
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.categoryDetailContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back link */}
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setActiveCategoryKey(null);
            }}
            style={styles.backLinkRow}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={theme.accent} strokeWidth={2.2} />
            <Text style={styles.backLinkText}>All categories</Text>
          </TouchableOpacity>

          {/* Category Header */}
          <View style={styles.catHeaderBlock}>
            <View style={styles.catHeaderIndexRow}>
              <Text style={styles.catHeaderIndex}>{activeCategory.index}</Text>
              <Text style={styles.catHeaderIndexLabel}>MILESTONE CATEGORY</Text>
            </View>
            <Text style={styles.catHeaderTitle}>{activeCategory.label}</Text>
            <Text style={styles.catHeaderSubtitle}>{activeCategory.subtitle}</Text>

            {/* Category unlock summary & progress */}
            <View style={styles.catProgressSummaryRow}>
              <Text style={styles.catProgressText}>
                {activeCategoryUnlocked} of {activeCategoryItems.length} unlocked
              </Text>
              <Text style={styles.catProgressPercent}>
                {activeCategoryItems.length > 0
                  ? Math.round((activeCategoryUnlocked / activeCategoryItems.length) * 100)
                  : 0}
                %
              </Text>
            </View>
            <View style={styles.catProgressBarTrack}>
              <View
                style={[
                  styles.catProgressBarFill,
                  {
                    width: `${
                      activeCategoryItems.length > 0
                        ? (activeCategoryUnlocked / activeCategoryItems.length) * 100
                        : 0
                    }%`,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
            </View>
          </View>

          {/* Achievement List */}
          <View style={styles.achievementItemsList}>
            {activeCategoryItems.map((item) => {
              const isUnlocked = item.unlocked;
              const dateEarned = item.unlockedAt
                ? new Date(item.unlockedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : null;

              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => {
                    hapticSelection();
                    setSelectedAchievement(item);
                  }}
                  style={styles.achievementRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.achLeftCol}>
                    <View style={styles.achTitleRow}>
                      <Text style={styles.achName}>{item.name}</Text>
                      <View style={styles.achXpBadge}>
                        <Text style={styles.achXpText}>+{item.xpReward} XP</Text>
                      </View>
                    </View>

                    <Text style={styles.achDesc}>{item.description}</Text>

                    {/* Progress indicator */}
                    <View style={styles.achProgressRow}>
                      <View style={styles.achMiniTrack}>
                        <View
                          style={[
                            styles.achMiniFill,
                            {
                              width: `${isUnlocked ? 100 : Math.min(100, item.progress)}%`,
                              backgroundColor: isUnlocked ? theme.accent : theme.secondaryText,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.achStatusText}>
                        {isUnlocked
                          ? `Earned ${dateEarned || 'Completed'}`
                          : `${item.progress}%`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.achRightCol}>
                    {isUnlocked ? (
                      <View style={styles.achCheckBadge}>
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    ) : (
                      <View style={styles.achLockBadge}>
                        <Lock size={14} color={theme.secondaryText} strokeWidth={2.2} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        /* ── CATEGORIES HOME VIEW ─────────────────────────────────────────── */
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.homeContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Editorial Heading */}
          <Text style={styles.editorialTitle}>Small steps count.</Text>
          <Text style={styles.editorialSubtitle}>
            Explore the milestones you can earn.
          </Text>

          {/* Category List matching latest spacious mockup */}
          <View style={styles.categoryList}>
            {CATEGORIES.map((cat, idx) => {
              return (
                <View key={cat.key}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticSelection();
                      setActiveCategoryKey(cat.key);
                    }}
                    style={styles.categoryItemRow}
                    activeOpacity={0.7}
                  >
                    {/* Index numeral: 01, 02, 03 */}
                    <Text style={styles.categoryIndexNumeral}>{cat.index}</Text>

                    {/* Title & subtitle */}
                    <View style={styles.categoryTextCol}>
                      <Text style={styles.categoryTitle}>{cat.label}</Text>
                      <Text style={styles.categorySubtitle}>{cat.subtitle}</Text>
                    </View>

                    {/* Blue Arrow */}
                    <ArrowRight size={22} color={theme.accent} strokeWidth={2} />
                  </TouchableOpacity>

                  {/* Thin divider line */}
                  <View style={styles.categoryDivider} />
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Achievement Detail Dialog */}
      <AchievementDetailModal
        item={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Styles matching design tokens & latest reference ─────────────────────────
function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    homeContentContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 150, // Generous spacing above bottom tab bar (avoids cramped final row)
    },
    categoryDetailContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 150,
    },

    // Heading matching mockup
    editorialTitle: {
      fontSize: 38,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.8,
      lineHeight: 44,
      marginBottom: 6,
    },
    editorialSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 32,
    },

    // Category List
    categoryList: {
      width: '100%',
    },
    categoryItemRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 22,
    },
    categoryIndexNumeral: {
      fontSize: 22,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.accent,
      width: 44,
      paddingTop: 2,
    },
    categoryTextCol: {
      flex: 1,
      paddingRight: 16,
    },
    categoryTitle: {
      fontSize: 24,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    categorySubtitle: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 20,
    },
    categoryDivider: {
      height: 1,
      backgroundColor: theme.separator,
    },

    // Category Detail View
    backLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      marginBottom: 16,
    },
    backLinkText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
    catHeaderBlock: {
      marginBottom: 28,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.separator,
    },
    catHeaderIndexRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 6,
    },
    catHeaderIndex: {
      fontSize: 20,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.accent,
    },
    catHeaderIndexLabel: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
    },
    catHeaderTitle: {
      fontSize: 34,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.6,
      marginBottom: 6,
    },
    catHeaderSubtitle: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 18,
    },
    catProgressSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    catProgressText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    catProgressPercent: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    catProgressBarTrack: {
      height: 3,
      backgroundColor: theme.separator,
      borderRadius: 1.5,
      overflow: 'hidden',
    },
    catProgressBarFill: {
      height: '100%',
      borderRadius: 1.5,
    },

    // Achievement Rows
    achievementItemsList: {
      width: '100%',
    },
    achievementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    achLeftCol: {
      flex: 1,
      paddingRight: 16,
    },
    achTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 4,
    },
    achName: {
      fontSize: 17,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.2,
    },
    achXpBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: theme.accentLight,
    },
    achXpText: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    achDesc: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 18,
      marginBottom: 10,
    },
    achProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    achMiniTrack: {
      flex: 1,
      maxWidth: 120,
      height: 3,
      backgroundColor: theme.separator,
      borderRadius: 1.5,
      overflow: 'hidden',
    },
    achMiniFill: {
      height: '100%',
      borderRadius: 1.5,
    },
    achStatusText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    achRightCol: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    achCheckBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    achLockBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 24,
      borderWidth: 1,
      padding: 28,
      position: 'relative',
      alignItems: 'center',
    },
    modalCloseBtn: {
      position: 'absolute',
      top: 18,
      right: 18,
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalStatusBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    modalXpPill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      marginBottom: 12,
    },
    modalXpText: {
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.5,
    },
    modalTitle: {
      fontSize: 24,
      fontFamily: 'PlayfairDisplay_700Bold',
      textAlign: 'center',
      letterSpacing: -0.4,
      marginBottom: 8,
    },
    modalDescription: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    modalMetaBox: {
      width: '100%',
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 24,
      gap: 10,
    },
    modalMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalMetaLabel: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
    },
    modalMetaValue: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
    },
    modalProgressBarTrack: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 4,
    },
    modalProgressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    modalDoneBtn: {
      width: '100%',
      height: 48,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalDoneBtnText: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
  });
}
