import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { hapticLight, hapticSelection } from '@/lib/haptics';

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
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

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

  return (
    <View style={styles.root}>
      {/* Brand Header with wordmark and blue accent line */}
      <View style={{ paddingTop: insets.top }}>
        <BrandHeader showBack={false} showMoreMenu={false} showAvatar={false} />
      </View>

      <View
        style={[
          styles.container,
          {
            maxWidth: isDesktop ? 680 : undefined,
            alignSelf: isDesktop ? 'center' : undefined,
            width: '100%',
          },
        ]}
      >
        {/* Page Heading & Subtitle */}
        <View style={styles.headingBlock}>
          <Text style={styles.pageHeading}>Connect.</Text>
          <Text style={styles.pageSubline}>Progress feels better together.</Text>

          {/* Two-row navigation matching latest spacious reference */}
          <View style={styles.navGrid}>
            {/* Row 1: Friends | Leaderboard */}
            <View style={styles.navRow}>
              <TouchableOpacity
                testID="connect-tab-friends"
                onPress={() => handleTabPress('Friends')}
                style={styles.navCell}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'Friends' }}
              >
                <Text
                  style={[
                    styles.navText,
                    activeTab === 'Friends' ? styles.navTextActive : styles.navTextInactive,
                  ]}
                >
                  Friends
                </Text>
                <View
                  style={[
                    styles.navUnderline,
                    activeTab === 'Friends' ? styles.navUnderlineActive : styles.navUnderlineInactive,
                  ]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                testID="connect-tab-leaderboard"
                onPress={() => handleTabPress('Leaderboard')}
                style={styles.navCell}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'Leaderboard' }}
              >
                <Text
                  style={[
                    styles.navText,
                    activeTab === 'Leaderboard' ? styles.navTextActive : styles.navTextInactive,
                  ]}
                >
                  Leaderboard
                </Text>
                <View
                  style={[
                    styles.navUnderline,
                    activeTab === 'Leaderboard' ? styles.navUnderlineActive : styles.navUnderlineInactive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {/* Row 2: Achievements | Profile */}
            <View style={styles.navRow}>
              <TouchableOpacity
                testID="connect-tab-achievements"
                onPress={() => handleTabPress('Achievements')}
                style={styles.navCell}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'Achievements' }}
              >
                <Text
                  style={[
                    styles.navText,
                    activeTab === 'Achievements' ? styles.navTextActive : styles.navTextInactive,
                  ]}
                >
                  Achievements
                </Text>
                <View
                  style={[
                    styles.navUnderline,
                    activeTab === 'Achievements' ? styles.navUnderlineActive : styles.navUnderlineInactive,
                  ]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                testID="connect-tab-profile"
                onPress={() => handleTabPress('Profile')}
                style={styles.navCell}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'Profile' }}
              >
                <Text
                  style={[
                    styles.navText,
                    activeTab === 'Profile' ? styles.navTextActive : styles.navTextInactive,
                  ]}
                >
                  Profile
                </Text>
                <View
                  style={[
                    styles.navUnderline,
                    activeTab === 'Profile' ? styles.navUnderlineActive : styles.navUnderlineInactive,
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tab Content */}
        <View style={styles.contentWrap}>
          {activeTab === 'Leaderboard' && (
            <LeaderboardScreen
              onSwitchToFriendsTab={() => handleTabPress('Friends')}
            />
          )}

          {activeTab === 'Achievements' && <AchievementsScreen />}

          {activeTab === 'Friends' && (
            <FriendsScreen
              onNavigateLeaderboard={() => handleTabPress('Leaderboard')}
              onNavigateAchievements={() => handleTabPress('Achievements')}
            />
          )}

          {activeTab === 'Profile' && (
            <ProfileScreen
              onSwitchToFriendsTab={() => handleTabPress('Friends')}
            />
          )}
        </View>
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
      fontSize: 42,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: -1.2,
      color: theme.primaryText,
      marginBottom: 4,
    },
    pageSubline: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 20,
    },

    // Two-row Navigation
    navGrid: {
      gap: 16,
      marginBottom: 16,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
    },
    navCell: {
      flex: 1,
    },
    navText: {
      fontSize: 16,
      letterSpacing: -0.2,
      paddingBottom: 8,
    },
    navTextActive: {
      color: theme.accent,
      fontFamily: 'Inter_700Bold',
    },
    navTextInactive: {
      color: theme.primaryText,
      fontFamily: 'Inter_500Medium',
    },
    navUnderline: {
      width: '100%',
    },
    navUnderlineActive: {
      height: 2.5,
      backgroundColor: theme.accent,
      borderRadius: 1,
    },
    navUnderlineInactive: {
      height: 1,
      backgroundColor: theme.separator,
    },

    contentWrap: {
      flex: 1,
    },
  });
}
