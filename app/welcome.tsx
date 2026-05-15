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

  const handleRedirect = async (url: string) => {
    const parsed = Linking.parse(url);
    const { access_token, refresh_token } = (parsed.queryParams || {}) as any;
    
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token });
      if (!error) {
        router.replace('/' as any);
      }
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      setGoogleLoading(true);
      const redirectUrl = 'groundwork://';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true } });

      if (error) { setGoogleLoading(false); return; }

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success' && res.url) {
          handleRedirect(res.url);
        }
      }
    } catch (e) {
      console.error(e);
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
});
