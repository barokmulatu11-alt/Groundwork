/**
 * upgrade.tsx — GroundWork Pro Upgrade Flow
 * Linear 5-step flow: Overview → Method → Instructions → Submit Proof → Status
 */
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { AppText as Text } from "@/components/ui/AppText";
import {
    PAYMENT_METHODS,
    PLANS,
    PaymentMethod,
    PlanId,
    STATUS_CONFIG,
    createPaymentRequest,
    getLatestPaymentRequest,
    submitPaymentProof,
    type PaymentRequest,
} from "@/lib/paymentService";
import { useTheme } from "@/lib/ThemeContext";
import { useAuthStore } from "@/store/useAuthStore";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    AlertCircle,
    ArrowRight,
    Building2,
    Check,
    CheckCircle2,
    ChevronLeft,
    Clock,
    Copy,
    Crown,
    Image as ImageIcon,
    Smartphone,
    XCircle,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = "overview" | "method" | "instructions" | "proof" | "status";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UpgradeScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();

  const [step, setStep] = useState<Step>("overview");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro_1year");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [currentRequest, setCurrentRequest] = useState<PaymentRequest | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // On mount, check if there's already an active/recent request
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data } = await getLatestPaymentRequest();
        if (data) {
          setCurrentRequest(data);
          if (data.status === "pending" || data.status === "under_review" || data.status === "approved") {
            setStep("status");
          }
        }
      })();
    }, [])
  );

  const handleBack = () => {
    if (step === "overview") { router.back(); return; }
    if (step === "method") setStep("overview");
    else if (step === "instructions") setStep("method");
    else if (step === "proof") setStep("instructions");
    else if (step === "status") router.back();
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep("instructions");
  };

  const handleCreateRequest = async () => {
    if (!selectedMethod) return;
    setLoading(true);
    const { data, error } = await createPaymentRequest(selectedMethod, selectedPlan);
    setLoading(false);
    if (error) { Alert.alert("Error", error); return; }
    setCurrentRequest(data);
    setStep("proof");
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleSubmitProof = async () => {
    if (!currentRequest) return;
    if (!transactionId.trim() || transactionId.trim().length < 4) {
      Alert.alert("Required", "Please enter your transaction ID (minimum 4 characters).");
      return;
    }
    setLoading(true);
    const { error } = await submitPaymentProof(
      currentRequest.id,
      transactionId,
      paymentNote,
      screenshotUri,
    );
    setLoading(false);
    if (error) { Alert.alert("Submission failed", error); return; }
    // Refresh request
    const { data } = await getLatestPaymentRequest();
    if (data) setCurrentRequest(data);
    setStep("status");
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    const { data } = await getLatestPaymentRequest();
    setLoading(false);
    if (data) setCurrentRequest(data);
  };

  // ── Render steps ─────────────────────────────────────────────────────────

  const renderHeader = (title: string) => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
        <ChevronLeft size={22} color={theme.accent} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{title}</Text>
      <View style={{ width: 38 }} />
    </View>
  );

  // Step 1: Overview
  if (step === "overview") {
    return (
      <BackgroundGradient>        {renderHeader("Upgrade to Pro")}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={[theme.accent + "22", theme.accent + "08"]}
              style={[styles.heroCard, { borderColor: theme.accent + "33" }]}
            >
              <View style={[styles.heroIcon, { backgroundColor: theme.accent }]}>
                <Crown size={28} color="#fff" />
              </View>
              <Text style={[styles.heroTitle, { color: theme.primaryText }]}>
                GroundWork Pro
              </Text>
              <Text style={[styles.heroSub, { color: theme.secondaryText }]}>
                Unlock the full productivity system — analytics, unlimited habits, premium themes, and more.
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Plan selection */}
          <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>SELECT PLAN</Text>
          {(Object.values(PLANS) as typeof PLANS[PlanId][]).map((plan, i) => (
            <Animated.View key={plan.id} entering={FadeInDown.delay(i * 60).duration(350)}>
              <Pressable
                onPress={() => setSelectedPlan(plan.id as PlanId)}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: selectedPlan === plan.id ? theme.accent : theme.cardBorder,
                    borderWidth: selectedPlan === plan.id ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: selectedPlan === plan.id ? theme.accent : theme.secondaryText }]}>
                  {selectedPlan === plan.id && <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.planLabel, { color: theme.primaryText }]}>{plan.label}</Text>
                    {plan.id === "pro_1year" && (
                      <View style={[styles.badge, { backgroundColor: theme.accent + "22" }]}>
                        <Text style={[styles.badgeText, { color: theme.accent }]}>BEST VALUE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.planPrice, { color: theme.accent }]}>
                    {plan.currency} {plan.price.toFixed(2)}
                  </Text>
                  <Text style={[styles.planDuration, { color: theme.tertiaryText }]}>
                    {plan.id === "pro_1month" ? "Billed monthly" : "Billed annually — save 17%"}
                  </Text>
                </View>
                {selectedPlan === plan.id && <Check size={16} color={theme.accent} />}
              </Pressable>
            </Animated.View>
          ))}

          {/* Key features */}
          <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>WHAT YOU GET</Text>
          {[
            "Unlimited tasks and habits",
            "Deep analytics and weekly reports",
            "7 premium themes and accent colors",
            "Note export (PDF & Markdown)",
            "Revision analytics with spaced repetition",
            "Pro XP boost and exclusive badges",
          ].map((f, i) => (
            <Animated.View key={f} entering={FadeInRight.delay(i * 40).duration(300)}>
              <View style={styles.featureRow}>
                <View style={[styles.featureCheck, { backgroundColor: theme.accent + "18" }]}>
                  <Check size={14} color={theme.accent} />
                </View>
                <Text style={[styles.featureText, { color: theme.primaryText }]}>{f}</Text>
              </View>
            </Animated.View>
          ))}

          <TouchableOpacity
            onPress={() => setStep("method")}
            style={[styles.ctaBtn, { backgroundColor: theme.accent }]}
            activeOpacity={0.85}
          >
            <Crown size={18} color="#fff" />
            <Text style={styles.ctaText}>Choose Payment Method</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </BackgroundGradient>
    );
  }

  // Step 2: Select payment method
  if (step === "method") {
    return (
      <BackgroundGradient>        {renderHeader("Select Payment Method")}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={[styles.methodIntro, { color: theme.secondaryText }]}>
              Choose how you would like to pay for GroundWork Pro.
            </Text>
          </Animated.View>

          {(Object.values(PAYMENT_METHODS) as typeof PAYMENT_METHODS[PaymentMethod][]).map((m, i) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(i * 80).duration(350)}>
              <Pressable
                onPress={() => handleSelectMethod(m.id as PaymentMethod)}
                style={[styles.methodCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              >
                <View style={[styles.methodIcon, { backgroundColor: theme.accent + "18" }]}>
                  {m.id === "telebirr" ? (
                    <Smartphone size={24} color={theme.accent} />
                  ) : (
                    <Building2 size={24} color={theme.accent} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, { color: theme.primaryText }]}>{m.label}</Text>
                  <Text style={[styles.methodSub, { color: theme.tertiaryText }]}>
                    {m.id === "telebirr" ? "Transfer via Telebirr mobile wallet" : "Transfer via CBE bank account"}
                  </Text>
                </View>
                <ArrowRight size={18} color={theme.accent} />
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      </BackgroundGradient>
    );
  }

  // Step 3: Payment instructions
  if (step === "instructions" && selectedMethod) {
    const method = PAYMENT_METHODS[selectedMethod];
    const plan = PLANS[selectedPlan];
    return (
      <BackgroundGradient>        {renderHeader("Payment Instructions")}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(350)}>
            {/* Amount */}
            <View style={[styles.amountCard, { backgroundColor: theme.accent + "12", borderColor: theme.accent + "33" }]}>
              <Text style={[styles.amountLabel, { color: theme.accent }]}>Amount to Transfer</Text>
              <Text style={[styles.amountValue, { color: theme.primaryText }]}>
                ETB {plan.price.toFixed(2)}
              </Text>
              <Text style={[styles.amountPlan, { color: theme.tertiaryText }]}>
                {plan.label} — {plan.durationDays} days
              </Text>
            </View>

            {/* Account details */}
            <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.detailsTitle, { color: theme.secondaryText }]}>
                {method.id === "telebirr" ? "TELEBIRR DETAILS" : "CBE BANK DETAILS"}
              </Text>
              <DetailRow label="Account Holder" value={method.accountHolder} theme={theme} />
              {method.id === "telebirr" ? (
                <DetailRow label="Phone Number" value={(method as any).phoneNumber} theme={theme} />
              ) : (
                <DetailRow label="Account Number" value={(method as any).accountNumber} theme={theme} />
              )}
              <DetailRow label="Amount" value={`ETB ${plan.price.toFixed(2)}`} theme={theme} accent />
            </View>

            {/* Instructions */}
            <View style={[styles.instructionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.detailsTitle, { color: theme.secondaryText }]}>HOW TO TRANSFER</Text>
              {method.instructions.map((step, i) => (
                <View key={i} style={styles.instructionRow}>
                  <View style={[styles.stepNum, { backgroundColor: theme.accent }]}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: theme.primaryText }]}>{step}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreateRequest}
              style={[styles.ctaBtn, { backgroundColor: theme.accent }]}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>I am ready to transfer</Text>
                  <ArrowRight size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </BackgroundGradient>
    );
  }

  // Step 4: Submit proof
  if (step === "proof" && currentRequest) {
    return (
      <BackgroundGradient>        {renderHeader("Confirm Payment")}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeIn.duration(350)}>
              {/* Reference code — prominent */}
              <View style={[styles.refCard, { backgroundColor: theme.accent + "12", borderColor: theme.accent + "44" }]}>
                <Text style={[styles.refLabel, { color: theme.accent }]}>Your Payment Reference</Text>
                <View style={styles.refRow}>
                  <Text style={[styles.refCode, { color: theme.primaryText }]}>
                    {currentRequest.referenceCode}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleCopyCode(currentRequest.referenceCode)}
                    style={[styles.copyBtn, { backgroundColor: theme.accent + "22" }]}
                    activeOpacity={0.7}
                  >
                    {copied ? <Check size={16} color={theme.accent} /> : <Copy size={16} color={theme.accent} />}
                  </TouchableOpacity>
                </View>
                <Text style={[styles.refHint, { color: theme.tertiaryText }]}>
                  Include this code in your transfer note or reference field
                </Text>
              </View>

              {/* Transaction ID */}
              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>
                TRANSACTION ID <Text style={{ color: "#FF3B30" }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.primaryText }]}
                placeholder="Enter the transaction/reference ID from your receipt"
                placeholderTextColor={theme.tertiaryText}
                value={transactionId}
                onChangeText={setTransactionId}
                returnKeyType="done"
              />

              {/* Screenshot */}
              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>
                PAYMENT SCREENSHOT <Text style={[{ color: theme.tertiaryText }]}>(Recommended)</Text>
              </Text>
              <TouchableOpacity
                onPress={handlePickScreenshot}
                style={[
                  styles.uploadBtn,
                  {
                    backgroundColor: screenshotUri ? theme.accent + "12" : theme.card,
                    borderColor: screenshotUri ? theme.accent : theme.cardBorder,
                  },
                ]}
                activeOpacity={0.8}
              >
                {screenshotUri ? (
                  <>
                    <Check size={20} color={theme.accent} />
                    <Text style={[styles.uploadText, { color: theme.accent }]}>Screenshot selected</Text>
                    <TouchableOpacity onPress={() => setScreenshotUri(null)} hitSlop={8}>
                      <XCircle size={18} color={theme.tertiaryText} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <ImageIcon size={20} color={theme.tertiaryText} />
                    <Text style={[styles.uploadText, { color: theme.tertiaryText }]}>Upload screenshot (max 5MB)</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Note */}
              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>NOTE (Optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti, { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.primaryText }]}
                placeholder="Any additional information"
                placeholderTextColor={theme.tertiaryText}
                value={paymentNote}
                onChangeText={setPaymentNote}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                onPress={handleSubmitProof}
                style={[styles.ctaBtn, { backgroundColor: loading ? theme.accent + "88" : theme.accent }]}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Submit Payment Request</Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.disclaimer, { color: theme.tertiaryText }]}>
                Your request will be reviewed within 24 hours. You will be notified once your payment is verified.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </BackgroundGradient>
    );
  }

  // Step 5: Status
  if (step === "status" && currentRequest) {
    const cfg = STATUS_CONFIG[currentRequest.status];
    const StatusIcon = currentRequest.status === "approved"
      ? CheckCircle2
      : currentRequest.status === "rejected"
      ? XCircle
      : currentRequest.status === "under_review"
      ? AlertCircle
      : Clock;

    return (
      <BackgroundGradient>        {renderHeader("Request Status")}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.statusContainer}>
            <View style={[styles.statusIcon, { backgroundColor: cfg.color + "18" }]}>
              <StatusIcon size={40} color={cfg.color} />
            </View>
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={[styles.statusMessage, { color: theme.secondaryText }]}>{cfg.message}</Text>

            {currentRequest.rejectionReason && (
              <View style={[styles.rejectionBox, { backgroundColor: "#FF3B3012", borderColor: "#FF3B3033" }]}>
                <Text style={[styles.rejectionLabel, { color: "#FF3B30" }]}>Reason</Text>
                <Text style={[styles.rejectionText, { color: theme.primaryText }]}>
                  {currentRequest.rejectionReason}
                </Text>
              </View>
            )}

            {/* Request details */}
            <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, width: "100%" }]}>
              <Text style={[styles.detailsTitle, { color: theme.secondaryText }]}>REQUEST DETAILS</Text>
              <DetailRow label="Reference" value={currentRequest.referenceCode} theme={theme} copyable onCopy={() => handleCopyCode(currentRequest.referenceCode)} />
              <DetailRow label="Method" value={PAYMENT_METHODS[currentRequest.paymentMethod]?.label ?? currentRequest.paymentMethod} theme={theme} />
              <DetailRow label="Plan" value={PLANS[currentRequest.plan]?.label ?? currentRequest.plan} theme={theme} />
              <DetailRow label="Amount" value={`ETB ${currentRequest.amount.toFixed(2)}`} theme={theme} accent />
              {currentRequest.transactionId && (
                <DetailRow label="Transaction ID" value={currentRequest.transactionId} theme={theme} />
              )}
              <DetailRow
                label="Submitted"
                value={new Date(currentRequest.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                theme={theme}
              />
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={handleRefreshStatus}
              style={[styles.refreshBtn, { borderColor: theme.accent }]}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Text style={[styles.refreshText, { color: theme.accent }]}>Refresh Status</Text>
              )}
            </TouchableOpacity>

            {currentRequest.status === "rejected" && (
              <TouchableOpacity
                onPress={() => { setCurrentRequest(null); setStep("overview"); setTransactionId(""); setScreenshotUri(null); }}
                style={[styles.ctaBtn, { backgroundColor: theme.accent }]}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>Submit New Request</Text>
              </TouchableOpacity>
            )}

            {currentRequest.status === "approved" && (
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.ctaBtn, { backgroundColor: "#34C759" }]}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.ctaText}>Start Using Pro</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => router.back()} style={styles.backTextBtn} activeOpacity={0.7}>
              <Text style={[styles.backTextBtnText, { color: theme.tertiaryText }]}>Back to app</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </BackgroundGradient>
    );
  }

  return null;
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value, theme, accent, copyable, onCopy }: any) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.tertiaryText }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[styles.detailValue, { color: accent ? theme.accent : theme.primaryText }]} numberOfLines={1}>
          {value}
        </Text>
        {copyable && onCopy && (
          <TouchableOpacity onPress={onCopy} hitSlop={8}>
            <Copy size={13} color={theme.tertiaryText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, justifyContent: "space-between" },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  heroCard: { borderRadius: 24, borderWidth: 1, padding: 24, alignItems: "center", gap: 12, marginBottom: 24 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, fontFamily: "Inter_800ExtraBold" },
  heroSub: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 22 },

  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  planCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 10, gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  planLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 16, fontFamily: "Inter_800ExtraBold", marginTop: 2 },
  planDuration: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.5 },

  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  featureCheck: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },

  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 20 },
  ctaText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  methodIntro: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 22, marginBottom: 16 },
  methodCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12, gap: 14 },
  methodIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  methodSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 3 },

  amountCard: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: "center", marginBottom: 16, gap: 4 },
  amountLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  amountValue: { fontSize: 32, fontFamily: "Inter_800ExtraBold" },
  amountPlan: { fontSize: 13, fontFamily: "Inter_500Medium" },

  detailsCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  detailsTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(128,128,128,0.15)" },
  detailLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detailValue: { fontSize: 13, fontFamily: "Inter_700Bold", maxWidth: "60%", textAlign: "right" },

  instructionCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNumText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
  instructionText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 20 },

  refCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, alignItems: "center", marginBottom: 20, gap: 8 },
  refLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  refRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  refCode: { fontSize: 24, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },
  copyBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  refHint: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 18 },

  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_500Medium" },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 16, marginBottom: 4 },
  uploadText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  disclaimer: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 18, marginTop: 14 },

  statusContainer: { alignItems: "center", gap: 16, paddingTop: 8 },
  statusIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  statusLabel: { fontSize: 20, fontFamily: "Inter_800ExtraBold" },
  statusMessage: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 22, paddingHorizontal: 20 },
  rejectionBox: { borderRadius: 14, borderWidth: 1, padding: 14, width: "100%", gap: 4 },
  rejectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  rejectionText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, width: "100%" },
  refreshText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  backTextBtn: { paddingVertical: 12 },
  backTextBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});


