import { AppText as Text } from '@/components/ui/AppText';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { 
    ChevronRight, 
    Bell,
    CheckCircle2,
    ChevronLeft,
    Copy,
    RefreshCw,
    Sun,
    Shield,
    Info,
    LogOut,
    Lock,
    User,
    Zap,
    Crown
 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { NativeSheet } from '@/components/ui/NativeSheet';

import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ProfileHeader } from '@/components/ui/ProfileHeader';

const Card = ({ children, theme }: { children: React.ReactNode; theme: any }) => (
  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
    {children}
  </View>
);

function SettingRow({ icon: Icon, title, subtitle, theme, onPress, destructive, rightElement }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.rowWrapper}>
      <View style={styles.rowContent}>
        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
          <Icon size={18} color={destructive ? theme.danger : theme.accent} />
        </View>
        <View style={styles.infoBox}>
          <Text style={[styles.rowTitle, { color: destructive ? theme.danger : theme.primaryText }]}>{title}</Text>
          {subtitle && <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>}
        </View>
        {rightElement || <ChevronRight size={18} color={theme.tertiaryText} />}
      </View>
    </TouchableOpacity>
  );
}


export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const { theme: settingsTheme, setTheme, notificationsEnabled, setNotificationsEnabled } = useSettingsStore();
  const { session, signOut, isGuest, profile } = useAuthStore();

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showAlert({
          title: "Error",
          message: "Cannot open link",
          primaryButton: { text: "OK", onPress: () => {} }
        });
      }
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Something went wrong",
        primaryButton: { text: "OK", onPress: () => {} }
      });
    }
  };

  const handleSignOut = () => {
    showAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out of groundwork.? You'll need to log in again to sync your data.",
      primaryButton: {
        text: "Sign Out",
        destructive: true,
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login' as any);
          } catch (error) {
            console.error("Sign out failed", error);
          }
        }
      },
      secondaryButton: {
        text: "Cancel",
        onPress: () => {}
      }
    });
  };

  return (
    <BackgroundGradient>
      
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
        <ProfileHeader 
          name={profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')?.[0] || "groundwork. User"}
          username={`@${profile?.username || session?.user?.user_metadata?.username || session?.user?.email?.split('@')?.[0] || 'guest'}`}
          email={session?.user?.email || "guest@groundwork.app"}
          isPro={profile?.pro_status || session?.user?.user_metadata?.is_pro || false}
          isOwner={profile?.role === 'owner' || session?.user?.email === 'barok.m.lakew@gmail.com'}
          isAdmin={profile?.role === 'admin'}
          isModerator={profile?.role === 'moderator'}
          avatarUri={profile?.avatar_url || session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/png?seed=${session?.user?.email || 'Barok'}`}
          onEditPress={() => router.push('/edit-profile' as any)}
        />

        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>USER ACCOUNT</Text>
        <Card theme={theme}>
          <SettingRow 
            icon={User} 
            title="Account" 
            subtitle={session ? "Email, Password, Security" : "Sign in to sync your data"}
            theme={theme}
            onPress={() => {
              if (session) {
                router.push('/account-settings' as any);
              } else {
                router.push('/login' as any);
              }
            }}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 24 }]}>SUBSCRIPTION</Text>
        <Card theme={theme}>
          <SettingRow 
            icon={Crown} 
            title="Groundwork Pro" 
            subtitle="View plans and billing" 
            theme={theme} 
            onPress={() => router.push('/subscription-settings' as any)} 
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 24 }]}>PREFERENCES</Text>
        <Card theme={theme}>
          <SettingRow icon={Sun} title="Appearance" subtitle="Theme, accent color, font size" theme={theme} onPress={() => router.push('/appearance-settings' as any)} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Zap} title="Productivity" subtitle="Priority, reminders, pomodoro, goals" theme={theme} onPress={() => router.push('/productivity-settings' as any)} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Bell} title="Notifications" subtitle="Alerts, sounds, quiet hours" theme={theme} onPress={() => router.push('/notification-settings' as any)} />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 24 }]}>DATA & PRIVACY</Text>
        <Card theme={theme}>
          <SettingRow icon={RefreshCw} title="Data & Sync" subtitle="Cloud backup, export, storage" theme={theme} onPress={() => router.push('/data-settings' as any)} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Shield} title="Privacy & Permissions" subtitle="Biometrics, permissions, PIN, sessions" theme={theme} onPress={() => router.push('/privacy-settings' as any)} />
        </Card>


        {session && !isGuest && (
          <View style={{ marginTop: 40, marginBottom: 20 }}>
            <TouchableOpacity 
              onPress={handleSignOut}
              activeOpacity={0.7}
              style={[
                styles.logoutBtn, 
                { 
                  backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.06)',
                  borderColor: isDark ? 'rgba(255,59,48,0.25)' : 'rgba(255,59,48,0.15)'
                }
              ]}
            >
              <LogOut size={20} color="#FF3B30" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}



      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  rowWrapper: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
  },
  separator: {
    height: 1,
    marginLeft: 46,
    opacity: 0.5,
  },

  header: { paddingHorizontal: 24, paddingBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: -8, marginBottom: 20 },
  backText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginLeft: 4 },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_800ExtraBold' },
  content: { paddingHorizontal: 24, paddingTop: 10 },
  
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  settingCard: { padding: 16, marginBottom: 12, borderRadius: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  settingSubtitle: { fontSize: 13, fontFamily: 'Inter_500Medium', opacity: 0.6 },

  aboutSection: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  aboutText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  sheetContent: { padding: 24 },
  sheetTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  sheetSubtitle: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 24, textAlign: 'center' },
  
  paymentCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  paymentTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  paymentNumber: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  copySuccess: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginTop: 8 },

  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16 },
  contactBtnText: { color: 'white', fontSize: 16, fontFamily: 'Inter_700Bold' },
  
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    width: '100%',
    borderWidth: 1,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  }
});
