import { AppText as Text } from '@/components/ui/AppText';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { setIsGuest } = useAuthStore();
  const [googleLoading, setGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
  }, []);

  const handleSignInWithGoogle = async () => {
    try {
      setGoogleLoading(true);
      const redirectUrl = __DEV__ ? Linking.createURL('/') : 'groundwork://';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account consent',
            access_type: 'offline',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success' && res.url) {
          const url = res.url;
          const getParam = (name: string) => {
            const match = url.match(new RegExp(`[?&#]${name}=([^&#]*)`));
            return match ? decodeURIComponent(match[1]) : null;
          };
          const code = getParam('code');
          const access_token = getParam('access_token');
          const refresh_token = getParam('refresh_token');

          if (code) {
            const { data: sessionData, error: exchError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchError) throw exchError;
            // onAuthStateChange handles Zustand state update — AuthMiddleware handles navigation
          } else if (access_token && refresh_token) {
            const { error: sessError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessError) throw sessError;
            // onAuthStateChange fires automatically
          }
          // AuthMiddleware will handle navigation when session updates — do NOT call router.replace here
        }
      } else {
        throw new Error('No authentication URL returned from Supabase.');
      }
    } catch (e: any) {
      console.error('[Auth] Google sign in error:', e);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCreateAccount = () => {
    router.push('/signup' as any);
  };

  const handleSignIn = () => {
    router.push('/login' as any);
  };

  const handleContinueWithoutAccount = () => {
    setIsGuest(true);
    router.replace('/');
  };

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, justifyContent: 'center', padding: 24 }}
      >
        {Platform.OS === 'web' ? (
          <View style={{ position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 10, zIndex: 10 }}>
            <Pressable
              onPress={handleSignIn}
              style={[styles.webTopSecondary, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
            >
              <Text style={[styles.webTopSecondaryText, { color: theme.primaryText }]}>Log in</Text>
            </Pressable>
            <Pressable
              onPress={handleCreateAccount}
              style={[styles.webTopPrimary, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.webTopPrimaryText}>Sign up</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={{ alignItems: 'center', zIndex: 1 }}>
          <Animated.View entering={FadeInUp.delay(0).duration(300)} style={{ alignItems: 'center', marginBottom: 40 }}>
            <BrandLogo fontSize={42} />
          </Animated.View>

          <Animated.Text 
            entering={FadeInUp.delay(100).duration(300)}
            style={[styles.tagline, { color: theme.primaryText }]}
          >
            Your daily focus companion.
          </Animated.Text>

          <Animated.Text 
            entering={FadeInUp.delay(200).duration(300)}
            style={[styles.subtitle, { color: theme.secondaryText }]}
          >
            Plan. Focus. Build habits. Learn.
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(300).duration(300)} style={{ width: '100%', marginTop: 48 }}>
            <Pressable
              onPress={handleCreateAccount}
              style={[styles.primaryButton, { backgroundColor: theme.accent, }]}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </Pressable>

            <Pressable
              onPress={handleSignIn}
              style={[styles.secondaryButton, { 
                backgroundColor: theme.card,
                borderColor: theme.cardBorder
              }]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.primaryText }]}>{'Sign In'}</Text>
            </Pressable>

            <Pressable
              onPress={handleSignInWithGoogle}
              disabled={googleLoading}
              style={[styles.secondaryButton, { 
                backgroundColor: theme.accentLight,
                borderColor: theme.accentBorder,
                marginTop: 12,
                opacity: googleLoading ? 0.7 : 1
              }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {googleLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <FontAwesome name="google" size={18} color={theme.accent} style={{ marginRight: 10 }} />
                    <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>Continue with Google</Text>
                  </>
                )}
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(300)} style={{ marginTop: 24 }}>
            <Pressable onPress={handleContinueWithoutAccount} style={{ backgroundColor: 'transparent' }}>
              <Text style={[styles.skipText, { color: theme.primaryText }]}>{'Continue without account'}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  logoText: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold' },
  tagline: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 12 },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: 8 },
  primaryButton: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    
    
    
    
    marginBottom: 12 },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold' },
  secondaryButton: {
    borderRadius: 50,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center' },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold' },
  skipText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center' }
  ,
  webTopPrimary: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  webTopPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  webTopSecondary: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  webTopSecondaryText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});
