import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { DesignTokens } from '@/constants/designTokens';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { PrivacyLevel } from '@/hooks/connect/usePrivacySettings';
import * as Icons from 'lucide-react-native';

interface Props {
  followersCount: number;
  followingCount: number;
  privacyLevel: PrivacyLevel;
  onManagePress?: () => void;
}

export const ConnectionsSection: React.FC<Props> = ({
  followersCount,
  followingCount,
  privacyLevel,
  onManagePress,
}) => {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;

  const getPrivacyIcon = () => {
    switch (privacyLevel) {
      case 'private':
        return <Icons.Lock size={12} color={theme.secondaryText} />;
      case 'connections':
        return <Icons.Users size={12} color={theme.secondaryText} />;
      default:
        return <Icons.Globe size={12} color={theme.secondaryText} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Icons.Users size={18} color={theme.primaryText} />
          <Text style={[styles.title, { color: theme.primaryText }]}>Study Network</Text>
        </View>
        
        <View style={styles.privacyBadge}>
          {getPrivacyIcon()}
          <Text style={[styles.privacyText, { color: theme.secondaryText }]}>
            {privacyLevel === 'public' ? 'Public Profile' : privacyLevel === 'connections' ? 'Friends Only' : 'Private Profile'}
          </Text>
        </View>
      </View>

      {/* Network Counters */}
      <View style={styles.countersRow}>
        <View style={styles.counterBox}>
          <Text style={[styles.counterVal, { color: theme.primaryText }]}>{followersCount}</Text>
          <Text style={[styles.counterLabel, { color: theme.secondaryText }]}>Connections</Text>
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.counterBox}>
          <Text style={[styles.counterVal, { color: theme.primaryText }]}>{followingCount}</Text>
          <Text style={[styles.counterLabel, { color: theme.secondaryText }]}>Mutual Partners</Text>
        </View>
      </View>

      {/* Manage Network Button */}
      <TouchableOpacity
        onPress={() => {
          if (onManagePress) {
            onManagePress();
          } else {
            router.push('/(tabs)/connect?tab=friends' as any);
          }
        }}
        style={[styles.manageBtn, { backgroundColor: theme.accent }]}
        activeOpacity={0.8}
      >
        <Icons.UserPlus size={14} color="white" style={{ marginRight: 6 }} />
        <Text style={styles.manageBtnText}>Manage Connections & Squads</Text>
      </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: DesignTokens.fonts.bold,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyText: {
    fontSize: 9,
    fontFamily: DesignTokens.fonts.bold,
    textTransform: 'uppercase',
  },
  countersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  counterBox: {
    alignItems: 'center',
    flex: 1,
  },
  counterVal: {
    fontSize: 22,
    fontFamily: DesignTokens.fonts.bold,
  },
  counterLabel: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.medium,
    opacity: 0.8,
  },
  verticalDivider: {
    width: 1,
    height: 30,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DesignTokens.borderRadius.md,
    paddingVertical: 10,
  },
  manageBtnText: {
    color: 'white',
    fontSize: 12,
    fontFamily: DesignTokens.fonts.bold,
  },
});
