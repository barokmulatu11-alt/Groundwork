import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useLeaderboard, RankedEntry, LeaderboardView } from '@/hooks/connect/useLeaderboard';
import * as Icons from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';
import { DesignTokens } from '@/constants/designTokens';
import { resolveAvatarUrl } from '@/lib/avatarUtils';

interface Props {
  onSwitchToFriendsTab?: () => void;
  setParentScrollEnabled?: (enabled: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Academic Medal colors ───────────────────────────────────────────────────
const MEDAL: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

// Subject list helper
const CORE_SUBJECTS = ['General', 'Mathematics', 'Physics', 'Chemistry', 'Programming'];

export default function LeaderboardScreen({ onSwitchToFriendsTab, setParentScrollEnabled }: Props) {
  const { theme, isDark } = useTheme();
  const { isGuest, session } = useAuthStore();

  const [activeTab, setActiveTab] = useState<LeaderboardView>('weekly');
  const [selectedSubject, setSelectedSubject] = useState<string>('General');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(CORE_SUBJECTS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch hook
  const { entries, topThree, rest, myEntry, loading, hasMore, countdown, refresh, loadMore } = useLeaderboard(
    activeTab,
    activeTab === 'global' ? 'alltime' : 'weekly',
    'total',
    activeTab === 'subjects' ? selectedSubject : undefined
  );

  // Discover subject folders dynamically from the user's database notes
  const userId = session?.user?.id;

  useEffect(() => {
    setParentScrollEnabled?.(activeTab !== 'subjects');
  }, [activeTab, setParentScrollEnabled]);

  const discoverSubjects = useCallback(() => {
    if (!userId) return;
    try {
      const rows = db.getAllSync<{ folder: string }>(
        "SELECT DISTINCT folder FROM notes WHERE user_id = ? AND folder IS NOT NULL AND folder != '' AND deleted_at IS NULL",
        [userId]
      );
      const discovered = rows.map(r => r.folder);
      const combined = Array.from(new Set([...CORE_SUBJECTS, ...discovered]));
      setAvailableSubjects(combined);
    } catch (_) {}
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      discoverSubjects();
      refresh();
    }, [activeTab, selectedSubject, refresh, discoverSubjects])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    discoverSubjects();
    refresh();
    setIsRefreshing(false);
  };

  // Color mapping helper for subject tiles
  const getSubjectConfig = (folder: string) => {
    const norm = folder.toLowerCase();
    if (norm.includes('math')) return { Icon: Icons.Binary, color: '#00C7C7', gradient: ['#00C7C7', '#009688'] as [string, string] };
    if (norm.includes('phys')) return { Icon: Icons.Atom, color: '#FF5E36', gradient: ['#FF5E36', '#FF2A6D'] as [string, string] };
    if (norm.includes('chem')) return { Icon: Icons.FlaskConical, color: '#34C759', gradient: ['#34C759', '#30B0C7'] as [string, string] };
    if (norm.includes('prog') || norm.includes('code')) return { Icon: Icons.Code, color: '#007AFF', gradient: ['#007AFF', '#5856D6'] as [string, string] };
    return { Icon: Icons.BookOpen, color: '#8B5CF6', gradient: ['#8B5CF6', '#D646B8'] as [string, string] };
  };

  // Sub-Tab Navigation Bar
  const renderNavTabs = () => {
    const tabs: { key: LeaderboardView; label: string; Icon: any }[] = [
      { key: 'weekly', label: 'Weekly', Icon: Icons.Calendar },
      { key: 'global', label: 'Global', Icon: Icons.Globe },
      { key: 'subjects', label: 'Subjects', Icon: Icons.BookOpen },
      { key: 'connections', label: 'Connections', Icon: Icons.Users },
    ];

    return (
      <View style={[styles.navTabsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: theme.cardBorder }]}>
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.8}
              onPress={() => setActiveTab(t.key)}
              style={[
                styles.navTabBtn,
                isActive && {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                  borderColor: theme.cardBorder,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 1.5,
                }
              ]}
            >
              <t.Icon
                size={14}
                color={isActive ? theme.accent : theme.secondaryText}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.navTabText,
                  {
                    color: isActive ? theme.primaryText : theme.secondaryText,
                    fontFamily: isActive ? 'Inter_700Bold' : 'Inter_500Medium'
                  }
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // 1. "Your Performance" Focus Panel
  const renderFocusPanel = () => {
    if (!myEntry || isGuest) return null;

    const movementColor =
      myEntry.rank_movement === 'up' ? '#34C759'
      : myEntry.rank_movement === 'down' ? '#FF3B30'
      : theme.secondaryText;

    const MovementIcon =
      myEntry.rank_movement === 'up' ? Icons.TrendingUp
      : myEntry.rank_movement === 'down' ? Icons.TrendingDown
      : Icons.Minus;

    const progressValue = activeTab === 'weekly'
      ? Math.min(1, myEntry.total_score / 600)
      : Math.min(1, myEntry.total_score / 2000);

    const motivationMsg =
      myEntry.rank <= 3 ? 'You are among the top academic leaders!'
      : myEntry.rank_movement === 'up' ? 'Superb progress! Keep scaling up the consistency!'
      : 'Consistency breeds mastery. Finish another review today!';

    return (
      <View style={[styles.focusCard, { backgroundColor: isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight, borderColor: theme.cardBorder }]}>
        <View style={styles.focusHeader}>
          <View>
            <Text style={[styles.focusSub, { color: theme.secondaryText }]}>YOUR PERFORMANCE</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={[styles.focusRank, { color: theme.primaryText }]}>Rank #{myEntry.rank === 0 ? '—' : myEntry.rank}</Text>
              <View style={[styles.movementBadge, { backgroundColor: movementColor + '20' }]}>
                <MovementIcon size={12} color={movementColor} strokeWidth={3} />
                <Text style={[styles.movementText, { color: movementColor }]}>
                  {myEntry.rank_movement === 'same' ? '=' : myEntry.rank_movement === 'up' ? '+1' : '-1'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreBadge}>
            <Text style={styles.scoreVal}>{myEntry.displayScore.toLocaleString()}</Text>
            <Text style={styles.scoreLabel}>Study Score</Text>
          </View>
        </View>

        {/* Progress bar towards milestone */}
        <View style={styles.progressContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>Weekly Academic Consistency</Text>
            <Text style={[styles.progressPct, { color: theme.accent }]}>{Math.round(progressValue * 100)}%</Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <LinearGradient
              colors={['#007AFF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressValue * 100}%` }]}
            />
          </View>
        </View>

        {/* Weekly specific details: display active days checklist dots */}
        {activeTab === 'weekly' && myEntry.weekly_details && (
          <View style={styles.weeklyDetailsRow}>
            <View style={styles.statMiniCard}>
              <Icons.Clock size={12} color={theme.accent} />
              <Text style={[styles.statMiniVal, { color: theme.primaryText }]}>{myEntry.weekly_details.studyHours}h</Text>
              <Text style={[styles.statMiniSub, { color: theme.secondaryText }]}>Study</Text>
            </View>
            <View style={styles.statMiniCard}>
              <Icons.FileText size={12} color="#34C759" />
              <Text style={[styles.statMiniVal, { color: theme.primaryText }]}>{myEntry.weekly_details.notesCreated}</Text>
              <Text style={[styles.statMiniSub, { color: theme.secondaryText }]}>Notes</Text>
            </View>
            <View style={styles.statMiniCard}>
              <Icons.BookOpen size={12} color="#FF9500" />
              <Text style={[styles.statMiniVal, { color: theme.primaryText }]}>{myEntry.weekly_details.revisionsCount}</Text>
              <Text style={[styles.statMiniSub, { color: theme.secondaryText }]}>Revisions</Text>
            </View>
            <View style={styles.statMiniCard}>
              <Icons.Calendar size={12} color="#FF5E36" />
              <Text style={[styles.statMiniVal, { color: theme.primaryText }]}>{myEntry.weekly_details.activeDays}/7</Text>
              <Text style={[styles.statMiniSub, { color: theme.secondaryText }]}>Days Active</Text>
            </View>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />

        {/* Countdown + positive reminder */}
        <View style={styles.focusFooter}>
          <Icons.Award size={14} color={theme.accent} style={{ marginTop: 1 }} />
          <Text style={[styles.motivationTextText, { color: theme.secondaryText }]}>{motivationMsg}</Text>
        </View>
      </View>
    );
  };

  // 2. High-Fidelity Global Top 3 Podium
  const renderPodium = () => {
    if (entries.length < 1) return null;
    const [second, first, third] = [entries[1], entries[0], entries[2]];

    const PodiumSlot = ({ entry, rank }: { entry: RankedEntry | undefined; rank: number }) => {
      if (!entry) return <View style={{ flex: 1 }} />;
      const medalColor = MEDAL[rank] || '#8E8E93';
      const slotHeight = rank === 1 ? 115 : rank === 2 ? 95 : 80;

      return (
        <View style={styles.podiumCol}>
          {/* Avatar glow wrapper */}
          <View style={[styles.podiumAvatarOuter, { borderColor: medalColor }]}>
            <View style={[styles.podiumAvatarInner, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              {resolveAvatarUrl(entry.avatar_url) ? (
                <Image source={{ uri: resolveAvatarUrl(entry.avatar_url)! }} style={styles.podiumAvatarImg} />
              ) : (
                <Text style={[styles.podiumInitial, { color: medalColor }]}>
                  {(entry.username || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={[styles.podiumBadge, { backgroundColor: medalColor }]}>
              <Text style={styles.podiumBadgeText}>{rank}</Text>
            </View>
          </View>

          <Text style={[styles.podiumName, { color: theme.primaryText }]} numberOfLines={1}>
            {entry.isCurrentUser ? 'You' : entry.username}
          </Text>
          <Text style={[styles.podiumScore, { color: medalColor }]}>
            {entry.displayScore.toLocaleString()}
          </Text>
          <Text style={[styles.podiumSub, { color: theme.tertiaryText }]}>{entry.academic_tier}</Text>

          {/* Solid 3D Base */}
          <LinearGradient
            colors={[medalColor + '18', medalColor + '08']}
            style={[styles.podiumBasePlate, { height: slotHeight, borderColor: medalColor + '40' }]}
          >
            <Text style={[styles.podiumBaseRankText, { color: medalColor }]}>#{rank}</Text>
          </LinearGradient>
        </View>
      );
    };

    return (
      <View style={styles.podiumRow}>
        <PodiumSlot entry={second} rank={2} />
        <PodiumSlot entry={first} rank={1} />
        <PodiumSlot entry={third} rank={3} />
      </View>
    );
  };

  // 3. Subject filtering sub-header list
  const renderSubjectFilter = () => {
    if (activeTab !== 'subjects') return null;

    return (
      <FlatList
        horizontal
        data={availableSubjects}
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subjectFilterScroll}
        nestedScrollEnabled
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: sub }) => {
          const isSel = selectedSubject === sub;
          const conf = getSubjectConfig(sub);
          const iconColor = isSel ? '#FFF' : conf.color;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedSubject(sub)}
              style={[
                styles.subjectChip,
                {
                  backgroundColor: isSel ? conf.color : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  borderColor: isSel ? conf.color : theme.cardBorder,
                },
              ]}
            >
              <conf.Icon size={12} color={iconColor} strokeWidth={2.5} />
              <Text style={[styles.subjectChipText, { color: isSel ? '#FFF' : theme.primaryText, fontFamily: isSel ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {sub}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  // 4. Single list item renderer (Leaderboard Row)
  const renderRowItem = ({ item }: { item: RankedEntry }) => {
    const isMe = item.isCurrentUser;
    const medalColor = MEDAL[item.rank];

    const isTopThree = item.rank <= 3 && activeTab !== 'subjects';

    // Rank Movement Styling
    const movColor =
      item.rank_movement === 'up' ? '#34C759'
      : item.rank_movement === 'down' ? '#FF3B30'
      : theme.secondaryText;

    const MovIcon =
      item.rank_movement === 'up' ? Icons.ChevronUp
      : item.rank_movement === 'down' ? Icons.ChevronDown
      : Icons.Minus;

    // Do not show full podium items in Global list rows, only from rank 4+ (since podium shows rank 1-3)
    if (activeTab === 'global' && item.rank <= 3) return null;

    return (
      <View
        style={[
          styles.rowCard,
          {
            backgroundColor: isMe
              ? isDark ? 'rgba(0,122,255,0.09)' : 'rgba(0,122,255,0.05)'
              : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.65)',
            borderColor: isMe
              ? '#007AFF66'
              : theme.cardBorder,
          },
          isTopThree && styles.glowBorder
        ]}
      >
        {/* Rank Number */}
        <View style={styles.rankCol}>
          <Text style={[styles.rankNumText, { color: medalColor ?? theme.primaryText }]}>
            {item.rank}
          </Text>
          <View style={styles.movIndicator}>
            <MovIcon size={10} color={movColor} strokeWidth={2.5} />
          </View>
        </View>

        {/* Custom Avatar Circle */}
        <View style={[styles.avatarCircle, { borderColor: medalColor ?? theme.cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.avatarInitial, { color: medalColor ?? theme.secondaryText }]}>
            {(item.username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* User Stats detail */}
        <View style={styles.infoCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.nameText, { color: theme.primaryText }]} numberOfLines={1}>
              {isMe ? 'You' : item.username}
            </Text>
            {item.institution && (
              <Text style={[styles.instBadge, { color: theme.tertiaryText }]} numberOfLines={1}>
                {item.institution}
              </Text>
            )}
          </View>
          <Text style={[styles.subText, { color: theme.secondaryText }]}>
            {item.academic_tier} · Lv.{item.level}
            {item.streak_count > 0 ? ` · ${item.streak_count}d streak` : ''}
          </Text>
        </View>

        {/* Score column */}
        <View style={styles.scoreCol}>
          <Text style={[styles.scoreText, { color: theme.primaryText }]}>
            {item.displayScore.toLocaleString()}
          </Text>
          <Text style={[styles.scoreSubLabel, { color: theme.tertiaryText }]}>pts</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    const isConn = activeTab === 'connections';
    return (
      <View style={[styles.emptyBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: theme.cardBorder }]}>
        <Icons.Trophy size={42} color={theme.tertiaryText} strokeWidth={1.5} />
        <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
          {isConn ? 'No peers tracked yet' : 'Academic Board is Empty'}
        </Text>
        <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
          {isConn
            ? 'Follow peers or study partners to compare weekly composite study progress'
            : 'Study focus minutes, note-taking and revision logs will appear here'}
        </Text>
        {isConn && onSwitchToFriendsTab && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accent }]} onPress={onSwitchToFriendsTab}>
            <Icons.Users size={14} color="#FFF" />
            <Text style={styles.actionBtnText}>Discover Peer Connections</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Header content rendered inside FlatList
  const renderListHeader = () => (
    <View style={{ gap: 12 }}>
      {/* 4-Tab Navigation */}
      {renderNavTabs()}

      {/* Subject scroll selector */}
      {renderSubjectFilter()}

      {/* Countdown Timer (Weekly Tab specific) */}
      {activeTab === 'weekly' && (
        <View style={[styles.timerBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: theme.cardBorder }]}>
          <Icons.Clock size={13} color={theme.secondaryText} />
          <Text style={[styles.timerText, { color: theme.secondaryText }]}>
            Cycle resets in: <Text style={{ fontFamily: 'Inter_700Bold', color: theme.accent }}>{countdown.days}d {countdown.hours}h {countdown.minutes}m</Text>
          </Text>
        </View>
      )}

      {/* Personal Focus Panel */}
      {renderFocusPanel()}

      {/* Connections Privacy disclaimer */}
      {activeTab === 'connections' && (
        <View style={[styles.privacyBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: theme.cardBorder }]}>
          <Icons.ShieldAlert size={14} color={theme.secondaryText} />
          <Text style={[styles.privacyTextText, { color: theme.secondaryText }]}>
            Privacy-First Mode: Rankings display ONLY connections who opted-in. Adjust your visibility inside settings.
          </Text>
        </View>
      )}

      {/* Global podium visual layout */}
      {activeTab === 'global' && entries.length > 0 && renderPodium()}

      {/* Title separator */}
      {entries.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 }}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
            {activeTab === 'global' ? 'TOP 100 ACHIEVERS' : activeTab === 'subjects' ? `${selectedSubject} RANKINGS` : 'ACADEMIC PARTICIPANTS'}
          </Text>
          <Text style={[styles.sectionSub, { color: theme.tertiaryText }]}>
            {activeTab === 'weekly' ? 'Composite Scores' : 'Study Scores'}
          </Text>
        </View>
      )}

      {/* Empty State trigger */}
      {!loading && entries.length === 0 && renderEmptyState()}

      {/* Loading Skeleton */}
      {loading && entries.length === 0 && (
        <View style={{ gap: 10, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.skeletonCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderColor: theme.cardBorder }]} />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={item => `${item.user_id}_${item.rank}`}
        renderItem={renderRowItem}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          hasMore && loading && entries.length > 0 ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 16 }} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      />
    </View>
  );
}

// ─── Visual Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 },

  // Nav tabs
  navTabsContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    justifyContent: 'space-between',
  },
  navTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navTabText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  // Countdown timer bar
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  timerText: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  // Focus panel card (Your Performance)
  focusCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.5,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  focusSub: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  focusRank: { fontSize: 18, fontFamily: 'Inter_800ExtraBold' },
  movementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  movementText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  scoreBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreVal: { color: '#FFF', fontSize: 15, fontFamily: 'Inter_800ExtraBold' },
  scoreLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 8, fontFamily: 'Inter_600SemiBold', marginTop: 1 },

  // Progress Bar
  progressContainer: { marginTop: 2 },
  progressLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  progressPct: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },

  // Stat mini columns
  weeklyDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  statMiniCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(128,128,128,0.05)',
    borderRadius: 12,
    gap: 2,
  },
  statMiniVal: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  statMiniSub: { fontSize: 8, fontFamily: 'Inter_500Medium' },

  divider: { height: 1, width: '100%' },

  // Motivation banner
  focusFooter: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    paddingRight: 6,
  },
  motivationTextText: { fontSize: 10, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 14 },

  // Top 3 Podium Visuals
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 8,
    gap: 12,
  },
  podiumCol: { flex: 1, alignItems: 'center' },
  podiumAvatarOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  podiumAvatarInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  podiumAvatarImg: { width: '100%', height: '100%' },
  podiumInitial: { fontSize: 22, fontFamily: 'Inter_800ExtraBold' },
  podiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Inter_800ExtraBold' },
  podiumName: { fontSize: 12, fontFamily: 'Inter_700Bold', textAlign: 'center', marginHorizontal: 2 },
  podiumScore: { fontSize: 13, fontFamily: 'Inter_800ExtraBold', marginTop: 1 },
  podiumSub: { fontSize: 8, fontFamily: 'Inter_500Medium', marginTop: 1 },
  podiumBasePlate: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    marginTop: 8,
  },
  podiumBaseRankText: { fontSize: 18, fontFamily: 'Inter_800ExtraBold' },

  // Subject filtering
  subjectFilterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  subjectChipText: { fontSize: 11 },

  // Connection privacy box
  privacyBox: {
    flexDirection: 'row',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  privacyTextText: { fontSize: 10, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 14 },

  // Section header titles
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  sectionSub: { fontSize: 10, fontFamily: 'Inter_500Medium' },

  // Ranked cards
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 12,
  },
  glowBorder: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankCol: { width: 22, alignItems: 'center', justifyContent: 'center' },
  rankNumText: { fontSize: 14, fontFamily: 'Inter_800ExtraBold' },
  movIndicator: { marginTop: 1 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 17, fontFamily: 'Inter_800ExtraBold' },
  infoCol: { flex: 1 },
  nameText: { fontSize: 14, fontFamily: 'Inter_700Bold', maxWidth: SCREEN_WIDTH * 0.4 },
  instBadge: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    backgroundColor: 'rgba(128,128,128,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subText: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
  scoreCol: { alignItems: 'flex-end', justifyContent: 'center' },
  scoreText: { fontSize: 15, fontFamily: 'Inter_800ExtraBold' },
  scoreSubLabel: { fontSize: 8, fontFamily: 'Inter_600SemiBold', marginTop: 1 },

  // Empty Box
  emptyBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 6 },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  actionBtnText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_700Bold' },

  // Loading Skeleton row
  skeletonCard: { height: 68, borderRadius: 18, borderWidth: 1 },
});
