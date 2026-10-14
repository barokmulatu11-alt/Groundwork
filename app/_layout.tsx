import notifee, { EventType } from '@/lib/safeNotifee';
import { supabase } from '@/lib/supabase';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
import { FontAwesome } from '@expo/vector-icons';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments, DefaultTheme, DarkTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

import { BackgroundGradient } from '@/components/BackgroundGradient';
import { XPToastProvider } from '@/components/XPToastProvider';
import { SecurityProvider } from '@/components/security/SecurityProvider';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { initConnectDb } from '@/lib/connect/connectDatabase';
import { initDb } from '@/lib/db';
import { handleNotificationResponse } from '@/lib/notifications';
import { useAuthStore } from '@/store/useAuthStore';
import { startSyncManager, useStore } from '@/store/useStore';
import * as rewardsService from '@/lib/rewardsService';
import * as audioStorage from '@/lib/audioStorage';
import { useSettingsStore } from '@/store/useSettingsStore';
import * as profileSettingsService from '@/lib/profileSettingsService';
import { useResponsive } from '@/hooks/useResponsive';
import { WebDesktopNav } from '@/components/layout/WebDesktopNav';

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Restrict test hooks exposure: never expose in standard production builds
const isTestOrDev =
  Boolean(__DEV__) ||
  process.env.NODE_ENV === 'test' ||
  process.env.EXPO_PUBLIC_ENABLE_TEST_HOOKS === 'true' ||
  (typeof window !== 'undefined' && (window as any).__GROUNDWORK_ENABLE_TEST_HOOKS__ === true);

if (Platform.OS === 'web' && typeof window !== 'undefined' && isTestOrDev) {
  (window as any).__groundwork = {
    useStore,
    useAuthStore,
    useSettingsStore,
    profileSettingsService,
    rewardsService,
    audioStorage,
    supabase,
  };
}

// Handle notification presses while the app is killed (background event)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // If the user presses a notification while the app is killed,
  // getInitialNotification in RootLayoutNav will handle it.
});

// Renders the correct status bar style (light/dark) based on the current theme
function ThemeAwareStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

