import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useProfile } from '@/hooks/connect/useProfile';
import { useFriends } from '@/hooks/connect/useFriends';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserPlus, Check, X, Shield, Award, UserMinus } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveAvatarUrl } from '@/lib/avatarUtils';
import { db } from '@/lib/db';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

export default function UserProfileScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuthStore();
  const currentUserId = session?.user?.id;

  const {
    profile,
    levelTitle,
    stats,
    connectionState,
    followersCount,
    followingCount,
    unlockedAchievements,
    loading,
    refresh,
  } = useProfile(userId);

  const {
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useFriends();

  const [actionLoading, setActionLoading] = useState(false);

  const getActiveRequestId = () => {
    if (!userId || !currentUserId) return undefined;
    const row = db.getFirstSync<{ id: string }>(
      'SELECT id FROM connect_friend_requests WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND status = "pending"',
      [userId, currentUserId, currentUserId, userId]
    );
    return row?.id;
  };

  const handleSendRequest = async () => {
    if (!userId) return;
    setActionLoading(true);
    hapticSuccess();
    try {
      const ok = await sendFriendRequest(userId);
      if (ok) refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    const reqId = getActiveRequestId();
    if (!reqId) return;
    setActionLoading(true);
    hapticSuccess();
    try {
      const ok = await acceptFriendRequest(reqId);
      if (ok) refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    const reqId = getActiveRequestId();
    if (!reqId) return;
    setActionLoading(true);
    hapticLight();
    try {
      const ok = await declineFriendRequest(reqId);
      if (ok) refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    const reqId = getActiveRequestId();
    if (!reqId) return;
    showAlert({
      title: 'Cancel Request',
      message: `Cancel friend request to @${profile?.username || 'user'}?`,
      primaryButton: {
        text: 'Cancel Request',
        destructive: true,
        onPress: async () => {
          setActionLoading(true);
          try {
            await cancelFriendRequest(reqId);
            refresh();
          } finally {
            setActionLoading(false);
          }
        },
      },
      secondaryButton: { text: 'Back', onPress: () => {} },
    });
  };

  const handleRemoveFriend = async () => {
    if (!userId) return;
    showAlert({
      title: 'Remove Connection',
      message: `Remove @${profile?.username || 'user'} from your circle?`,
      primaryButton: {
        text: 'Remove',
        destructive: true,
        onPress: async () => {
          setActionLoading(true);
          try {
            await removeFriend(userId);
            refresh();
          } finally {
            setActionLoading(false);
          }
        },
      },
      secondaryButton: { text: 'Cancel', onPress: () => {} },
    });
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  if (loading && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="small" color={theme.accent} />
      </View>
    );
  }

  const username = profile?.username || 'user';
  const fullName = (profile as any)?.full_name || username;
  const bio = profile?.bio || 'No bio yet.';
  const avatarUrl = resolveAvatarUrl(profile?.avatar_url);
  const joinDate = profile?.joined_at
    ? new Date(profile.joined_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  const filteredAchievements = React.useMemo(() => {
    return unlockedAchievements.filter((ach) => {
      const cat = (ach.category || '').toLowerCase();
      if (cat === 'notes' || cat === 'study' || cat === 'pro') return false;
      if (
        ach.key.includes('note') ||
        ach.key.includes('revision') ||
        ach.key.includes('formula') ||
        ach.key.includes('folder') ||
        ach.key.includes('tag')
      ) {
        return false;
      }
      return true;
    });
  }, [unlockedAchievements]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top back navigation bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={theme.accent} strokeWidth={2.2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Identity Block */}
        <View style={styles.identityBlock}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitial}>{fullName.charAt(0).toUpperCase()}</Text>
              )}
            </View>

            {/* Connection action button */}
            {actionLoading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : connectionState === 'none' ? (
              <TouchableOpacity
                onPress={handleSendRequest}
                style={styles.actionBtnPrimary}
                activeOpacity={0.8}
              >
                <UserPlus size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Add Friend</Text>
              </TouchableOpacity>
            ) : connectionState === 'sent' ? (
              <TouchableOpacity
                onPress={handleCancelRequest}
                style={styles.actionBtnSecondary}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnSecondaryText}>Request Sent</Text>
              </TouchableOpacity>
            ) : connectionState === 'received' ? (
              <View style={styles.receivedActionGroup}>
                <TouchableOpacity
                  onPress={handleAcceptRequest}
                  style={styles.acceptBtn}
                  activeOpacity={0.8}
                >
                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeclineRequest}
                  style={styles.declineBtn}
                  activeOpacity={0.8}
                >
                  <X size={14} color={theme.secondaryText} />
                </TouchableOpacity>
              </View>
            ) : connectionState === 'friends' ? (
              <TouchableOpacity
                onPress={handleRemoveFriend}
                style={styles.actionBtnSecondary}
                activeOpacity={0.8}
              >
                <Check size={14} color={theme.accent} strokeWidth={2.5} />
                <Text style={styles.actionBtnSecondaryText}>Friends</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.fullName}>{fullName}</Text>
          <Text style={styles.handle}>@{username}</Text>
          <Text style={styles.bioText}>{bio}</Text>

          {joinDate && <Text style={styles.joinedText}>Member since {joinDate}</Text>}
        </View>

        {/* Real Stats Grid */}
        <View style={styles.statsCardGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{profile?.level || 1}</Text>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.statSub}>{levelTitle || 'Learner'}</Text>
          </View>

          <View style={styles.statCell}>
            <Text style={styles.statValue}>{(profile?.xp || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>TOTAL XP</Text>
            <Text style={styles.statSub}>Overall score</Text>
          </View>

          <View style={styles.statCell}>
            <Text style={styles.statValue}>{stats?.longestStreak || 0}d</Text>
            <Text style={styles.statLabel}>STREAK</Text>
            <Text style={styles.statSub}>Best run</Text>
          </View>

          <View style={styles.statCell}>
            <Text style={styles.statValue}>{followersCount || 0}</Text>
            <Text style={styles.statLabel}>CIRCLE</Text>
            <Text style={styles.statSub}>Followers</Text>
          </View>
        </View>

        {/* Achievements Showcase */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>01</Text>
          <Text style={styles.sectionTitle}>UNLOCKED MILESTONES</Text>
        </View>

        {filteredAchievements.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No milestones unlocked yet.</Text>
          </View>
        ) : (
          <View style={styles.achievementsList}>
            {filteredAchievements.map((ach) => (
              <View key={ach.key} style={styles.achRow}>
                <View style={styles.achIconCircle}>
                  <Award size={18} color={theme.accent} strokeWidth={2.2} />
                </View>
                <View style={styles.achInfoCol}>
                  <Text style={styles.achName}>{ach.name}</Text>
                  <Text style={styles.achDesc}>{ach.description}</Text>
                </View>
                <View style={styles.achXpBadge}>
                  <Text style={styles.achXpText}>+{ach.xpReward} XP</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    container: {
      flex: 1,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    backText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 60,
    },

    // Identity Block
    identityBlock: {
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.separator,
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.cardSolid,
      borderWidth: 1.5,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarInitial: {
      fontSize: 28,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
    },
    actionBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.accent,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 999,
    },
    actionBtnPrimaryText: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    actionBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.separator,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    actionBtnSecondaryText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
    },
    receivedActionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    acceptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
    },
    acceptBtnText: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    declineBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullName: {
      fontSize: 28,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    handle: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 12,
    },
    bioText: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.primaryText,
      lineHeight: 22,
      marginBottom: 10,
    },
    joinedText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },

    // Stats Grid
    statsCardGrid: {
      flexDirection: 'row',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
      paddingVertical: 14,
      marginBottom: 32,
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    statValue: {
      fontSize: 20,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.2,
      color: theme.secondaryText,
      marginBottom: 2,
    },
    statSub: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      textAlign: 'center',
    },

    // Sections
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 16,
    },
    sectionIndex: {
      fontSize: 18,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.accent,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: 'PlayfairDisplay_600SemiBold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
    },
    emptyBox: {
      paddingVertical: 16,
      paddingHorizontal: 4,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    achievementsList: {
      width: '100%',
    },
    achRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    achIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    achInfoCol: {
      flex: 1,
      paddingRight: 10,
    },
    achName: {
      fontSize: 15,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    achDesc: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    achXpBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.accentLight,
    },
    achXpText: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
  });
}
