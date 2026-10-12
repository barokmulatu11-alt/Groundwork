import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; mode?: string }>();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Extract token from params or directly from web window location as fallback
  const [token, setToken] = useState<string>('');
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);

  useEffect(() => {
    let extractedToken = params.token;
    if (!extractedToken && Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      extractedToken = urlParams.get('token') || undefined;

      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          setIsSupabaseMode(true);
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
    if (extractedToken) {
      setToken(extractedToken);
    }
    if (params.mode === 'supabase' || process.env.EXPO_PUBLIC_USE_SUPABASE === 'true') {
      setIsSupabaseMode(true);
    }
  }, [params]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenError, setTokenError] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;

  const getStrengthColor = () => {
    if (newPassword.length === 0) return theme.cardBorder;
    if (strengthScore <= 1) return '#FF3B30';
    if (strengthScore <= 3) return '#FFCC00';
    return '#34C759';
  };

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return '';
    if (strengthScore <= 1) return 'Weak';
    if (strengthScore <= 3) return 'Fair';
    return 'Strong';
  };

  const validate = () => {
    if (!newPassword) {
      setError('New password is required');
      return false;
    }
    if (strengthScore < 4) {
      setError('Password must meet all complexity requirements');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    setError('');
    return true;
  };

  async function handleResetSubmit() {
    if (!validate()) return;

    if (!token && !isSupabaseMode) {
      setTokenError(true);
      setError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSupabaseMode) {
        // Supabase session-based password update
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) throw updateError;
      } else {
        // Neon Auth token-based password reset
        const { error: resetError } = await (supabase.auth as any).resetPassword({
          token: token.trim(),
          newPassword,
        });
        if (resetError) throw resetError;
      }

      setSuccess(true);
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('session token') ||
        msg.toLowerCase().includes('bad_jwt') ||
        err.status === 400 ||
        err.status === 401
      ) {
        setTokenError(true);
        setError('This password reset link has expired or has already been used. Please request a new link.');
      } else {
        setError(msg || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Missing token view
  if (!token && !isSupabaseMode) {
    return (
      <BackgroundGradient>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerContainer}
        >
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[
              isDesktop ? styles.desktopCard : styles.mobileCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FF3B3020' }]}>
              <AlertCircle size={40} color="#FF3B30" />
            </View>
            <Text style={[styles.title, { color: theme.primaryText, textAlign: 'center', marginBottom: 12 }]}>
              Invalid Reset Link
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText, textAlign: 'center', marginBottom: 32 }]}>
              This password reset link is missing a valid verification token or is malformed. Please request a fresh reset link.
            </Text>
            <Pressable
              onPress={() => router.replace('/forgot-password' as any)}
              style={[styles.primaryButton, { backgroundColor: theme.accent, width: '100%' }]}
            >
              <Text style={styles.primaryButtonText}>Request New Link</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/login' as any)}
              style={{ marginTop: 16 }}
            >
              <Text style={{ color: theme.secondaryText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                Back to Sign In
              </Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </BackgroundGradient>
    );
  }

  // Success view
  if (success) {
    return (
      <BackgroundGradient>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centerContainer}
        >
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[
              isDesktop ? styles.desktopCard : styles.mobileCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#34C75920' }]}>
              <CheckCircle2 size={48} color="#34C759" />
            </View>
            <Text style={[styles.title, { color: theme.primaryText, textAlign: 'center', marginBottom: 12 }]}>
              Password Reset!
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText, textAlign: 'center', marginBottom: 32 }]}>
              Your password has been successfully updated. You can now sign in with your new credentials.
            </Text>
            <Pressable
              onPress={() => router.replace('/login' as any)}
              style={[styles.primaryButton, { backgroundColor: theme.accent, width: '100%' }]}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={isDesktop ? styles.desktopContainer : styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={[isDesktop ? styles.desktopCard : styles.mobileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Pressable
              onPress={() => router.replace('/login' as any)}
              style={[styles.iconBox, { backgroundColor: theme.accentLight, marginBottom: 24 }]}
            >
              <ChevronLeft size={20} color={theme.accent} />
            </Pressable>

            <View style={{ marginBottom: 28 }}>
              <Text style={[styles.title, { color: theme.primaryText }]}>Reset Password</Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                Choose a strong new password for your account.
              </Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FF3B3015', borderColor: '#FF3B3040' }]}>
                <AlertCircle size={18} color="#FF3B30" style={{ marginRight: 8 }} />
                <Text style={[styles.errorBannerText, { color: '#FF3B30' }]}>{error}</Text>
              </View>
            ) : null}

            {tokenError ? (
              <Pressable
                onPress={() => router.replace('/forgot-password' as any)}
                style={[styles.secondaryButton, { borderColor: theme.accent, marginBottom: 20 }]}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>Request New Reset Email</Text>
              </Pressable>
            ) : null}

            {/* New Password Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.label, { color: theme.primaryText }]}>New Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: error ? theme.danger : theme.cardBorder }]}>
                <Lock size={18} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText }]}
                  onChangeText={setNewPassword}
                  value={newPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={theme.secondaryText}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowNew(!showNew)} hitSlop={10}>
                  {showNew ? <EyeOff size={18} color={theme.secondaryText} /> : <Eye size={18} color={theme.secondaryText} />}
                </Pressable>
              </View>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: theme.secondaryText, fontFamily: 'Inter_600SemiBold' }}>Strength</Text>
                    <Text style={{ fontSize: 12, color: getStrengthColor(), fontFamily: 'Inter_700Bold' }}>{getStrengthLabel()}</Text>
                  </View>
                  <View style={styles.strengthBarBg}>
                    <View style={[styles.strengthBarFill, { width: `${(strengthScore / 4) * 100}%`, backgroundColor: getStrengthColor() }]} />
                  </View>
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[styles.label, { color: theme.primaryText }]}>Confirm Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: error ? theme.danger : theme.cardBorder }]}>
                <Lock size={18} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText }]}
                  onChangeText={setConfirmPassword}
                  value={confirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={theme.secondaryText}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={10}>
                  {showConfirm ? <EyeOff size={18} color={theme.secondaryText} /> : <Eye size={18} color={theme.secondaryText} />}
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleResetSubmit}
              disabled={loading || tokenError}
              style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: loading || tokenError ? 0.6 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Set New Password</Text>
              )}
            </Pressable>

            {/* Back to Login */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text
                onPress={() => router.replace('/login' as any)}
                style={{ color: theme.accent, fontFamily: 'Inter_700Bold', fontSize: 14 }}
              >
                Back to Sign In
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  desktopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: '100%',
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 60,
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
  mobileCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  primaryButton: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  secondaryButton: {
    borderRadius: 50,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
  },
  strengthBarBg: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});
