import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useLeaderboard, RankedEntry } from '@/hooks/connect/useLeaderboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { hapticSelection } from '@/lib/haptics';
import { resolveAvatarUrl } from '@/lib/avatarUtils';

interface LeaderboardScreenProps {
  onSwitchToFriendsTab?: () => void;
}

type AudienceFilter = 'global' | 'friends';
type PeriodFilter = 'weekly' | 'alltime';

export default function LeaderboardScreen({ onSwitchToFriendsTab }: LeaderboardScreenProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { isGuest, session } = useAuthStore();
  const currentUserId = session?.user?.id;

  const [audience, setAudience] = useState<AudienceFilter>('global');
  const [period, setPeriod] = useState<PeriodFilter>('weekly');
  const [refreshing, setRefreshing] = useState(false);

  // Map to useLeaderboard arguments:
  // view: 'connections' if audience === 'friends', else 'global'
  // period: 'weekly' or 'alltime'
  const { entries, myEntry, loading, refresh } = useLeaderboard(
    audience === 'friends' ? 'connections' : 'global',
    period,
    'total'
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [audience, period, refresh])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleAudienceChange = (val: AudienceFilter) => {
    hapticSelection();
    setAudience(val);
  };

  const handlePeriodChange = (val: PeriodFilter) => {
    hapticSelection();
    setPeriod(val);
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Medals for top 3
  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return theme.secondaryText;
  };

  const formatRank = (rank: number) => {
    return rank < 10 ? `0${rank}` : `${rank}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.accent}
          colors={[theme.accent]}
        />
      }
    >
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <Text style={styles.editorialTitle}>Measure momentum.</Text>
      <Text style={styles.editorialSubtitle}>
        Compare focus, consistency, and progress with friends and the global community.
      </Text>

      {/* ── Filters Section (Clearly separated) ────────────────────────────── */}
      <View style={styles.filtersBlock}>
        {/* Audience Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>AUDIENCE</Text>
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              onPress={() => handleAudienceChange('global')}
              style={[
                styles.segmentBtn,
                audience === 'global' ? styles.segmentBtnActive : styles.segmentBtnInactive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: audience === 'global' }}
            >
              <Text
                style={[
                  styles.segmentText,
                  audience === 'global' ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
              >
                Global
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAudienceChange('friends')}
              style={[
                styles.segmentBtn,
                audience === 'friends' ? styles.segmentBtnActive : styles.segmentBtnInactive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: audience === 'friends' }}
            >
              <Text
                style={[
                  styles.segmentText,
                  audience === 'friends' ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeframe Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>TIMEFRAME</Text>
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              onPress={() => handlePeriodChange('weekly')}
              style={[
                styles.segmentBtn,
                period === 'weekly' ? styles.segmentBtnActive : styles.segmentBtnInactive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: period === 'weekly' }}
            >
              <Text
                style={[
                  styles.segmentText,
                  period === 'weekly' ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
              >
                Weekly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handlePeriodChange('alltime')}
              style={[
                styles.segmentBtn,
                period === 'alltime' ? styles.segmentBtnActive : styles.segmentBtnInactive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: period === 'alltime' }}
            >
              <Text
                style={[
                  styles.segmentText,
                  period === 'alltime' ? styles.segmentTextActive : styles.segmentTextInactive,
                ]}
              >
                All-time
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Your Standing Banner (if signed in) ────────────────────────────── */}
      {myEntry && !isGuest && (
        <View style={styles.myStandingCard}>
          <View style={styles.myStandingLeft}>
            <Text style={styles.myStandingRank}>#{myEntry.rank}</Text>
            <View>
              <Text style={styles.myStandingName}>Your Standing</Text>
              <Text style={styles.myStandingSub}>
                Level {myEntry.level} · {myEntry.levelTitle || 'Learner'}
              </Text>
            </View>
          </View>
          <View style={styles.myStandingScoreCol}>
            <Text style={styles.myStandingScore}>{myEntry.displayScore.toLocaleString()}</Text>
            <Text style={styles.myStandingScoreLabel}>XP</Text>
          </View>
        </View>
      )}

      {/* ── List Content / States ─────────────────────────────────────────── */}
      {loading && entries.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={styles.loadingText}>Loading standings...</Text>
        </View>
      ) : entries.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyStateBox}>
          {audience === 'friends' ? (
            <>
              <Text style={styles.emptyTitle}>Your circle is quiet.</Text>
              <Text style={styles.emptySub}>
                Connect with friends to see how your momentum and consistency compare week to week.
              </Text>
              {onSwitchToFriendsTab && (
                <TouchableOpacity
                  onPress={onSwitchToFriendsTab}
                  style={styles.findFriendsLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.findFriendsLinkText}>Find friends →</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>No participants yet.</Text>
              <Text style={styles.emptySub}>
                Complete tasks and stay consistent to take the top spot on the board!
              </Text>
            </>
          )}
        </View>
      ) : (
        /* Populated Ranking Rows */
        <View style={styles.rankingList}>
          {entries.map((entry) => {
            const isMe = entry.isCurrentUser || entry.user_id === currentUserId;
            const rankColor = getRankColor(entry.rank);

            return (
              <TouchableOpacity
                key={entry.user_id}
                onPress={() => {
                  if (entry.user_id && entry.user_id !== 'guest') {
                    router.push({
                      pathname: '/(tabs)/connect/user-profile',
                      params: { userId: entry.user_id },
                    } as any);
                  }
                }}
                style={[styles.rankingRow, isMe && styles.rankingRowSelf]}
                activeOpacity={0.7}
              >
                {/* Rank Numeral */}
                <Text style={[styles.rankNumeral, { color: rankColor }]}>
                  {formatRank(entry.rank)}
                </Text>

                {/* Avatar circle */}
                <View style={styles.avatarCircle}>
                  {resolveAvatarUrl(entry.avatar_url) ? (
                    <Image source={{ uri: resolveAvatarUrl(entry.avatar_url)! }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {(entry.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                {/* Identity info */}
                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.usernameText} numberOfLines={1}>
                      {entry.username}
                    </Text>
                    {isMe && <Text style={styles.youTag}>(You)</Text>}
                  </View>
                  <Text style={styles.levelSubtitle} numberOfLines={1}>
                    Level {entry.level} · {entry.levelTitle || 'Learner'}
                  </Text>
                </View>

                {/* Score */}
                <View style={styles.scoreCol}>
                  <Text style={styles.scoreNumber}>
                    {entry.displayScore.toLocaleString()}
                  </Text>
                  <Text style={styles.scoreUnit}>XP</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 150, // Generous spacing above bottom tab bar
    },

    // Editorial Heading matching visual direction
    editorialTitle: {
      fontSize: 34,
      fontFamily: 'Inter_800ExtraBold',
      color: theme.primaryText,
      letterSpacing: -0.8,
      lineHeight: 40,
      marginBottom: 6,
    },
    editorialSubtitle: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 22,
      marginBottom: 24,
    },

    // Filters Block
    filtersBlock: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 24,
    },
    filterGroup: {
      flex: 1,
    },
    filterLabel: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
      marginBottom: 8,
    },
    segmentedRow: {
      flexDirection: 'row',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      padding: 3,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
    },
    segmentBtnActive: {
      backgroundColor: theme.accent,
    },
    segmentBtnInactive: {
      backgroundColor: 'transparent',
    },
    segmentText: {
      fontSize: 13,
      letterSpacing: -0.2,
    },
    segmentTextActive: {
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
    },
    segmentTextInactive: {
      color: theme.primaryText,
      fontFamily: 'Inter_500Medium',
    },

    // Standing Card
    myStandingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
      marginBottom: 20,
    },
    myStandingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    myStandingRank: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    myStandingName: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    myStandingSub: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    myStandingScoreCol: {
      alignItems: 'flex-end',
    },
    myStandingScore: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    myStandingScoreLabel: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },

    // Loading & Empty States
    loadingBox: {
      paddingVertical: 48,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    emptyStateBox: {
      paddingVertical: 32,
      paddingHorizontal: 4,
    },
    emptyTitle: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.6,
      marginBottom: 8,
    },
    emptySub: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 22,
      marginBottom: 20,
    },
    findFriendsLink: {
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    findFriendsLinkText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    // Ranking list
    rankingList: {
      width: '100%',
    },
    rankingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    rankingRowSelf: {
      backgroundColor: isDark ? 'rgba(0,102,255,0.06)' : 'rgba(0,102,255,0.03)',
      marginHorizontal: -8,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    rankNumeral: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      width: 38,
      fontVariant: ['tabular-nums'],
      flexShrink: 0,
    },
    avatarCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.cardSolid,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      overflow: 'hidden',
      flexShrink: 0,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
      borderRadius: 19,
    },
    avatarText: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    infoCol: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 3,
    },
    usernameText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
    },
    youTag: {
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    levelSubtitle: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    scoreCol: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    scoreNumber: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      fontVariant: ['tabular-nums'],
    },
    scoreUnit: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
  });
}
