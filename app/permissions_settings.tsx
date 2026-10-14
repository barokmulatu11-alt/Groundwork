import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { checkAllPermissions, openSettings } from '@/lib/permissions';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Folder, Image as ImageIcon, Mic } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PermissionRow = ({ icon: Icon, name, subtitle, isAllowed, onPress, theme }: any) => (
  <View style={[styles.card, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${theme.accent}15` }]}>
          <Icon size={20} color={isAllowed ? theme.accent : theme.textMuted} />
        </View>
        <View>
          <Text style={[styles.rowTitle, { color: theme.text }]}>{name}</Text>
          <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
      
      <View style={[
        styles.badge, 
        { backgroundColor: isAllowed ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.1)' }
      ]}>
        <Text style={[
          styles.badgeText, 
          { color: isAllowed ? '#34C759' : '#FF3B30' }
        ]}>
          {isAllowed ? 'Allowed' : 'Denied'}
        </Text>
      </View>
    </Pressable>
  </View>
);

export default function PermissionsSettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [statuses, setStatuses] = useState({
    camera: false,
    microphone: false,
    media: false,
  });

  const updateStatuses = async () => {
    const s = await checkAllPermissions();
    setStatuses(s);
  };

  useFocusEffect(
    useCallback(() => {
      updateStatuses();
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandHeader title="groundwork." onBack={() => router.back()} />

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 28, marginTop: 8 }}>
          <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -1 }}>
            Permissions.
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
            Manage device hardware access.
          </Text>
        </View>

        <View style={styles.list}>
          <PermissionRow 
            icon={Mic} 
            name="Microphone" 
            subtitle="Voice recordings & audio input"
            isAllowed={statuses.microphone}
            onPress={openSettings}
            theme={theme}
          />
          <PermissionRow 
            icon={ImageIcon} 
            name="Photos & Media" 
            subtitle="Pick from your gallery"
            isAllowed={statuses.media}
            onPress={openSettings}
            theme={theme}
          />
          <PermissionRow 
            icon={Folder} 
            name="Files" 
            subtitle="Attachments & downloads"
            isAllowed={true}
            onPress={openSettings}
            theme={theme}
          />
        </View>

        <Text style={[styles.footer, { color: theme.textSecondary }]}>
          {Platform.OS === 'web'
            ? 'On web browsers, permissions are managed directly in your browser. Click the lock/settings icon next to your address bar to adjust camera, microphone, and notifications.'
            : 'Tapping a row will open your device settings where you can toggle these permissions.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 10 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconContainer: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  rowSubtitle: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  footer: { marginTop: 28, fontSize: 13, textAlign: 'center', fontFamily: 'Inter_500Medium', lineHeight: 20 }
});
