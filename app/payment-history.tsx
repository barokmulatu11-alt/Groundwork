/**
 * payment-history.tsx — User payment history (read-only)
 */
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { AppText as Text } from "@/components/ui/AppText";
import { PAYMENT_METHODS, PLANS, STATUS_CONFIG, getPaymentHistory, type PaymentRequest } from "@/lib/paymentService";
import { useTheme } from "@/lib/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { ChevronLeft, Receipt } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentHistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [history, setHistory] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const data = await getPaymentHistory();
        setHistory(data);
        setLoading(false);
      })();
    }, [])
  );

  return (
    <BackgroundGradient>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={theme.accent} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.primaryText }]}>Payment History</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Receipt size={48} color={theme.tertiaryText} />
          <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No payment history</Text>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            Your payment requests will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const cfg = STATUS_CONFIG[item.status];
            return (
              <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.refCode, { color: theme.primaryText }]}>{item.referenceCode}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + "18" }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <View style={styles.cardDetails}>
                    <Text style={[styles.detail, { color: theme.secondaryText }]}>
                      {PAYMENT_METHODS[item.paymentMethod]?.label ?? item.paymentMethod} · {PLANS[item.plan]?.label ?? item.plan}
                    </Text>
                    <Text style={[styles.amount, { color: theme.accent }]}>
                      ETB {item.amount.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={[styles.date, { color: theme.tertiaryText }]}>
                    {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </Text>
                  {item.transactionId && (
                    <Text style={[styles.txId, { color: theme.tertiaryText }]}>
                      TX: {item.transactionId}
                    </Text>
                  )}
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, justifyContent: "space-between" },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 22 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  refCode: { fontSize: 15, fontFamily: "Inter_800ExtraBold" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  cardDetails: { flexDirection: "row", justifyContent: "space-between" },
  detail: { fontSize: 13, fontFamily: "Inter_500Medium" },
  amount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  date: { fontSize: 12, fontFamily: "Inter_500Medium" },
  txId: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
