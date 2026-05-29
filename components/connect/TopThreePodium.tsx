import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { RankedEntry } from '@/hooks/connect/useLeaderboard';
import { resolveAvatarUrl } from '@/lib/avatarUtils';
import { useRouter } from 'expo-router';
import { Crown, Medal } from 'lucide-react-native';

interface Props {
  entries: RankedEntry[];
}

export const TopThreePodium: React.FC<Props> = ({ entries }) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const renderPodiumBlock = (entry: RankedEntry | undefined, place: 1 | 2 | 3) => {
    if (!entry) return <View style={styles.emptyBlock} />;

    const isFirst = place === 1;
    const isSecond = place === 2;
    const borderColor = isFirst ? '#FFD700' : isSecond ? '#C0C0C0' : '#CD7F32';
    const height = isFirst ? 160 : isSecond ? 130 : 100;
    const avatarSize = isFirst ? 64 : 52;

    return (
      <TouchableOpacity
        style={[styles.podiumCol, entry.isCurrentUser && styles.currentUserGlow]}
        activeOpacity={0.8}
        onPress={() => router.push(`/connect/user-profile?userId=${entry.user_id}`)}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatarCircle, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor }]}>
            {resolveAvatarUrl(entry.avatar_url) ? (
              <Image source={{ uri: resolveAvatarUrl(entry.avatar_url)! }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarText, { fontSize: isFirst ? 28 : 22 }]}>
                {entry.username ? entry.username.charAt(0).toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: theme.background }]}>
            {isFirst ? (
              <Crown size={14} color="#FFD700" fill="#FFD700" />
            ) : (
              <Medal size={14} color={isSecond ? '#C0C0C0' : '#CD7F32'} fill={isSecond ? '#C0C0C0' : '#CD7F32'} />
            )}
          </View>
        </View>

        <Text style={[styles.username, { color: theme.primaryText }]} numberOfLines={1}>
          {entry.username}
        </Text>
        <Text style={styles.xpText}>{entry.displayScore.toLocaleString()} pts</Text>

        <View
          style={[
            styles.podiumBox,
            {
              height,
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
              borderColor,
            },
            entry.isCurrentUser && { borderColor: '#007AFF', borderWidth: 2, backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)' }
          ]}
        >
          <Text style={[styles.rankNumber, { color: borderColor }]}>{place}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View entering={FadeInUp.duration(500)} style={styles.container}>
      {renderPodiumBlock(second, 2)}
      {renderPodiumBlock(first, 1)}
      {renderPodiumBlock(third, 3)}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  emptyBlock: {
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarCircle: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: 'white',
    fontFamily: 'Inter_800ExtraBold',
  },
  badge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  username: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 2,
    textAlign: 'center',
  },
  xpText: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    color: '#007AFF',
    marginBottom: 8,
  },
  podiumBox: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  rankNumber: {
    fontSize: 48,
    fontFamily: 'Inter_800ExtraBold',
    opacity: 0.6,
  },
  currentUserGlow: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
});
