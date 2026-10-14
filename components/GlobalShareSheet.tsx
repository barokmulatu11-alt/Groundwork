import { CustomAlert } from "@/components/ui/CustomAlert";
import { useTheme } from "@/lib/ThemeContext";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Award,
  Bookmark,
  BookOpen,
  Check,
  Copy,
  Flame,
  Image as ImageIcon,
  Lock,
  Paintbrush,
  Plus,
  RotateCcw,
  RotateCw,
  Share2,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  Type,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ViewShot from "react-native-view-shot";
type ViewShotRef = any;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Visual Theme Presets ────────────────────────────────────────────────────
export interface ThemePreset {
  id: string;
  name: string;
  colors: string[];
  textColor: string;
  secondaryTextColor: string;
  fontFamily: string;
  authorFontFamily: string;
  fontWeight?: "400" | "500" | "600" | "700" | "800";
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
  {
    id: "academic_ivory",
    name: "Academic Ivory",
    colors: ["#F5F5F0", "#E5E5E0"],
    textColor: "#2C2C2C",
    secondaryTextColor: "#5A5A5A",
    fontFamily: "Inter_600SemiBold",
    authorFontFamily: "Inter_500Medium",
    borderStyle: "thin",
  },
  {
    id: "luxury_obsidian",
    name: "Luxury Gold",
    colors: ["#1A1A1D", "#3B3B3F", "#0D0D0F"],
    textColor: "#D4AF37",
    secondaryTextColor: "#C0C0C0",
    fontFamily: "Inter_800ExtraBold",
    authorFontFamily: "Inter_600SemiBold",
    borderStyle: "thin",
  },
];

export type AspectRatio = "9:16" | "1:1" | "4:5";
export type ShareContentType =
  | "quote"
  | "achievement"
  | "streak"
  | "level"
  | "profile";
export type ActiveTab = "content" | "design" | "canvas" | "templates";
export type LayoutType = "classic" | "hero" | "minimalist" | "split";
export type VerticalAlign = "flex-start" | "center" | "flex-end";
export type BrandingStyle = "full" | "minimal" | "hidden";

interface SavedTemplate {
  id: string;
  name: string;
  themeId: string;
  customFont: string;
  customTextColor: string;
  customRadius: number;
  isGlass: boolean;
  isNeon: boolean;
  isDecorated: boolean;
  fontSize: number;
  lineSpacing: number;
  letterSpacing: number;
  textAlignment: "left" | "center" | "right";
  verticalAlign: VerticalAlign;
  layoutType: LayoutType;
  authorAbove: boolean;
  bgOpacity: number;
  showOverlay: boolean;
  customColors: string[];
}

interface GlobalShareSheetProps {
  visible: boolean;
  onClose: () => void;
  contentType: ShareContentType;
  contentData: any;
}

