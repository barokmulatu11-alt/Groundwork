import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { RankedEntry } from '@/hooks/connect/useLeaderboard';
import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import { DesignTokens } from '@/constants/designTokens';
import { resolveAvatarUrl } from '@/lib/avatarUtils';

interface Props {
  entry: RankedEntry;
}

export const LeaderboardCard: React.FC<Props> = ({ entry }) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const isTop3 = entry.rank <= 3;
  const rankColor = entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : theme.secondaryText;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight,
          borderColor: isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight,
        },
        entry.isCurrentUser && { 
          borderColor: '#007AFF', 
          borderWidth: 1.5,
          backgroundColor: isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.05)',
        }
      ]}
      activeOpacity={0.8}
      onPress={() => router.push(`/connect/user-profile?userId=${entry.user_id}`)}
    >
      <View style={styles.left}>
        <Text style={[styles.rank, { color: isTop3 ? rankColor : theme.secondaryText }]}>
          {entry.rank}
        </Text>
        <View style={[styles.avatar, isTop3 && { borderColor: rankColor, borderWidth: 2 }]}>
          {resolveAvatarUrl(entry.avatar_url) ? (
            <Image source={{ uri: resolveAvatarUrl(entry.avatar_url)! }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {entry.username ? entry.username.charAt(0).toUpperCase() : '?'}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, { color: theme.primaryText }]} numberOfLines={1}>
              {entry.username}
            </Text>
            {entry.isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>You</Text>
              </View>
            )}
          </View>
          <Text style={[styles.level, { color: theme.secondaryText }]} numberOfLines={1}>
            Lvl {entry.level} • {entry.levelTitle}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.xp}>{entry.displayScore.toLocaleString()} pts</Text>
        {entry.streak_count > 0 && (
          <View style={styles.streakBadge}>
            <Flame size={12} color="#FF9500" strokeWidth={3} />
            <Text style={styles.streakText}>{entry.streak_count}d</Text>
          </View>
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rank: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    width: 28,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 18,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  youBadge: {
    backgroundColor: 'rgba(0,122,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youText: {
    color: '#007AFF',
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
  },
  level: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  xp: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    color: '#007AFF',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,149,0,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  streakText: {
    color: '#FF9500',
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
  },
});
