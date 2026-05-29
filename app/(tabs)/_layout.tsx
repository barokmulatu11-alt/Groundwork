import { useTheme } from '@/lib/ThemeContext';
import { Tabs, usePathname } from 'expo-router';
import { BookOpen, Home, Menu, Users, Star, MoreHorizontal, ChevronLeft, ChevronRight, LogOut, Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { AppText as Text } from '@/components/ui/AppText';
import { hapticSelection } from '@/lib/haptics';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';

const { width: initWidth } = Dimensions.get('window');

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 72;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const translateX = useRef(new Animated.Value(0)).current;
  const paddingHorizontal = 10;

  const totalTabs = state.routes.length;
  const BAR_WIDTH = isDesktop ? 220 : (width - 80);
  const usableWidth = isDesktop ? 200 : (BAR_WIDTH - (paddingHorizontal * 2));
  const tabWidth = isDesktop ? 200 : (usableWidth / totalTabs);

  useEffect(() => {
    if (!isDesktop) {
      Animated.spring(translateX, {
        toValue: state.index * tabWidth,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    }
  }, [state.index, isDesktop, tabWidth]);

  if (isDesktop) {
    return null; // Sidebar rendered separately
  }

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 16), width: BAR_WIDTH }]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blurContainer,
          {
            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            borderColor: theme.cardBorder,
          }
        ]}
      >
        <View style={[styles.tabItemsContainer, { paddingHorizontal }]}>
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                width: tabWidth - 12,
                backgroundColor: theme.accent + '15',
                transform: [{ translateX: Animated.add(translateX, 6) }],
              }
            ]}
          />
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                hapticSelection();
                navigation.navigate(route.name);
              }
            };

            const Icon = options.tabBarIcon;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  {Icon && Icon({ color: isFocused ? theme.accent : theme.secondaryText, focused: isFocused, size: 24 })}
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: isFocused ? theme.accent : theme.secondaryText,
                      fontFamily: isFocused ? 'Inter_700Bold' : 'Inter_500Medium',
                    }
                  ]}
                >
                  {options.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { profile, signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = width >= 768;

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Animated sidebar width
  const sidebarAnim = useRef(new Animated.Value(SIDEBAR_EXPANDED)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const collapseIconRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sidebarAnim, {
        toValue: isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        useNativeDriver: false,
        damping: 20,
        stiffness: 180,
        mass: 0.8,
      }),
      Animated.timing(contentOpacity, {
        toValue: isCollapsed ? 0 : 1,
        duration: isCollapsed ? 80 : 200,
        useNativeDriver: true,
      }),
      Animated.spring(collapseIconRotate, {
        toValue: isCollapsed ? 1 : 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }),
    ]).start();
  }, [isCollapsed]);

  const rotateInterpolate = collapseIconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const sidebarRoutes = [
    { name: 'index', title: 'Home', path: '/(tabs)/', Icon: Home },
    { name: 'courses', title: 'Courses', path: '/(tabs)/courses', Icon: BookOpen },
    { name: 'connect', title: 'Connect', path: '/(tabs)/connect', Icon: Users },
    { name: 'more', title: 'More', path: '/(tabs)/more', Icon: MoreHorizontal },
  ];

  const isActive = (routeName: string) => {
    if (routeName === 'index') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/';
    return pathname.includes(routeName);
  };

  if (isDesktop) {
    return (
      <View style={[styles.desktopContainer, { backgroundColor: isDark ? '#080808' : '#f2f3f7' }]}>
        {/* Sidebar */}
        <Animated.View
          style={[
            styles.sidebar,
            {
              width: sidebarAnim,
              backgroundColor: isDark ? '#0c0c0e' : '#ffffff',
              borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            }
          ]}
        >
          {/* Top section: brand + collapse button */}
          <View style={styles.sidebarTop}>
            <View style={[styles.sidebarHeader]}>
              {/* Brand mark — always visible */}
              <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
                <Text style={styles.brandMarkText}>G</Text>
              </View>

              {/* Brand name — fades out when collapsed */}
              <Animated.View style={{ flex: 1, opacity: contentOpacity, marginLeft: 10 }} pointerEvents={isCollapsed ? 'none' : 'auto'}>
                <Text style={[styles.brandName, { color: theme.primaryText }]}>
                  ground<Text style={{ color: theme.accent }}>work</Text>
                </Text>
                {profile?.pro_status && (
                  <View style={[styles.proBadge, { backgroundColor: theme.accent + '20', borderColor: theme.accent + '50' }]}>
                    <Zap size={9} color={theme.accent} fill={theme.accent} />
                    <Text style={[styles.proBadgeText, { color: theme.accent }]}>PRO</Text>
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Collapse toggle button */}
            <TouchableOpacity
              onPress={() => { hapticSelection(); setIsCollapsed(!isCollapsed); }}
              style={[styles.collapseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <ChevronLeft size={15} color={theme.secondaryText} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

          {/* Nav Items */}
          <View style={styles.sidebarMenu}>
            {sidebarRoutes.map((route) => {
              const active = isActive(route.name);
              return (
                <TouchableOpacity
                  key={route.name}
                  onPress={() => {
                    hapticSelection();
                    router.push(`/(tabs)/${route.name === 'index' ? '' : route.name}` as any);
                  }}
                  style={[
                    styles.navItem,
                    isCollapsed && styles.navItemCollapsed,
                    active && {
                      backgroundColor: theme.accent + '14',
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <View style={[styles.activeBar, { backgroundColor: theme.accent }]} />
                  )}

                  <View style={[
                    styles.navIconWrap,
                    active && { backgroundColor: theme.accent + '18' }
                  ]}>
                    <route.Icon
                      size={18}
                      color={active ? theme.accent : theme.secondaryText}
                      strokeWidth={active ? 2.5 : 1.8}
                    />
                  </View>

                  <Animated.View style={{ flex: 1, opacity: contentOpacity }} pointerEvents={isCollapsed ? 'none' : 'auto'}>
                    <Text
                      style={[
                        styles.navLabel,
                        {
                          color: active ? theme.accent : theme.secondaryText,
                          fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium',
                        }
                      ]}
                    >
                      {route.title}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={[styles.sidebarFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            {/* User card */}
            <View style={styles.userCard}>
              <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                <Text style={styles.avatarText}>
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <Animated.View style={[{ flex: 1, marginLeft: 10, overflow: 'hidden' }, { opacity: contentOpacity }]} pointerEvents={isCollapsed ? 'none' : 'auto'}>
                <Text style={[styles.userName, { color: theme.primaryText }]} numberOfLines={1}>
                  {profile?.full_name || profile?.username || 'User'}
                </Text>
                <Text style={[styles.userSub, { color: theme.secondaryText }]}>
                  Level {profile?.level || 1} · {profile?.xp || 0} XP
                </Text>
              </Animated.View>
            </View>

            {/* Sign out */}
            <TouchableOpacity
              onPress={() => signOut()}
              style={[
                styles.signOutBtn,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  paddingHorizontal: isCollapsed ? 0 : 12,
                }
              ]}
              activeOpacity={0.7}
            >
              <LogOut size={14} color={theme.danger} strokeWidth={2} />
              <Animated.View style={{ opacity: contentOpacity, marginLeft: 8 }} pointerEvents={isCollapsed ? 'none' : 'auto'}>
                <Text style={{ color: theme.danger, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                  Sign Out
                </Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Content */}
        <View style={styles.desktopContent}>
          <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
                tabBarIcon: ({ color }) => <Home size={22} color={color} />,
              }}
            />
            <Tabs.Screen
              name="courses"
              options={{
                title: 'Courses',
                tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
              }}
            />
            <Tabs.Screen
              name="connect"
              options={{
                title: 'Connect',
                tabBarIcon: ({ color }) => <Users size={22} color={color} />,
              }}
            />
            <Tabs.Screen
              name="more"
              options={{
                title: 'More',
                tabBarIcon: ({ color }) => <MoreHorizontal size={22} color={color} />,
              }}
            />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MoreHorizontal size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // ── Mobile bottom tab bar ──────────────────────────────
  container: {
    position: 'absolute',
    left: 40,
    right: 40,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  blurContainer: {
    flex: 1,
    borderRadius: 30,
    borderWidth: 1,
  },
  tabItemsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    height: 36,
    borderRadius: 18,
    zIndex: -1,
  },
  iconWrapper: { marginBottom: 2 },
  label: { fontSize: 9, letterSpacing: 0.1 },

  // ── Desktop layout ─────────────────────────────────────
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  sidebar: {
    height: '100%',
    borderRightWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 16,
    justifyContent: 'flex-start',
    zIndex: 10,
  },
  sidebarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 6,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandMarkText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  brandName: {
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.3,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  proBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  sidebarMenu: {
    flex: 1,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 10,
    position: 'relative',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: 3,
  },
  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navLabel: {
    fontSize: 13,
    marginLeft: 10,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  userName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  userSub: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  desktopContent: {
    flex: 1,
    height: '100%',
  },
});
