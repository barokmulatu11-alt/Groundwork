import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { ActionRow } from '@/components/ui/ActionRow';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Lock,
  LogOut,
  Mail,
  User,
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AccountSettingsScreen() {
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  const { signOut } = useAuthStore();

  const handleSignOut = () => {
    showAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out of groundwork.?",
      primaryButton: {
        text: "Sign Out",
        destructive: true,
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        }
      },
      secondaryButton: { text: "Cancel", onPress: () => {} }
    });
  };

  const handleDeletePress = () => {
    showAlert({
      title: "Delete Account?",
      message: "This will permanently delete your account and all associated data. This cannot be undone.",
      primaryButton: {
        text: "Delete Everything",
        destructive: true,
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        }
      },
      secondaryButton: { text: "Cancel", onPress: () => {} }
    });
  };

  return (
    <BackgroundGradient>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>PERSONAL INFO</Text>
        <View style={styles.group}>
          <ActionRow Icon={User} title="Change Name" subtitle={session?.user?.user_metadata?.full_name || "Barok Mulatu"} onPress={() => {}} />
          <ActionRow Icon={User} title="Change Username" subtitle={`@${session?.user?.user_metadata?.username || "barok"}`} onPress={() => router.push('/edit-profile')} />
          <ActionRow Icon={Mail} title="Change Email" subtitle={session?.user?.email || "barok@example.com"} onPress={() => {}} />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 24 }]}>SECURITY</Text>
        <View style={styles.group}>
          <ActionRow
            Icon={Lock}
            title="Change Password"
            onPress={() => router.push('/change-password' as any)}
          />
        </View>
        <View style={styles.logoutContainer}>
          <TouchableOpacity onPress={handleSignOut} style={[styles.logoutButton, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.06)' }]}>
            <LogOut size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: -4, marginBottom: 20 },
  backText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginLeft: 4 },
  headerTitle: { fontSize: 34, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1 },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
  group: { marginBottom: 8 },
  logoutContainer: { marginTop: 40, marginBottom: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20, gap: 10, width: '100%', justifyContent: 'center' },
  logoutText: { color: '#FF3B30', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
