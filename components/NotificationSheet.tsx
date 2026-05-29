import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { AppText as Text } from './ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { X, BellRing as Bell, CheckCircle2, Info, AlertTriangle, Inbox } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  is_read: boolean;
  created_at: string;
}

interface NotificationSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationSheet({ visible, onClose }: NotificationSheetProps) {
  const { theme, isDark } = useTheme();
  const { session } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAllRead = async () => {
    if (!session?.user?.id || notifications.length === 0) return;
    await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    if (visible) fetchNotifications();
  }, [visible]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="#34C759" />;
      case 'warning': return <AlertTriangle size={18} color="#FF9500" />;
      default: return <Info size={18} color={theme.accent} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: theme.cardBorder }]}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Bell size={20} color={theme.primaryText} />
              <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Notifications</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={markAllRead}>
                <Text style={{ fontSize: 13, color: theme.accent, fontFamily: 'Inter_700Bold' }}>Mark all read</Text>
              </Pressable>
              <Pressable onPress={onClose}>
                <X size={20} color={theme.tertiaryText} />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.center}>
              <Inbox size={48} color={theme.tertiaryText} strokeWidth={1} />
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>All caught up!</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {notifications.map((n) => (
                <View 
                  key={n.id} 
                  style={[
                    styles.notificationItem, 
                    { backgroundColor: n.is_read ? 'transparent' : theme.accent + '08' }
                  ]}
                >
                  <View style={styles.iconCol}>
                    {getIcon(n.type)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemTitle, { color: theme.primaryText }]}>{n.title}</Text>
                      <Text style={[styles.itemTime, { color: theme.tertiaryText }]}>
                        {new Date(n.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.itemMessage, { color: theme.secondaryText }]}>{n.message}</Text>
                  </View>
                  {!n.is_read && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
    minHeight: 150,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 12,
  },
  list: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  iconCol: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  itemTime: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  itemMessage: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 16,
    right: 16,
  }
});
