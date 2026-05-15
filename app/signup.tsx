import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  
  const router = useRouter();
  const { theme } = useTheme();

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function signUpWithEmail() {
    if (!validateForm()) return;
    
    setLoading(true);

    const {
      data: { session },
      error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name }
      }
    });

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      setErrors({ email: error.message });
    } else if (!session) {
      // Email verification required
      router.replace('/login' as any);
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
            <Text style={[styles.title, { color: theme.primaryText }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Start your productivity journey</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInUp.delay(200).duration(300)} style={{ zIndex: 1 }}>
            {/* Name Input */}
            <View style={{ marginBottom: 10 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.name ? theme.danger : theme.cardBorder }]}>
                <User size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText, fontFamily: 'Inter_600SemiBold' }]}
                  onChangeText={setName}
                  value={name}
                  placeholder="Full Name"
                  placeholderTextColor={theme.secondaryText}
                />
              </View>
              {errors.name && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.name}</Text>}
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: 10 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.email ? theme.danger : theme.cardBorder }]}>
                <Mail size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText, fontFamily: 'Inter_600SemiBold' }]}
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
            <View style={{ marginBottom: 10 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.password ? theme.danger : theme.cardBorder }]}>
                <Lock size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText, fontFamily: 'Inter_600SemiBold' }]}
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

            {/* Confirm Password Input */}
            <View style={{ marginBottom: 24 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: errors.confirmPassword ? theme.danger : theme.cardBorder }]}>
                <Lock size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.primaryText, fontFamily: 'Inter_600SemiBold' }]}
                  onChangeText={setConfirmPassword}
                  value={confirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor={theme.secondaryText}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                  {showConfirmPassword ? <EyeOff size={20} color={theme.secondaryText} /> : <Eye size={20} color={theme.secondaryText} />}
                </Pressable>
              </View>
              {errors.confirmPassword && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.confirmPassword}</Text>}
            </View>

            <Pressable
              onPress={signUpWithEmail}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: theme.accent,  opacity: loading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
              <Text style={{ marginHorizontal: 16, color: theme.secondaryText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>or</Text>
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

            {/* Sign In Link */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: theme.secondaryText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                Already have an account?{' '}
                <Text onPress={() => router.push('/login' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
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
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
