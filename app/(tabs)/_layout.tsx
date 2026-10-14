import { useTheme } from '@/lib/ThemeContext';
import { Tabs, usePathname } from 'expo-router';
import { Home, Menu, Users, Star, MoreHorizontal, ChevronLeft, ChevronRight, LogOut, Zap } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
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
  const isDesktop = width >= 1100;

  if (isDesktop) {
    return null; // Desktop uses persistent left rail from root layout
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.background,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.separator,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          width: '100%',
          maxWidth: 480,
          alignSelf: 'center',
        }}
      >
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
          const activeColor = theme.accent;
          const inactiveColor = theme.secondaryText;
          const color = isFocused ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 4,
              }}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.title || route.name}
            >
              <View style={{ marginBottom: 3, alignItems: 'center', justifyContent: 'center' }}>
                {Icon && Icon({ color, focused: isFocused, size: 22 })}
              </View>
              <Text
                style={{
                  color,
                  fontSize: 11,
                  fontFamily: isFocused ? 'Inter_700Bold' : 'Inter_500Medium',
                }}
              >
                {options.title}
              </Text>
              {isFocused && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.accent,
                    marginTop: 3,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }: any) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} fill={focused ? color : 'none'} />
          ),
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

});
