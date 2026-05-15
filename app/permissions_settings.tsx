import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient as BG } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useTheme } from '@/lib/ThemeContext';
import { checkAllPermissions, openSettings } from '@/lib/permissions';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, Folder, Image as ImageIcon, Mic } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

const PermissionRow = ({ icon: Icon, name, subtitle, isAllowed, onPress, theme }: any) => (
  <AnimatedCard>
    <Pressable onPress={onPress} style={[styles.row]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.accentLight, borderColor: 'transparent' }]}>
          <Icon size={20} color={isAllowed ? theme.accent : theme.secondaryText} />
        </View>
        <View>
          <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{name}</Text>
          <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
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
  </AnimatedCard>
);

export default function PermissionsSettings() {
  const router = useRouter();
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
    <BG>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Pressable 
            onPress={() => router.back()} 
            style={[styles.iconBox, { backgroundColor: theme.accentLight, marginBottom: 24 }]}
          >
            <ChevronLeft size={20} color={theme.accent} />
          </Pressable>

          <Text style={[styles.title, { color: theme.primaryText }]}>App Permissions</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Manage what groundwork. can access</Text>

          <View style={styles.list}>
            <PermissionRow 
              icon={Camera} 
              name="Camera" 
              subtitle="Photos for your notes"
              isAllowed={statuses.camera}
              onPress={openSettings}
              theme={theme}
            />
            <PermissionRow 
              icon={Mic} 
              name="Microphone" 
              subtitle="Voice recordings & notes"
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
              isAllowed={true} // Implicit on Android picker
              onPress={openSettings}
              theme={theme}
            />
          </View>

          <Text style={[styles.footer, { color: theme.secondaryText }]}>
            Tapping a row will open your device settings where you can toggle these permissions.
          </Text>
        </ScrollView>
      </View>
    </BG>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 60 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginLeft: -8 },
  backText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginLeft: 4 },
  title: { fontSize: 26, fontFamily: 'System', fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'System', fontWeight: '500', marginBottom: 30 },
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  rowSubtitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  footer: { marginTop: 30, fontSize: 13, textAlign: 'center', fontFamily: 'Inter_500Medium', lineHeight: 20 }
});
