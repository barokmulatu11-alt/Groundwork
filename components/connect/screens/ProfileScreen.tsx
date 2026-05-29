import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Image, Linking } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useProfile } from '@/hooks/connect/useProfile';
import { useXP } from '@/hooks/connect/useXP';
import { useFriends } from '@/hooks/connect/useFriends';
import { useProfileStats } from '@/hooks/connect/useProfileStats';
import { useTimeline } from '@/hooks/connect/useTimeline';
import { usePrivacySettings } from '@/hooks/connect/usePrivacySettings';
import { useIdentityTitle } from '@/hooks/connect/useIdentityTitle';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter, useFocusEffect } from 'expo-router';

// Custom Components
import { ProfileHeader } from '@/components/connect/ProfileHeader';
import { XPBar } from '@/components/connect/XPBar';
import { StatCard } from '@/components/connect/StatCard';
import { AchievementsShowcase } from '@/components/connect/AchievementsShowcase';
import { HabitStreak } from '@/components/connect/HabitStreak';
import { NotesPortfolio } from '@/components/connect/NotesPortfolio';
import { ActivityTimeline } from '@/components/connect/ActivityTimeline';
import { ConnectionsSection } from '@/components/connect/ConnectionsSection';
import { SocialLinksSection } from '@/components/connect/SocialLinksSection';
import { DesignTokens } from '@/constants/designTokens';
import { getWeeklyHabitActivity } from '@/lib/GreetingUtils';
import { ACHIEVEMENTS } from '@/lib/connect/achievementEngine';

// Icons
import * as Icons from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'overview' | 'activity' | 'achievements' | 'notes' | 'stats' | 'connections';

interface ProfileScreenProps {
  onSwitchToFriendsTab?: () => void;
  setParentScrollEnabled?: (enabled: boolean) => void;
}