// Root layout — manages splash screen, fonts, database init, auth init, and sync
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold_Italic,
    ...FontAwesome.font,
  });

  const { initialize } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // Boot sequence: init DBs, auth, and sync manager
  useEffect(() => {
    let isMounted = true;
    const boot = async () => {
      try {
        console.log('[RootLayout] Starting boot sequence...');
        initDb();
        initConnectDb();
        console.log('[RootLayout] Database initialized');
        await initialize();
        console.log('[RootLayout] Auth initialized');
        const userId = useAuthStore.getState().session?.user?.id || 'guest';
        const { initializeAccountRewards } = await import('@/lib/rewardsService');
        await initializeAccountRewards(userId);
        console.log('[RootLayout] Account rewards initialized');
        startSyncManager();
        console.log('[RootLayout] Sync manager started');
      } catch (e) {
        console.error('[RootLayout] Boot sequence failed:', e);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };
    boot();

    // Safety timeout: Ensure splash screen hides even if fonts or auth hang
    const timer = setTimeout(() => {
      console.log('[RootLayout] Safety timeout reached, forcing splash screen hide');
      if (isMounted) setIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [initialize]);

  // Clean transition: Once fonts and boot sequence are ready, hide native splash once
  useEffect(() => {
    if ((loaded || error) && isReady) {
      console.log('[RootLayout] Ready, hiding native splash screen');
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error, isReady]);

  // Don't render until fonts and boot sequence are ready (prevents flash of unstyled content)
  if ((!loaded && !error) || !isReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <AuthMiddleware />
        <SecurityProvider>
          <RootLayoutNav />
        </SecurityProvider>
      </View>
    </ThemeProvider>
  );
}

// Watches auth state and redirects users to the right screen (welcome, login, onboarding, home).
// Renders nothing — it's a side-effect-only component.
function AuthMiddleware() {
  const router = useRouter();
  const { session, isGuest, isLoading, isOAuthPending, onboardingDone, welcomeShown } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    // CRITICAL: Never navigate while auth is still being initialized.
    // Without this, session=null fires a redirect to /welcome before
    // initialize() has finished — competing with any in-flight OAuth login.
    if (isLoading) return;

    // Also bail out while Google/OAuth sign-in is in progress.
    // This prevents the flash where the middleware sees session=null mid-OAuth
    // and wrongly flips the user to guest mode — causing the open/close/reopen glitch.
    if (isOAuthPending) return;

    const inAuthGroup =
      segments[0] === 'login' ||
      segments[0] === 'signup' ||
      segments[0] === 'welcome' ||
      segments[0] === 'forgot-password' ||
      segments[0] === 'reset-password';
    const inOnboarding = segments[0] === 'permissions_onboarding';

    // Password recovery screen guard: NEVER redirect away from reset-password!
    if (segments[0] === 'reset-password') {
      return;
    }

    if (!session && !isGuest) {
      if (welcomeShown) {
        // User has been here before — send to login, not welcome.
        // Do NOT call setIsGuest here — that causes a state change loop.
        // Just navigate to login if they're not already in an auth screen.
        if (!inAuthGroup) {
          router.replace('/login' as any);
        }
      } else {
        // First time — send to welcome
        if (!inAuthGroup) {
          router.replace('/welcome' as any);
        }
      }
    } else if (session) {
      // Authenticated — redirect away from auth pages
      if (inAuthGroup) {
        if (!onboardingDone) {
          router.replace('/permissions_onboarding' as any);
        } else {
          router.replace('/');
        }
      } else if (!onboardingDone && !inOnboarding) {
        router.replace('/permissions_onboarding' as any);
      }
    }
    // Guest users: allow anywhere
  }, [session, isGuest, isLoading, isOAuthPending, onboardingDone, welcomeShown, segments]);

  return null;
}

// Main navigation container — sets up notification handlers, deep link handling, and screen stack
function RootLayoutNav() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const navTheme = isDark ? DarkTheme : DefaultTheme;
  const segments = useSegments();
  const { isDesktop, isWeb } = useResponsive();

  const isAuthOrOnboarding =
    segments[0] === 'login' ||
    segments[0] === 'signup' ||
    segments[0] === 'welcome' ||
    segments[0] === 'forgot-password' ||
    segments[0] === 'reset-password' ||
    segments[0] === 'permissions_onboarding';

  const showDesktopRail = isWeb && isDesktop && !isAuthOrOnboarding;

  useEffect(() => {
    // Check if app was opened from a notification while killed
    notifee.getInitialNotification().then(initialNotification => {
      if (initialNotification) {
        handleNotificationResponse(initialNotification.notification, router);
      }
    });

    // Handle tapping a notification when app is in foreground
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        handleNotificationResponse(detail.notification, router);
      }
    });
  }, [router]);

  // Global Deep Link Handler — handles cold-start OAuth and password recovery redirects.
  // Full URLs are NOT logged to prevent exposing authentication tokens in logs.
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;

      const getParam = (name: string) => {
        const match = url.match(new RegExp(`[?&#]${name}=([^&#]*)`));
        return match ? decodeURIComponent(match[1]) : null;
      };

      const code = getParam('code');
      const access_token = getParam('access_token');
      const refresh_token = getParam('refresh_token');
      const type = getParam('type');
      const token = getParam('token');
      const isRecovery = type === 'recovery' || url.includes('reset-password');

      // 1. Neon Auth token link (direct token query param or path)
      if (url.includes('reset-password') && !access_token && !code) {
        let extractedToken = token;
        if (!extractedToken && url.includes('reset-password/')) {
          const parts = url.split('reset-password/')[1]?.split(/[?&#]/)[0];
          if (parts && parts.length > 5) {
            extractedToken = parts;
          }
        }
        console.log('[Global DeepLink] Navigating to reset-password screen');
        router.push({ pathname: '/reset-password', params: extractedToken ? { token: extractedToken } : {} });
        return;
      }

      // 2. Supabase Password Recovery link (older build / rollback support)
      if (isRecovery && (access_token || code)) {
        console.log('[Global DeepLink] Handling password recovery link');
        try {
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
          router.replace({ pathname: '/reset-password', params: { mode: 'supabase' } });
          return;
        } catch (e: any) {
          console.error('[Global DeepLink] Failed to process recovery session');
          router.replace('/forgot-password' as any);
          return;
        }
      }

      // 3. Regular OAuth redirects
      if (!code && !access_token) return;

      console.log('[Global DeepLink] Processing OAuth redirect');
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        }
      } catch (e: any) {
        console.error('[Global DeepLink] Failed to handle authentication redirect');
      }
    };

    // Only used for true cold-start deep links (app opened via URL while closed)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeAwareStatusBar />
        <BackgroundGradient>
          <NavigationThemeProvider value={navTheme}>
            <BottomSheetModalProvider>
              <XPToastProvider>
                <View style={{ flex: 1, flexDirection: showDesktopRail ? 'row' : 'column' }}>
                  {showDesktopRail && <WebDesktopNav />}
                  <View style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                    <Stack screenOptions={{ animation: 'fade', contentStyle: { backgroundColor: theme.background } }}>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
                      <Stack.Screen name="login" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                      <Stack.Screen name="signup" options={{ headerShown: false, animation: 'slide_from_right' }} />
                      <Stack.Screen name="forgot-password" options={{ headerShown: false, animation: 'slide_from_right' }} />
                      <Stack.Screen name="reset-password" options={{ headerShown: false, animation: 'slide_from_right' }} />
                      <Stack.Screen name="tasks/index" options={{ headerShown: false }} />
                      <Stack.Screen name="tasks/task-detail" options={{ headerShown: false }} />
                      <Stack.Screen name="habits" options={{ headerShown: false }} />
                      <Stack.Screen name="focus" options={{ headerShown: false }} />
                      <Stack.Screen name="notes/index" options={{ headerShown: false }} />
                      <Stack.Screen name="notes/[id]" options={{ headerShown: false }} />
                      <Stack.Screen name="achievements" options={{ headerShown: false }} />
                      <Stack.Screen name="downloads" options={{ headerShown: false }} />
                      <Stack.Screen name="recap" options={{ headerShown: false }} />
                      <Stack.Screen name="calendar" options={{ headerShown: false }} />
                      <Stack.Screen name="settings" options={{ presentation: 'modal', headerShown: false }} />
                      <Stack.Screen name="profile" options={{ headerShown: false }} />
                      <Stack.Screen name="journey" options={{ headerShown: false }} />
                      <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerShown: false }} />
                      <Stack.Screen name="change-password" options={{ presentation: 'modal', headerShown: false }} />
                      <Stack.Screen name="permissions_onboarding" options={{ headerShown: false }} />
                      <Stack.Screen name="permissions_settings" options={{ headerShown: false }} />
                      <Stack.Screen name="account-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="appearance-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="logo-center" options={{ headerShown: false }} />
                      <Stack.Screen name="productivity-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="data-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="support-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="subscription-settings" options={{ headerShown: false }} />
                      <Stack.Screen name="analytics" options={{ headerShown: false }} />
                      <Stack.Screen name="upgrade" options={{ headerShown: false }} />
                      <Stack.Screen name="payment-history" options={{ headerShown: false }} />
                      <Stack.Screen name="reports" options={{ headerShown: false }} />
                      <Stack.Screen name="revision-insights" options={{ headerShown: false }} />
                    </Stack>
                  </View>
                </View>
              </XPToastProvider>
            </BottomSheetModalProvider>
          </NavigationThemeProvider>
        </BackgroundGradient>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
