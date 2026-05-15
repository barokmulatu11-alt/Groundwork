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
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

import { BackgroundGradient } from '@/components/BackgroundGradient';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { initDb } from '@/lib/db';
import { handleNotificationResponse } from '@/lib/notifications';
import { useAuthStore } from '@/store/useAuthStore';
import { startSyncManager } from '@/store/useStore';
import { AppLockScreen } from '@/components/AppLockScreen';
import { AnimatedSplashScreen } from '@/components/AnimatedSplashScreen';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

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
            <AuthMiddleware />
            <AppLockScreen />
            <RootLayoutNav />
          </>
        )}
      </View>
    </ThemeProvider>
  );
}

function AuthMiddleware() {
  const router = useRouter();
  const { session, isGuest } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    const checkNavigation = async () => {
      const inAuthGroup =
        segments[0] === 'login' ||
        segments[0] === 'signup' ||
        segments[0] === 'welcome' ||
        segments[0] === 'forgot-password';
      const inOnboarding = segments[0] === 'permissions_onboarding';
      const done = await AsyncStorage.getItem('permissions_onboarding_done');

      if (!session && !isGuest) {
        // Not logged in at all — force to welcome
        if (!inAuthGroup) {
          router.replace('/welcome' as any);
        }
      } else if (session) {
        // Fully authenticated user — redirect away from auth pages
        if (inAuthGroup) {
          if (!done) {
            router.replace('/permissions_onboarding' as any);
          } else {
            router.replace('/');
          }
        } else if (!done && !inOnboarding) {
          router.replace('/permissions_onboarding' as any);
        }
      }
      // Guest users: allow them to go anywhere including login/signup
    };
    checkNavigation();
  }, [session, isGuest, segments]);

  return null;
}

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    // Handle tapping a notification when app is in foreground or background
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationResponse(response, router);
    });
    return () => sub.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeAwareStatusBar />
        <BackgroundGradient>
          <NavigationThemeProvider value={DefaultTheme}>
            <BottomSheetModalProvider>
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
            </BottomSheetModalProvider>
          </NavigationThemeProvider>
        </BackgroundGradient>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
