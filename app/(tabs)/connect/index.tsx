import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useResponsive } from '@/hooks/useResponsive';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { Users, Trophy, Award, User, ChevronRight, Sparkles } from 'lucide-react-native';
import { resolveAvatarUrl } from '@/lib/avatarUtils';

// Subscreen imports
import LeaderboardScreen from '@/components/connect/screens/LeaderboardScreen';
import AchievementsScreen from '@/components/connect/screens/AchievementsScreen';
import FriendsScreen from '@/components/connect/screens/FriendsScreen';
import ProfileScreen from '@/components/connect/screens/ProfileScreen';

type ConnectTab = 'Leaderboard' | 'Achievements' | 'Friends' | 'Profile';

export default function ConnectRootScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, session, isGuest } = useAuthStore();
  const { isDesktop, contentMaxWidth, horizontalPadding } = useResponsive();

  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<ConnectTab>('Friends');

  useEffect(() => {
    if (tab) {
      const lower = tab.toLowerCase();
      if (lower === 'leaderboard') setActiveTab('Leaderboard');
      else if (lower === 'achievements') setActiveTab('Achievements');
      else if (lower === 'friends') setActiveTab('Friends');
      else if (lower === 'profile') setActiveTab('Profile');
    }
  }, [tab]);

  const handleTabPress = (tabName: ConnectTab) => {
    hapticSelection();
    setActiveTab(tabName);
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const avatarInitial = (
    profile?.full_name?.charAt(0) ||
    profile?.username?.charAt(0) ||
    session?.user?.email?.charAt(0) ||
    'G'
  ).toUpperCase();
  const rawAvatarUrl =
    profile?.avatar_url ||
    (session?.user?.user_metadata as any)?.avatar_url ||
    (session?.user?.user_metadata as any)?.picture;
  const avatarUrl = resolveAvatarUrl(rawAvatarUrl);
  const displayName = profile?.full_name || profile?.username || (isGuest ? 'Guest User' : 'Groundwork User');
  const displayHandle = profile?.username ? `@${profile.username}` : (isGuest ? 'Local device' : 'Active user');

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Leaderboard':
        return <LeaderboardScreen onSwitchToFriendsTab={() => handleTabPress('Friends')} />;
      case 'Achievements':
        return <AchievementsScreen />;
      case 'Friends':
        return (
          <FriendsScreen
            onNavigateLeaderboard={() => handleTabPress('Leaderboard')}
            onNavigateAchievements={() => handleTabPress('Achievements')}
          />
        );
      case 'Profile':
        return <ProfileScreen onSwitchToFriendsTab={() => handleTabPress('Friends')} />;
      default:
        return null;
    }
  };

  const CONNECT_TABS = [
    { id: 'Friends' as const, label: 'Friends', icon: Users },
    { id: 'Leaderboard' as const, label: 'Leaderboard', icon: Trophy },
    { id: 'Achievements' as const, label: 'Achievements', icon: Award },
    { id: 'Profile' as const, label: 'Profile', icon: User },
  ];

  const renderNavTabs = () => (
    <View style={styles.navTabsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navTabsContainer}
      >
        {CONNECT_TABS.map((tabItem) => {
          const isSelected = activeTab === tabItem.id;
          const Icon = tabItem.icon;
          return (
            <TouchableOpacity
              key={tabItem.id}
              testID={`connect-tab-${tabItem.id.toLowerCase()}`}
              onPress={() => handleTabPress(tabItem.id)}
              style={[
                styles.navTabChip,
                isSelected ? styles.navTabChipActive : styles.navTabChipInactive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
            >
              <Icon
                size={17}
                color={isSelected ? theme.accent : theme.secondaryText}
                strokeWidth={isSelected ? 2.4 : 1.8}
              />
              <Text
                style={[
                  styles.navTabText,
                  isSelected ? styles.navTabTextActive : styles.navTabTextInactive,
                ]}
              >
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Brand Header with wordmark and blue accent line */}
      <BrandHeader showBack={false} showMoreMenu={false} showAvatar={false} />

      <View
        style={[
          styles.container,
          {
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: isDesktop ? horizontalPadding : 0,
          },
        ]}
      >
        {isDesktop ? (
          /* ── Desktop 2-Column Connect Composition ───────────────── */
          <View style={styles.desktopColumnsRow}>
            {/* Left Column: Heading, 2-Row Navigation, Tab Content */}
            <View style={styles.desktopConnectMain}>
              <View style={styles.headingBlock}>
                <Text style={styles.pageHeading}>Connect.</Text>
                <Text style={styles.pageSubline}>Progress feels better together.</Text>
                {renderNavTabs()}
              </View>

              <View style={styles.contentWrap}>
                {renderActiveScreen()}
              </View>
            </View>

            {/* Right Column: User Identity Card, Quick Navigation, Community */}
            <View style={styles.desktopConnectSide}>
              {/* User Identity Card */}
              <View style={styles.desktopSideCard}>
                <View style={styles.userCardHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: theme.accent, overflow: 'hidden' }]}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
                    ) : (
                      <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userNameText} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.userHandleText} numberOfLines={1}>{displayHandle}</Text>
                  </View>
                </View>

                <View style={styles.xpRow}>
                  <Text style={styles.xpBadgeText}>Level {profile?.level || 1}</Text>
                  <Text style={styles.xpAmountText}>{profile?.xp || 0} XP</Text>
                </View>
              </View>

              {/* Quick Connect Actions Card */}
              <View style={styles.desktopSideCard}>
                <Text style={styles.desktopCardTitle}>Hub overview</Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleTabPress('Friends')}
                    style={[styles.quickHubRow, activeTab === 'Friends' && styles.quickHubRowActive]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Users size={16} color={activeTab === 'Friends' ? theme.accent : theme.secondaryText} />
                      <Text style={[styles.quickHubText, activeTab === 'Friends' && { color: theme.accent }]}>
                        Study circles & friends
                      </Text>
                    </View>
                    <ChevronRight size={15} color={theme.secondaryText} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleTabPress('Leaderboard')}
                    style={[styles.quickHubRow, activeTab === 'Leaderboard' && styles.quickHubRowActive]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Trophy size={16} color={activeTab === 'Leaderboard' ? theme.accent : theme.secondaryText} />
                      <Text style={[styles.quickHubText, activeTab === 'Leaderboard' && { color: theme.accent }]}>
                        Weekly leaderboard
                      </Text>
                    </View>
                    <ChevronRight size={15} color={theme.secondaryText} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleTabPress('Achievements')}
                    style={[styles.quickHubRow, activeTab === 'Achievements' && styles.quickHubRowActive]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Award size={16} color={activeTab === 'Achievements' ? theme.accent : theme.secondaryText} />
                      <Text style={[styles.quickHubText, activeTab === 'Achievements' && { color: theme.accent }]}>
                        Earned achievements
                      </Text>
                    </View>
                    <ChevronRight size={15} color={theme.secondaryText} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Community Ethos Card */}
              <View style={styles.desktopSideCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Sparkles size={16} color={theme.accent} />
                  <Text style={styles.desktopCardTitle}>Shared momentum</Text>
                </View>
                <Text style={styles.communityDesc}>
                  Accountability increases habit retention by 65%. Challenge friends and share quiet study sessions.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* ── Mobile / Tablet Sequential Layout ─────────────────── */
          <View style={{ flex: 1 }}>
            <View style={styles.headingBlock}>
              <Text style={styles.pageHeading}>Connect.</Text>
              <Text style={styles.pageSubline}>Progress feels better together.</Text>
              {renderNavTabs()}
            </View>

            <View style={styles.contentWrap}>
              {renderActiveScreen()}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    headingBlock: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 4,
    },
    pageHeading: {
      fontSize: 28,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: -0.6,
      color: theme.primaryText,
      marginBottom: 4,
    },
    pageSubline: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 16,
    },

    // Horizontal scrollable tabs navigation
    navTabsWrapper: {
      marginBottom: 16,
      marginHorizontal: -20,
    },
    navTabsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 4,
    },
    navTabChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
    },
    navTabChipActive: {
      backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)',
      borderColor: theme.accent,
    },
    navTabChipInactive: {
      backgroundColor: isDark ? '#1C1C1E' : '#F4F4F6',
      borderColor: isDark ? '#2C2C2E' : '#E8E8ED',
    },
    navTabText: {
      fontSize: 14,
      letterSpacing: -0.2,
    },
    navTabTextActive: {
      color: theme.accent,
      fontFamily: 'Inter_700Bold',
    },
    navTabTextInactive: {
      color: theme.secondaryText,
      fontFamily: 'Inter_500Medium',
    },

    contentWrap: {
      flex: 1,
    },

    // Desktop 2-column styles
    desktopColumnsRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 36,
      width: '100%',
      alignItems: 'flex-start',
    },
    desktopConnectMain: {
      flex: 1.35,
      minWidth: 0,
    },
    desktopConnectSide: {
      flex: 0.95,
      minWidth: 320,
      gap: 18,
      paddingTop: 18,
    },
    desktopSideCard: {
      borderWidth: 1,
      borderColor: theme.separator,
      borderRadius: 14,
      padding: 18,
      backgroundColor: isDark ? '#080808' : '#FFFFFF',
    },
    desktopCardTitle: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.3,
    },
    userCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    avatarInitial: {
      color: '#FFFFFF',
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
    },
    userNameText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    userHandleText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginTop: 2,
    },
    xpRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.separator,
    },
    xpBadgeText: {
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    xpAmountText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    quickHubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    },
    quickHubRowActive: {
      backgroundColor: isDark ? 'rgba(0, 102, 255, 0.12)' : 'rgba(0, 102, 255, 0.08)',
    },
    quickHubText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: theme.primaryText,
    },
    communityDesc: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 18,
    },
  });
}
