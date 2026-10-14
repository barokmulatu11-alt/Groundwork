import { CustomAlert } from "@/components/ui/CustomAlert";
import { useTheme } from "@/lib/ThemeContext";
import { hapticLight, hapticSuccess, hapticSelection } from "@/lib/haptics";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import {
  BookOpen,
  Check,
  Copy,
  Lock,
  Send,
  Settings,
  Share2,
  Smartphone,
  Sparkles,
  Square as SquareIcon,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Premium Quote Styling Presets
export interface ThemePreset {
  id: string;
  name: string;
  colors: string[];
  textColor: string;
  secondaryTextColor: string;
  fontFamily: string;
  authorFontFamily: string;
  showDecoration?: boolean;
  bgDecorativeText?: string;
  borderStyle?: "none" | "thin" | "neon";
  neonColor?: string;
  glass?: boolean;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "midnight_aurora",
    name: "Midnight Aurora",
    colors: ["#0F0C20", "#1F1A3A", "#0D0B18"],
    textColor: "#FFFFFF",
    secondaryTextColor: "#A099D0",
    fontFamily: "Inter_700Bold",
    authorFontFamily: "Inter_600SemiBold",
    showDecoration: true,
    bgDecorativeText: "GROUNDWORK",
  },
  {
    id: "sunset_glow",
    name: "Sunset Glow",
    colors: ["#FF512F", "#DD2476"],
    textColor: "#FFFFFF",
    secondaryTextColor: "#FFE4E6",
    fontFamily: "Inter_800ExtraBold",
    authorFontFamily: "Inter_600SemiBold",
    showDecoration: false,
  },
  {
    id: "frosted_glass",
    name: "Frosted Glass",
    colors: ["#141414", "#0A0A0A"],
    textColor: "#FFFFFF",
    secondaryTextColor: "#B3B3B3",
    fontFamily: "Inter_700Bold",
    authorFontFamily: "Inter_500Medium",
    glass: true,
  },
  {
    id: "zen_minimalist",
    name: "Zen Minimalist",
    colors: ["#FAF9F6", "#FAF9F6"],
    textColor: "#1A1A1A",
    secondaryTextColor: "#666666",
    fontFamily: "Inter_600SemiBold",
    authorFontFamily: "Inter_500Medium",
    borderStyle: "thin",
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    colors: ["#000000", "#000000"],
    textColor: "#39FF14",
    secondaryTextColor: "#00FFFF",
    fontFamily: "Inter_800ExtraBold",
    authorFontFamily: "Inter_700Bold",
    borderStyle: "neon",
    neonColor: "#39FF14",
  },
];

export type AspectRatio = "9:16" | "1:1" | "4:5";

interface SocialMediaDef {
  id: string;
  name: string;
  color: string;
  gradientColors?: string[];
  textColor: string;
}

const SOCIAL_NETWORKS: SocialMediaDef[] = [
  {
    id: "instagram",
    name: "Instagram Stories",
    color: "#E4405F",
    gradientColors: ["#F58529", "#DD2A7B", "#8134AF", "#515BD4"],
    textColor: "#FFF",
  },
  { id: "tiktok", name: "TikTok Feed", color: "#010101", textColor: "#FFF" },
  { id: "twitter", name: "X / Twitter", color: "#000000", textColor: "#FFF" },
  {
    id: "whatsapp",
    name: "WhatsApp Status",
    color: "#25D366",
    textColor: "#FFF",
  },
  {
    id: "telegram",
    name: "Telegram Chats",
    color: "#26A5E4",
    textColor: "#FFF",
  },
  {
    id: "facebook",
    name: "Facebook Feed",
    color: "#1877F2",
    textColor: "#FFF",
  },
  {
    id: "snapchat",
    name: "Snapchat stories",
    color: "#FFFC00",
    textColor: "#000",
  },
  {
    id: "discord",
    name: "Discord Server",
    color: "#5865F2",
    textColor: "#FFF",
  },
];

