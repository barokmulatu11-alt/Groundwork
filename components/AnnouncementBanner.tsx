import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText as Text } from './ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { neonData as supabase } from '@/lib/neon';
import { Info, AlertTriangle, X, Megaphone } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

export interface Announcement {
  id: string;
  title: string;
  message?: string | null;
  type: 'info' | 'warning' | 'maintenance';
  is_active?: boolean;
  expires_at?: string | null;
}

const DISMISSED_KEY = 'groundwork_dismissed_announcements';
const CACHED_KEY = 'groundwork_cached_announcements';

export function AnnouncementBanner() {
  const { theme, isDark } = useTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    try {
      // 1. Load dismissed IDs from local storage
      const dismissedRaw = await AsyncStorage.getItem(DISMISSED_KEY);
      const dismissed: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      setDismissedIds(dismissed);

      // 2. Fetch fresh announcements from public backend API
      let items: Announcement[] = [];
      try {
        const res = await fetch('https://barok-labs.pro.et/api/announcements', {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.announcements)) {
            items = json.announcements;
          }
        }
      } catch (err) {
        console.log('[Announcements] Primary API fetch failed, falling back...');
      }

      // 3. Fallback to PostgREST if backend returned empty or network error
      if (items.length === 0) {
        try {
          const { data } = await supabase
            .from('announcements')
            .select('id, title, message, type, is_active, expires_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          if (data && data.length > 0) {
            items = data;
          }
        } catch (_) {}
      }

      // 4. Fallback to cached items if completely offline
      if (items.length > 0) {
        setAnnouncements(items);
        await AsyncStorage.setItem(CACHED_KEY, JSON.stringify(items));
      } else {
        const cachedRaw = await AsyncStorage.getItem(CACHED_KEY);
        if (cachedRaw) {
          setAnnouncements(JSON.parse(cachedRaw));
        }
      }
    } catch (e) {
      console.warn('[Announcements] Failed to fetch announcements:', e);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Filter out any dismissed announcements
  const activeAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  if (!visible || activeAnnouncements.length === 0) return null;

  const current = activeAnnouncements[0];

  const handleDismiss = async () => {
    setVisible(false);
    try {
      const updated = [...dismissedIds, current.id];
      setDismissedIds(updated);
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  const getColors = () => {
    switch (current.type) {
      case 'warning':
        return {
          bg: '#FF9500',
          containerBg: isDark ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 149, 0, 0.08)',
          borderColor: isDark ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.25)',
          icon: AlertTriangle,
        };
      case 'maintenance':
        return {
          bg: '#FF3B30',
          containerBg: isDark ? 'rgba(255, 59, 48, 0.12)' : 'rgba(255, 59, 48, 0.08)',
          borderColor: isDark ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 59, 48, 0.25)',
          icon: Info,
        };
      default:
        return {
          bg: theme.accent,
          containerBg: isDark ? 'rgba(0, 102, 255, 0.12)' : 'rgba(0, 102, 255, 0.08)',
          borderColor: isDark ? 'rgba(0, 102, 255, 0.3)' : 'rgba(0, 102, 255, 0.25)',
          icon: Megaphone,
        };
    }
  };

  const { bg, containerBg, borderColor, icon: Icon } = getColors();
  const hasMessage = Boolean(current.message && current.message.trim().length > 0);

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: containerBg,
          borderColor: borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Icon size={15} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.primaryText }]}>
            {current.title}
          </Text>
          {hasMessage && (
            <Text
              style={[styles.message, { color: theme.secondaryText }]}
              numberOfLines={3}
            >
              {current.message}
            </Text>
          )}
        </View>
        <Pressable
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss announcement"
        >
          <X size={16} color={theme.secondaryText} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    lineHeight: 18,
  },
  message: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    marginLeft: 6,
  },
});