export function GlobalShareSheet({
  visible,
  onClose,
  contentType,
  contentData,
}: GlobalShareSheetProps) {
  const { theme } = useTheme();
  const cardRef = useRef<ViewShotRef>(null);

  // Tabbed Customizer Selection
  const [activeTab, setActiveTab] = useState<ActiveTab>("content");

  // Aspect Ratio Settings
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("9:16");
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(
    THEME_PRESETS[0],
  );
  const [brandingStyle, setBrandingStyle] = useState<BrandingStyle>("full");

  // Text Content Settings
  const [quoteText, setQuoteText] = useState(contentData?.text || "");
  const [authorText, setAuthorText] = useState(contentData?.author || "");
  const [reflectionText, setReflectionText] = useState("");
  const [categoryLabel, setCategoryLabel] = useState(
    contentData?.category || "",
  );

  // Typography Settings
  const [customFont, setCustomFont] = useState(selectedTheme.fontFamily);
  const [customTextColor, setCustomTextColor] = useState(
    selectedTheme.textColor,
  );
  const [fontSize, setFontSize] = useState(20);
  const [lineSpacing, setLineSpacing] = useState(28);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textAlignment, setTextAlignment] = useState<
    "left" | "center" | "right"
  >("center");
  const [verticalAlign, setVerticalAlign] = useState<VerticalAlign>("center");

  // Layout & Alignment Settings
  const [layoutType, setLayoutType] = useState<LayoutType>("classic");
  const [authorAbove, setAuthorAbove] = useState(false);
  const [customRadius, setCustomRadius] = useState(0); // default to perfectly square corners

  // Visual background & image uploads
  const [bgImageUri, setBgImageUri] = useState<string | null>(null);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgZoom, setBgZoom] = useState(1);
  const [bgBrightness, setBgBrightness] = useState(1);
  const [bgOpacity, setBgOpacity] = useState(0.85);
  const [showOverlay, setShowOverlay] = useState(true);

  // Customizable Gradient / Solid state override
  const [customColors, setCustomColors] = useState<string[]>(
    selectedTheme.colors,
  );

  // Aesthetic filters & decor overlays
  const [isGlass, setIsGlass] = useState(!!selectedTheme.glass);
  const [isNeon, setIsNeon] = useState(selectedTheme.borderStyle === "neon");
  const [isDecorated, setIsDecorated] = useState(
    !!selectedTheme.showDecoration,
  );
  const [showDate, setShowDate] = useState(true);
  const [showCategory, setShowCategory] = useState(true);

  // Undo / Redo History stack
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Saved templates registry
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");

  // Milestone rewards / Dialog UI
  const router = useRouter();
  const [showProAlert, setShowProAlert] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Load content whenever contentData is updated
  useEffect(() => {
    if (contentData) {
      setQuoteText(contentData.text || "");
      setAuthorText(contentData.author || "");
      setCategoryLabel(contentData.category || "");
    }
  }, [contentData]);

  // Sync custom settings when theme changes
  useEffect(() => {
    setCustomFont(selectedTheme.fontFamily);
    setCustomTextColor(selectedTheme.textColor);
    setIsGlass(!!selectedTheme.glass);
    setIsNeon(selectedTheme.borderStyle === "neon");
    setIsDecorated(!!selectedTheme.showDecoration);
    setCustomColors(selectedTheme.colors);
  }, [selectedTheme]);

  // Handle template synchronization
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  // History tracking state collector
  const captureHistoryState = () => {
    const state = {
      selectedRatio,
      themeId: selectedTheme.id,
      quoteText,
      authorText,
      reflectionText,
      categoryLabel,
      customFont,
      customTextColor,
      fontSize,
      lineSpacing,
      letterSpacing,
      textAlignment,
      verticalAlign,
      layoutType,
      authorAbove,
      customRadius,
      bgImageUri,
      bgBlur,
      bgZoom,
      bgBrightness,
      bgOpacity,
      showOverlay,
      isGlass,
      isNeon,
      isDecorated,
      showDate,
      showCategory,
      customColors,
    };
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, state]);
    setHistoryIndex(newHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      applyHistoryState(history[prevIndex]);
      hapticLight();
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      applyHistoryState(history[nextIndex]);
      hapticLight();
    }
  };

  const applyHistoryState = (state: any) => {
    if (!state) return;
    setSelectedRatio(state.selectedRatio);
    const themeObj = THEME_PRESETS.find((t) => t.id === state.themeId);
    if (themeObj) setSelectedTheme(themeObj);
    setQuoteText(state.quoteText);
    setAuthorText(state.authorText);
    setReflectionText(state.reflectionText);
    setCategoryLabel(state.categoryLabel);
    setCustomFont(state.customFont);
    setCustomTextColor(state.customTextColor);
    setFontSize(state.fontSize);
    setLineSpacing(state.lineSpacing);
    setLetterSpacing(state.letterSpacing);
    setTextAlignment(state.textAlignment);
    setVerticalAlign(state.verticalAlign);
    setLayoutType(state.layoutType);
    setAuthorAbove(state.authorAbove);
    setCustomRadius(state.customRadius);
    setBgImageUri(state.bgImageUri);
    setBgBlur(state.bgBlur);
    setBgZoom(state.bgZoom);
    setBgBrightness(state.bgBrightness);
    setBgOpacity(state.bgOpacity);
    setShowOverlay(state.showOverlay);
    setIsGlass(state.isGlass);
    setIsNeon(state.isNeon);
    setIsDecorated(state.isDecorated);
    setShowDate(state.showDate);
    setShowCategory(state.showCategory);
    setCustomColors(state.customColors);
  };

  const handleReset = () => {
    hapticLight();
    if (contentData) {
      setQuoteText(contentData.text || "");
      setAuthorText(contentData.author || "");
      setReflectionText("");
      setCategoryLabel(contentData.category || "");
    }
    setSelectedTheme(THEME_PRESETS[0]);
    setCustomRadius(0);
    setBgImageUri(null);
    setBgBlur(0);
    setBgZoom(1);
    setBgBrightness(1);
    setBgOpacity(0.85);
    setShowOverlay(true);
    setLayoutType("classic");
    setAuthorAbove(false);
    setTextAlignment("center");
    setVerticalAlign("center");
    setFontSize(20);
    setLineSpacing(28);
    setLetterSpacing(0);
    captureHistoryState();
  };

  // Image Upload handler
  const handleUploadImage = async () => {
    hapticLight();
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permission Denied",
        "Please grant library permissions in settings to select backgrounds.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1.0,
    });
    if (!result.canceled && result.assets?.[0]) {
      setBgImageUri(result.assets[0].uri);
      captureHistoryState();
    }
  };

  // Template handling methods
  const loadSavedTemplates = async () => {
    try {
      const data = await AsyncStorage.getItem("@groundwork_share_templates");
      if (data) {
        setTemplates(JSON.parse(data));
      }
    } catch (err) {
      console.warn("Failed to load templates:", err);
    }
  };

  const handleSaveTemplate = async () => {
    hapticLight();
    if (!newTemplateName.trim()) {
      Alert.alert("Name Required", "Please enter a template name.");
      return;
    }
    const newTemplate: SavedTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      themeId: selectedTheme.id,
      customFont,
      customTextColor,
      customRadius,
      isGlass,
      isNeon,
      isDecorated,
      fontSize,
      lineSpacing,
      letterSpacing,
      textAlignment,
      verticalAlign,
      layoutType,
      authorAbove,
      bgOpacity,
      showOverlay,
      customColors,
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    setNewTemplateName("");
    try {
      await AsyncStorage.setItem(
        "@groundwork_share_templates",
        JSON.stringify(updated),
      );
      hapticSuccess();
      Alert.alert("Success", "Design template saved successfully!");
    } catch (err) {
      Alert.alert("Error", "Could not save template.");
    }
  };

  const handleLoadTemplate = (template: SavedTemplate) => {
    hapticLight();
    const matchedTheme = THEME_PRESETS.find((t) => t.id === template.themeId);
    if (matchedTheme) setSelectedTheme(matchedTheme);
    setCustomFont(template.customFont);
    setCustomTextColor(template.customTextColor);
    setCustomRadius(template.customRadius);
    setIsGlass(template.isGlass);
    setIsNeon(template.isNeon);
    setIsDecorated(template.isDecorated);
    setFontSize(template.fontSize);
    setLineSpacing(template.lineSpacing);
    setLetterSpacing(template.letterSpacing);
    setTextAlignment(template.textAlignment);
    setVerticalAlign(template.verticalAlign);
    setLayoutType(template.layoutType);
    setAuthorAbove(template.authorAbove);
    setBgOpacity(template.bgOpacity);
    setShowOverlay(template.showOverlay);
    setCustomColors(template.customColors);
    captureHistoryState();
  };

  const handleDeleteTemplate = async (id: string) => {
    hapticLight();
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    try {
      await AsyncStorage.setItem(
        "@groundwork_share_templates",
        JSON.stringify(updated),
      );
    } catch {}
  };

  // Preview sizing calculator
  let containerWidth = SCREEN_WIDTH * 0.78;
  let containerHeight = containerWidth * (16 / 9);
  if (selectedRatio === "1:1") containerHeight = containerWidth;
  else if (selectedRatio === "4:5") containerHeight = containerWidth * 1.25;

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getShareText = () => {
    let body = quoteText ? `"${quoteText}"` : "";
    if (authorText) body += `\n— ${authorText}`;
    if (reflectionText) body += `\n\nReflection:\n${reflectionText}`;
    return brandingStyle !== "hidden"
      ? `${body}\n\nShared via Groundwork`
      : body;
  };

  const handleShareImage = async () => {
    hapticLight();
    setIsSharing(true);
    try {
      if (Platform.OS === "web") {
        await Share.share({
          title: "My Groundwork Card",
          message: getShareText(),
        });
        setIsSharing(false);
        return;
      }
      const uri = await cardRef.current!.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        await Share.share({
          title: "My Groundwork Card",
          message: getShareText(),
        });
        setIsSharing(false);
        return;
      }
      hapticSuccess();
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your Groundwork card",
        UTI: "public.png",
      });
    } catch (err: any) {
      if (
        !err?.message?.includes("cancelled") &&
        !err?.message?.includes("dismissed")
      ) {
        console.warn("Share error:", err);
        Alert.alert(
          "Share Failed",
          "Could not share the card. Please try again.",
        );
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyText = async () => {
    hapticLight();
    try {
      await Clipboard.setStringAsync(getShareText());
      hapticSuccess();
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      Alert.alert("Copy Failed", "Could not copy to clipboard.");
    }
  };

  const handleBrandingToggle = () => {
    hapticLight();
    if (brandingStyle === "full") {
      setBrandingStyle("minimal");
    } else if (brandingStyle === "minimal") {
      setShowProAlert(true);
    } else {
      setBrandingStyle("full");
    }
  };

  const getLayoutStyles = () => {
    switch (layoutType) {
      case "hero":
        return { padding: 40, justifyContent: "flex-start" as const };
      case "minimalist":
        return { padding: 10, justifyContent: "center" as const };
      case "split":
        return { padding: 24, justifyContent: "space-between" as const };
      default:
        return { padding: 24, justifyContent: verticalAlign };
    }
  };

  // Scale typography for compact ratios
  const scaledFontSize =
    selectedRatio === "1:1"
      ? Math.max(12, Math.round(fontSize * 0.85))
      : fontSize;
  const scaledLineSpacing =
    selectedRatio === "1:1"
      ? Math.max(16, Math.round(lineSpacing * 0.85))
      : lineSpacing;
  const scaledLetterSpacing =
    selectedRatio === "1:1" ? letterSpacing * 0.9 : letterSpacing;
  const quoteWrapperMargin = selectedRatio === "1:1" ? 8 : 20;

  // Card Content renderer
  const renderCardContent = () => {
    switch (contentType) {
      case "quote":
        return (
          <View
            style={[
              styles.quoteWrapper,
              getLayoutStyles(),
              { marginVertical: quoteWrapperMargin },
            ]}
          >
            {authorAbove && authorText && (
              <Text
                style={[
                  styles.authorText,
                  {
                    color: customTextColor + "D0",
                    fontFamily: selectedTheme.authorFontFamily,
                    textAlign: textAlignment,
                    marginBottom: 12,
                    fontSize: scaledFontSize * 0.7,
                  },
                ]}
              >
                — {authorText}
              </Text>
            )}
            <Text
              style={[
                styles.quoteText,
                {
                  color: customTextColor,
                  fontFamily: customFont,
                  fontSize: scaledFontSize,
                  lineHeight: scaledLineSpacing,
                  letterSpacing: scaledLetterSpacing,
                  textAlign: layoutType === "hero" ? "left" : textAlignment,
                  marginBottom: authorAbove ? 0 : 12,
                },
              ]}
            >
              {quoteText ? `"${quoteText}"` : "Your customized quote here..."}
            </Text>
            {!authorAbove && authorText && (
              <Text
                style={[
                  styles.authorText,
                  {
                    color: customTextColor + "D0",
                    fontFamily: selectedTheme.authorFontFamily,
                    textAlign: layoutType === "hero" ? "left" : textAlignment,
                    fontSize: scaledFontSize * 0.7,
                  },
                ]}
              >
                — {authorText}
              </Text>
            )}
            {reflectionText.trim().length > 0 && (
              <View
                style={[
                  styles.reflectionCard,
                  { borderColor: customTextColor + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.reflectionLabel,
                    { color: customTextColor + "A0" },
                  ]}
                >
                  REFLECTIONS
                </Text>
                <Text
                  style={[
                    styles.reflectionContent,
                    {
                      color: customTextColor,
                      textAlign: layoutType === "hero" ? "left" : textAlignment,
                    },
                  ]}
                >
                  {reflectionText}
                </Text>
              </View>
            )}
          </View>
        );

      case "achievement":
        return (
          <View style={styles.centerWrapper}>
            <View
              style={[
                styles.glowingRing,
                { borderColor: customTextColor + "60" },
              ]}
            >
              <Trophy size={48} color={customTextColor} strokeWidth={2.5} />
            </View>
            <Text style={[styles.cardHeadline, { color: customTextColor }]}>
              ACHIEVEMENT UNLOCKED
            </Text>
            <Text
              style={[
                styles.cardValName,
                { color: customTextColor, fontSize: fontSize },
              ]}
            >
              {contentData.name}
            </Text>
            {contentData.description && (
              <Text
                style={[styles.cardValDesc, { color: customTextColor + "CC" }]}
              >
                {contentData.description}
              </Text>
            )}
            {contentData.xpReward && (
              <View
                style={[
                  styles.xpBadge,
                  { backgroundColor: selectedTheme.textColor + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.xpBadgeText,
                    { color: selectedTheme.textColor },
                  ]}
                >
                  +{contentData.xpReward} XP
                </Text>
              </View>
            )}
          </View>
        );

      case "streak":
        return (
          <View style={styles.centerWrapper}>
            <View
              style={[
                styles.glowingRing,
                {
                  borderColor: "#FF9500" + "60",
                  backgroundColor: "#FF9500" + "15",
                },
              ]}
            >
              <Flame size={54} color="#FF9500" strokeWidth={2.5} />
            </View>
            <Text
              style={[styles.cardHeadline, { color: selectedTheme.textColor }]}
            >
              STREAK UNSTOPPABLE
            </Text>
            <Text
              style={[
                styles.cardValNumber,
                { color: selectedTheme.textColor, fontSize: fontSize * 1.5 },
              ]}
            >
              {contentData.count} DAYS
            </Text>
            <Text
              style={[styles.cardValDesc, { color: customTextColor + "CC" }]}
            >
              Consistency is key. Building something real day by day!
            </Text>
          </View>
        );

      case "level":
        return (
          <View style={styles.centerWrapper}>
            <View
              style={[
                styles.glowingRing,
                { borderColor: customTextColor + "60" },
              ]}
            >
              <Award size={52} color={customTextColor} strokeWidth={2.5} />
            </View>
            <Text style={[styles.cardHeadline, { color: customTextColor }]}>
              LEVEL ACHIEVED
            </Text>
            <Text
              style={[
                styles.cardValNumber,
                { color: customTextColor, fontSize: fontSize * 1.5 },
              ]}
            >
              LEVEL {contentData.level}
            </Text>
            <Text
              style={[styles.cardValDesc, { color: customTextColor + "CC" }]}
            >
              Advancing through habits and crushing goals!
            </Text>
          </View>
        );

      case "profile":
        return (
          <View style={styles.profileWrapper}>
            <View style={styles.profileHeaderRow}>
              <View
                style={[
                  styles.avatarBox,
                  { backgroundColor: customTextColor + "25" },
                ]}
              >
                <User size={36} color={customTextColor} />
              </View>
              <View>
                <Text
                  style={[
                    styles.profileName,
                    { color: customTextColor, fontSize: fontSize },
                  ]}
                >
                  {contentData.name || "Groundwork Hero"}
                </Text>
                <Text
                  style={[styles.profileSub, { color: customTextColor + "CC" }]}
                >
                  Progress Snapshot
                </Text>
              </View>
            </View>
            <View style={styles.profileStatsRow}>
              <View
                style={[
                  styles.profileStatCard,
                  { backgroundColor: customTextColor + "10" },
                ]}
              >
                <Text
                  style={[styles.profileStatVal, { color: customTextColor }]}
                >
                  {contentData.level}
                </Text>
                <Text
                  style={[
                    styles.profileStatLabel,
                    { color: customTextColor + "CC" },
                  ]}
                >
                  Level
                </Text>
              </View>
              <View
                style={[
                  styles.profileStatCard,
                  { backgroundColor: customTextColor + "10" },
                ]}
              >
                <Text
                  style={[styles.profileStatVal, { color: customTextColor }]}
                >
                  {contentData.streak}
                </Text>
                <Text
                  style={[
                    styles.profileStatLabel,
                    { color: customTextColor + "CC" },
                  ]}
                >
                  Streak
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
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
          {/* Header with Undo / Redo controls */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={[styles.circleBtn, { backgroundColor: theme.cardBorder }]}
            >
              <X size={20} color={theme.primaryText} />
            </Pressable>

            {/* Live undo / redo buttons */}
            <View style={styles.historyActionsRow}>
              <Pressable
                onPress={handleUndo}
                disabled={historyIndex <= 0}
                style={[
                  styles.historyBtn,
                  { opacity: historyIndex > 0 ? 1 : 0.4 },
                ]}
              >
                <RotateCcw size={18} color={theme.primaryText} />
              </Pressable>
              <Pressable
                onPress={handleRedo}
                disabled={historyIndex >= history.length - 1}
                style={[
                  styles.historyBtn,
                  { opacity: historyIndex < history.length - 1 ? 1 : 0.4 },
                ]}
              >
                <RotateCw size={18} color={theme.primaryText} />
              </Pressable>
              <Pressable onPress={handleReset} style={styles.resetBtn}>
                <Text style={[styles.resetText, { color: theme.accent }]}>
                  Reset
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleCopyText}
              style={[styles.circleBtn, { backgroundColor: theme.accentLight }]}
            >
              {copySuccess ? (
                <Check size={18} color={theme.accent} />
              ) : (
                <Copy size={20} color={theme.accent} />
              )}
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Live Premium Card Preview */}
            <View style={styles.previewContainer}>
              <ViewShot
                ref={cardRef}
                options={{
                  format: "png",
                  quality: 1.0,
                  result: "tmpfile",
                  width: containerWidth * 3,
                  height: containerHeight * 3,
                }}
                style={{ overflow: "hidden" }}
              >
                <View
                  style={{ width: containerWidth, height: containerHeight }}
                >
                  {bgImageUri ? (
                    <Image
                      source={{ uri: bgImageUri }}
                      style={[
                        StyleSheet.absoluteFill,
                        { opacity: bgOpacity, transform: [{ scale: bgZoom }] },
                      ]}
                      blurRadius={bgBlur}
                    />
                  ) : null}
                  {bgImageUri && (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: "#000", opacity: 1 - bgBrightness },
                      ]}
                    />
                  )}
                  <LinearGradient
                    colors={
                      customColors as unknown as [string, string, ...string[]]
                    }
                    start={{ x: 0.1, y: 0.1 }}
                    end={{ x: 0.9, y: 0.9 }}
                    style={[
                      styles.cardBody,
                      { borderRadius: customRadius },
                      { opacity: bgImageUri && showOverlay ? 0.45 : 1 },
                      selectedTheme.borderStyle === "thin" && styles.thinBorder,
                      isNeon && [
                        styles.neonBorder,
                        { borderColor: selectedTheme.neonColor },
                      ],
                    ]}
                  >
                    {/* Decorative background overlay */}
                    {isDecorated && (
                      <View style={styles.decorContainer}>
                        <Text style={styles.decorText}>
                          {selectedTheme.bgDecorativeText}
                        </Text>
                      </View>
                    )}

                    {/* Ambient Light Circle */}
                    {isGlass && <View style={styles.ambientCircle} />}

                    <View
                      style={[
                        styles.cardContent,
                        isGlass && styles.glassCard,
                        { borderRadius: customRadius },
                        selectedRatio === "9:16"
                          ? { padding: 24 }
                          : selectedRatio === "1:1"
                            ? { padding: 12 }
                            : { padding: 20 },
                      ]}
                    >
                      {/* Card header row */}
                      <View style={styles.cardHeader}>
                        {showDate && (
                          <Text
                            style={[
                              styles.cardDate,
                              { color: customTextColor + "CC" },
                            ]}
                          >
                            {todayDateStr}
                          </Text>
                        )}
                        {showCategory && categoryLabel.trim().length > 0 && (
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
                                { color: customTextColor },
                              ]}
                            >
                              {categoryLabel.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Dynamic card body */}
                      {renderCardContent()}

                      {/* Branding footer */}
                      {brandingStyle !== "hidden" && (
                        <View style={styles.brandingFooter}>
                          <View
                            style={[
                              styles.brandDot,
                              { backgroundColor: customTextColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.brandText,
                              { color: customTextColor },
                            ]}
                          >
                            {brandingStyle === "full" ? "GROUNDWORK" : "GW"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </ViewShot>
            </View>

            {/* Customizer Navigation Tabs */}
            <View
              style={[
                styles.tabNavigationRow,
                { borderColor: theme.cardBorder },
              ]}
            >
              {(
                [
                  { key: "content", label: "Content", icon: Type },
                  { key: "design", label: "Styles", icon: Sliders },
                  { key: "canvas", label: "Canvas", icon: Paintbrush },
                  { key: "templates", label: "Library", icon: Bookmark },
                ] as const
              ).map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    hapticLight();
                    setActiveTab(tab.key);
                  }}
                  style={[
                    styles.tabNavBtn,
                    activeTab === tab.key && [
                      styles.tabNavBtnActive,
                      { borderBottomColor: theme.accent },
                    ],
                  ]}
                >
                  <tab.icon
                    size={16}
                    color={
                      activeTab === tab.key ? theme.accent : theme.secondaryText
                    }
                  />
                  <Text
                    style={[
                      styles.tabNavLabel,
                      {
                        color:
                          activeTab === tab.key
                            ? theme.primaryText
                            : theme.secondaryText,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Tab 1: Content Editor ── */}
            {activeTab === "content" && (
              <View style={styles.tabContentContainer}>
                {contentType === "quote" && (
                  <>
                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Quote Text
                    </Text>
                    <TextInput
                      style={[
                        styles.editorInput,
                        {
                          color: theme.primaryText,
                          borderColor: theme.cardBorder,
                          backgroundColor: theme.card,
                        },
                      ]}
                      value={quoteText}
                      onChangeText={setQuoteText}
                      onEndEditing={captureHistoryState}
                      multiline
                      placeholder="Add quote body..."
                      placeholderTextColor={theme.tertiaryText}
                    />

                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Author / Subtitle
                    </Text>
                    <TextInput
                      style={[
                        styles.editorInput,
                        {
                          color: theme.primaryText,
                          borderColor: theme.cardBorder,
                          backgroundColor: theme.card,
                        },
                      ]}
                      value={authorText}
                      onChangeText={setAuthorText}
                      onEndEditing={captureHistoryState}
                      placeholder="Add author..."
                      placeholderTextColor={theme.tertiaryText}
                    />

                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Category / Tag
                    </Text>
                    <TextInput
                      style={[
                        styles.editorInput,
                        {
                          color: theme.primaryText,
                          borderColor: theme.cardBorder,
                          backgroundColor: theme.card,
                        },
                      ]}
                      value={categoryLabel}
                      onChangeText={setCategoryLabel}
                      onEndEditing={captureHistoryState}
                      placeholder="Add category tag..."
                      placeholderTextColor={theme.tertiaryText}
                    />

                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Personal Reflection (Optional)
                    </Text>
                    <TextInput
                      style={[
                        styles.editorInput,
                        {
                          color: theme.primaryText,
                          borderColor: theme.cardBorder,
                          backgroundColor: theme.card,
                          minHeight: 60,
                        },
                      ]}
                      value={reflectionText}
                      onChangeText={setReflectionText}
                      onEndEditing={captureHistoryState}
                      multiline
                      placeholder="Add private reflection or notes..."
                      placeholderTextColor={theme.tertiaryText}
                    />
                  </>
                )}
                {contentType !== "quote" && (
                  <Text
                    style={[
                      styles.tabNoticeText,
                      { color: theme.secondaryText },
                    ]}
                  >
                    The text body for achievements, streak counters, and
                    snapshot cards is automatically mapped from your progress
                    logs. Proceed to design or template tabs to customize
                    layouts.
                  </Text>
                )}
              </View>
            )}

            {/* ── Tab 2: Design Styles & Formatting ── */}
            {activeTab === "design" && (
              <View style={styles.tabContentContainer}>
                {/* Aspect ratio selector */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Card Aspect Ratio
                </Text>
                <View style={styles.ratioRow}>
                  {(["9:16", "1:1", "4:5"] as AspectRatio[]).map((ratio) => (
                    <Pressable
                      key={ratio}
                      onPress={() => {
                        hapticLight();
                        setSelectedRatio(ratio);
                        captureHistoryState();
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
                          ? "Story (9:16)"
                          : ratio === "1:1"
                            ? "Square (1:1)"
                            : "Portrait (4:5)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Layout Presets */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Layout Preset
                </Text>
                <View style={styles.actionGrid}>
                  {(
                    ["classic", "hero", "minimalist", "split"] as LayoutType[]
                  ).map((l) => (
                    <Pressable
                      key={l}
                      onPress={() => {
                        hapticLight();
                        setLayoutType(l);
                        captureHistoryState();
                      }}
                      style={[
                        styles.outlineBtn,
                        {
                          flex: 1,
                          backgroundColor: theme.card,
                          borderColor:
                            layoutType === l ? theme.accent : theme.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.outlineBtnText,
                          {
                            color:
                              layoutType === l
                                ? theme.accent
                                : theme.primaryText,
                            textTransform: "capitalize",
                          },
                        ]}
                      >
                        {l}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Typography weight selector */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Font Style & weight
                </Text>
                <View style={styles.actionGrid}>
                  {[
                    "Inter_600SemiBold",
                    "Inter_700Bold",
                    "Inter_800ExtraBold",
                  ].map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => {
                        hapticLight();
                        setCustomFont(f);
                        captureHistoryState();
                      }}
                      style={[
                        styles.outlineBtn,
                        {
                          flex: 1,
                          backgroundColor: theme.card,
                          borderColor:
                            customFont === f ? theme.accent : theme.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.outlineBtnText,
                          {
                            color:
                              customFont === f
                                ? theme.accent
                                : theme.primaryText,
                            fontFamily: f,
                          },
                        ]}
                      >
                        {f === "Inter_600SemiBold"
                          ? "Medium"
                          : f === "Inter_700Bold"
                            ? "Bold"
                            : "Black"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Letter Spacing */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Letter Spacing
                </Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setLetterSpacing(Math.max(-2, letterSpacing - 0.5));
                      captureHistoryState();
                    }}
                    style={[
                      styles.stepperBtn,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepperBtnText,
                        { color: theme.primaryText },
                      ]}
                    >
                      -
                    </Text>
                  </Pressable>
                  <Text
                    style={[styles.stepperVal, { color: theme.primaryText }]}
                  >
                    {letterSpacing.toFixed(1)}
                  </Text>
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setLetterSpacing(Math.min(10, letterSpacing + 0.5));
                      captureHistoryState();
                    }}
                    style={[
                      styles.stepperBtn,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepperBtnText,
                        { color: theme.primaryText },
                      ]}
                    >
                      +
                    </Text>
                  </Pressable>
                </View>

                {/* Alignment */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Text Alignment
                </Text>
                <View style={styles.actionGrid}>
                  {(
                    [
                      { align: "left", icon: AlignLeft },
                      { align: "center", icon: AlignCenter },
                      { align: "right", icon: AlignRight },
                    ] as const
                  ).map((a) => (
                    <Pressable
                      key={a.align}
                      onPress={() => {
                        hapticLight();
                        setTextAlignment(a.align);
                        captureHistoryState();
                      }}
                      style={[
                        styles.outlineBtn,
                        {
                          flex: 1,
                          backgroundColor: theme.card,
                          borderColor:
                            textAlignment === a.align
                              ? theme.accent
                              : theme.cardBorder,
                        },
                      ]}
                    >
                      <a.icon
                        size={16}
                        color={
                          textAlignment === a.align
                            ? theme.accent
                            : theme.primaryText
                        }
                      />
                    </Pressable>
                  ))}
                </View>

                {/* Vertical Alignment */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Vertical Position
                </Text>
                <View style={styles.actionGrid}>
                  {(
                    [
                      { align: "flex-start", label: "Top" },
                      { align: "center", label: "Center" },
                      { align: "flex-end", label: "Bottom" },
                    ] as const
                  ).map((v) => (
                    <Pressable
                      key={v.align}
                      onPress={() => {
                        hapticLight();
                        setVerticalAlign(v.align);
                        captureHistoryState();
                      }}
                      style={[
                        styles.outlineBtn,
                        {
                          flex: 1,
                          backgroundColor: theme.card,
                          borderColor:
                            verticalAlign === v.align
                              ? theme.accent
                              : theme.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.outlineBtnText,
                          {
                            color:
                              verticalAlign === v.align
                                ? theme.accent
                                : theme.primaryText,
                          },
                        ]}
                      >
                        {v.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Ordering */}
                {contentType === "quote" && (
                  <>
                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Element Order
                    </Text>
                    <View style={styles.actionGrid}>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setAuthorAbove(false);
                          captureHistoryState();
                        }}
                        style={[
                          styles.outlineBtn,
                          {
                            flex: 1,
                            backgroundColor: theme.card,
                            borderColor: !authorAbove
                              ? theme.accent
                              : theme.cardBorder,
                          },
                        ]}
                      >
                        <ArrowDown
                          size={14}
                          color={
                            !authorAbove ? theme.accent : theme.primaryText
                          }
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.outlineBtnText,
                            {
                              color: !authorAbove
                                ? theme.accent
                                : theme.primaryText,
                            },
                          ]}
                        >
                          Author Below
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setAuthorAbove(true);
                          captureHistoryState();
                        }}
                        style={[
                          styles.outlineBtn,
                          {
                            flex: 1,
                            backgroundColor: theme.card,
                            borderColor: authorAbove
                              ? theme.accent
                              : theme.cardBorder,
                          },
                        ]}
                      >
                        <ArrowUp
                          size={14}
                          color={authorAbove ? theme.accent : theme.primaryText}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.outlineBtnText,
                            {
                              color: authorAbove
                                ? theme.accent
                                : theme.primaryText,
                            },
                          ]}
                        >
                          Author Above
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}

                {/* Corner radius customization */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Card Edges
                </Text>
                <View style={styles.actionGrid}>
                  {([0, 16, 28] as const).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => {
                        hapticLight();
                        setCustomRadius(r);
                        captureHistoryState();
                      }}
                      style={[
                        styles.outlineBtn,
                        {
                          flex: 1,
                          backgroundColor: theme.card,
                          borderColor:
                            customRadius === r
                              ? theme.accent
                              : theme.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.outlineBtnText,
                          {
                            color:
                              customRadius === r
                                ? theme.accent
                                : theme.primaryText,
                          },
                        ]}
                      >
                        {r === 0
                          ? "Square Corners"
                          : r === 16
                            ? "Soft Rounded"
                            : "Rounded Pill"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Spacing & Sizes parameters */}
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Font Size
                    </Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setFontSize(Math.max(12, fontSize - 1));
                          captureHistoryState();
                        }}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperBtnText,
                            { color: theme.primaryText },
                          ]}
                        >
                          -
                        </Text>
                      </Pressable>
                      <Text
                        style={[
                          styles.stepperVal,
                          { color: theme.primaryText },
                        ]}
                      >
                        {fontSize}
                      </Text>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setFontSize(Math.min(48, fontSize + 1));
                          captureHistoryState();
                        }}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperBtnText,
                            { color: theme.primaryText },
                          ]}
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Line Space
                    </Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setLineSpacing(Math.max(12, lineSpacing - 1));
                          captureHistoryState();
                        }}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperBtnText,
                            { color: theme.primaryText },
                          ]}
                        >
                          -
                        </Text>
                      </Pressable>
                      <Text
                        style={[
                          styles.stepperVal,
                          { color: theme.primaryText },
                        ]}
                      >
                        {lineSpacing}
                      </Text>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setLineSpacing(Math.min(64, lineSpacing + 1));
                          captureHistoryState();
                        }}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperBtnText,
                            { color: theme.primaryText },
                          ]}
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Card Settings
                </Text>
                <View
                  style={[
                    styles.configPanel,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Pressable
                    onPress={handleBrandingToggle}
                    style={styles.configRow}
                  >
                    <Text
                      style={[styles.configLabel, { color: theme.primaryText }]}
                    >
                      Branding: {brandingStyle.toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.switch,
                        brandingStyle !== "hidden"
                          ? { backgroundColor: theme.accent }
                          : styles.switchOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchHandle,
                          brandingStyle !== "hidden" && styles.switchHandleOn,
                        ]}
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setShowDate(!showDate);
                      captureHistoryState();
                    }}
                    style={styles.configRow}
                  >
                    <Text
                      style={[styles.configLabel, { color: theme.primaryText }]}
                    >
                      Show Date Header
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
                      captureHistoryState();
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
              </View>
            )}

            {/* ── Tab 3: Canvas Customization ── */}
            {activeTab === "canvas" && (
              <View style={styles.tabContentContainer}>
                {/* Default ground themes list */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Themes Preset
                </Text>
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
                        // Preserve current background state when switching themes
                        const currentBg = bgImageUri;
                        const currentBgBlur = bgBlur;
                        const currentBgZoom = bgZoom;
                        const currentBgBrightness = bgBrightness;
                        const currentBgOpacity = bgOpacity;
                        const currentShowOverlay = showOverlay;
                        setSelectedTheme(preset);
                        if (currentBg) setBgImageUri(currentBg);
                        setBgBlur(currentBgBlur);
                        setBgZoom(currentBgZoom);
                        setBgBrightness(currentBgBrightness);
                        setBgOpacity(currentBgOpacity);
                        setShowOverlay(currentShowOverlay);
                        captureHistoryState();
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

                {/* Customizable Color Pickers overrides */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Overlay Text Color
                </Text>
                <View style={styles.colorPaletteGrid}>
                  {[
                    "#FFFFFF",
                    "#000000",
                    "#F3E5AB",
                    "#39FF14",
                    "#00FFFF",
                    theme.accent,
                  ].map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => {
                        hapticLight();
                        setCustomTextColor(c);
                        captureHistoryState();
                      }}
                      style={[
                        styles.colorBubble,
                        {
                          backgroundColor: c,
                          borderColor:
                            customTextColor === c
                              ? theme.accent
                              : theme.cardBorder,
                          borderWidth: customTextColor === c ? 2 : 1,
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* Custom Gradient Background selection */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Gradient Colors
                </Text>
                <View style={styles.colorPaletteGrid}>
                  {(
                    [
                      ["#0F0C20", "#1F1A3A", "#0D0B18"],
                      ["#FF512F", "#DD2476"],
                      ["#141414", "#0A0A0A"],
                      ["#FAF9F6", "#FAF9F6"],
                      ["#0F2027", "#203A43", "#2C5364"],
                      ["#8E2DE2", "#4A00E0"],
                    ] as const
                  ).map((grad, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        hapticLight();
                        setCustomColors(grad as unknown as string[]);
                        captureHistoryState();
                      }}
                      style={[
                        styles.gradientBubble,
                        {
                          borderColor:
                            JSON.stringify(customColors) ===
                            JSON.stringify(grad)
                              ? theme.accent
                              : "transparent",
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={
                          grad as unknown as [string, string, ...string[]]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ flex: 1, borderRadius: 18 }}
                      />
                    </Pressable>
                  ))}
                </View>

                {/* Background image upload selector */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Image Background
                </Text>
                <View style={styles.actionGrid}>
                  <Pressable
                    onPress={handleUploadImage}
                    style={[
                      styles.outlineBtn,
                      {
                        flex: 1,
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <ImageIcon
                      size={16}
                      color={theme.accent}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.outlineBtnText,
                        { color: theme.primaryText },
                      ]}
                    >
                      Upload Custom Photo
                    </Text>
                  </Pressable>
                  {bgImageUri && (
                    <Pressable
                      onPress={() => {
                        hapticLight();
                        setBgImageUri(null);
                        captureHistoryState();
                      }}
                      style={[
                        styles.outlineBtn,
                        {
                          flex: 0.4,
                          borderColor: theme.danger,
                          backgroundColor: theme.card,
                        },
                      ]}
                    >
                      <Trash2 size={16} color={theme.danger} />
                    </Pressable>
                  )}
                </View>

                {bgImageUri && (
                  <>
                    <View style={{ flexDirection: "row", gap: 16 }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.inputHeading,
                            { color: theme.secondaryText },
                          ]}
                        >
                          Opacity
                        </Text>
                        <View style={styles.stepperRow}>
                          <Pressable
                            onPress={() => {
                              hapticLight();
                              setBgOpacity(Math.max(0, bgOpacity - 0.1));
                              captureHistoryState();
                            }}
                            style={[
                              styles.stepperBtn,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.cardBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepperBtnText,
                                { color: theme.primaryText },
                              ]}
                            >
                              -
                            </Text>
                          </Pressable>
                          <Text
                            style={[
                              styles.stepperVal,
                              { color: theme.primaryText },
                            ]}
                          >
                            {Math.round(bgOpacity * 10)}
                          </Text>
                          <Pressable
                            onPress={() => {
                              hapticLight();
                              setBgOpacity(Math.min(1.0, bgOpacity + 0.1));
                              captureHistoryState();
                            }}
                            style={[
                              styles.stepperBtn,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.cardBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepperBtnText,
                                { color: theme.primaryText },
                              ]}
                            >
                              +
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.inputHeading,
                            { color: theme.secondaryText },
                          ]}
                        >
                          Zoom
                        </Text>
                        <View style={styles.stepperRow}>
                          <Pressable
                            onPress={() => {
                              hapticLight();
                              setBgZoom(Math.max(1, bgZoom - 0.1));
                              captureHistoryState();
                            }}
                            style={[
                              styles.stepperBtn,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.cardBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepperBtnText,
                                { color: theme.primaryText },
                              ]}
                            >
                              -
                            </Text>
                          </Pressable>
                          <Text
                            style={[
                              styles.stepperVal,
                              { color: theme.primaryText },
                            ]}
                          >
                            {bgZoom.toFixed(1)}x
                          </Text>
                          <Pressable
                            onPress={() => {
                              hapticLight();
                              setBgZoom(Math.min(3, bgZoom + 0.1));
                              captureHistoryState();
                            }}
                            style={[
                              styles.stepperBtn,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.cardBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepperBtnText,
                                { color: theme.primaryText },
                              ]}
                            >
                              +
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.inputHeading,
                        { color: theme.secondaryText },
                      ]}
                    >
                      Background Blur
                    </Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setBgBlur(Math.max(0, bgBlur - 2));
                          captureHistoryState();
                        }}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperBtnText,
                            { color: theme.primaryText },
                          ]}
                        >
                          -
                        </Text>
                      </Pressable>
                      <Text
                        style={[
                          styles.stepperVal,
                          { color: theme.primaryText },
                        ]}
                      >
                        {bgBlur}px
                      </Text>
                      <Pressable
                        onPress={() => {
                          hapticLight();
                          setBgBlur(Math.min(20, bgBlur + 2));
                          captureHistoryState();
                        }}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepperBtnText,
                            { color: theme.primaryText },
                          ]}
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>

                    {/* Show overlay over the background image for readability */}
                    <Pressable
                      onPress={() => {
                        hapticLight();
                        setShowOverlay(!showOverlay);
                        captureHistoryState();
                      }}
                      style={styles.configRow}
                    >
                      <Text
                        style={[
                          styles.configLabel,
                          { color: theme.primaryText },
                        ]}
                      >
                        Add Tint Overlay (Better Text Readability)
                      </Text>
                      <View
                        style={[
                          styles.switch,
                          showOverlay
                            ? { backgroundColor: theme.accent }
                            : styles.switchOff,
                        ]}
                      >
                        <View
                          style={[
                            styles.switchHandle,
                            showOverlay && styles.switchHandleOn,
                          ]}
                        />
                      </View>
                    </Pressable>
                  </>
                )}

                {/* Decorative Visual FX */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Visual FX Overlays
                </Text>
                <View
                  style={[
                    styles.configPanel,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setIsGlass(!isGlass);
                      captureHistoryState();
                    }}
                    style={styles.configRow}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Sparkles size={16} color={theme.secondaryText} />
                      <Text
                        style={[
                          styles.configLabel,
                          { color: theme.primaryText },
                        ]}
                      >
                        Glassmorphism Backdrop
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.switch,
                        isGlass
                          ? { backgroundColor: theme.accent }
                          : styles.switchOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchHandle,
                          isGlass && styles.switchHandleOn,
                        ]}
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setIsNeon(!isNeon);
                      captureHistoryState();
                    }}
                    style={styles.configRow}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: theme.accent,
                        }}
                      />
                      <Text
                        style={[
                          styles.configLabel,
                          { color: theme.primaryText },
                        ]}
                      >
                        Neon Glowing Border
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.switch,
                        isNeon
                          ? { backgroundColor: theme.accent }
                          : styles.switchOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchHandle,
                          isNeon && styles.switchHandleOn,
                        ]}
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      hapticLight();
                      setIsDecorated(!isDecorated);
                      captureHistoryState();
                    }}
                    style={[styles.configRow, { borderBottomWidth: 0 }]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <BookOpen size={16} color={theme.secondaryText} />
                      <Text
                        style={[
                          styles.configLabel,
                          { color: theme.primaryText },
                        ]}
                      >
                        BG Word Overlays
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.switch,
                        isDecorated
                          ? { backgroundColor: theme.accent }
                          : styles.switchOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.switchHandle,
                          isDecorated && styles.switchHandleOn,
                        ]}
                      />
                    </View>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── Tab 4: Templates Library ── */}
            {activeTab === "templates" && (
              <View style={styles.tabContentContainer}>
                {/* Save Current Design Panel */}
                <Text
                  style={[styles.inputHeading, { color: theme.secondaryText }]}
                >
                  Save Current Layout Design
                </Text>
                <View style={styles.saveTemplateRow}>
                  <TextInput
                    style={[
                      styles.templateInput,
                      {
                        color: theme.primaryText,
                        borderColor: theme.cardBorder,
                        backgroundColor: theme.card,
                      },
                    ]}
                    value={newTemplateName}
                    onChangeText={setNewTemplateName}
                    placeholder="Enter template name..."
                    placeholderTextColor={theme.tertiaryText}
                  />
                  <Pressable
                    onPress={handleSaveTemplate}
                    style={[
                      styles.saveTemplateBtn,
                      { backgroundColor: theme.accent },
                    ]}
                  >
                    <Plus size={18} color="#FFF" />
                  </Pressable>
                </View>

                {/* Templates List */}
                <Text
                  style={[
                    styles.inputHeading,
                    { color: theme.secondaryText, marginTop: 16 },
                  ]}
                >
                  My Saved Designs
                </Text>
                {templates.length === 0 ? (
                  <Text
                    style={[
                      styles.emptyNoticeText,
                      { color: theme.tertiaryText },
                    ]}
                  >
                    No templates saved yet. Create a layout and save it above
                    for instant access anytime.
                  </Text>
                ) : (
                  templates.map((tpl) => (
                    <View
                      key={tpl.id}
                      style={[
                        styles.templateItem,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.cardBorder,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => handleLoadTemplate(tpl)}
                        style={{ flex: 1 }}
                      >
                        <Text
                          style={[
                            styles.templateNameText,
                            { color: theme.primaryText },
                          ]}
                        >
                          {tpl.name}
                        </Text>
                        <Text
                          style={[
                            styles.templateDetailsText,
                            { color: theme.secondaryText },
                          ]}
                        >
                          {tpl.themeId.replace("_", " ")} · {tpl.textAlignment}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteTemplate(tpl.id)}
                        style={styles.templateDeleteBtn}
                      >
                        <Trash2 size={16} color={theme.danger} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Space at the bottom */}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Sticky Bottom Bar always visible */}
          <View
            style={[
              styles.stickyBar,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.cardBorder,
              },
            ]}
          >
            <Pressable
              style={[
                styles.primaryShareBtn,
                { backgroundColor: theme.accent, flex: 1 },
                isSharing && { opacity: 0.7 },
              ]}
              onPress={handleShareImage}
              disabled={isSharing}
            >
              {isSharing ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#FFF"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.primaryShareBtnText}>
                    Preparing Studio Image…
                  </Text>
                </>
              ) : (
                <>
                  <Share2 size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryShareBtnText}>
                    Share Studio Card
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Milestone Rewards alert */}
      <CustomAlert
        visible={showProAlert}
        type="info"
        title="Milestone Reward"
        message="Watermark-free exports unlock through Groundwork Milestone Rewards. Complete your focus and habit goals to unlock custom studio cards!"
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
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
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
    paddingBottom: 120,
    paddingHorizontal: 16,
  },

  // History and Reset buttons
  historyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  historyBtn: {
    padding: 6,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },

  // Sticky bottom bar
  stickyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },

  // Sizing Picker
  ratioRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 12,
  },
  ratioBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  ratioText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  // Live Card Preview
  previewContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Card body & gradient shapes
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
    borderRadius: 0,
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

  // Card items: Quote & Author content
  quoteWrapper: { flex: 1, justifyContent: "center", marginVertical: 20 },
  quoteText: {
    fontSize: 20,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  authorText: { fontSize: 13, textAlign: "center", opacity: 0.85 },

  // Custom reflections card
  reflectionCard: {
    marginTop: 16,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  reflectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  reflectionContent: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // Achievement, Streaks, snapshots
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  glowingRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cardHeadline: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: "center",
  },
  cardValName: {
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
    textAlign: "center",
    marginBottom: 10,
  },
  cardValNumber: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    textAlign: "center",
    marginBottom: 10,
  },
  cardValDesc: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    opacity: 0.85,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  xpBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 16,
  },
  xpBadgeText: { fontSize: 12, fontFamily: "Inter_800ExtraBold" },

  // Snapshot details
  profileWrapper: { flex: 1, justifyContent: "center", paddingHorizontal: 10 },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 18, fontFamily: "Inter_800ExtraBold" },
  profileSub: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  profileStatsRow: { flexDirection: "row", gap: 12 },
  profileStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  profileStatVal: { fontSize: 24, fontFamily: "Inter_800ExtraBold" },
  profileStatLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },

  // Branding footer branding
  brandingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: 0.5,
  },
  brandDot: { width: 4, height: 4, borderRadius: 2 },
  brandText: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.5,
  },

  // Studio share triggers
  primaryShareWrapper: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryShareBtn: {
    width: "100%",
    height: 58,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryShareBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF",
  },

  // Sections
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Theme pills
  themeList: { gap: 12, paddingRight: 16 },
  themePill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 8,
  },
  themePillColor: { width: 24, height: 24, borderRadius: 12 },
  themePillLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Controls Navigation bar
  tabNavigationRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginVertical: 16,
    justifyContent: "space-between",
  },
  tabNavBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabNavBtnActive: {
    borderBottomWidth: 2,
  },
  tabNavLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  // Tab panels
  tabContentContainer: {
    paddingHorizontal: 4,
  },
  inputHeading: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  editorInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 12,
  },
  tabNoticeText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    marginVertical: 12,
  },

  // Alignment configuration controls
  actionGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  outlineBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  outlineBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  // Stepper controls
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  stepperVal: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    minWidth: 60,
    textAlign: "center",
  },

  // Color selection bubbles
  colorPaletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  colorBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  gradientBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
  },

  // Templates saving list
  saveTemplateRow: {
    flexDirection: "row",
    gap: 8,
  },
  templateInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  saveTemplateBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNoticeText: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
    marginVertical: 12,
  },
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  templateNameText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  templateDetailsText: {
    fontSize: 11,
    marginTop: 2,
  },
  templateDeleteBtn: {
    padding: 8,
  },

  // Custom configurations panels
  configPanel: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  configLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  switchOff: { backgroundColor: "rgba(120,120,120,0.3)" },
  switchHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  switchHandleOn: { alignSelf: "flex-end" },

  // Paywalls dialogs
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
  paywallBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
