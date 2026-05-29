import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { ConnectProfile } from '@/hooks/connect/useProfile';
import { DesignTokens } from '@/constants/designTokens';
import { LinearGradient } from 'expo-linear-gradient';
import * as Icons from 'lucide-react-native';
import { PrivacyLevel } from '@/hooks/connect/usePrivacySettings';
import { resolveAvatarUrl } from '@/lib/avatarUtils';

interface Props {
  profile: ConnectProfile | null;
  authProfile?: any;
  levelTitle: string;
  isOwnProfile?: boolean;
  onEditPress?: () => void;
  followersCount?: number;
  followingCount?: number;
  connectionState?: 'none' | 'sent' | 'received' | 'friends' | 'blocked';
  onSendRequest?: () => void;
  onAcceptRequest?: () => void;
  onDeclineRequest?: () => void;
  onCancelRequest?: () => void;
  onRemoveFriend?: () => void;
  onBlockUser?: () => void;
  onUnblockUser?: () => void;
  privacyLevel?: PrivacyLevel;
  onPrivacyChange?: (level: PrivacyLevel) => void;
  institution?: string | null;
  statusLabel?: 'Active Learner' | 'Focus Mode Active' | 'Consistent Student' | 'Inactive Learner';
  identityTitle?: string;
}

