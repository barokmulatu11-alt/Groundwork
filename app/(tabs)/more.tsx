import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { hapticLight } from '@/lib/haptics';
import { resolveAvatarUrl } from '@/lib/avatarUtils';

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark, showAlert } = useTheme();
  const { profile, session, isGuest, signOut, isSigningOut } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [signOutLoading, setSignOutLoading] = useState(false);

  const handleExitOrSignOut = () => {
    if (signOutLoading || isSigningOut) return;
    hapticLight();

    const title = isGuest ? 'Exit guest mode' : 'Sign out';
    const message = isGuest
      ? 'Your data remains saved locally on this device. Sign in or create an account to sync across devices.'
      : 'Are you sure you want to sign out? Your local data is preserved and will resume when you sign back in.';

    showAlert({
      title,
      message,
      primaryButton: {
        text: isGuest ? 'Exit guest' : 'Sign out',
        destructive: true,
        onPress: async () => {
          try {
            setSignOutLoading(true);
            await signOut();
            router.replace('/login');
          } catch (err) {
            console.error('Sign out error:', err);
            showAlert({
              title: 'Sign out failed',
              message: 'Could not complete sign out. Please try again.',
              primaryButton: { text: 'OK', onPress: () => {} },
            });
          } finally {
            setSignOutLoading(false);
          }
        },
      },
      secondaryButton: {
        text: 'Cancel',
        onPress: () => {},
      },
    });
  };

  const avatarInitial = (
    profile?.full_name?.charAt(0) ||
    profile?.username?.charAt(0) ||
    session?.user?.email?.charAt(0) ||
    'G'
  ).toUpperCase();

  const rawAvatarUrl =
    profile?.avatar_url ||
    (session?.user?.user_metadata as any)?.avatar_url ||
    (session?.user?.user_metadata as any)?.picture;
  const avatarUrl = resolveAvatarUrl(rawAvatarUrl);

  const isUserAuthenticated = !isGuest && !!session?.user?.id;
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.root}>
      <BrandHeader showBack={false} showMoreMenu={false} />

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 32 : 20,
          paddingTop: 24,
          paddingBottom: Math.max(insets.bottom, 24) + 90,
          maxWidth: isDesktop ? 640 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Label */}
        <Text style={styles.categoryLabel}>SETTINGS</Text>

        {/* Heading & Subtitle */}
        <Text style={styles.pageHeading}>Your space.</Text>
        <Text style={styles.pageSubline}>Set it up your way.</Text>

        {/* Account Area */}
        <View style={styles.accountCard}>
          <View style={styles.avatarCircle}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitialText}>{avatarInitial}</Text>
            )}
          </View>

          <View style={styles.accountInfoCol}>
            {isUserAuthenticated ? (
              <>
                <Text style={styles.accountPrimaryText} numberOfLines={1}>
                  {profile?.full_name || profile?.username || 'Groundwork User'}
                </Text>
                <Text style={styles.accountSecondaryText} numberOfLines={1}>
                  {session?.user?.email || 'Authenticated account'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.accountPrimaryText}>Guest mode</Text>
                <Text style={styles.accountSecondaryText}>Saved on this device</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            onPress={() => {
              if (isUserAuthenticated) {
                router.push('/account-settings' as any);
              } else {
                router.push('/login' as any);
              }
            }}
            style={styles.accountActionBtn}
            accessibilityRole="button"
          >
            <Text style={styles.blueActionText}>
              {isUserAuthenticated ? 'Account →' : 'Sign in →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.thinDivider} />

        {/* ── 01 Your workspace ────────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>01</Text>
          <Text style={styles.sectionTitle}>Your workspace</Text>
        </View>

        {/* Appearance row with large serif Aa and swatches */}
        <TouchableOpacity
          onPress={() => router.push('/appearance-settings' as any)}
          style={styles.appearanceRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={styles.serifAa}>Aa</Text>
          <View style={styles.appearanceTextCol}>
            <Text style={styles.itemTitle}>Appearance</Text>
            <Text style={styles.itemSubtitle}>Type, colour, atmosphere.</Text>
            {/* Color swatches */}
            <View style={styles.swatchesRow}>
              <View style={[styles.swatchDot, { backgroundColor: '#0066FF' }]} />
              <View style={[styles.swatchDot, { backgroundColor: '#F5F2EB' }]} />
              <View
                style={[
                  styles.swatchDot,
                  { backgroundColor: '#000000', borderWidth: 1, borderColor: '#FFFFFF' },
                ]}
              />
            </View>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Productivity */}
        <TouchableOpacity
          onPress={() => router.push('/productivity-settings' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Productivity</Text>
            <Text style={styles.itemSubtitle}>Build your daily rhythm.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity
          onPress={() => router.push('/notification-settings' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Notifications</Text>
            <Text style={styles.itemSubtitle}>Choose when to be interrupted.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.thinDivider} />

        {/* ── 02 Account & privacy ─────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>02</Text>
          <Text style={styles.sectionTitle}>Account & privacy</Text>
        </View>

        {/* Account */}
        <TouchableOpacity
          onPress={() => router.push('/account-settings' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Account</Text>
            <Text style={styles.itemSubtitle}>Profile and sign-in.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Privacy & security */}
        <TouchableOpacity
          onPress={() => router.push('/privacy-settings' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Privacy & security</Text>
            <Text style={styles.itemSubtitle}>App lock, sessions and permissions.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.thinDivider} />

        {/* ── 03 Data & progress ───────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>03</Text>
          <Text style={styles.sectionTitle}>Data & progress</Text>
        </View>

        {/* Productivity analytics */}
        <TouchableOpacity
          onPress={() => router.push('/analytics' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Productivity analytics</Text>
            <Text style={styles.itemSubtitle}>Focus metrics, consistency and trends.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Milestone rewards */}
        <TouchableOpacity
          onPress={() => router.push('/data-settings' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Data & sync</Text>
            <Text style={styles.itemSubtitle}>Backups, import and cloud sync.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Offline storage */}
        <TouchableOpacity
          onPress={() => router.push('/downloads' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Offline storage</Text>
            <Text style={styles.itemSubtitle}>Content saved on this device.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Milestone rewards */}
        <TouchableOpacity
          onPress={() => router.push('/rewards' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Milestone rewards</Text>
            <Text style={styles.itemSubtitle}>Features earned through consistency.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.thinDivider} />

        {/* ── 04 Here to help ──────────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIndex}>04</Text>
          <Text style={styles.sectionTitle}>Here to help</Text>
        </View>

        {/* Support & contact */}
        <TouchableOpacity
          onPress={() => router.push('/support-settings' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>Support & contact</Text>
            <Text style={styles.itemSubtitle}>Get help or report an issue.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* About Groundwork */}
        <TouchableOpacity
          onPress={() => router.push('/about' as any)}
          style={styles.navRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <View style={styles.navTextCol}>
            <Text style={styles.itemTitle}>About Groundwork</Text>
            <Text style={styles.itemSubtitle}>Version, credits and legal.</Text>
          </View>
          <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.thinDivider} />

        {/* Bottom Exit guest mode / Sign out action */}
        <TouchableOpacity
          onPress={handleExitOrSignOut}
          disabled={signOutLoading || isSigningOut}
          style={styles.exitActionRow}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          {signOutLoading || isSigningOut ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Text style={styles.exitActionText}>
              {isGuest ? 'Exit guest mode →' : 'Sign out →'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    categoryLabel: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 2,
      color: theme.secondaryText,
      marginBottom: 6,
    },
    pageHeading: {
      fontSize: 28,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: -0.6,
      color: theme.primaryText,
      marginBottom: 4,
    },
    pageSubline: {
      fontSize: 14,
      fontFamily: 'PlayfairDisplay_600SemiBold_Italic',
      color: theme.secondaryText,
      marginBottom: 20,
    },

    // Account Card
    accountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 14,
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.separator,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardSolid,
      overflow: 'hidden',
      flexShrink: 0,
    },
    avatarImg: {
      width: '100%',
      height: '100%',
      borderRadius: 22,
    },
    avatarInitialText: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    accountInfoCol: {
      flex: 1,
      minWidth: 0,
    },
    accountPrimaryText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    accountSecondaryText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginTop: 2,
    },
    accountActionBtn: {
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    blueActionText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    thinDivider: {
      height: 1,
      backgroundColor: theme.separator,
      marginVertical: 20,
    },

    // Section headers
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
      marginBottom: 16,
    },
    sectionIndex: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      letterSpacing: -0.4,
      color: theme.primaryText,
    },

    // Appearance row
    appearanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 18,
    },
    serifAa: {
      fontSize: 34,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      lineHeight: 40,
    },
    appearanceTextCol: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    itemSubtitle: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginTop: 2,
    },
    swatchesRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    swatchDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },

    // Standard nav rows
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    navTextCol: {
      flex: 1,
      paddingRight: 16,
    },

    // Exit action
    exitActionRow: {
      paddingVertical: 14,
    },
    exitActionText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
  });
