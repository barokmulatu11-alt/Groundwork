import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && width >= 768;

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return false;
    }
    setError('');
    return true;
  };

  async function handleResetPassword() {
    if (!validateEmail()) return;
    
    setLoading(true);
    try {
      const origin = (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin)
        ? window.location.origin
        : null;
      const redirectTo = origin ? `${origin}/reset-password` : 'groundwork://reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      
      if (error) {
        setError(error.message || 'Failed to send reset instructions');
      } else {
        setSuccess(true);
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Animated.View entering={FadeInUp.duration(300)} style={[isDesktop ? styles.desktopCard : { width: '100%' }, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: isDesktop ? 1 : 0, padding: isDesktop ? 40 : 0, alignItems: 'center', zIndex: 1 }]}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 40, fontFamily: 'Inter_700Bold', color: 'white' }}>✓</Text>
            </View>
            <Text style={[styles.title, { color: theme.text, marginBottom: 12 }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center', marginBottom: 32 }]}>
              We've sent password reset instructions to {email}
            </Text>
            <Pressable onPress={() => router.replace('/login' as any)} style={[styles.primaryButton, { backgroundColor: theme.accent, width: '100%' }]}>
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.desktopContainer}>
          <View style={[styles.desktopCard, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
            <Pressable 
              onPress={() => router.back()} 
              style={[styles.iconBox, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1, marginBottom: 24 }]}
            >
              <ChevronLeft size={20} color={theme.text} />
            </Pressable>

            <View style={{ marginBottom: 28 }}>
              <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>No worries, we'll send you reset instructions.</Text>
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: 24 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: error ? theme.danger : theme.separator }]}>
                <Mail size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  onChangeText={setEmail}
                  value={email}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
            </View>

            {/* Send Reset Link Button */}
            <Pressable
              onPress={handleResetPassword}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </Pressable>

            {/* Sign In Link */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                Remember your password?{' '}
                <Text onPress={() => router.replace('/login' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <Animated.View entering={FadeInUp.duration(300)} style={{ zIndex: 1, marginTop: 40, marginBottom: 24 }}>
            <Pressable 
              onPress={() => router.back()} 
              style={[styles.iconBox, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}
            >
              <ChevronLeft size={20} color={theme.text} />
            </Pressable>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100).duration(300)} style={{ marginBottom: 32, zIndex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>No worries, we'll send you reset instructions</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInUp.delay(200).duration(300)} style={{ zIndex: 1 }}>
            {/* Email Input */}
            <View style={{ marginBottom: 24 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.cardSolid, borderColor: error ? theme.danger : theme.separator }]}>
                <Mail size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  onChangeText={setEmail}
                  value={email}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {error && <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>}
            </View>

            {/* Send Reset Link Button */}
            <Pressable
              onPress={handleResetPassword}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </Pressable>

            {/* Sign In Link */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                Remember your password?{' '}
                <Text onPress={() => router.replace('/login' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
                  Sign In
                </Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: '100%',
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
  primaryButton: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter_700Bold' } });
