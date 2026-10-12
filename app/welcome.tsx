import { BackgroundGradient } from "@/components/BackgroundGradient";
import { AppText as Text } from "@/components/ui/AppText";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { migrateGuestData } from "@/lib/db";
import { neonAuth } from "@/lib/neon";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ActivityIndicator,
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
        : "groundwork://auth/callback";
      console.log(
        "[Auth] Starting Google OAuth (Welcome) with redirect:",
        redirectUrl,
      );

      const { data, error } = await (neonAuth.signIn as any).social({
        provider: "google",
        callbackURL: redirectUrl,
      });

      if (error) throw error;

      if (data?.url) {
        if (isWeb && typeof window !== "undefined") {
          window.location.href = data.url;
          return;
        }
        const res = await WebBrowser.openAuthSessionAsync(
          data.url,
          "groundwork://",
        );
        if (res.type === "success") {
          const { data: authData } = await neonAuth.getSession();
          const userId = (authData as any)?.user?.id || (authData as any)?.session?.userId;

          if (userId) {
            await migrateGuestData("guest", userId);
            useAuthStore.getState().setIsGuest(false);

            const { useStore } = await import("@/store/useStore");
            await useStore.getState().syncFromCloud();
            console.log("[Auth] Google welcome sync complete");
          }
        }
      } else {
        throw new Error("No authentication URL returned from Neon Auth.");
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
    <BackgroundGradient>
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
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                  },
                ]
              : { alignItems: "center", zIndex: 1 }
          }
        >
          <Animated.View
            entering={FadeInUp.delay(0).duration(300)}
            style={{ alignItems: "center", marginBottom: 32 }}
          >
            <BrandLogo fontSize={38} />
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(100).duration(300)}
            style={[styles.tagline, { color: theme.primaryText }]}
          >
            Your daily focus companion.
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.delay(200).duration(300)}
            style={[styles.subtitle, { color: theme.secondaryText }]}
          >
            Tasks, habits, notes, and timers built for deep work.
          </Animated.Text>

          <Animated.View
            entering={FadeInUp.delay(300).duration(300)}
            style={{ width: "100%", marginTop: 36 }}
          >
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
                  backgroundColor: isDesktop ? "transparent" : theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: theme.primaryText },
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
                  backgroundColor: theme.accentLight,
                  borderColor: theme.accentBorder,
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
                        { color: theme.accent },
                      ]}
                    >
                      Continue with Google
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(400).duration(300)}
            style={{ marginTop: 20, alignItems: "center" }}
          >
            <Pressable
              onPress={handleContinueWithoutAccount}
              style={{ backgroundColor: "transparent", paddingVertical: 6 }}
            >
              <Text style={[styles.skipText, { color: theme.primaryText }]}>
                {"Continue without account"}
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 12,
                color: theme.tertiaryText,
                fontFamily: "Inter_400Regular",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Your tasks and notes stay on this device unless connected.
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </BackgroundGradient>
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
