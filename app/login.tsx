import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { migrateGuestData } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

WebBrowser.maybeCompleteAuthSession();
import { FontAwesome } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const router = useRouter();
  const { theme } = useTheme();

  // Pre-warm Chrome Custom Tabs on Android to reduce cold-start delay
  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => { WebBrowser.coolDownAsync(); };
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

  async function signInWithEmail() {
    if (!validateForm()) return;
    
    setLoading(true);
    
    // Check if user was previously a guest and migrate data
    const { isGuest } = await import('@/store/useAuthStore').then(m => ({ isGuest: m.useAuthStore.getState().isGuest }));
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      Alert.alert('Sign In Failed', error.message);
      setErrors({ email: error.message });
    } else if (data.user) {
      // Migrate guest data to new user account
      if (isGuest) {
        migrateGuestData('guest', data.user.id);
        await import('@/store/useAuthStore').then(m => m.useAuthStore.getState().setIsGuest(false));
      }
      router.replace('/' as any);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        handleRedirect(event.url);
      }
    });
    return () => subscription.remove();
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

  async function signInWithGoogle() {
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
  }

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          
          {/* Background Blobs */}


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
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
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
