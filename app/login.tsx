import { BackgroundGradient } from "@/components/BackgroundGradient";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";
import { AppText as Text } from "@/components/ui/AppText";
import { useTheme } from "@/lib/ThemeContext";
import { migrateGuestData } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { neonAuth } from "@/lib/neon";
import { useAuthStore } from "@/store/useAuthStore";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ChevronLeft, Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

WebBrowser.maybeCompleteAuthSession();

// Login screen — email/password and Google OAuth sign-in with MFA support
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === "web" && width >= 768;

  // Pre-warm Chrome Custom Tabs on Android to reduce cold-start delay
  useEffect(() => {
    if (Platform.OS !== "web") {
      WebBrowser.warmUpAsync();
      return () => {
        WebBrowser.coolDownAsync();
      };
    }
  }, []);

  // Validates email and password fields, returns true if both are filled
  const validateForm = () => {
    const newErrors: any = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string } | null>(
    null,
  );

  // Signs in with email/password, checks for MFA, migrates guest data, and triggers sync
  async function signInWithEmail() {
    if (!validateForm()) return;

    setLoading(true);

    const { isGuest } = await import("@/store/useAuthStore").then((m) => ({
      isGuest: m.useAuthStore.getState().isGuest,
    }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Sign In Failed", error.message || "Unknown error");
      setErrors({ email: error.message || "Unknown error" });
      setLoading(false);
    } else if (data?.user) {
      // Always migrate local guest data to the authenticated user ID to prevent data loss
      migrateGuestData("guest", data.user.id);
      
      const { useAuthStore } = await import("@/store/useAuthStore");
      useAuthStore.getState().setIsGuest(false);
      
      // Manually trigger the Auth Store hydrate since we removed the global listener
      await useAuthStore.getState().handleAuthEvent("SIGNED_IN", { user: data.user });

      // Trigger sync from cloud immediately
      import("@/store/useStore").then((m) =>
        m.useStore.getState().syncFromCloud(),
      );

      setLoading(false);
      router.replace("/");
    }
  }

  // Google OAuth sign-in — opens a browser, exchanges the code for a session, migrates guest data, triggers sync.
  // Does NOT manually navigate; AuthMiddleware handles redirects on session change.
  async function signInWithGoogle() {
    try {
      setGoogleLoading(true);
      // Block AuthMiddleware from reacting to the session=null window during OAuth
      useAuthStore.getState().setIsOAuthPending(true);

      // Use consistent redirect URL across dev, production, and web
      // This ensures the OAuth flow properly redirects back to the app via deep linking or browser origin
      const isWeb = Platform.OS === 'web';
      const redirectUrl = isWeb
        ? (typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:8081/')
        : "groundwork://auth/callback";
      console.log("[Auth] Starting Google OAuth with redirect:", redirectUrl);

      const { data, error } = await (neonAuth.signIn as any).social({
        provider: "google",
        callbackURL: redirectUrl,
      });

      if (error) throw error;

      if (data?.url) {
        if (isWeb && typeof window !== 'undefined') {
          window.location.href = data.url;
          return;
        }
        // WebBrowser.openAuthSessionAsync second parameter is the URL scheme to listen for
        const res = await WebBrowser.openAuthSessionAsync(
          data.url,
          "groundwork://",
        );

        if (res.type === "success") {
          const { data: authData } = await neonAuth.getSession();
          const userId = authData?.user?.id || null;

          if (userId && authData?.user && authData?.session) {
            // Always migrate local guest data and sync profile/settings (themes, etc.)
            await migrateGuestData("guest", userId);
            useAuthStore.getState().setIsGuest(false);
            await useAuthStore.getState().handleAuthEvent("SIGNED_IN", { user: authData.user, session: authData.session });

            const { useStore } = await import("@/store/useStore");
            await useStore.getState().syncFromCloud();
            console.log("[Auth] Google login sync complete");
            router.replace("/");
          }
        }
      } else {
        throw new Error("No authentication URL returned from auth provider.");
      }
    } catch (e: any) {
      console.error("[Auth] Google sign in error:", e);
      Alert.alert(
        "Google Sign-In Error",
        e.message || "Could not start Google authentication.",
      );
    } finally {
      useAuthStore.getState().setIsOAuthPending(false);
      setGoogleLoading(false);
    }
  }

  // Desktop layout: side-by-side brand panel and auth card
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
                Master your day, own your progress.
              </Text>
              <Text
                style={[styles.brandingDesc, { color: theme.textSecondary }]}
              >
                A clean, minimal, and premium workspace designed to help you
                construct habits, manage tasks, and concentrate on
                what matters most.
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
                <Text style={[styles.title, { color: theme.text }]}>
                  Sign In
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Welcome back to groundwork.
                </Text>
              </View>

              {/* Form Content */}
              <View>
                {/* Email Input */}
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.background,
                        borderColor: errors.email
                          ? theme.danger
                          : theme.cardBorder,
                      },
                    ]}
                  >
                    <Mail
                      size={18}
                      color={theme.secondaryText}
                      style={{ marginRight: 12 }}
                    />
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
                  {errors.email && (
                    <Text style={[styles.errorText, { color: theme.danger }]}>
                      {errors.email}
                    </Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 16 }}>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.background,
                        borderColor: errors.password
                          ? theme.danger
                          : theme.cardBorder,
                      },
                    ]}
                  >
                    <Lock
                      size={18}
                      color={theme.secondaryText}
                      style={{ marginRight: 12 }}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.primaryText }]}
                      onChangeText={setPassword}
                      value={password}
                      placeholder="Password"
                      placeholderTextColor={theme.secondaryText}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 4 }}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={theme.secondaryText} />
                      ) : (
                        <Eye size={18} color={theme.secondaryText} />
                      )}
                    </Pressable>
                  </View>
                  {errors.password && (
                    <Text style={[styles.errorText, { color: theme.danger }]}>
                      {errors.password}
                    </Text>
                  )}
                </View>

                {/* Forgot Password */}
                <Pressable
                  onPress={() => router.push("/forgot-password" as any)}
                  style={{ marginBottom: 24, alignSelf: "flex-end" }}
                >
                  <Text
                    style={[styles.forgotPasswordText, { color: theme.accent }]}
                  >
                    Forgot password?
                  </Text>
                </Pressable>

                <Pressable
                  onPress={signInWithEmail}
                  disabled={loading}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: theme.accent,
                      opacity: loading ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Text>
                </Pressable>

                {/* Divider */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: 24,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: theme.cardBorder,
                    }}
                  />
                  <Text
                    style={{
                      marginHorizontal: 16,
                      color: theme.secondaryText,
                      fontSize: 13,
                      fontFamily: "System",
                    }}
                  >
                    or
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: theme.cardBorder,
                    }}
                  />
                </View>

                {/* Continue with Google */}
                <Pressable
                  onPress={signInWithGoogle}
                  disabled={googleLoading || loading}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.accentLight,
                      borderColor: theme.accentBorder,
                      opacity: googleLoading ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <>
                        <FontAwesome
                          name="google"
                          size={18}
                          color={theme.accent}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            { color: theme.accent },
                          ]}
                        >
                          Continue with Google
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>

                {/* Sign Up Link */}
                <View style={{ alignItems: "center", marginTop: 28 }}>
                  <Text
                    style={{
                      color: theme.secondaryText,
                      fontSize: 14,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    Don't have an account?{" "}
                    <Text
                      onPress={() => router.push("/signup" as any)}
                      style={{
                        color: theme.accent,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
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
                router.replace("/");
              }}
              onCancel={() => setMfaChallenge(null)}
            />
          )}
        </Modal>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={{ zIndex: 1 }}
          >
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { borderColor: theme.separator }]}
            >
              <ChevronLeft color={theme.text} size={24} />
            </Pressable>
          </Animated.View>

          {/* Header */}
          <Animated.View
            entering={FadeInUp.delay(100).duration(300)}
            style={{ marginBottom: 32, zIndex: 1 }}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Sign In
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'PlayfairDisplay_600SemiBold_Italic' }]}>
              Welcome back
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(300)}
            style={{ zIndex: 1 }}
          >
            {/* Email Input */}
            <View style={{ marginBottom: 10 }}>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.cardSolid,
                    borderColor: errors.email ? theme.danger : theme.separator,
                  },
                ]}
              >
                <Mail
                  size={20}
                  color={theme.textSecondary}
                  style={{ marginRight: 12 }}
                />
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
              {errors.email && (
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 12 }}>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.cardSolid,
                    borderColor: errors.password
                      ? theme.danger
                      : theme.separator,
                  },
                ]}
              >
                <Lock
                  size={20}
                  color={theme.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  onChangeText={setPassword}
                  value={password}
                  placeholder="Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.secondaryText} />
                  ) : (
                    <Eye size={20} color={theme.secondaryText} />
                  )}
                </Pressable>
              </View>
              {errors.password && (
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Forgot Password */}
            <Pressable
              onPress={() => router.push("/forgot-password" as any)}
              style={{ marginBottom: 24 }}
            >
              <Text
                style={[styles.forgotPasswordText, { color: theme.accent }]}
              >
                Forgot password?
              </Text>
            </Pressable>

            <Pressable
              onPress={signInWithEmail}
              disabled={loading}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </Pressable>

            {/* Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 24,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: theme.cardBorder,
                }}
              />
              <Text
                style={{
                  marginHorizontal: 16,
                  color: theme.secondaryText,
                  fontSize: 14,
                  fontWeight: "600",
                  fontFamily: "System",
                }}
              >
                or
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: theme.cardBorder,
                }}
              />
            </View>

            {/* Continue with Google */}
            <Pressable
              onPress={signInWithGoogle}
              disabled={googleLoading || loading}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: theme.accentLight,
                  borderColor: theme.accentBorder,
                  opacity: googleLoading ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <FontAwesome
                      name="google"
                      size={18}
                      color={theme.accent}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: theme.accent },
                      ]}
                    >
                      Continue with Google
                    </Text>
                  </>
                )}
              </View>
            </Pressable>

            {/* Sign Up Link */}
            <View style={{ alignItems: "center", marginTop: 24 }}>
              <Text
                style={{
                  color: theme.secondaryText,
                  fontSize: 14,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                Don't have an account?{" "}
                <Text
                  onPress={() => router.push("/signup" as any)}
                  style={{ color: theme.accent, fontFamily: "Inter_700Bold" }}
                >
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
              router.replace("/");
            }}
            onCancel={() => setMfaChallenge(null)}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: "row",
    height: "100%",
    width: "100%",
    backgroundColor: "transparent",
  },
  desktopBrandingPanel: {
    flex: 1,
    justifyContent: "center",
    padding: 60,
    position: "relative",
  },
  brandingContent: {
    maxWidth: 480,
    zIndex: 1,
  },
  brandingLogo: {
    fontSize: 48,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  brandingTagline: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 36,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  brandingDesc: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    lineHeight: 24,
    opacity: 0.8,
  },
  desktopFormPanel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  desktopCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 24,
    borderWidth: 1,
    padding: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },

  topBlob: {
    position: "absolute" as any,
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    zIndex: 0,
  },
  bottomBlob: {
    position: "absolute" as any,
    bottom: 100,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    zIndex: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 40,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  primaryButton: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryButton: {
    borderRadius: 50,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
