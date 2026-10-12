import { BackgroundGradient } from '@/components/BackgroundGradient';
import { ProfileHeader } from '@/components/ui/ProfileHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronLeft,
  HelpCircle,
  Info,
  LogOut,
  RefreshCw,
  Shield,
  Sun,
  Trophy,
  User,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, showAlert } = useTheme();
  const insets = useSafeAreaInsets();
  const { session, signOut, isGuest, profile, isSigningOut } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const handleSignOut = () => {
    showAlert({
      title: isGuest ? 'Exit Guest Mode' : 'Sign Out',
      message: isGuest
        ? "Your local data is saved on this device. Sign in or create an account to sync with the cloud."
        : "Are you sure you want to sign out of groundwork.? You'll need to log in again to sync your data.",
      primaryButton: {
        text: isGuest ? 'Exit Guest' : 'Sign Out',
        destructive: true,
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login' as any);
          } catch (error) {
            console.error('Sign out failed', error);
          }
        },
      },
      secondaryButton: {
        text: 'Cancel',
        onPress: () => {},
      },
    });
  };

  return (
    <BackgroundGradient>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 90,
            maxWidth: isDesktop ? 760 : undefined,
            alignSelf: isDesktop ? 'center' : undefined,
            width: '100%',
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={
            isGuest || !session
              ? 'Guest User'
              : profile?.full_name ||
                session?.user?.user_metadata?.full_name ||
                session?.user?.email?.split('@')?.[0] ||
                'groundwork. User'
          }
          username={
            isGuest || !session
              ? '@guest'
              : `@${
                  profile?.username ||
                  session?.user?.user_metadata?.username ||
                  session?.user?.email?.split('@')?.[0] ||
                  'user'
                }`
          }
          email={
            isGuest || !session
              ? 'Local device account (No cloud sync)'
              : session?.user?.email || 'No email'
          }
          isGuest={isGuest || !session}
          isPro={!isGuest && (profile?.pro_status || session?.user?.user_metadata?.is_pro || false)}
          isOwner={!isGuest && (profile?.role === 'owner' || session?.user?.email === 'barok.m.lakew@gmail.com')}
          isAdmin={!isGuest && profile?.role === 'admin'}
          isModerator={!isGuest && profile?.role === 'moderator'}
          avatarUri={!isGuest ? profile?.avatar_url || session?.user?.user_metadata?.avatar_url : undefined}
          onEditPress={() => {
            if (isGuest || !session) {
              router.push('/login' as any);
            } else {
              router.push('/edit-profile' as any);
            }
          }}
        />

        {/* PREFERENCES */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <SettingRow
            icon={Sun}
            title="Appearance"
            subtitle="Theme, accent color, font size & logo"
            theme={theme}
            testID="settings-row-appearance"
            onPress={() => router.push('/appearance-settings' as any)}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Zap}
            title="Productivity"
            subtitle="Priority, reminders, pomodoro, goals"
            theme={theme}
            testID="settings-row-productivity"
            onPress={() => router.push('/productivity-settings' as any)}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Bell}
            title="Notifications"
            subtitle="Alerts, sounds, quiet hours"
            theme={theme}
            testID="settings-row-notifications"
            onPress={() => router.push('/notification-settings' as any)}
          />
        </View>

        {/* ACCOUNT & SECURITY */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>ACCOUNT & SECURITY</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <SettingRow
            icon={User}
            title="Account"
            subtitle={session ? 'Email, Password, Security' : 'Sign in to sync your data'}
            theme={theme}
            testID="settings-row-account"
            onPress={() => {
              if (session) {
                router.push('/account-settings' as any);
              } else {
                router.push('/login' as any);
              }
            }}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Shield}
            title="Privacy & Permissions"
            subtitle="Biometrics, permissions, PIN, sessions"
            theme={theme}
            testID="settings-row-privacy"
            onPress={() => router.push('/privacy-settings' as any)}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Trophy}
            title="Milestone Rewards"
            subtitle="Earned features and progress tiers"
            theme={theme}
            testID="settings-row-rewards"
            onPress={() => router.push('/rewards')}
          />
        </View>

        {/* DATA & BACKUP */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>DATA & STORAGE</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <SettingRow
            icon={RefreshCw}
            title="Data & Sync"
            subtitle="Cloud backup, export, local cache"
            theme={theme}
            testID="settings-row-data"
            onPress={() => router.push('/data-settings' as any)}
          />
        </View>

        {/* HELP & ABOUT */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>HELP & ABOUT</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <SettingRow
            icon={HelpCircle}
            title="Support & FAQ"
            subtitle="Documentation and developer contact"
            theme={theme}
            testID="settings-row-support"
            onPress={() => router.push('/support-settings')}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Info}
            title="About groundwork."
            subtitle="Version, legal, terms & privacy"
            theme={theme}
            testID="settings-row-about"
            onPress={() => router.push('/about' as any)}
          />
        </View>

        {/* SIGN OUT / EXIT GUEST BUTTON */}
        <View style={{ marginTop: 24, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            disabled={isSigningOut}
            activeOpacity={0.7}
            style={[
              styles.logoutBtn,
              {
                backgroundColor: isDark ? 'rgba(255,59,48,0.1)' : 'rgba(255,59,48,0.06)',
                borderColor: isDark ? 'rgba(255,59,48,0.25)' : 'rgba(255,59,48,0.15)',
                opacity: isSigningOut ? 0.7 : 1,
              },
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <>
                <LogOut size={16} color="#FF3B30" style={{ marginRight: 8 }} />
                <Text style={styles.logoutBtnText}>
                  {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -6,
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 14,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 4,
  },
  separator: {
    height: 1,
    marginLeft: 46,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtnText: {
    color: '#FF3B30',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
