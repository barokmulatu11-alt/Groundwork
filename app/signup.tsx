import { BackgroundGradient } from "@/components/BackgroundGradient";
import { AppText as Text } from "@/components/ui/AppText";
import { useTheme } from "@/lib/ThemeContext";
import { migrateGuestData } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { neonAuth, persistSessionToken } from "@/lib/neon";
import { useAuthStore } from "@/store/useAuthStore";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

function extractParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIdx = url.indexOf('#');
  const queryIdx = url.indexOf('?');
  const parts: string[] = [];
  if (hashIdx !== -1) parts.push(url.substring(hashIdx + 1));
  if (queryIdx !== -1) {
    const end = hashIdx !== -1 && hashIdx > queryIdx ? hashIdx : url.length;
    parts.push(url.substring(queryIdx + 1, end));
  }
  for (const part of parts) {
    part.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
    });
  }
  return params;
}
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

// Sign up screen — email/password registration with name, confirm password, and Google OAuth
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

  // Pre-warm Chrome Custom Tabs on Android to reduce Google sign-in cold-start delay
  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      WebBrowser.warmUpAsync();
      return () => {
        WebBrowser.coolDownAsync();
      };
    }
  }, []);

  // Validates all form fields — name, email format, password length, and confirm match
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

  // Creates an account via auth with email, password, and full name metadata
  async function signUpWithEmail() {
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } }
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message || 'Unknown error');
        setErrors({ email: error.message || 'Unknown error' });
      } else if (data) {
        const user = (data as any).user;
        if (user) {
          migrateGuestData("guest", user.id);
          const { useAuthStore } = await import("@/store/useAuthStore");
          useAuthStore.getState().setIsGuest(false);
          await useAuthStore.getState().handleAuthEvent("SIGNED_IN", { user, session: (data as any).session || { user } });
          import("@/store/useStore").then(m => m.useStore.getState().syncFromCloud());
          router.replace('/');
        } else {
          Alert.alert('Success', 'Account created! Please sign in with your credentials.');
          router.replace('/login' as any);
        }
      }
    } catch (err: any) {
      console.error('[SignUp] signUpWithEmail error:', err);
      Alert.alert('Sign Up Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // Google OAuth sign-up — opens browser, exchanges code for session, migrates guest data, triggers sync
  async function signInWithGoogle() {
    try {
      setGoogleLoading(true);
      useAuthStore.getState().setIsOAuthPending(true);

      const isWeb = Platform.OS === 'web';
      const redirectUrl = isWeb
        ? (typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:8081/')
        : "https://barok-labs.pro.et/api/auth/google-callback";
      console.log("[Auth] Starting Google OAuth (SignUp) with redirect:", redirectUrl);

      let oauthUrl: string | null = null;
      try {
        const { data, error } = await (neonAuth.signIn as any).social({
          provider: 'google',
          callbackURL: redirectUrl,
        });
        if (error) throw error;
        oauthUrl = data?.url || null;
      } catch (oauthErr: any) {
        if (oauthErr?.code === 'feature_not_supported' || oauthErr?.status === 403) {
          Alert.alert(
            "Google Sign-In Unavailable",
            "Google Sign-In is not currently enabled on your Neon instance. Please sign up with your email and password."
          );
          setGoogleLoading(false);
          useAuthStore.getState().setIsOAuthPending(false);
          return;
        }
        throw oauthErr;
      }

      if (!oauthUrl) {
        throw new Error("No authentication URL returned from auth provider.");
      }

      if (isWeb && typeof window !== 'undefined') {
        window.location.href = oauthUrl;
        return;
      }

      const res = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        "groundwork://"
      );

      if (res.type !== 'success') {
        return;
      }

      let token: string | null = null;
      let userId: string | null = null;
      let email: string | null = null;
      let name: string | null = null;

      if ((res as any).url) {
        const params = extractParamsFromUrl((res as any).url);
        token = params.token || null;
        userId = params.userId || null;
        email = params.email || null;
        name = params.name || null;
      }

      // If token is missing but userId is present, try mobile-session bridge strictly for that userId
      if (!token && userId) {
        try {
          const bridgeRes = await fetch(
            `https://barok-labs.pro.et/api/auth/mobile-session?userId=${encodeURIComponent(userId)}`
          );
          const bridgeData = await bridgeRes.json();
          if (bridgeData.success && bridgeData.session?.token) {
            token = bridgeData.session.token;
            email = email || bridgeData.session.email || null;
            name = name || bridgeData.session.name || null;
          }
        } catch (bridgeErr) {
          console.warn("[Auth] Bridge session fetch error:", bridgeErr);
        }
      }

      if (token && userId) {
        await persistSessionToken(token);
        useAuthStore.getState().setIsGuest(false);
        await migrateGuestData("guest", userId);
        await useAuthStore.getState().handleAuthEvent("SIGNED_IN", {
          user: {
            id: userId,
            email: email || "",
            user_metadata: { full_name: name || "" },
          },
          session: {
            access_token: token,
            token: token,
            userId: userId,
            user: { id: userId, email: email || "", user_metadata: { full_name: name || "" } },
          },
        });

        const { useStore } = await import("@/store/useStore");
        await useStore.getState().syncFromCloud();
        console.log("[Auth] Google signup sync complete");
        router.replace('/');
        return;
      }

      // Fallback: neonAuth.getSession()
      const { data: authData } = await neonAuth.getSession().catch(() => ({ data: null }));
      const authUser = authData?.user;
      const authSession = authData?.session;

      const fallbackUserId = authUser?.id || null;
      if (fallbackUserId && authUser && authSession) {
        await migrateGuestData("guest", fallbackUserId);
        useAuthStore.getState().setIsGuest(false);
        await useAuthStore.getState().handleAuthEvent("SIGNED_IN", { user: authUser, session: authSession });
        
        const { useStore } = await import("@/store/useStore");
        await useStore.getState().syncFromCloud();
        console.log("[Auth] Google signup sync complete");
        router.replace('/');
      }
    } catch (e: any) {
      console.error('[Auth] Google sign in error:', e);
      Alert.alert('Google Sign-In Error', e.message || 'Could not start Google authentication.');
    } finally {
      useAuthStore.getState().setIsOAuthPending(false);
      setGoogleLoading(false);
    }
  }

  const handleContinueAsGuest = () => {
    useAuthStore.getState().setIsGuest(true);
    router.replace("/");
  };

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.desktopContainer}>
          {/* Left Panel: App Intro / Brand Identity */}
          <View
            style={[
              styles.desktopBrandingPanel,
              { backgroundColor: theme.cardSolid, borderRightWidth: 1, borderRightColor: theme.separator },
            ]}
          >
            <View style={styles.brandingContent}>
              <Text
                style={[
                  styles.brandingLogo,
                  {
                    fontFamily: "Inter_800ExtraBold",
                    color: theme.text,
                  },
                ]}
              >
                <Text style={{ color: theme.accent }}>g</Text>roundwork
                <Text style={{ color: theme.accent }}>.</Text>
              </Text>
              <Text
                style={[styles.brandingTagline, { color: theme.text, fontFamily: 'PlayfairDisplay_600SemiBold_Italic' }]}
              >
                Construct the foundation of your success.
              </Text>
              <Text
                style={[styles.brandingDesc, { color: theme.textSecondary }]}
              >
                Create an account to synchronize your habits, tasks, focus sessions, and daily recaps across all of your devices.
              </Text>
            </View>
          </View>

          {/* Right Panel: Auth Card */}
          <View style={styles.desktopFormPanel}>
            <View
              style={[
                styles.desktopCard,
                { backgroundColor: theme.cardSolid, borderColor: theme.separator },
              ]}
            >
              <View style={{ marginBottom: 28 }}>
                <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Start your productivity journey today.</Text>
              </View>

              {/* Form Content */}
              <View>
                {/* Name Input */}
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.background,
                        borderColor: errors.name ? theme.danger : theme.separator,
                      },
                    ]}
                  >
                    <User size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      onChangeText={setName}
                      value={name}
                      placeholder="Full Name"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                  {errors.name && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.name}</Text>}
                </View>

                {/* Email Input */}
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.background,
                        borderColor: errors.email ? theme.danger : theme.separator,
                      },
                    ]}
                  >
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
                  {errors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.email}</Text>}
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.background,
                        borderColor: errors.password ? theme.danger : theme.separator,
                      },
                    ]}
                  >
                    <Lock size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      onChangeText={setPassword}
                      value={password}
                      placeholder="Password (min 8 chars)"
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                      {showPassword ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
                    </Pressable>
                  </View>
                  {errors.password && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.password}</Text>}
                </View>

                {/* Confirm Password Input */}
                <View style={{ marginBottom: 24 }}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.background,
                        borderColor: errors.confirmPassword ? theme.danger : theme.separator,
                      },
                    ]}
                  >
                    <Lock size={18} color={theme.textSecondary} style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      onChangeText={setConfirmPassword}
                      value={confirmPassword}
                      placeholder="Confirm Password"
                      placeholderTextColor={theme.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                      {showConfirmPassword ? <EyeOff size={18} color={theme.textSecondary} /> : <Eye size={18} color={theme.textSecondary} />}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.separator }} />
                  <Text style={{ marginHorizontal: 16, color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>or</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.separator }} />
                </View>

                {/* Continue with Google */}
                <Pressable
                  onPress={signInWithGoogle}
                  disabled={googleLoading || loading}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.separator,
                      opacity: googleLoading ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <>
                        <FontAwesome name="google" size={18} color={theme.text} style={{ marginRight: 10 }} />
                        <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Continue with Google</Text>
                      </>
                    )}
                  </View>
                </Pressable>

                {/* Sign In Link */}
                <View style={{ alignItems: 'center', marginTop: 24 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
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
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
          <View style={{ marginBottom: 32, zIndex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Start your productivity journey</Text>
          </View>

          {/* Form */}
          <View style={{ zIndex: 1 }}>
            {/* Name Input */}
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.cardSolid, borderColor: errors.name ? theme.danger : theme.separator }]}>
                <User size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}
                  onChangeText={setName}
                  value={name}
                  placeholder="Full Name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              {errors.name && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.name}</Text>}
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.cardSolid, borderColor: errors.email ? theme.danger : theme.separator }]}>
                <Mail size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}
                  onChangeText={setEmail}
                  value={email}
                  placeholder="Email"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              {errors.email && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.cardSolid, borderColor: errors.password ? theme.danger : theme.separator }]}>
                <Lock size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}
                  onChangeText={setPassword}
                  value={password}
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                </Pressable>
              </View>
              {errors.password && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.password}</Text>}
            </View>

            {/* Confirm Password Input */}
            <View style={{ marginBottom: 24 }}>
              <View style={[styles.inputContainer, { backgroundColor: theme.cardSolid, borderColor: errors.confirmPassword ? theme.danger : theme.separator }]}>
                <Lock size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}
                  onChangeText={setConfirmPassword}
                  value={confirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                  {showConfirmPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                </Pressable>
              </View>
              {errors.confirmPassword && <Text style={[styles.errorText, { color: theme.danger }]}>{errors.confirmPassword}</Text>}
            </View>

            <Pressable
              onPress={signUpWithEmail}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.separator }} />
              <Text style={{ marginHorizontal: 16, color: theme.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.separator }} />
            </View>

            {/* Continue with Google */}
            <Pressable
              onPress={signInWithGoogle}
              disabled={googleLoading || loading}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: theme.cardSolid,
                  borderColor: theme.separator,
                  opacity: googleLoading ? 0.7 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {googleLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <FontAwesome name="google" size={18} color={theme.text} style={{ marginRight: 10 }} />
                    <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Continue with Google</Text>
                  </>
                )}
              </View>
            </Pressable>

            {/* Sign In Link */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                Already have an account?{' '}
                <Text onPress={() => router.push('/login' as any)} style={{ color: theme.accent, fontFamily: 'Inter_700Bold' }}>
                  Sign In
                </Text>
              </Text>

              <Pressable
                onPress={handleContinueAsGuest}
                style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                  or{' '}
                  <Text style={{ color: theme.accent, fontFamily: "Inter_600SemiBold" }}>
                    Continue as Guest
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
