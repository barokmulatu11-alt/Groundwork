import { BackgroundGradient } from "@/components/BackgroundGradient";
import { AppText as Text } from "@/components/ui/AppText";
import { useTheme } from "@/lib/ThemeContext";
import { migrateGuestData } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === 'web' && width >= 768;

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
      Alert.alert('Success', 'Please check your email to verify your account.');
      router.replace('/login' as any);
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    try {
      setGoogleLoading(true);
      const redirectUrl = "groundwork://auth/callback";
      console.log("[Auth] Starting Google OAuth (SignUp) with redirect:", redirectUrl);

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
        const res = await WebBrowser.openAuthSessionAsync(
          data.url,
          "groundwork://"
        );
        if (res.type === 'success' && res.url) {
          const url = res.url;
          const getParam = (name: string) => {
            const match = url.match(new RegExp(`[?&#]${name}=([^&#]*)`));
            return match ? decodeURIComponent(match[1]) : null;
          };
          const code = getParam('code');
          const access_token = getParam('access_token');
          const refresh_token = getParam('refresh_token');

          let userId: string | null = null;

          if (code) {
            const { data: sessionData, error: exchError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchError) throw exchError;
            userId = sessionData.session?.user.id || null;
          } else if (access_token && refresh_token) {
            const { data: sessionData, error: sessError } = await supabase.auth.setSession({ access_token, refresh_token });
            if (sessError) throw sessError;
            userId = sessionData.session?.user.id || null;
          }

          if (userId) {
            await migrateGuestData("guest", userId);
            useAuthStore.getState().setIsGuest(false);
            
            const { useStore } = await import("@/store/useStore");
            await useStore.getState().syncFromCloud();
            console.log("[Auth] Google signup sync complete");
          }
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
              <Text style={[styles.brandingLogo, { fontFamily: 'Inter_800ExtraBold', color: theme.primaryText }]}>
                <Text style={{ color: theme.accent }}>g</Text>roundwork<Text style={{ color: theme.accent }}>.</Text>
              </Text>
              <Text style={[styles.brandingTagline, { color: theme.primaryText }]}>Start your productivity journey today.</Text>
              <Text style={[styles.brandingDesc, { color: theme.secondaryText }]}>
                Create an account to synchronize your habits, tasks, focus sessions, and daily recaps across all of your devices.
              </Text>
            </View>
          </View>

          {/* Right Panel: Auth Card */}
          <View style={styles.desktopFormPanel}>
            <View style={[styles.desktopCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.title, { color: theme.primaryText }]}>Create Account</Text>
                <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Construct the foundation of your success.</Text>
              </View>

              {/* Form Content */}
              <View>
                {/* Name Input */}
                <View style={{ marginBottom: 12 }}>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: errors.name ? theme.danger : theme.cardBorder }]}>
                    <User size={18} color={theme.secondaryText} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.primaryText }]}
                      onChangeText={setName}
                      value={name}
                      placeholder="Full Name"
                      placeholderTextColor={theme.secondaryText}
                    />
                  </View>
                  {errors.name && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.name}</Text>}
                </View>

                {/* Email Input */}
                <View style={{ marginBottom: 12 }}>
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
                <View style={{ marginBottom: 12 }}>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: errors.password ? theme.danger : theme.cardBorder }]}>
                    <Lock size={18} color={theme.secondaryText} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.primaryText }]}
                      onChangeText={setPassword}
                      value={password}
                      placeholder="Password (min 8 chars)"
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

                {/* Confirm Password Input */}
                <View style={{ marginBottom: 20 }}>
                  <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: errors.confirmPassword ? theme.danger : theme.cardBorder }]}>
                    <Lock size={18} color={theme.secondaryText} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.primaryText }]}
                      onChangeText={setConfirmPassword}
                      value={confirmPassword}
                      placeholder="Confirm Password"
                      placeholderTextColor={theme.secondaryText}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                      {showConfirmPassword ? <EyeOff size={18} color={theme.secondaryText} /> : <Eye size={18} color={theme.secondaryText} />}
                    </Pressable>
                  </View>
                  {errors.confirmPassword && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.confirmPassword}</Text>}
                </View>

                <Pressable
                  onPress={signUpWithEmail}
                  disabled={loading}
                  style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
                >
                  <Text style={styles.primaryButtonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
                </Pressable>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
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

                {/* Sign In Link */}
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <Text style={{ color: theme.secondaryText, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                    Already have an account?{' '}
                    <Text onPress={() => router.push('/login' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
                      Sign In
                    </Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
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
