import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const { theme } = useTheme();

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
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setError('');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <BackgroundGradient>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', padding: 24 }}>


          <Animated.View entering={FadeInUp.duration(300)} style={{ alignItems: 'center', zIndex: 1 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 48,  fontFamily: 'Inter_700Bold', color: 'white' }}>✓</Text>
            </View>
            <Text style={[styles.title, { color: theme.primaryText, marginBottom: 12 }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: theme.primaryText, textAlign: 'center', marginBottom: 32 }]}>
              We've sent password reset instructions to {email}
            </Text>
            <Pressable onPress={() => router.replace('/login' as any)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          


          <Animated.View entering={FadeInUp.duration(300)} style={{ zIndex: 1, marginTop: 40, marginBottom: 24 }}>
            <Pressable 
              onPress={() => router.back()} 
              style={[styles.iconBox, { backgroundColor: theme.accentLight }]}
            >
              <ChevronLeft size={20} color={theme.accent} />
            </Pressable>
          </Animated.View>

          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100).duration(300)} style={{ marginBottom: 32, zIndex: 1 }}>
            <Text style={[styles.title, { color: theme.primaryText }]}>Forgot Password</Text>
            <Text style={[styles.subtitle, { color: theme.primaryText }]}>No worries, we'll send you reset instructions</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInUp.delay(200).duration(300)} style={{ zIndex: 1 }}>
            {/* Email Input */}
            <View style={{ marginBottom: 24 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: error ? '#FF3B30' : theme.cardBorder }]}>
                <Mail size={20} color={theme.primaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText }]}
                  onChangeText={setEmail}
                  value={email}
                  placeholder="Email"
                  placeholderTextColor={theme.primaryText}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Send Reset Link Button */}
            <Pressable
              onPress={handleResetPassword}
              disabled={loading}
              style={[styles.primaryButton, { opacity: loading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </Pressable>

            {/* Sign In Link */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: theme.primaryText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                Remember your password?{' '}
                <Text onPress={() => router.replace('/login' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
                  Sign In
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

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
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
    fontFamily: 'Inter_600SemiBold', color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4 },
  primaryButton: {
    backgroundColor: '#007AFF', // Re-evaluate if this should be theme.accent
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
