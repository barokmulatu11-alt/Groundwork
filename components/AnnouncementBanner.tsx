import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, LayoutAnimation } from 'react-native';
import { AppText as Text } from './ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Info, AlertTriangle, X, Megaphone } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance';
}

export function AnnouncementBanner() {
  const { theme, isDark } = useTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, message, type')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setAnnouncements(data);
      }
    };

    fetchAnnouncements();
  }, []);

  if (!visible || announcements.length === 0) return null;

  const current = announcements[0]; // Just show the latest one for now

  const getColors = () => {
    switch (current.type) {
      case 'warning':
        return { bg: '#FF9500', icon: AlertTriangle };
      case 'maintenance':
        return { bg: '#FF3B30', icon: Info };
      default:
        return { bg: theme.accent, icon: Megaphone };
    }
  };

  const { bg, icon: Icon } = getColors();

  return (
    <Animated.View 
      entering={FadeInUp} 
      exiting={FadeOutUp}
      style={[styles.container, { backgroundColor: bg + '20', borderColor: bg + '40' }]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Icon size={16} color="white" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.primaryText }]}>{current.title}</Text>
          <Text style={[styles.message, { color: theme.secondaryText }]} numberOfLines={2}>
            {current.message}
          </Text>
        </View>
        <Pressable 
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setVisible(false);
          }}
          style={styles.closeButton}
        >
          <X size={16} color={theme.tertiaryText} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
