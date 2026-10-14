import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Search, ChevronRight, Check, X, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useFriends } from '@/hooks/connect/useFriends';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

interface FriendsScreenProps {
  onNavigateLeaderboard?: () => void;
  onNavigateAchievements?: () => void;
}

export default function FriendsScreen({
  onNavigateLeaderboard,
  onNavigateAchievements,
}: FriendsScreenProps) {
  const router = useRouter();
  const { theme, isDark, showAlert } = useTheme();
  const searchInputRef = useRef<TextInput>(null);

  const {
    friends,
    incomingRequests,
    sentRequests,
    searchResults,
    searchQuery,
    setSearchQuery,
    isSearching,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
  } = useFriends();

  const [showRequestsView, setShowRequestsView] = useState(false);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);

  const isSearchActive = searchQuery.trim().length >= 2;
  const connectionsCount = friends.length;

  const handleSendRequest = async (targetUserId: string) => {
    setRequestActionLoadingId(targetUserId);
    hapticSuccess();
    try {
      const ok = await sendFriendRequest(targetUserId);
      if (ok) {
        showAlert({
          title: 'Request Sent',
          message: 'Your friend request has been sent successfully.',
          primaryButton: { text: 'Done', onPress: () => {} },
        });
      }
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    setRequestActionLoadingId(requestId);
    hapticSuccess();
    try {
      await acceptFriendRequest(requestId);
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setRequestActionLoadingId(requestId);
    hapticLight();
    try {
      await declineFriendRequest(requestId);
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    showAlert({
      title: 'Cancel Request',
      message: 'Are you sure you want to cancel this pending friend request?',
      primaryButton: {
        text: 'Cancel Request',
        destructive: true,
        onPress: async () => {
          setRequestActionLoadingId(requestId);
          try {
            await cancelFriendRequest(requestId);
          } finally {
            setRequestActionLoadingId(null);
          }
        },
      },
      secondaryButton: { text: 'Keep', onPress: () => {} },
    });
  };

  const handleRemoveFriend = (friendId: string, name: string) => {
    showAlert({
      title: 'Remove Connection',
      message: `Remove ${name} from your connections circle?`,
      primaryButton: {
        text: 'Remove',
        destructive: true,
        onPress: async () => {
          hapticLight();
          await removeFriend(friendId);
        },
      },
      secondaryButton: { text: 'Keep', onPress: () => {} },
    });
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── REQUESTS SUBVIEW ────────────────────────────────────────────────── */}
      {showRequestsView ? (
        <View style={styles.requestsViewContainer}>
          <TouchableOpacity
            onPress={() => setShowRequestsView(false)}
            style={styles.backToCircleBtn}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={theme.accent} strokeWidth={2.2} />
            <Text style={styles.backToCircleText}>Back to circle</Text>
          </TouchableOpacity>

          <Text style={styles.requestsMainTitle}>Connection Requests</Text>
          <Text style={styles.requestsMainSubtitle}>
            Manage your incoming invitations and pending sent requests.
          </Text>

          {/* Incoming */}
          <View style={styles.requestsSection}>
            <Text style={styles.requestsSectionLabel}>
              INCOMING ({incomingRequests.length})
            </Text>
            {incomingRequests.length === 0 ? (
              <Text style={styles.emptyRequestsText}>No incoming requests right now.</Text>
            ) : (
              incomingRequests.map((req) => {
                const isLoading = requestActionLoadingId === req.user_id;
                return (
                  <View key={req.user_id} style={styles.requestRow}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/connect/user-profile',
                          params: { userId: req.user_id },
                        } as any)
                      }
                      style={styles.requestAvatarCircle}
                    >
                      <Text style={styles.requestAvatarText}>
                        {(req.full_name || req.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.requestInfoCol}>
                      <Text style={styles.requestName} numberOfLines={1}>
                        {req.full_name || req.username}
                      </Text>
                      <Text style={styles.requestHandle} numberOfLines={1}>
                        @{req.username}
                      </Text>
                    </View>

                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <View style={styles.requestActionButtons}>
                        <TouchableOpacity
                          onPress={() => handleAccept(req.user_id)}
                          style={styles.acceptButton}
                          accessibilityLabel="Accept request"
                        >
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDecline(req.user_id)}
                          style={styles.declineButton}
                          accessibilityLabel="Decline request"
                        >
                          <X size={14} color={theme.secondaryText} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* Sent Requests */}
          <View style={styles.requestsSection}>
            <Text style={styles.requestsSectionLabel}>
              SENT PENDING ({sentRequests.length})
            </Text>
            {sentRequests.length === 0 ? (
              <Text style={styles.emptyRequestsText}>No pending sent requests.</Text>
            ) : (
              sentRequests.map((req) => {
                const isLoading = requestActionLoadingId === req.user_id;
                return (
                  <View key={req.user_id} style={styles.requestRow}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/connect/user-profile',
                          params: { userId: req.user_id },
                        } as any)
                      }
                      style={styles.requestAvatarCircle}
                    >
                      <Text style={styles.requestAvatarText}>
                        {(req.full_name || req.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.requestInfoCol}>
                      <Text style={styles.requestName} numberOfLines={1}>
                        {req.full_name || req.username}
                      </Text>
                      <Text style={styles.requestHandle} numberOfLines={1}>
                        @{req.username}
                      </Text>
                    </View>

                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleCancel(req.user_id)}
                        style={styles.cancelSentBtn}
                      >
                        <Text style={styles.cancelSentText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      ) : (
        /* ── CIRCLE MAIN VIEW ─────────────────────────────────────────────── */
        <>
          {/* Header Row: YOUR CIRCLE on left, Requests on right */}
          <View style={styles.circleTopRow}>
            <Text style={styles.circleLabel}>YOUR CIRCLE</Text>
            <TouchableOpacity
              onPress={() => setShowRequestsView(true)}
              style={styles.requestsActionLink}
              activeOpacity={0.7}
            >
              <Text style={styles.requestsActionText}>
                Requests{incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ''} →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Connection Count */}
          <View style={styles.connectionsCountRow}>
            <Text style={styles.connectionsNumber}>{connectionsCount}</Text>
            <Text style={styles.connectionsWord}>connections</Text>
          </View>

          {/* Accessible Search Input in rounded container */}
          <View style={styles.searchContainer}>
            <Search size={18} color={theme.secondaryText} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Find a username"
              placeholderTextColor={theme.secondaryText}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Find a username search input"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={theme.accent} style={{ marginLeft: 8 }} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={theme.secondaryText} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Live Search Results */}
          {isSearchActive && (
            <View style={styles.searchResultsBox}>
              <Text style={styles.searchResultsHeader}>
                SEARCH RESULTS ({searchResults.length})
              </Text>
              {searchResults.length === 0 && !isSearching ? (
                <Text style={styles.noResultsText}>
                  No users found matching &ldquo;{searchQuery.trim()}&rdquo;.
                </Text>
              ) : (
                searchResults.map((user) => {
                  const isFriend = friends.some((f) => f.user_id === user.user_id);
                  const isSent = sentRequests.some((r) => r.user_id === user.user_id);
                  const isActionLoading = requestActionLoadingId === user.user_id;

                  return (
                    <View key={user.user_id} style={styles.userResultRow}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/connect/user-profile',
                            params: { userId: user.user_id },
                          } as any)
                        }
                        style={styles.userResultInfo}
                      >
                        <Text style={styles.userResultName}>
                          {user.full_name || user.username}
                        </Text>
                        <Text style={styles.userResultSub}>@{user.username}</Text>
                      </TouchableOpacity>

                      {isFriend ? (
                        <View style={styles.connectedBadge}>
                          <Text style={styles.connectedBadgeText}>Connected</Text>
                        </View>
                      ) : isSent ? (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                      ) : isActionLoading ? (
                        <ActivityIndicator size="small" color={theme.accent} />
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleSendRequest(user.user_id)}
                          style={styles.addFriendBtn}
                          activeOpacity={0.7}
                        >
                          <UserPlus size={14} color={theme.accent} />
                          <Text style={styles.addFriendBtnText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Loading state OR Empty State OR Populated Friends List */}
          {loading && friends.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={styles.loadingText}>Loading circle...</Text>
            </View>
          ) : connectionsCount === 0 && !isSearchActive ? (
            /* Illustrated typography empty state */
            <View style={styles.emptyStateSection}>
              <Text style={styles.emptyHeading}>Good habits.{'\n'}Better company.</Text>
              <Text style={styles.emptySubheading}>
                Find someone to grow alongside.
              </Text>
              <TouchableOpacity
                onPress={() => searchInputRef.current?.focus()}
                style={styles.findFriendsLink}
                activeOpacity={0.7}
              >
                <Text style={styles.findFriendsLinkText}>Find friends →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Populated Friends List */
            !isSearchActive && (
              <View style={styles.friendsListWrap}>
                {friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.user_id}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/connect/user-profile',
                        params: { userId: friend.user_id },
                      } as any)
                    }
                    onLongPress={() =>
                      handleRemoveFriend(friend.user_id, friend.full_name || friend.username)
                    }
                    style={styles.friendRow}
                    activeOpacity={0.7}
                  >
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>
                        {(friend.full_name || friend.username || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.friendInfoCol}>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {friend.full_name || friend.username}
                      </Text>
                      <Text style={styles.friendSub} numberOfLines={1}>
                        @{friend.username} · Level {friend.level || 1}
                        {friend.streak_count ? ` · ${friend.streak_count}d streak` : ''}
                      </Text>
                    </View>

                    <ChevronRight size={18} color={theme.secondaryText} />
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}

          {/* Thin Divider */}
          <View style={styles.thinDivider} />

          {/* ── 01 A LITTLE SHARED MOMENTUM ──────────────────────────────────── */}
          <View style={styles.momentumSection}>
            <View style={styles.momentumHeaderRow}>
              <Text style={styles.momentumIndex}>01</Text>
              <Text style={styles.momentumLabel}>A LITTLE SHARED MOMENTUM</Text>
            </View>

            {/* Weekly leaderboard link */}
            <TouchableOpacity
              onPress={() => {
                if (onNavigateLeaderboard) onNavigateLeaderboard();
              }}
              style={styles.momentumItem}
              activeOpacity={0.7}
            >
              <View style={styles.momentumTextCol}>
                <Text style={styles.momentumTitle}>Weekly leaderboard</Text>
                <Text style={styles.momentumSub}>See how your week adds up.</Text>
              </View>
              <ArrowRight size={20} color={theme.accent} strokeWidth={2} />
            </TouchableOpacity>

            {/* Your achievements link */}
            <TouchableOpacity
              onPress={() => {
                if (onNavigateAchievements) onNavigateAchievements();
              }}
              style={styles.momentumItem}
              activeOpacity={0.7}
            >
              <View style={styles.momentumTextCol}>
                <Text style={styles.momentumTitle}>Your achievements</Text>
                <Text style={styles.momentumSub}>Keep track of the steps you earn.</Text>
              </View>
              <ArrowRight size={20} color={theme.accent} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </>
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
      paddingBottom: 130, // Generous spacing above bottom tab bar
    },

    // Circle Header Row
    circleTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    circleLabel: {
      fontSize: 13,
      fontFamily: 'PlayfairDisplay_600SemiBold',
      letterSpacing: 1.5,
      color: theme.primaryText,
      textTransform: 'uppercase',
    },
    requestsActionLink: {
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    requestsActionText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    // Connections count
    connectionsCountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
      marginBottom: 20,
    },
    connectionsNumber: {
      fontSize: 60,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -1,
      lineHeight: 64,
    },
    connectionsWord: {
      fontSize: 34,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.5,
    },
    loadingBox: {
      paddingVertical: 36,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },

    // Search bar (rounded pill container matching mockup)
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.primaryText,
      paddingVertical: 0,
    },

    // Search Results
    searchResultsBox: {
      paddingBottom: 16,
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.separator,
    },
    searchResultsHeader: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
      marginBottom: 12,
    },
    noResultsText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      paddingVertical: 8,
    },
    userResultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    userResultInfo: {
      flex: 1,
      paddingRight: 12,
    },
    userResultName: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    userResultSub: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    addFriendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    addFriendBtnText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
    connectedBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.separator,
    },
    connectedBadgeText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    pendingBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    pendingBadgeText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },

    // Empty state matching latest mockup
    emptyStateSection: {
      paddingVertical: 8,
      marginBottom: 16,
    },
    emptyHeading: {
      fontSize: 38,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      lineHeight: 44,
      letterSpacing: -0.8,
      marginBottom: 10,
    },
    emptySubheading: {
      fontSize: 16,
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

    // Populated friends list
    friendsListWrap: {
      width: '100%',
      marginBottom: 16,
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    friendAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.cardSolid,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    friendAvatarText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    friendInfoCol: {
      flex: 1,
      paddingRight: 10,
    },
    friendName: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
      marginBottom: 3,
    },
    friendSub: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },

    // Thin divider
    thinDivider: {
      height: 1,
      backgroundColor: theme.separator,
      marginVertical: 24,
    },

    // Momentum section
    momentumSection: {
      marginTop: 4,
    },
    momentumHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
      marginBottom: 20,
    },
    momentumIndex: {
      fontSize: 20,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.accent,
    },
    momentumLabel: {
      fontSize: 12,
      fontFamily: 'PlayfairDisplay_600SemiBold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
    },
    momentumItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    momentumTextCol: {
      flex: 1,
      paddingRight: 16,
    },
    momentumTitle: {
      fontSize: 17,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
      marginBottom: 4,
    },
    momentumSub: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },

    // Requests subview
    requestsViewContainer: {
      paddingBottom: 24,
    },
    backToCircleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      marginBottom: 16,
    },
    backToCircleText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
    requestsMainTitle: {
      fontSize: 32,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      marginBottom: 6,
    },
    requestsMainSubtitle: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 24,
    },
    requestsSection: {
      marginBottom: 28,
    },
    requestsSectionLabel: {
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
      marginBottom: 12,
    },
    emptyRequestsText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      paddingVertical: 10,
    },
    requestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    requestAvatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.cardSolid,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    requestAvatarText: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    requestInfoCol: {
      flex: 1,
      paddingRight: 10,
    },
    requestName: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    requestHandle: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    requestActionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    acceptButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    declineButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelSentBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    cancelSentText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
  });
}