interface QuoteShareModalProps {
  visible: boolean;
  onClose: () => void;
  quote: { text: string; author: string; category?: string };
}

export function QuoteShareModal({
  visible,
  onClose,
  quote,
}: QuoteShareModalProps) {
  const { theme } = useTheme();
  const router = useRouter();

  // States
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("9:16");
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(
    THEME_PRESETS[0],
  );
  const [showBranding, setShowBranding] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // Popups & Alerts
  const [showProAlert, setShowProAlert] = useState(false);

  // Sharing simulation
  const [simulatingShare, setSimulatingShare] = useState(false);
  const [simPlatform, setSimPlatform] = useState<SocialMediaDef | null>(null);
  const [simStep, setSimStep] = useState(0);

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate live preview container size based on ratio
  let containerWidth = SCREEN_WIDTH * 0.76;
  let containerHeight = containerWidth * (16 / 9);

  if (selectedRatio === "1:1") {
    containerHeight = containerWidth;
  } else if (selectedRatio === "4:5") {
    containerHeight = containerWidth * 1.25;
  }

  // Generate gorgeous shareable text representation of the quote
  const getShareableText = () => {
    let header = "";
    if (showCategory && quote.category) {
      header += `[${quote.category.toUpperCase()}] • `;
    }
    if (showDate) {
      header += `${todayDateStr}`;
    }

    const branding = showBranding ? "\n\n— Shared via Groundwork" : "";
    return `${header ? `${header}\n` : ""}“${quote.text}”\n\n— ${quote.author}${branding}`;
  };

  // Direct real native share
  const handlePlatformShare = async (platform: SocialMediaDef) => {
    hapticSelection();
    try {
      await Share.share({
        message: getShareableText(),
        title: `Post to ${platform.name}`,
      });
    } catch {
      // ignore sharing cancel/abort
    }
  };

  // Handle Copy Quote Text
  const handleCopy = async () => {
    hapticLight();
    try {
      const shareText = getShareableText();
      await Clipboard.setStringAsync(shareText);
      hapticSuccess();
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (error) {
      Alert.alert("Copy Failed", "Could not copy to clipboard.");
    }
  };

  const handleBrandingToggle = () => {
    hapticLight();
    setShowBranding(!showBranding);
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
      >
        <View style={[styles.root, { backgroundColor: theme.background }]}>
          {/* Header Navigation */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={[styles.circleBtn, { backgroundColor: theme.cardBorder }]}
            >
              <X size={20} color={theme.primaryText} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
              Share Quote
            </Text>
            <Pressable
              onPress={handleCopy}
              style={[styles.circleBtn, { backgroundColor: theme.accentLight }]}
            >
              <Copy size={20} color={theme.accent} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Aspect Ratio Switcher */}
            <View style={styles.ratioRow}>
              {(["9:16", "1:1", "4:5"] as AspectRatio[]).map((ratio) => (
                <Pressable
                  key={ratio}
                  onPress={() => {
                    hapticLight();
                    setSelectedRatio(ratio);
                  }}
                  style={[
                    styles.ratioBtn,
                    selectedRatio === ratio && {
                      backgroundColor: theme.accent,
                      borderColor: theme.accent,
                    },
                    { borderColor: theme.cardBorder },
                  ]}
                >
                  {ratio === "9:16" ? (
                    <Smartphone
                      size={16}
                      color={
                        selectedRatio === ratio ? "#FFF" : theme.secondaryText
                      }
                    />
                  ) : ratio === "1:1" ? (
                    <SquareIcon
                      size={14}
                      color={
                        selectedRatio === ratio ? "#FFF" : theme.secondaryText
                      }
                    />
                  ) : (
                    <BookOpen
                      size={15}
                      color={
                        selectedRatio === ratio ? "#FFF" : theme.secondaryText
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.ratioText,
                      {
                        color:
                          selectedRatio === ratio
                            ? "#FFF"
                            : theme.secondaryText,
                      },
                    ]}
                  >
                    {ratio === "9:16"
                      ? "Story"
                      : ratio === "1:1"
                        ? "Square"
                        : "Portrait"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Live Premium Visual Designer Preview */}
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.shotWrapper,
                  { width: containerWidth, height: containerHeight },
                ]}
              >
                <LinearGradient
                  colors={selectedTheme.colors as [string, string, ...string[]]}
                  start={{ x: 0.1, y: 0.1 }}
                  end={{ x: 0.9, y: 0.9 }}
                  style={[
                    styles.cardBody,
                    selectedTheme.borderStyle === "thin" && styles.thinBorder,
                    selectedTheme.borderStyle === "neon" && [
                      styles.neonBorder,
                      { borderColor: selectedTheme.neonColor },
                    ],
                  ]}
                >
                  {/* Decorative background overlay */}
                  {selectedTheme.showDecoration && (
                    <View style={styles.decorContainer}>
                      <Text style={styles.decorText}>
                        {selectedTheme.bgDecorativeText}
                      </Text>
                    </View>
                  )}

                  {/* Ambient Blur effect for Glass preset */}
                  {selectedTheme.glass && <View style={styles.ambientCircle} />}

                  <View
                    style={[
                      styles.cardContent,
                      selectedTheme.glass && styles.glassCard,
                      selectedRatio === "9:16"
                        ? { padding: 24 }
                        : { padding: 20 },
                    ]}
                  >
                    {/* Card Header metadata */}
                    <View style={styles.cardHeader}>
                      {showDate && (
                        <Text
                          style={[
                            styles.cardDate,
                            { color: selectedTheme.secondaryTextColor },
                          ]}
                        >
                          {todayDateStr}
                        </Text>
                      )}
                      {showCategory && quote.category && (
                        <View
                          style={[
                            styles.tag,
                            {
                              backgroundColor:
                                selectedTheme.secondaryTextColor + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              { color: selectedTheme.textColor },
                            ]}
                          >
                            {quote.category.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Visual Quote Text */}
                    <View style={styles.quoteWrapper}>
                      <Text
                        style={[
                          styles.quoteText,
                          {
                            color: selectedTheme.textColor,
                            fontFamily: selectedTheme.fontFamily,
                            fontSize: selectedRatio === "9:16" ? 22 : 18,
                            lineHeight: selectedRatio === "9:16" ? 32 : 26,
                          },
                        ]}
                      >
                        “{quote.text}”
                      </Text>
                      <Text
                        style={[
                          styles.authorText,
                          {
                            color: selectedTheme.secondaryTextColor,
                            fontFamily: selectedTheme.authorFontFamily,
                          },
                        ]}
                      >
                        — {quote.author}
                      </Text>
                    </View>

                    {/* Logo Brand watermark */}
                    {showBranding && (
                      <View style={styles.brandingFooter}>
                        <View
                          style={[
                            styles.brandDot,
                            { backgroundColor: selectedTheme.textColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.brandText,
                            { color: selectedTheme.textColor },
                          ]}
                        >
                          GROUNDWORK
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Share to Premium Social Grid */}
            <View style={styles.sectionHeader}>
              <Share2 size={16} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                Share as Premium Card
              </Text>
            </View>
            <View style={styles.socialGrid}>
              {SOCIAL_NETWORKS.map((network) => (
                <Pressable
                  key={network.id}
                  onPress={() => handlePlatformShare(network)}
                  style={[styles.socialPill, { borderColor: theme.cardBorder }]}
                >
                  {network.gradientColors ? (
                    <LinearGradient
                      colors={
                        network.gradientColors as [string, string, ...string[]]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.socialIconDot}
                    >
                      <Send size={10} color="#FFF" />
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.socialIconDot,
                        { backgroundColor: network.color },
                      ]}
                    >
                      <Send size={10} color={network.textColor} />
                    </View>
                  )}
                  <Text
                    style={[styles.socialLabel, { color: theme.primaryText }]}
                  >
                    {network.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Style Presets Carousel */}
            <View style={styles.sectionHeader}>
              <Sparkles size={16} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                Theme Styles
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.themeList}
            >
              {THEME_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    hapticLight();
                    setSelectedTheme(preset);
                  }}
                  style={[
                    styles.themePill,
                    selectedTheme.id === preset.id && {
                      borderColor: theme.accent,
                      borderWidth: 2,
                    },
                    { backgroundColor: theme.card },
                  ]}
                >
                  <LinearGradient
                    colors={preset.colors as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.themePillColor}
                  />
                  <Text
                    style={[
                      styles.themePillLabel,
                      { color: theme.primaryText },
                    ]}
                  >
                    {preset.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Dynamic Settings panel */}
            <View style={styles.sectionHeader}>
              <Settings size={16} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
                Card Settings
              </Text>
            </View>
            <View
              style={[
                styles.configPanel,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Pressable
                onPress={handleBrandingToggle}
                style={styles.configRow}
              >
                <Text
                  style={[styles.configLabel, { color: theme.primaryText }]}
                >
                  Branding Logo
                </Text>
                <View
                  style={[
                    styles.switch,
                    showBranding
                      ? { backgroundColor: theme.accent }
                      : styles.switchOff,
                  ]}
                >
                  <View
                    style={[
                      styles.switchHandle,
                      showBranding && styles.switchHandleOn,
                    ]}
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  hapticLight();
                  setShowDate(!showDate);
                }}
                style={styles.configRow}
              >
                <Text
                  style={[styles.configLabel, { color: theme.primaryText }]}
                >
                  Show Date
                </Text>
                <View
                  style={[
                    styles.switch,
                    showDate
                      ? { backgroundColor: theme.accent }
                      : styles.switchOff,
                  ]}
                >
                  <View
                    style={[
                      styles.switchHandle,
                      showDate && styles.switchHandleOn,
                    ]}
                  />
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  hapticLight();
                  setShowCategory(!showCategory);
                }}
                style={[styles.configRow, { borderBottomWidth: 0 }]}
              >
                <Text
                  style={[styles.configLabel, { color: theme.primaryText }]}
                >
                  Show Category Tag
                </Text>
                <View
                  style={[
                    styles.switch,
                    showCategory
                      ? { backgroundColor: theme.accent }
                      : styles.switchOff,
                  ]}
                >
                  <View
                    style={[
                      styles.switchHandle,
                      showCategory && styles.switchHandleOn,
                    ]}
                  />
                </View>
              </Pressable>
            </View>

            {/* Utilities */}
            <View style={styles.actionGrid}>
              <Pressable
                onPress={handleCopy}
                style={[
                  styles.outlineBtn,
                  {
                    flex: 1,
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                {copySuccess ? (
                  <>
                    <Check size={18} color={theme.accent} />
                    <Text
                      style={[styles.outlineBtnText, { color: theme.accent }]}
                    >
                      Copied!
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={18} color={theme.primaryText} />
                    <Text
                      style={[
                        styles.outlineBtnText,
                        { color: theme.primaryText },
                      ]}
                    >
                      Copy Text
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Milestone Rewards dialog */}
      <CustomAlert
        visible={showProAlert}
        type="info"
        title="Milestone Reward"
        message="Watermark-free studio exports unlock through Groundwork Milestone Rewards. Complete your focus and habit milestones to unlock full studio card customization!"
        confirmText="View Milestones"
        cancelText="Maybe Later"
        showCancel
        onConfirm={() => {
          hapticLight();
          setShowProAlert(false);
          router.push('/rewards' as any);
        }}
        onCancel={() => setShowProAlert(false)}
      />

      {/* Ultra-HD Rendering & Simulated Posting Pipeline Modal */}
      <Modal transparent visible={simulatingShare} animationType="fade">
        <View style={styles.simulationOverlay}>
          <View
            style={[
              styles.simulationBox,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <ActivityIndicator
              size="large"
              color={theme.accent}
              style={{ marginBottom: 16 }}
            />

            <Text style={[styles.simTitle, { color: theme.primaryText }]}>
              {simPlatform?.name}
            </Text>

            <View style={styles.simStepsContainer}>
              <View style={styles.simStepRow}>
                <View
                  style={[
                    styles.simDot,
                    simStep >= 0
                      ? { backgroundColor: theme.accent }
                      : styles.simDotPending,
                  ]}
                />
                <Text
                  style={[
                    styles.simStepText,
                    simStep === 0
                      ? styles.simActiveText
                      : { color: theme.secondaryText },
                  ]}
                >
                  Rendering Ultra-HD premium card...
                </Text>
              </View>

              <View style={styles.simStepRow}>
                <View
                  style={[
                    styles.simDot,
                    simStep >= 1
                      ? { backgroundColor: theme.accent }
                      : styles.simDotPending,
                  ]}
                />
                <Text
                  style={[
                    styles.simStepText,
                    simStep === 1
                      ? styles.simActiveText
                      : { color: theme.secondaryText },
                  ]}
                >
                  Applying HSL presets & aspect ratios...
                </Text>
              </View>

              <View style={styles.simStepRow}>
                <View
                  style={[
                    styles.simDot,
                    simStep >= 2
                      ? { backgroundColor: theme.accent }
                      : styles.simDotPending,
                  ]}
                />
                <Text
                  style={[
                    styles.simStepText,
                    simStep === 2
                      ? styles.simActiveText
                      : { color: theme.secondaryText },
                  ]}
                >
                  Exporting to platform natively...
                </Text>
              </View>

              {simStep >= 3 && (
                <View style={styles.simSuccessRow}>
                  <Check size={20} color="#34C759" />
                  <Text style={[styles.simSuccessText, { color: "#34C759" }]}>
                    Premium card shared successfully!
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// FadeIn animation helper
function FadeIn({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === "ios" ? 44 : 20 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  ratioRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 16,
  },
  ratioBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  ratioText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  previewContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  shotWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardBody: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  thinBorder: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.06)",
  },
  neonBorder: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowColor: "#fff",
    elevation: 12,
  },
  decorContainer: {
    position: "absolute",
    top: -20,
    left: -20,
    opacity: 0.04,
  },
  decorText: {
    fontSize: 120,
    fontFamily: "Inter_800ExtraBold",
    color: "#FFF",
    letterSpacing: -4,
  },
  ambientCircle: {
    position: "absolute",
    top: "30%",
    left: "25%",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#8A2BE2",
    opacity: 0.3,
    transform: [{ scale: 1.5 }],
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDate: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  quoteWrapper: {
    flex: 1,
    justifyContent: "center",
    marginVertical: 20,
  },
  quoteText: {
    fontSize: 20,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  authorText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.85,
  },
  brandingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: 0.5,
  },
  brandDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  brandText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 8,
  },
  socialPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minWidth: SCREEN_WIDTH * 0.43,
  },
  socialIconDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  themeList: {
    gap: 12,
    paddingRight: 16,
  },
  themePill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 8,
  },
  themePillColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  themePillLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  configPanel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  configLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  switchOff: {
    backgroundColor: "rgba(120,120,120,0.3)",
  },
  switchHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  switchHandleOn: {
    alignSelf: "flex-end",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  outlineBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  outlineBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  paywallOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  paywallBox: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  paywallIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  paywallTitle: {
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 4,
    textAlign: "center",
  },
  paywallSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paywallText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 28,
  },
  paywallBtn: {
    width: "100%",
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  paywallBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  simulationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  simulationBox: {
    width: "82%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  simTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 20,
  },
  simStepsContainer: {
    width: "100%",
    gap: 12,
  },
  simStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  simDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  simDotPending: {
    backgroundColor: "rgba(120,120,120,0.3)",
  },
  simStepText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  simActiveText: {
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },
  simSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  simSuccessText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
