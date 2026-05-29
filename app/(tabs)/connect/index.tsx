import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, useWindowDimensions, Platform } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import LeaderboardScreen from '@/components/connect/screens/LeaderboardScreen';
import AchievementsScreen from '@/components/connect/screens/AchievementsScreen';
import FriendsScreen from '@/components/connect/screens/FriendsScreen';
import ProfileScreen from '@/components/connect/screens/ProfileScreen';
import { Sparkles, Trophy, Award, Users, UserCircle } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { hapticSelection } from '@/lib/haptics';

const TABS = [
  { name: 'Leaderboard', Icon: Trophy },
  { name: 'Achievements', Icon: Award },
  { name: 'Friends', Icon: Users },
  { name: 'Profile', Icon: UserCircle }
];

export default function ConnectRootScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 768;
  const contentWidth = isDesktop ? 800 : windowWidth;

  const [activeIndex, setActiveIndex] = useState(0);
  const [tabBarWidth, setTabBarWidth] = useState(contentWidth - 32);
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const indicatorPos = useSharedValue(0);

  useEffect(() => {
    const tabWidth = tabBarWidth / TABS.length;
    indicatorPos.value = withTiming(activeIndex * tabWidth, { duration: 250 });
  }, [activeIndex, tabBarWidth]);

  useEffect(() => {
    if (tab) {
      const tabIndex = parseInt(tab, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < TABS.length) {
        handleTabPress(tabIndex);
      } else if (tab === 'leaderboard') {
        handleTabPress(0);
      } else if (tab === 'achievements') {
        handleTabPress(1);
      } else if (tab === 'friends') {
        handleTabPress(2);
      } else if (tab === 'profile') {
        handleTabPress(3);
      }
    }
  }, [tab]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: tabBarWidth / TABS.length,
    transform: [{ translateX: indicatorPos.value }],
  }));

  const handleTabPress = (index: number) => {
    hapticSelection();
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * contentWidth, animated: false });
  };

  const handleScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / contentWidth);
    if (index !== activeIndex && index >= 0 && index < TABS.length) {
      setActiveIndex(index);
    }
  };

  return (
    <BackgroundGradient>
      <View style={[styles.container, { 
        paddingTop: insets.top,
        maxWidth: isDesktop ? 800 : undefined,
        alignSelf: isDesktop ? 'center' : undefined,
        width: '100%',
      }]}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={[styles.title, { color: theme.primaryText }]}>Connect</Text>
            <Sparkles size={24} color={theme.accent} />
          </View>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Find your squad & climb the ranks</Text>
        </View>

        <View style={styles.tabBarContainer} onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}>
          <Animated.View style={[styles.indicator, { backgroundColor: theme.accent, shadowColor: theme.accent }, indicatorStyle]} />
          {TABS.map((tabItem, i) => {
            const isActive = activeIndex === i;
            const IconComponent = tabItem.Icon;
            return (
              <TouchableOpacity
                key={tabItem.name}
                style={styles.tabBtn}
                activeOpacity={0.7}
                onPress={() => handleTabPress(i)}
              >
                <Animated.View style={[styles.iconWrapper, isActive ? { transform: [{ scale: 1.1 }] } : { transform: [{ scale: 1.0 }] }]}>
                  <IconComponent
                    size={24}
                    color={isActive ? theme.accent : theme.secondaryText}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={parentScrollEnabled}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          style={styles.screenScroll}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: contentWidth, flex: 1 }}>
            <LeaderboardScreen onSwitchToFriendsTab={() => handleTabPress(2)} setParentScrollEnabled={setParentScrollEnabled} />
          </View>
          <View style={{ width: contentWidth, flex: 1 }}>
            <AchievementsScreen />
          </View>
          <View style={{ width: contentWidth, flex: 1 }}>
            <FriendsScreen />
          </View>
          <View style={{ width: contentWidth, flex: 1 }}>
            <ProfileScreen onSwitchToFriendsTab={() => handleTabPress(2)} setParentScrollEnabled={setParentScrollEnabled} />
          </View>
        </ScrollView>
      </View>
    </BackgroundGradient>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 34, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: -1,
    height: 3,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  iconWrapper: { alignItems: 'center', justifyContent: 'center' },
  screenScroll: { flex: 1 },
});
