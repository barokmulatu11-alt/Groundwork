import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { migrateGuestData } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { FontAwesome } from '@expo/vector-icons';
import { ChevronLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { TwoFactorChallenge } from '@/components/security/TwoFactorChallenge';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

WebBrowser.maybeCompleteAuthSession();


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Pre-warm Chrome Custom Tabs on Android to reduce cold-start delay
  useEffect(() => {
    if (Platform.OS !== 'web') {
      WebBrowser.warmUpAsync();
      return () => { WebBrowser.coolDownAsync(); };
    }
  }, []);

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string } | null>(null);

  async function signInWithEmail() {
    if (!validateForm()) return;
    
    setLoading(true);
    
    // Check if user was previously a guest and migrate data
    const { isGuest } = await import('@/store/useAuthStore').then(m => ({ isGuest: m.useAuthStore.getState().isGuest }));
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      Alert.alert('Sign In Failed', error.message);
      setErrors({ email: error.message });
      setLoading(false);
    } else if (data.user) {
      // Check for MFA
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (mfaData && mfaData.nextLevel === 'aal2') {
        // MFA Required
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
        
        if (totpFactor) {
          setMfaChallenge({ factorId: totpFactor.id });
          setLoading(false);
          return;
        }
      }

      // No MFA or AAL1 sufficient
      if (isGuest) {
        migrateGuestData('guest', data.user.id);
        await import('@/store/useAuthStore').then(m => m.useAuthStore.getState().setIsGuest(false));
      }
      router.replace('/' as any);
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setGoogleLoading(true);
      
      const redirectUrl = __DEV__ ? Linking.createURL('/') : 'groundwork://';
      console.log('[Auth] Starting Google OAuth with redirect:', redirectUrl);

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
          // Parse and exchange the code directly here — no Linking.openURL, no router.replace.
          // AuthMiddleware will handle navigation once the session is set in the store.
          const url = res.url;
          const getParam = (name: string) => {
            const match = url.match(new RegExp(`[?&#]${name}=([^&#]*)`) );
            return match ? decodeURIComponent(match[1]) : null;
          };
          const code = getParam('code');
          const access_token = getParam('access_token');
          const refresh_token = getParam('refresh_token');

          if (code) {
            const { data: sessionData, error: exchError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchError) throw exchError;
            // onAuthStateChange in useAuthStore will fire SIGNED_IN and update state automatically.
            // AuthMiddleware will then navigate — do NOT call setSession() or router.replace() here.
            if (sessionData.session) {
              const isGuest = useAuthStore.getState().isGuest;
              if (isGuest && sessionData.session.user) {
                await migrateGuestData('guest', sessionData.session.user.id);
                useAuthStore.getState().setIsGuest(false);
              }
            }
          } else if (access_token && refresh_token) {
            const { error: sessError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessError) throw sessError;
            // onAuthStateChange fires automatically after setSession — no manual store update needed
          } else {
            const errParam = getParam('error_description') || getParam('error');
            if (errParam) Alert.alert('Login Failed', errParam.replace(/\+/g, ' '));
          }
        } else if (res.type === 'cancel' || res.type === 'dismiss') {
          // User closed the browser — do nothing
        }
      } else {
        throw new Error('No authentication URL returned from Supabase.');
      }
    } catch (e: any) {
      console.error('[Auth] Google sign in error:', e);
      Alert.alert('Google Sign-In Error', e.message || 'Could not start Google authentication.');
    } finally {
      setGoogleLoading(false);
    }
  }

  if (isDesktop) {
    return (
      <BackgroundGradient>
        <View style={styles.desktopContainer}>
          {/* Left Panel: App Intro / Brand Identity */}
          <View style={[styles.desktopBrandingPanel, { backgroundColor: theme.accentLight }]}>
            <LinearGradient
              colors={[theme.accentLight, theme.backgroundGradientStart || theme.card]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.brandingContent}>
              <Text style={[styles.brandingLogo, { color: theme.accent }]}>groundwork.</Text>
              <Text style={[styles.brandingTagline, { color: theme.primaryText }]}>Master your day, own your progress.</Text>
              <Text style={[styles.brandingDesc, { color: theme.secondaryText }]}>
                A clean, minimal, and premium workspace designed to help you construct habits, manage tasks, record notes, and concentrate on what matters most.
              </Text>
            </View>
          </View>

          {/* Right Panel: Auth Card */}
          <View style={styles.desktopFormPanel}>
            <View style={[styles.desktopCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={{ marginBottom: 28 }}>
                <Text style={[styles.title, { color: theme.primaryText }]}>Sign In</Text>
                <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Welcome back to groundwork.</Text>
              </View>

              {/* Form Content */}
              <View>
                {/* Email Input */}
                <View style={{ marginBottom: 16 }}>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: errors.email ? theme.danger : theme.cardBorder }]}>
                    <Mail size={18} color={theme.secondaryText} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.primaryText }]}
                      onChangeText={setEmail}
                      value={email}
                      placeholder="Email"
                      placeholderTextColor={theme.secondaryText}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  {errors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.email}</Text>}
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 16 }}>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: errors.password ? theme.danger : theme.cardBorder }]}>
                    <Lock size={18} color={theme.secondaryText} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.primaryText }]}
                      onChangeText={setPassword}
                      value={password}
                      placeholder="Password"
                      placeholderTextColor={theme.secondaryText}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                      {showPassword ? <EyeOff size={18} color={theme.secondaryText} /> : <Eye size={18} color={theme.secondaryText} />}
                    </Pressable>
                  </View>
                  {errors.password && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.password}</Text>}
                </View>

                {/* Forgot Password */}
                <Pressable onPress={() => router.push('/forgot-password' as any)} style={{ marginBottom: 24, alignSelf: 'flex-end' }}>
                  <Text style={[styles.forgotPasswordText, { color: theme.accent }]}>Forgot password?</Text>
                </Pressable>

                <Pressable
                  onPress={signInWithEmail}
                  disabled={loading}
                  style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
                >
                  <Text style={styles.primaryButtonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
                </Pressable>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
                  <Text style={{ marginHorizontal: 16, color: theme.secondaryText, fontSize: 13, fontFamily: 'System' }}>or</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
                </View>

                {/* Continue with Google */}
                <Pressable
                  onPress={signInWithGoogle}
                  disabled={googleLoading || loading}
                  style={[styles.secondaryButton, { backgroundColor: theme.accentLight, borderColor: theme.accentBorder, opacity: googleLoading ? 0.7 : 1 }]}
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

                {/* Sign Up Link */}
                <View style={{ alignItems: 'center', marginTop: 28 }}>
                  <Text style={{ color: theme.secondaryText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    Don't have an account?{' '}
                    <Text onPress={() => router.push('/signup' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
                      Sign Up
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <Modal visible={!!mfaChallenge} animationType="slide">
          {mfaChallenge && (
            <TwoFactorChallenge 
              factorId={mfaChallenge.factorId}
              onSuccess={() => {
                setMfaChallenge(null);
                router.replace('/');
              }}
              onCancel={() => setMfaChallenge(null)}
            />
          )}
        </Modal>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          {/* Back Button */}
          <Animated.View entering={FadeInUp.duration(300)} style={{ zIndex: 1 }}>
            <Pressable onPress={() => router.back()} style={[styles.backButton, { borderColor: theme.cardBorder }]}>
              <ChevronLeft color={theme.primaryText} size={24} />
            </Pressable>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100).duration(300)} style={{ marginBottom: 32, zIndex: 1 }}>
            <Text style={[styles.title, { color: theme.primaryText }]}>Sign In</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Welcome back</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInUp.delay(200).duration(300)} style={{ zIndex: 1 }}>
            {/* Email Input */}
            <View style={{ marginBottom: 10 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.email ? theme.danger : theme.cardBorder }]}>
                <Mail size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText }]}
                  onChangeText={setEmail}
                  value={email}
                  placeholder="Email"
                  placeholderTextColor={theme.secondaryText}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {errors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.password ? theme.danger : theme.cardBorder }]}>
                <Lock size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText }]}
                  onChangeText={setPassword}
                  value={password}
                  placeholder="Password"
                  placeholderTextColor={theme.secondaryText}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? <EyeOff size={20} color={theme.secondaryText} /> : <Eye size={20} color={theme.secondaryText} />}
                </Pressable>
              </View>
              {errors.password && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.password}</Text>}
            </View>

            {/* Forgot Password */}
            <Pressable onPress={() => router.push('/forgot-password' as any)} style={{ marginBottom: 24 }}>
              <Text style={[styles.forgotPasswordText, { color: theme.accent }]}>Forgot password?</Text>
            </Pressable>

            <Pressable
              onPress={signInWithEmail}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: theme.accent,  opacity: loading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
              <Text style={{ marginHorizontal: 16, color: theme.secondaryText, fontSize: 14, fontWeight: '600', fontFamily: 'System' }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
            </View>

            {/* Continue with Google */}
            <Pressable
              onPress={signInWithGoogle}
              disabled={googleLoading || loading}
              style={[styles.secondaryButton, { backgroundColor: theme.accentLight, borderColor: theme.accentBorder, opacity: googleLoading ? 0.7 : 1 }]}
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

            {/* Sign Up Link */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: theme.secondaryText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                Don't have an account?{' '}
                <Text onPress={() => router.push('/signup' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
                  Sign Up
                </Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!mfaChallenge} animationType="slide">
        {mfaChallenge && (
          <TwoFactorChallenge 
            factorId={mfaChallenge.factorId}
            onSuccess={() => {
              setMfaChallenge(null);
              router.replace('/');
            }}
            onCancel={() => setMfaChallenge(null)}
          />
        )}
      </Modal>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    backgroundColor: 'transparent',
  },
  desktopBrandingPanel: {
    flex: 1,
    justifyContent: 'center',
    padding: 60,
    position: 'relative',
  },
  brandingContent: {
    maxWidth: 480,
    zIndex: 1,
  },
  brandingLogo: {
    fontSize: 48,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  brandingTagline: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    lineHeight: 36,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  brandingDesc: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    lineHeight: 24,
    opacity: 0.8,
  },
  desktopFormPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  desktopCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 24,
    borderWidth: 1,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },

  topBlob: {
    position: 'absolute' as any,
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    zIndex: 0 },
  bottomBlob: {
    position: 'absolute' as any,
    bottom: 100,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    zIndex: 0 },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 40 },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5,
    marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold' },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
    marginLeft: 4 },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold', textAlign: 'right' },
  primaryButton: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12 },
  primaryButtonText: {
    color: 'white',
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
    fontFamily: 'Inter_700Bold' } });
