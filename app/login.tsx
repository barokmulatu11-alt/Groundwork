import { BackgroundGradient } from "@/components/BackgroundGradient";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";
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

  // Signs in with email/password, migrates guest data, and triggers sync
  async function signInWithEmail() {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert("Sign In Failed", error.message || "Invalid credentials");
        setErrors({ email: error.message || "Invalid credentials" });
        setLoading(false);
        return;
      }

      const user = data?.user || (data?.session as any)?.user;
      if (user) {
        migrateGuestData("guest", user.id);
        
        const { useAuthStore } = await import("@/store/useAuthStore");
        useAuthStore.getState().setIsGuest(false);
        
        await useAuthStore.getState().handleAuthEvent("SIGNED_IN", { user, session: data.session });

        import("@/store/useStore").then((m) =>
          m.useStore.getState().syncFromCloud(),
        );

        setLoading(false);
        router.replace("/");
      } else {
        Alert.alert("Sign In Failed", "Could not retrieve user session. Please check your credentials.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("[Login] signInWithEmail error:", err);
      Alert.alert("Sign In Error", err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  }

  // Google OAuth sign-in — opens a browser, exchanges the code/tokens for a session, migrates guest data, triggers sync.
  async function signInWithGoogle() {
    try {
      setGoogleLoading(true);
      useAuthStore.getState().setIsOAuthPending(true);

      const isWeb = Platform.OS === 'web';
      const redirectUrl = isWeb
        ? (typeof window !== 'undefined' ? `${window.location.origin}/` : 'http://localhost:8081/')
        : "https://barok-labs.pro.et/api/auth/google-callback";
      console.log("[Auth] Starting Google OAuth with redirect:", redirectUrl);

      let oauthUrl: string | null = null;
      try {
        const { data, error } = await (neonAuth.signIn as any).social({
          provider: "google",
          callbackURL: redirectUrl,
        });
        if (error) throw error;
        oauthUrl = data?.url || null;
      } catch (oauthErr: any) {
        if (oauthErr?.code === 'feature_not_supported' || oauthErr?.status === 403) {
          Alert.alert(
            "Google Sign-In Unavailable",
            "Google Sign-In is not currently enabled on your Neon instance. Please sign in with your email and password."
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
        "groundwork://",
      );

      if (res.type === "success" || res.type === "dismiss") {
        let token: string | null = null;
        let userId: string | null = null;
        let email: string | null = null;
        let name: string | null = null;

        if (res.type === "success" && (res as any).url) {
          const params = extractParamsFromUrl((res as any).url);
          token = params.token || null;
          userId = params.userId || null;
          email = params.email || null;
          name = params.name || null;
        }

        // Fallback: Query mobile-session bridge from Neon
        if (!token || !userId) {
          try {
            const bridgeRes = await fetch("https://barok-labs.pro.et/api/auth/mobile-session");
            const bridgeData = await bridgeRes.json();
            if (bridgeData.success && bridgeData.session?.token) {
              token = bridgeData.session.token;
              userId = bridgeData.session.userId;
              email = bridgeData.session.email || null;
              name = bridgeData.session.name || null;
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
          console.log("[Auth] Google login sync complete");
          router.replace("/");
          return;
        }

        // Second fallback: neonAuth.getSession()
        const { data: authData } = await neonAuth.getSession().catch(() => ({ data: null }));
        const authUser = authData?.user;
        const authSession = authData?.session;

        const fallbackUserId = authUser?.id || null;
        if (fallbackUserId && authUser && authSession) {
          await migrateGuestData("guest", fallbackUserId);
          useAuthStore.getState().setIsGuest(false);
          await useAuthStore.getState().handleAuthEvent("SIGNED_IN", {
            user: authUser,
            session: authSession,
          });

          const { useStore } = await import("@/store/useStore");
          await useStore.getState().syncFromCloud();
          console.log("[Auth] Google login sync complete");
          router.replace("/");
        }
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

  const handleContinueAsGuest = () => {
    useAuthStore.getState().setIsGuest(true);
    router.replace("/");
  };

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
          <View style={{ marginBottom: 32, zIndex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>
              Sign In
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'PlayfairDisplay_600SemiBold_Italic' }]}>
              Welcome back
            </Text>
          </View>

          {/* Form */}
          <View style={{ zIndex: 1 }}>
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

              <Pressable
                onPress={handleContinueAsGuest}
                style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16 }}
              >
                <Text style={{ color: theme.secondaryText, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                  or{" "}
                  <Text style={{ color: theme.accent, fontFamily: "Inter_600SemiBold" }}>
                    Continue as Guest
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>
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