export const ProfileHeader: React.FC<Props> = ({
  profile,
  authProfile,
  levelTitle,
  isOwnProfile = true,
  onEditPress,
  followersCount = 0,
  followingCount = 0,
  connectionState = 'none',
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  onRemoveFriend,
  onBlockUser,
  onUnblockUser,
  privacyLevel = 'public',
  onPrivacyChange,
  institution,
  statusLabel = 'Active Learner',
  identityTitle = 'Active Learner',
}) => {
  const { theme, isDark, showAlert } = useTheme();

  const username = authProfile?.username || profile?.username || 'User';
  const displayName = isOwnProfile && authProfile?.full_name ? authProfile.full_name : username;
  const bio = isOwnProfile && authProfile?.bio ? authProfile.bio : (profile?.bio || 'No bio yet.');
  const rawAvatar = isOwnProfile && authProfile?.avatar_url ? authProfile.avatar_url : profile?.avatar_url;
  const finalAvatar = resolveAvatarUrl(rawAvatar);
  
  const displayInstitution = institution || (profile as any)?.institution || '';
  const joinDate = profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short'
  }) : 'May 2026';

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  // Status Indicator styling
  const getStatusColor = () => {
    switch (statusLabel) {
      case 'Focus Mode Active':
        return DesignTokens.colors.statusFocus;
      case 'Consistent Student':
        return DesignTokens.colors.statusConsistent;
      case 'Inactive Learner':
        return DesignTokens.colors.statusInactive;
      default:
        return DesignTokens.colors.statusActive;
    }
  };

  const handleActionPress = () => {
    if (connectionState === 'none' && onSendRequest) {
      onSendRequest();
    } else if (connectionState === 'sent' && onCancelRequest) {
      onCancelRequest();
    } else if (connectionState === 'friends' && onRemoveFriend) {
      showAlert({
        title: 'Remove Friend',
        message: `Are you sure you want to remove @${username} from your study network?`,
        primaryButton: {
          text: 'Remove',
          destructive: true,
          onPress: onRemoveFriend,
        },
        secondaryButton: {
          text: 'Cancel',
          onPress: () => {},
        },
      });
    } else if (connectionState === 'blocked' && onUnblockUser) {
      onUnblockUser();
    }
  };

  const handlePrivacyToggle = () => {
    if (!onPrivacyChange) return;
    const nextMap: Record<PrivacyLevel, PrivacyLevel> = {
      'public': 'connections',
      'connections': 'private',
      'private': 'public'
    };
    onPrivacyChange(nextMap[privacyLevel]);
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      
      {/* Top Identity Layer */}
      <View style={styles.topSection}>
        
        {/* Profile Picture with Dynamic Level Glow */}
        <View style={styles.avatarWrapper}>
          <LinearGradient
            colors={[DesignTokens.colors.gradientStart, DesignTokens.colors.gradientEnd]}
            style={[styles.glowBorder, { shadowColor: DesignTokens.colors.gradientStart }]}
          >
            <View style={[styles.avatarInner, { backgroundColor: theme.background }]}>
              {finalAvatar ? (
                <Image source={{ uri: finalAvatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </LinearGradient>
          
          {/* Level Badge */}
          <View style={[styles.levelBadge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
            <Text style={styles.levelText}>{profile?.level || 1}</Text>
          </View>
        </View>

        {/* Identity Details */}
        <View style={styles.detailsCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: theme.primaryText }]} numberOfLines={1}>
              {displayName}
            </Text>
            {isOwnProfile && (
              <TouchableOpacity onPress={onEditPress} style={styles.editIconBtn}>
                <Icons.Edit2 size={14} color={theme.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.username, { color: theme.secondaryText }]}>@{username}</Text>

          {/* Algorithm-Generated Identity Title Badge */}
          {identityTitle && (
            <View style={[styles.identityBadge, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '40' }]}>
              <Icons.Sparkles size={10} color={theme.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.identityBadgeText, { color: theme.accent }]}>{identityTitle}</Text>
            </View>
          )}

          {/* Academic Info */}
          <View style={styles.academicInfo}>
            {displayInstitution ? (
              <View style={styles.academicRow}>
                <Icons.School size={12} color={theme.secondaryText} style={{ marginRight: 4 }} />
                <Text style={[styles.academicText, { color: theme.secondaryText }]} numberOfLines={1}>
                  {displayInstitution}
                </Text>
              </View>
            ) : null}
            <View style={styles.academicRow}>
              <Icons.Calendar size={12} color={theme.secondaryText} style={{ marginRight: 4 }} />
              <Text style={[styles.academicText, { color: theme.secondaryText }]}>Joined {joinDate}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bio Section */}
      {bio ? (
        <Text style={[styles.bio, { color: theme.primaryText }]} numberOfLines={2}>
          {bio}
        </Text>
      ) : null}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

      {/* Bottom Status & Actions Layer */}
      <View style={styles.bottomRow}>
        
        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: theme.secondaryText }]}>{statusLabel}</Text>
        </View>

        {/* Study Network & Actions */}
        <View style={styles.actionsContainer}>
          {isOwnProfile ? (
            // Own Profile: Privacy Level Toggle
            <TouchableOpacity
              onPress={handlePrivacyToggle}
              style={[styles.privacyToggleBtn, { borderColor: cardBorder }]}
              activeOpacity={0.7}
            >
              {privacyLevel === 'public' && <Icons.Globe size={13} color={theme.accent} />}
              {privacyLevel === 'connections' && <Icons.Users size={13} color={theme.accent} />}
              {privacyLevel === 'private' && <Icons.Lock size={13} color={theme.accent} />}
              <Text style={[styles.privacyToggleText, { color: theme.primaryText }]}>
                {privacyLevel.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ) : (
            // Other Profile: Add Friend / Pending / Friends Button
            <TouchableOpacity
              onPress={handleActionPress}
              style={[
                styles.actionBtn,
                connectionState === 'none' && { backgroundColor: theme.accent },
                connectionState === 'sent' && { borderColor: cardBorder, borderWidth: 1 },
                connectionState === 'friends' && { borderColor: theme.accent, borderWidth: 1 },
                connectionState === 'blocked' && { borderColor: '#FF3B30', borderWidth: 1 }
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.actionBtnText,
                connectionState === 'none' ? { color: 'white' } : { color: theme.primaryText },
                connectionState === 'blocked' && { color: '#FF3B30' }
              ]}>
                {connectionState === 'none' && 'Add Friend'}
                {connectionState === 'sent' && 'Pending'}
                {connectionState === 'friends' && 'Friends'}
                {connectionState === 'blocked' && 'Unblock'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
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
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  glowBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: DesignTokens.fonts.bold,
    color: '#007AFF',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 9,
    fontFamily: DesignTokens.fonts.bold,
    color: 'white',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  displayName: {
    fontSize: 18,
    fontFamily: DesignTokens.fonts.bold,
    flexShrink: 1,
  },
  editIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  username: {
    fontSize: 13,
    fontFamily: DesignTokens.fonts.regular,
    marginBottom: 6,
  },
  identityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  identityBadgeText: {
    fontSize: 9,
    fontFamily: DesignTokens.fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  academicInfo: {
    flexDirection: 'column',
    gap: 3,
  },
  academicRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  academicText: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.regular,
    opacity: 0.8,
  },
  bio: {
    fontSize: 13,
    fontFamily: DesignTokens.fonts.regular,
    lineHeight: 18,
    marginBottom: 12,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: DesignTokens.fonts.regular,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  privacyToggleText: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.bold,
  },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: DesignTokens.fonts.bold,
  },
});
