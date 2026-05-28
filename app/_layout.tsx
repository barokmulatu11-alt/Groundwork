import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import {
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { FontAwesome } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import notifee, { EventType } from '@/lib/safeNotifee';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

import { BackgroundGradient } from '@/components/BackgroundGradient';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { initDb } from '@/lib/db';
import { initConnectDb } from '@/lib/connect/connectDatabase';
import { handleNotificationResponse } from '@/lib/notifications';
import { useAuthStore } from '@/store/useAuthStore';
import { startSyncManager } from '@/store/useStore';
import { SecurityProvider } from '@/components/security/SecurityProvider';
import { AnimatedSplashScreen } from '@/components/AnimatedSplashScreen';
import { UniversalRefreshButton } from '@/components/ui/UniversalRefreshButton';
import { XPToastProvider } from '@/components/XPToastProvider';
import { WebAuthHeader } from '@/components/ui/WebAuthHeader';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Background events are handled here. If the user presses a notification
  // while the app is killed, getInitialNotification in RootLayoutNav will handle it.
});

function ThemeAwareStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />;
}

export default function RootLayout() {
  const [splashComplete, setSplashComplete] = useState(false);
  const [loaded, error] = useFonts({
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    ...FontAwesome.font,
  });

  const { initialize } = useAuthStore();

  useEffect(() => {
    const boot = async () => {
      try {
        console.log('[RootLayout] Starting boot sequence...');
        initDb();
        initConnectDb();
        console.log('[RootLayout] Database initialized');
        await initialize();
        console.log('[RootLayout] Auth initialized');
        startSyncManager();
        console.log('[RootLayout] Sync manager started');
      } catch (e) {
        console.error('[RootLayout] Boot sequence failed:', e);
      }
    };
    boot();

    // Safety timeout: Ensure splash screen hides even if fonts or auth hang
    const timer = setTimeout(() => {
      console.log('[RootLayout] Safety timeout reached, forcing splash screen hide');
      SplashScreen.hideAsync().catch(() => {});
    }, 5000);

    return () => clearTimeout(timer);
  }, [initialize]);

  useEffect(() => {
    if (error) {
      console.error('[RootLayout] Font loading error:', error);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      console.log('[RootLayout] Fonts loaded, hiding splash screen');
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        {!splashComplete ? (
          <AnimatedSplashScreen onFinish={() => setSplashComplete(true)} />
        ) : (
          <>
            <WebAuthHeader />
            <AuthMiddleware />
            <SecurityProvider>
              <RootLayoutNav />
            </SecurityProvider>
          </>
        )}
      </View>
    </ThemeProvider>
  );
}

function AuthMiddleware() {
  const router = useRouter();
  const { session, isGuest, isLoading, onboardingDone, welcomeShown, setIsGuest } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    // CRITICAL: Never navigate while auth is still being initialized.
    // Without this, session=null fires a redirect to /welcome before
    // initialize() has finished — competing with any in-flight OAuth login.
    if (isLoading) return;

    const inAuthGroup =
      segments[0] === 'login' ||
      segments[0] === 'signup' ||
      segments[0] === 'welcome' ||
      segments[0] === 'forgot-password';
    const inOnboarding = segments[0] === 'permissions_onboarding';

    if (!session && !isGuest) {
      if (welcomeShown) {
        // User already onboarded once, default to guest state rather than kicking them to welcome screen
        setIsGuest(true);
      } else {
        // Not logged in and welcome not shown yet — send to welcome
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
  }, [session, isGuest, isLoading, onboardingDone, welcomeShown, segments]);

  return null;
}

function RootLayoutNav() {
  const router = useRouter();

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

  // Global Deep Link Handler — handles cold-start OAuth redirects only.
  // Navigation is handled solely by AuthMiddleware watching session state.
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url) return;
      
      console.log('[Global DeepLink] Received URL:', url);
      
      const getParam = (name: string) => {
        const match = url.match(new RegExp(`[?&#]${name}=([^&#]*)`));
        return match ? decodeURIComponent(match[1]) : null;
      };

      const code = getParam('code');
      const access_token = getParam('access_token');
      const refresh_token = getParam('refresh_token');

      // Only process if this is actually an auth redirect
      if (!code && !access_token) return;

      try {
        if (code) {
          console.log('[Global DeepLink] Exchanging PKCE code for session...');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          // onAuthStateChange in useAuthStore fires automatically → AuthMiddleware navigates
        } else if (access_token && refresh_token) {
          console.log('[Global DeepLink] Setting session from implicit flow...');
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          // onAuthStateChange fires automatically → AuthMiddleware navigates
        }
      } catch (e: any) {
        console.error('[Global DeepLink] Failed to handle authentication redirect:', e);
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
          <NavigationThemeProvider value={DefaultTheme}>
            <BottomSheetModalProvider>
              <XPToastProvider>
              <UniversalRefreshButton />
              <Stack screenOptions={{ animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="login" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                <Stack.Screen name="signup" options={{ headerShown: false, animation: 'slide_from_right' }} />
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
                <Stack.Screen name="edit-profile" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="change-password" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="permissions_onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="permissions_settings" options={{ headerShown: false }} />
                <Stack.Screen name="account-settings" options={{ headerShown: false }} />
                <Stack.Screen name="appearance-settings" options={{ headerShown: false }} />
                <Stack.Screen name="productivity-settings" options={{ headerShown: false }} />
                <Stack.Screen name="data-settings" options={{ headerShown: false }} />
                <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
                <Stack.Screen name="support-settings" options={{ headerShown: false }} />
                <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
                <Stack.Screen name="subscription-settings" options={{ headerShown: false }} />
              </Stack>
              </XPToastProvider>
            </BottomSheetModalProvider>
          </NavigationThemeProvider>
        </BackgroundGradient>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
