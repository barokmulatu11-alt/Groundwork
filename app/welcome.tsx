import { BackgroundGradient } from "@/components/BackgroundGradient";
import { AppText as Text } from "@/components/ui/AppText";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { migrateGuestData } from "@/lib/db";
import { neonAuth, persistSessionToken } from "@/lib/neon";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

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
import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { setIsGuest } = useAuthStore();
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const { width } = useWindowDimensions();

  const isDesktop = Platform.OS === "web" && width >= 768;

  React.useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  const handleSignInWithGoogle = async () => {
    try {
      setGoogleLoading(true);
      const isWeb = Platform.OS === "web";
      const redirectUrl = isWeb
        ? (typeof window !== "undefined" ? `${window.location.origin}/` : "http://localhost:8081/")
        : "https://barok-labs.pro.et/api/auth/google-callback";
      console.log(
        "[Auth] Starting Google OAuth (Welcome) with redirect:",
        redirectUrl,
      );

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

      if (isWeb && typeof window !== "undefined") {
        window.location.href = oauthUrl;
        return;
      }

      const res = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        "groundwork://",
      );

      if (res.type !== "success") {
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
        console.log("[Auth] Google welcome sync complete");
        router.replace("/");
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
        router.replace("/");
      }
    } catch (e: any) {
      console.error("[Auth] Google sign in error:", e);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCreateAccount = () => {
    router.push("/signup" as any);
  };

  const handleSignIn = () => {
    router.push("/login" as any);
  };

  const handleContinueWithoutAccount = () => {
    setIsGuest(true);
    router.replace("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={
          isDesktop
            ? styles.desktopContainer
            : { flex: 1, justifyContent: "center", padding: 24 }
        }
      >
        <View
          style={
            isDesktop
              ? [
                  styles.desktopCard,
                  {
                    backgroundColor: theme.cardSolid,
                    borderColor: theme.separator,
                  },
                ]
              : { alignItems: "center", zIndex: 1 }
          }
        >
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <BrandLogo fontSize={38} />
          </View>

          <Text style={[styles.tagline, { color: theme.text }]}>
            Your daily focus companion.
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'PlayfairDisplay_600SemiBold_Italic' }]}>
            Tasks, habits, and timers built for deep work.
          </Text>

          <View style={{ width: "100%", marginTop: 36 }}>
            <Pressable
              onPress={handleCreateAccount}
              style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </Pressable>

            <Pressable
              onPress={handleSignIn}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: theme.cardSolid,
                  borderColor: theme.separator,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: theme.text },
                ]}
              >
                {"Sign In"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSignInWithGoogle}
              disabled={googleLoading}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: theme.cardSolid,
                  borderColor: theme.separator,
                  marginTop: 12,
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
                        { color: theme.text },
                      ]}
                    >
                      Continue with Google
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>

          <View style={{ marginTop: 20, alignItems: "center" }}>
            <Pressable
              onPress={handleContinueWithoutAccount}
              style={{ backgroundColor: "transparent", paddingVertical: 6 }}
            >
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>
                {"Continue without account"}
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 12,
                color: theme.textMuted,
                fontFamily: "Inter_400Regular",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Your tasks, habits, and focus stay on this device unless connected.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: "100%",
  },
  desktopCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 24,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 1,
  },
  logoText: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
  },
  tagline: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginBottom: 8,
  },
  primaryButton: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
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
    fontFamily: "Inter_600SemiBold",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  webTopPrimary: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  webTopPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  webTopSecondary: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  webTopSecondaryText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
