import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  Home,
  CheckSquare,
  Timer,
  Sparkles,
  Users,
  Calendar,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  CloudCheck,
  CloudOff,
  LogOut,
  User,
} from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { hapticSelection } from '@/lib/haptics';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: any;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', label: 'Today', path: '/(tabs)', icon: Home },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { id: 'focus', label: 'Focus', path: '/focus', icon: Timer },
  { id: 'habits', label: 'Habits', path: '/habits', icon: Sparkles },
  { id: 'connect', label: 'Connect', path: '/(tabs)/connect', icon: Users },
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: Calendar },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
];

export function WebDesktopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, isDark, toggleTheme } = useTheme();
  const { profile, session, isGuest, signOut } = useAuthStore();
  const { syncStatus } = useStore();
  const { offlineMode } = useSettingsStore();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const navWidth = isCollapsed ? 76 : 240;

  const isRouteActive = (item: NavItem) => {
    if (item.id === 'today') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '';
    }
    if (item.id === 'connect') {
      return pathname.includes('connect');
    }
    if (item.id === 'tasks') {
      return pathname.startsWith('/tasks');
    }
    return pathname.startsWith(item.path);
  };

  const handleNavigate = (path: string) => {
    hapticSelection();
    router.push(path as any);
  };

  const username = profile?.username || session?.user?.email?.split('@')[0] || (isGuest ? 'Guest' : 'User');
  const avatarInitial = username.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.railContainer,
        {
          width: navWidth,
          backgroundColor: isDark ? '#000000' : '#FAF9F6',
          borderRightColor: theme.separator,
        },
      ]}
    >
      {/* ── Brand Header ────────────────────────────────────── */}
      <View style={[styles.brandSection, isCollapsed && styles.brandSectionCollapsed]}>
        <TouchableOpacity
          onPress={() => handleNavigate('/(tabs)')}
          style={styles.brandTouchable}
          activeOpacity={0.8}
          accessibilityRole="link"
          accessibilityLabel="Groundwork home"
        >
          <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
            <Text style={styles.brandMarkText}>G</Text>
          </View>
          {!isCollapsed && (
            <View style={styles.brandNameWrap}>
              <Text style={[styles.brandName, { color: theme.primaryText }]}>
                <Text style={{ color: theme.accent }}>g</Text>roundwork
                <Text style={{ color: theme.accent }}>.</Text>
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Nav Links ────────────────────────────────────────── */}
      <View style={styles.navItemsList}>
        {NAV_ITEMS.map((item) => {
          const active = isRouteActive(item);
          const IconComponent = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleNavigate(item.path)}
              style={[
                styles.navItemRow,
                isCollapsed && styles.navItemRowCollapsed,
                active && [
                  styles.navItemRowActive,
                  { backgroundColor: isDark ? 'rgba(0, 102, 255, 0.12)' : 'rgba(0, 102, 255, 0.08)' },
                ],
              ]}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
            >
              {/* Active left indicator bar */}
              {active && (
                <View style={[styles.activeIndicator, { backgroundColor: theme.accent }]} />
              )}

              <View style={styles.iconBox}>
                <IconComponent
                  size={19}
                  color={active ? theme.accent : theme.secondaryText}
                  strokeWidth={active ? 2.4 : 2}
                />
              </View>

              {!isCollapsed && (
                <Text
                  style={[
                    styles.navItemLabel,
                    { color: active ? theme.accent : theme.secondaryText },
                    active && styles.navItemLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Bottom Controls Section ──────────────────────────── */}
      <View style={[styles.bottomSection, isCollapsed && styles.bottomSectionCollapsed]}>
        {/* Sync Status Indicator */}
        <View style={[styles.syncStatusRow, isCollapsed && styles.syncStatusRowCollapsed]}>
          {offlineMode ? (
            <CloudOff size={15} color={theme.textMuted} />
          ) : (
            <CloudCheck size={15} color={theme.accent} />
          )}
          {!isCollapsed && (
            <Text style={[styles.syncStatusText, { color: theme.secondaryText }]}>
              {offlineMode ? 'Offline mode' : syncStatus === 'syncing' ? 'Syncing...' : 'Synced'}
            </Text>
          )}
        </View>

        {/* Theme switcher */}
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            toggleTheme();
          }}
          style={[
            styles.utilityBtn,
            isCollapsed && styles.utilityBtnCollapsed,
            { borderColor: theme.separator },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        >
          {isDark ? (
            <Sun size={16} color={theme.primaryText} strokeWidth={2} />
          ) : (
            <Moon size={16} color={theme.primaryText} strokeWidth={2} />
          )}
          {!isCollapsed && (
            <Text style={[styles.utilityBtnText, { color: theme.primaryText }]}>
              {isDark ? 'Light theme' : 'Dark theme'}
            </Text>
          )}
        </TouchableOpacity>

        {/* User Account / Profile Chip */}
        <TouchableOpacity
          onPress={() => handleNavigate('/settings')}
          style={[
            styles.userProfileChip,
            isCollapsed && styles.userProfileChipCollapsed,
            { borderColor: theme.separator, backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF' },
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="User settings and account"
        >
          <View style={[styles.avatarCircle, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarInitialText}>{avatarInitial}</Text>
          </View>
          {!isCollapsed && (
            <View style={styles.userInfoTextCol}>
              <Text style={[styles.usernameText, { color: theme.primaryText }]} numberOfLines={1}>
                {username}
              </Text>
              <Text style={[styles.userRoleText, { color: theme.secondaryText }]}>
                {isGuest ? 'Guest user' : 'Personal account'}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Rail Collapse Toggle */}
        <TouchableOpacity
          onPress={() => {
            hapticSelection();
            setIsCollapsed(!isCollapsed);
          }}
          style={[styles.collapseBtn, { borderColor: theme.separator }]}
          accessibilityRole="button"
          accessibilityLabel={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isCollapsed ? (
            <ChevronRight size={16} color={theme.secondaryText} />
          ) : (
            <View style={styles.collapseFullRow}>
              <ChevronLeft size={16} color={theme.secondaryText} />
              <Text style={[styles.collapseText, { color: theme.secondaryText }]}>Collapse</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  railContainer: {
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 100,
    userSelect: 'none',
  },
  brandSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  brandSectionCollapsed: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  brandTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_900Black',
    fontSize: 16,
    lineHeight: 18,
  },
  brandNameWrap: {
    flexDirection: 'row',
  },
  brandName: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.6,
  },

  // Nav list
  navItemsList: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 4,
  },
  navItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
  },
  navItemRowCollapsed: {
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  navItemRowActive: {},
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 1.5,
  },
  iconBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navItemLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  navItemLabelActive: {
    fontFamily: 'Inter_700Bold',
  },

  // Bottom section
  bottomSection: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
    gap: 10,
  },
  bottomSectionCollapsed: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  syncStatusRowCollapsed: {
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  syncStatusText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  utilityBtnCollapsed: {
    paddingHorizontal: 0,
    width: 40,
    justifyContent: 'center',
  },
  utilityBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  userProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  userProfileChipCollapsed: {
    paddingHorizontal: 0,
    width: 40,
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  userInfoTextCol: {
    flex: 1,
  },
  usernameText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  userRoleText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  collapseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  collapseFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collapseText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
});
