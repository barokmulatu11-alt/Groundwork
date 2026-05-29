import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_WIDTH = (SCREEN_WIDTH - 32 - 32) / 5;
import { useTheme } from '@/lib/ThemeContext';
import { useProfile } from '@/hooks/connect/useProfile';
import { useFriends } from '@/hooks/connect/useFriends';
import { ProfileHeader } from '@/components/connect/ProfileHeader';
import { StatChip } from '@/components/connect/StatChip';
import { SocialLinksSection } from '@/components/connect/SocialLinksSection';
import { AchievementCard } from '@/components/connect/AchievementCard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { db } from '@/lib/db';

export default function UserProfileScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuthStore();
  const currentUserId = session?.user?.id;

  const { profile, levelTitle, socialLinks, stats, connectionState, followersCount, unlockedAchievements, loading, refresh } = useProfile(userId);
  const {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useFriends();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const getActiveRequestId = () => {
    if (!userId || !currentUserId) return undefined;
    const row = db.getFirstSync<{ id: string }>(
      'SELECT id FROM connect_friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = "pending"',
      [userId, currentUserId, currentUserId, userId]
    );
    return row?.id;
  };

  const handleSendRequest = async () => {
    if (userId) {
      const res = await sendFriendRequest(userId);
      if (res) refresh();
    }
  };

  const handleAcceptRequest = async () => {
    const reqId = getActiveRequestId();
    if (reqId) {
      const res = await acceptFriendRequest(reqId);
      if (res) refresh();
    }
  };

  const handleDeclineRequest = async () => {
    const reqId = getActiveRequestId();
    if (reqId) {
      const res = await declineFriendRequest(reqId);
      if (res) refresh();
    }
  };

  const handleCancelRequest = async () => {
    const reqId = getActiveRequestId();
    if (reqId) {
      showAlert({
        title: "Cancel Request",
        message: `Cancel friend request to @${profile?.username || 'user'}?`,
        primaryButton: {
          text: "Cancel Request",
          destructive: true,
          onPress: async () => {
            await cancelFriendRequest(reqId);
            refresh();
          }
        },
        secondaryButton: {
          text: "Back",
          onPress: () => {}
        }
      });
    }
  };

  const handleRemoveFriend = async () => {
    if (userId) {
      showAlert({
        title: "Remove Friend",
        message: `Are you sure you want to remove @${profile?.username || 'user'} from your friends list?`,
        primaryButton: {
          text: "Remove Friend",
          destructive: true,
          onPress: async () => {
            await removeFriend(userId);
            refresh();
          }
        },
        secondaryButton: {
          text: "Cancel",
          onPress: () => {}
        }
      });
    }
  };

  const handleBlockUser = async () => {
    if (userId) {
      showAlert({
        title: "Block User",
        message: `Are you sure you want to block @${profile?.username || 'user'}? They will not be able to find or add you in the Connect tab.`,
        primaryButton: {
          text: "Block User",
          destructive: true,
          onPress: async () => {
            await blockUser(userId);
            router.back();
          }
        },
        secondaryButton: {
          text: "Cancel",
          onPress: () => {}
        }
      });
    }
  };

  const handleUnblockUser = async () => {
    if (userId) {
      const res = await unblockUser(userId);
      if (res) refresh();
    }
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)';

  if (loading && !profile) {
    return (
      <BackgroundGradient>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </SafeAreaView>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: theme.primaryText }]}>← Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <ProfileHeader
            profile={profile}
            levelTitle={levelTitle}
            isOwnProfile={false}
            connectionState={connectionState}
            followersCount={followersCount}
            onSendRequest={handleSendRequest}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onCancelRequest={handleCancelRequest}
            onRemoveFriend={handleRemoveFriend}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
          />

          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <StatChip label="Total XP" value={profile?.xp || 0} />
              <StatChip label="Tasks Done" value={stats?.totalTasksCompleted || 0} />
            </View>
            <View style={styles.statsRow}>
              <StatChip label="Best Streak" value={stats?.longestStreak || 0} />
              <StatChip label="Focus Hours" value={Math.round((stats?.totalFocusMinutes || 0) / 60)} />
            </View>
          </View>

          <SocialLinksSection
            links={socialLinks}
            editable={false}
            emptyMessage={`No social links added by ${profile?.username || 'this user'}.`}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Achievements</Text>
            {unlockedAchievements.length > 0 ? (
              <View style={styles.showcaseGrid}>
                {unlockedAchievements.map(ach => {
                  const IconComponent = (Icons as any)[ach.icon] || Icons.Award;
                  return (
                    <TouchableOpacity
                      key={ach.key}
                      activeOpacity={0.7}
                      onPress={() => {
                        showAlert({
                          title: ach.name,
                          message: `${ach.description}\n\nReward: +${ach.xpReward} XP`,
                          primaryButton: {
                            text: 'Awesome',
                            onPress: () => {},
                          },
                        });
                      }}
                      style={styles.showcaseBadgeContainer}
                    >
                      <View style={[styles.showcaseBadgeCircle, { backgroundColor: ach.color + '15', borderColor: ach.color + '40' }]}>
                        <IconComponent size={18} color={ach.color} strokeWidth={2} />
                      </View>
                      <Text style={[styles.showcaseBadgeLabel, { color: theme.primaryText }]} numberOfLines={1}>
                        {ach.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                  No achievements unlocked yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  statsContainer: {
    gap: 8,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'System',
    fontWeight: '800',
    marginBottom: 12,
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  showcaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  showcaseBadgeContainer: {
    alignItems: 'center',
    width: BADGE_WIDTH,
    marginBottom: 12,
  },
  showcaseBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  showcaseBadgeLabel: {
    fontSize: 9,
    fontFamily: 'System',
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '500',
    textAlign: 'center',
  },
});
