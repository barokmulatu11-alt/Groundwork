import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { FriendUser } from '@/hooks/connect/useFriends';
import { resolveAvatarUrl } from '@/lib/avatarUtils';
import { useRouter } from 'expo-router';
import { UserPlus, UserMinus, UserCheck, X, Check, Eye } from 'lucide-react-native';

interface Props {
  user: FriendUser;
  onSendRequest?: (userId: string) => void;
  onAcceptRequest?: (requestId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
  onCancelRequest?: (requestId: string) => void;
  onRemoveFriend?: (userId: string) => void;
  showStatus?: boolean;
}

export const FriendCard: React.FC<Props> = ({
  user,
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  onRemoveFriend,
  showStatus = true,
}) => {
  const { theme, isDark, showAlert } = useTheme();
  const router = useRouter();

  // Helper to determine activity status dot color
  const getActivityStatusColor = (updatedAtStr: string | null) => {
    if (!updatedAtStr) return null;
    const diffMs = Date.now() - new Date(updatedAtStr).getTime();
    const diffMins = diffMs / 60000;
    if (diffMins <= 5) return '#34C759'; // Online - vibrant green
    if (diffMins <= 1440) return theme.accent;
    return null;
  };

  const statusColor = showStatus ? getActivityStatusColor(user.xp > 0 ? new Date().toISOString() : null) : null; // Dynamic indicator placeholder

  const handleAction = (e: any) => {
    e.stopPropagation();
    const state = user.connectionState;

    if (state === 'none' && onSendRequest) {
      onSendRequest(user.user_id);
    } else if (state === 'sent' && onCancelRequest && user.requestId) {
      showAlert({
        title: "Cancel Request",
        message: `Cancel your friend request to @${user.username}?`,
        primaryButton: {
          text: "Cancel Request",
          destructive: true,
          onPress: () => onCancelRequest(user.requestId!)
        },
        secondaryButton: {
          text: "Back",
          onPress: () => {}
        }
      });
    } else if (state === 'friends' && onRemoveFriend) {
      showAlert({
        title: "Remove Friend",
        message: `Are you sure you want to remove @${user.username} from your friends list?`,
        primaryButton: {
          text: "Remove Friend",
          destructive: true,
          onPress: () => onRemoveFriend(user.user_id)
        },
        secondaryButton: {
          text: "Cancel",
          onPress: () => {}
        }
      });
    }
  };

  const handleAccept = (e: any) => {
    e.stopPropagation();
    if (onAcceptRequest && user.requestId) {
      onAcceptRequest(user.requestId);
    }
  };

  const handleDecline = (e: any) => {
    e.stopPropagation();
    if (onDeclineRequest && user.requestId) {
      onDeclineRequest(user.requestId);
    }
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      activeOpacity={0.8}
      onPress={() => router.push(`/connect/user-profile?userId=${user.user_id}`)}
    >
      <View style={styles.left}>
        {/* Avatar with real photo + letter fallback */}
        <View style={[styles.avatarContainer]}>
          {resolveAvatarUrl(user.avatar_url) ? (
            <Image
              source={{ uri: resolveAvatarUrl(user.avatar_url)! }}
              style={styles.avatarImage}
              onError={() => {}}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarText}>
                {user.username ? user.username.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          {statusColor && (
            <View style={[styles.statusDot, { backgroundColor: statusColor, borderColor: isDark ? '#1C1C1E' : '#FFFFFF' }]} />
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.username, { color: theme.primaryText }]} numberOfLines={1}>
            {user.username}
          </Text>
          <Text style={[styles.level, { color: theme.secondaryText }]}>
            Lvl {user.level} • {user.levelTitle}{user.xp > 0 ? ` • ${user.xp} XP` : ''}
          </Text>
        </View>
      </View>

      {/* Connection state actions */}
      <View style={styles.actionsContainer}>
        {user.connectionState === 'received' ? (
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.declineTextBtn,
                { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
              ]}
              activeOpacity={0.7}
              onPress={handleDecline}
            >
              <X size={13} color={theme.secondaryText} style={styles.btnIcon} />
              <Text style={[styles.btnText, { color: theme.secondaryText }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.acceptTextBtn, { backgroundColor: '#34C759' }]}
              activeOpacity={0.7}
              onPress={handleAccept}
            >
              <Check size={13} color="white" style={styles.btnIcon} />
              <Text style={[styles.btnText, { color: 'white' }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.btn,
              user.connectionState === 'none' && {
                backgroundColor: theme.accent,
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              },
              user.connectionState === 'sent' && [styles.pendingBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }],
              user.connectionState === 'friends' && [styles.friendBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }],
            ]}
            activeOpacity={0.7}
            onPress={handleAction}
          >
            {user.connectionState === 'none' && (
              <>
                <UserPlus size={14} color="white" style={styles.btnIcon} />
                <Text style={[styles.btnText, { color: 'white' }]}>Add</Text>
              </>
            )}
            {user.connectionState === 'sent' && (
              <Text style={[styles.btnText, { color: theme.secondaryText }]}>Pending</Text>
            )}
            {user.connectionState === 'friends' && (
              <>
                <UserCheck size={14} color={theme.primaryText} style={styles.btnIcon} />
                <Text style={[styles.btnText, { color: theme.primaryText }]}>Friends</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 48,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  level: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  xp: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
  },
  actionsContainer: {
    justifyContent: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  acceptBtn: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  declineTextBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  acceptTextBtn: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  friendBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnIcon: {
    marginRight: 4,
  },
  btnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});