export default function ProfileScreen({ onSwitchToFriendsTab, setParentScrollEnabled }: ProfileScreenProps = {}) {
  const { theme, isDark, showAlert } = useTheme();
  const router = useRouter();
  const { profile: authProfile } = useAuthStore();
  
  // Custom Hooks & Stores
  const { notes, habits, loadNotes } = useStore();
  const {
    profile,
    levelTitle,
    refresh: refreshProfile,
    followersCount,
    followingCount,
    unlockedAchievements,
    socialLinks,
    addSocialLink,
    deleteSocialLink,
  } = useProfile();
  const { xp, level, nextLevelTitle, nextLevelXp, progress, refresh: refreshXP } = useXP();
  const { incomingRequests, acceptFriendRequest, declineFriendRequest, refresh: refreshFriends } = useFriends();
  const { stats: computedStats, refresh: refreshStats } = useProfileStats();
  const { events: timelineEvents, loading: timelineLoading, hasMore: timelineHasMore, loadMore: loadMoreTimeline, refresh: refreshTimeline } = useTimeline();
  const { privacyLevel, updatePrivacyLevel, refresh: refreshPrivacy } = usePrivacySettings();
  const { title: identityTitle, refresh: refreshIdentity } = useIdentityTitle();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Sync data on tab focus
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      refreshXP();
      refreshFriends();
      refreshStats();
      refreshTimeline();
      refreshPrivacy();
      refreshIdentity();
      loadNotes();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshProfile(),
      refreshXP(),
      refreshFriends(),
      refreshStats(),
      refreshTimeline(),
      refreshPrivacy(),
      refreshIdentity(),
      loadNotes()
    ]);
    setRefreshing(false);
  };

  const handleNotePress = (noteId: string) => {
    router.push(`/notes/${noteId}`);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const success = await acceptFriendRequest(requestId);
    if (success) {
      onRefresh();
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    const success = await declineFriendRequest(requestId);
    if (success) {
      onRefresh();
    }
  };

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  // Unlocked achievement keys set
  const unlockedKeys = new Set(unlockedAchievements.map(a => a.key));

  // Determine status classification dynamically
  const getStatusLabel = () => {
    if (computedStats.totalStudyHours > 0) {
      return 'Active Learner';
    } else if (computedStats.currentStreak >= 3) {
      return 'Consistent Student';
    } else {
      return 'Active Learner';
    }
  };

  // Sub-Tab Rendering helpers
  const renderOverview = () => {
    // Determine last 7 days check-ins. If database has habit_checkins, we can map them.
    // For visual excellence, we fallback to a mockup streak weekly activity array if empty.
    const weeklyActivity = getWeeklyHabitActivity(habits);

    return (
      <View style={styles.tabContent}>
        {/* Core Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard label="Total Notes" value={computedStats.totalNotes} icon="FileText" color={theme.accent} />
            <StatCard label="Tasks Done" value={computedStats.totalTasksCompleted} icon="CheckCircle" color="#34C759" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Study Hours" value={computedStats.totalStudyHours} icon="Clock" color="#8B5CF6" />
            <StatCard label="Subjects" value={computedStats.activeSubjectsCount} icon="FolderOpen" color="#FF9500" />
          </View>
        </View>

        {/* Habit & Streak Tracker */}
        <HabitStreak
          currentStreak={computedStats.currentStreak}
          longestStreak={computedStats.longestStreak}
          weeklyActivity={weeklyActivity}
        />

        <SocialLinksSection
          links={socialLinks}
          editable
          onAdd={addSocialLink}
          onDelete={deleteSocialLink}
          cardBg={cardBg}
          cardBorder={cardBorder}
        />

        {/* Achievements Showcase */}
        <AchievementsShowcase
          unlockedKeys={unlockedKeys}
          onViewAllPress={() => setActiveTab('achievements')}
        />

        {/* Pinned Notes Portfolio */}
        <NotesPortfolio
          notes={notes}
          onNotePress={handleNotePress}
        />

        {/* Study Network Panel */}
        <ConnectionsSection
          followersCount={followersCount}
          followingCount={followingCount}
          privacyLevel={privacyLevel}
          onManagePress={onSwitchToFriendsTab || (() => setActiveTab('connections'))}
        />
      </View>
    );
  };

  const renderTimeline = () => {
    return (
      <View style={styles.tabContent}>
        <ActivityTimeline
          events={timelineEvents}
          loading={timelineLoading}
          hasMore={timelineHasMore}
          onLoadMore={loadMoreTimeline}
        />
      </View>
    );
  };

  const renderAchievementsList = () => {
    return (
      <View style={[styles.fullCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>All Achievements</Text>
        <Text style={[styles.cardSub, { color: theme.secondaryText, marginBottom: 16 }]}>
          Unlocked {unlockedAchievements.length} / {ACHIEVEMENTS.length}
        </Text>

        <View style={styles.achievementsGrid}>
          {ACHIEVEMENTS.map(ach => {
            const unlocked = unlockedKeys.has(ach.key);
            const IconComponent = (Icons as any)[ach.icon] || Icons.Award;
            
            return (
              <TouchableOpacity
                key={ach.key}
                style={[
                  styles.fullAchRow,
                  { borderColor: cardBorder },
                  unlocked ? { opacity: 1 } : { opacity: 0.5 }
                ]}
                onPress={() => {
                  showAlert({
                    title: ach.name,
                    message: `${ach.description}\n\nStatus: ${unlocked ? '✅ Unlocked' : '🔒 Locked'}\nReward: +${ach.xpReward} XP`,
                    primaryButton: { text: 'Awesome!', onPress: () => {} },
                  });
                }}
              >
                <View style={[styles.fullAchIcon, { backgroundColor: unlocked ? ach.color + '15' : 'rgba(150,150,150,0.1)' }]}>
                  <IconComponent size={20} color={unlocked ? ach.color : theme.secondaryText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fullAchName, { color: theme.primaryText }]}>{ach.name}</Text>
                  <Text style={[styles.fullAchDesc, { color: theme.secondaryText }]}>{ach.description}</Text>
                </View>
                {unlocked ? (
                  <Icons.CheckCircle2 size={16} color="#34C759" />
                ) : (
                  <Icons.Lock size={14} color={theme.secondaryText} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderNotesTab = () => {
    return (
      <View style={styles.tabContent}>
        <NotesPortfolio
          notes={notes}
          onNotePress={handleNotePress}
        />
      </View>
    );
  };

  const renderStatsTab = () => {
    return (
      <View style={[styles.fullCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Advanced Metrics</Text>
        <Text style={[styles.cardSub, { color: theme.secondaryText, marginBottom: 20 }]}>
          Deep dive into your study habits.
        </Text>

        <View style={styles.analyticsList}>
          <View style={[styles.analyticRow, { borderColor: cardBorder }]}>
            <Text style={[styles.analyticLabel, { color: theme.primaryText }]}>Focus Score</Text>
            <Text style={[styles.analyticValue, { color: theme.accent }]}>{computedStats.focusScore} / 100</Text>
          </View>
          <View style={[styles.analyticRow, { borderColor: cardBorder }]}>
            <Text style={[styles.analyticLabel, { color: theme.primaryText }]}>Daily Activity Score</Text>
            <Text style={[styles.analyticValue, { color: theme.primaryText }]}>{computedStats.averageDailyActivityScore}</Text>
          </View>
          <View style={[styles.analyticRow, { borderColor: cardBorder }]}>
            <Text style={[styles.analyticLabel, { color: theme.primaryText }]}>Active Recall Notes</Text>
            <Text style={[styles.analyticValue, { color: theme.primaryText }]}>{computedStats.revisionSessionsCompleted}</Text>
          </View>
          <View style={[styles.analyticRow, { borderColor: cardBorder }]}>
            <Text style={[styles.analyticLabel, { color: theme.primaryText }]}>Subjects Studied</Text>
            <Text style={[styles.analyticValue, { color: theme.primaryText }]}>{computedStats.activeSubjectsCount}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderConnectionsTab = () => {
    return (
      <View style={styles.tabContent}>
        {incomingRequests.length > 0 && (
          <View style={[styles.fullCard, { backgroundColor: cardBg, borderColor: cardBorder, marginBottom: 16 }]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText, marginBottom: 12 }]}>
              Pending Connection Requests
            </Text>
            <View style={styles.requestsList}>
              {incomingRequests.map(req => (
                <View key={req.user_id} style={[styles.requestRow, { borderColor: cardBorder }]}>
                  <View style={styles.requestLeft}>
                    {req.avatar_url ? (
                      <Image source={{ uri: req.avatar_url }} style={styles.reqAvatar} />
                    ) : (
                      <View style={[styles.reqAvatarPlaceholder, { backgroundColor: theme.accent }]}>
                        <Text style={styles.reqAvatarText}>
                          {req.username ? req.username.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={[styles.reqUsername, { color: theme.primaryText }]}>@{req.username}</Text>
                      <Text style={[styles.reqLevel, { color: theme.secondaryText }]}>Level {req.level}</Text>
                    </View>
                  </View>
                  <View style={styles.reqActions}>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineRequest(req.requestId!)}>
                      <Icons.X size={14} color={theme.secondaryText} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: '#34C759' }]} onPress={() => handleAcceptRequest(req.requestId!)}>
                      <Icons.Check size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <ConnectionsSection
          followersCount={followersCount}
          followingCount={followingCount}
          privacyLevel={privacyLevel}
          onManagePress={onSwitchToFriendsTab}
        />
      </View>
    );
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return renderTimeline();
      case 'achievements':
        return renderAchievementsList();
      case 'notes':
        return renderNotesTab();
      case 'stats':
        return renderStatsTab();
      case 'connections':
        return renderConnectionsTab();
      default:
        return renderOverview();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Identity Layer */}
      <ProfileHeader
        profile={profile}
        authProfile={authProfile}
        levelTitle={levelTitle}
        isOwnProfile={true}
        onEditPress={() => router.push('/edit-profile')}
        followersCount={followersCount}
        followingCount={followingCount}
        privacyLevel={privacyLevel}
        onPrivacyChange={updatePrivacyLevel}
        statusLabel={getStatusLabel()}
        identityTitle={identityTitle}
      />

      {/* XP System */}
      <XPBar
        level={level}
        xp={xp}
        nextXp={nextLevelXp}
        levelTitle={levelTitle}
        nextLevelTitle={nextLevelTitle}
        progress={progress}
      />

      {/* In-Page Navigation Bar */}
      <View style={[styles.tabBar, { borderBottomColor: cardBorder }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
          nestedScrollEnabled={true}
          onTouchStart={() => setParentScrollEnabled?.(false)}
          onTouchEnd={() => setParentScrollEnabled?.(true)}
          onTouchCancel={() => setParentScrollEnabled?.(true)}
        >
          {(['overview', 'activity', 'achievements', 'notes', 'stats', 'connections'] as TabType[]).map(t => {
            const isActive = activeTab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tabItem,
                  isActive && [styles.activeTabItem, { borderBottomColor: theme.accent }]
                ]}
                onPress={() => setActiveTab(t)}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    { color: isActive ? theme.accent : theme.secondaryText }
                  ]}
                >
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Contents */}
      {renderActiveTabContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  tabBar: {
    borderBottomWidth: 1.5,
    marginBottom: 16,
    width: '100%',
  },
  tabBarScroll: {
    paddingRight: 10,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2.5,
  },
  tabItemText: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.bold,
    letterSpacing: 0.5,
  },
  tabContent: {
    flexDirection: 'column',
  },
  statsGrid: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fullCard: {
    borderRadius: DesignTokens.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...DesignTokens.shadows.soft,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: DesignTokens.fonts.bold,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.regular,
  },
  achievementsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  fullAchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 10,
    gap: 12,
  },
  fullAchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullAchName: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
    marginBottom: 2,
  },
  fullAchDesc: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.medium,
  },
  analyticsList: {
    flexDirection: 'column',
    gap: 8,
  },
  analyticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  analyticLabel: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.semiBold,
  },
  analyticValue: {
    fontSize: 13,
    fontFamily: DesignTokens.fonts.bold,
  },
  requestsList: {
    gap: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 10,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reqAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reqAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqAvatarText: {
    color: 'white',
    fontSize: 14,
    fontFamily: DesignTokens.fonts.bold,
  },
  reqUsername: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
  },
  reqLevel: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.medium,
  },
  reqActions: {
    flexDirection: 'row',
    gap: 8,
  },
  declineBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
