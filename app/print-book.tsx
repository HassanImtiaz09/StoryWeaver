import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { PRINT_FORMATS } from "@/constants/assets";
import { trpc } from "@/lib/trpc";

type PrintStep = "format" | "preview" | "shipping" | "payment" | "confirmation";

export default function PrintBookScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ arcId: string; episodeId?: string }>();

  const [step, setStep] = useState<PrintStep>("format");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [dedication, setDedication] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pricing, setPricing] = useState<{ subtotal: number; discount: number; total: number } | null>(null);

  // Shipping
  const [shippingName, setShippingName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [email, setEmail] = useState("");

  // Order result
  const [orderId, setOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  // tRPC mutations
  const createOrderMutation = trpc.printOrders.create.useMutation();
  const getShippingMutation = trpc.printOrders.shippingRates.useMutation();
  const confirmOrderMutation = trpc.printOrders.confirm.useMutation();

  const handleSelectFormat = useCallback((formatId: string) => {
    setSelectedFormat(formatId);
  }, []);

  const handleProceedToPreview = useCallback(async () => {
    if (!selectedFormat) {
      Alert.alert("Select a format", "Please choose a book format to continue.");
      return;
    }
    setStep("preview");
  }, [selectedFormat]);

  const handleProceedToShipping = useCallback(() => {
    setStep("shipping");
  }, []);

  const handleProceedToPayment = useCallback(async () => {
    if (!shippingName || !address1 || !city || !stateCode || !zip) {
      Alert.alert("Missing info", "Please fill in all required shipping fields.");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const result = await createOrderMutation.mutateAsync({
        storyArcId: parseInt(params.arcId ?? "0", 10),
        episodeId: params.episodeId ? parseInt(params.episodeId, 10) : undefined,
        bookFormat: selectedFormat,
        dedication,
        shipping: {
          name: shippingName,
          address1,
          address2: address2 || undefined,
          city,
          stateCode,
          zip,
          countryCode: country,
          email: email || undefined,
        },
      });

      setOrderId(result.orderId);
      setPricing(result.pricing);
      setStep("payment");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to prepare your order. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    params.arcId, params.episodeId, selectedFormat, dedication,
    shippingName, address1, address2, city, stateCode, zip, country, email,
    createOrderMutation,
  ]);

  const handleConfirmOrder = useCallback(async () => {
    try {
      const result = await confirmOrderMutation.mutateAsync({ orderId });
      setOrderStatus("submitted");
      setStep("confirmation");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to confirm order.");
    }
  }, [orderId, confirmOrderMutation]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>{"\u{2190}"} Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {step === "format" && "\u{1F4D6} Print Your Book"}
          {step === "preview" && "\u{1F440} Preview"}
          {step === "shipping" && "\u{1F4E6} Shipping"}
          {step === "payment" && "\u{1F4B3} Review Order"}
          {step === "confirmation" && "\u{2705} Order Placed!"}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── Step: Format ────────────────── */}
        {step === "format" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Choose your book format
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Every story page includes its AI-generated illustration
            </Text>

            {PRINT_FORMATS.map((fmt) => (
              <Pressable
                key={fmt.id}
                onPress={() => handleSelectFormat(fmt.id)}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: selectedFormat === fmt.id ? colors.primary + "15" : colors.card,
                    borderColor: selectedFormat === fmt.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.formatIcon}>
                  <Text style={styles.formatEmoji}>
                    {fmt.id.includes("hard") ? "\u{1F4D5}" : "\u{1F4D4}"}
                  </Text>
                </View>
                <View style={styles.formatInfo}>
                  <Text style={[styles.formatLabel, { color: colors.text }]}>{fmt.label}</Text>
                  <Text style={[styles.formatDesc, { color: colors.textSecondary }]}>
                    {fmt.description}
                  </Text>
                  <Text style={[styles.formatPrice, { color: colors.primary }]}>
                    {fmt.priceRange}
                  </Text>
                </View>
                {selectedFormat === fmt.id && (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>{"\u{2713}"}</Text>
                )}
              </Pressable>
            ))}

            <Text style={[styles.label, { color: colors.text }]}>Dedication (optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="For my little explorer, may your dreams always be this magical..."
              placeholderTextColor={colors.textSecondary}
              value={dedication}
              onChangeText={setDedication}
              multiline
              numberOfLines={3}
            />

            <Pressable
              onPress={handleProceedToPreview}
              style={[styles.ctaButton, { backgroundColor: selectedFormat ? colors.primary : colors.muted }]}
            >
              <Text style={styles.ctaText}>Preview Book {"\u{2192}"}</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ─── Step: Preview ───────────────── */}
        {step === "preview" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your storybook preview
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Each page will include the full-color AI illustration and story text
            </Text>

            <View style={[styles.previewBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.previewTitle, { color: colors.text }]}>
                {"\u{1F4D6}"} Book Details
              </Text>
              <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                Format: {PRINT_FORMATS.find((f) => f.id === selectedFormat)?.label}
              </Text>
              <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                Pages: Full-color illustrations + text on every page
              </Text>
              <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                Cover: AI-generated custom artwork
              </Text>
              {dedication ? (
                <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                  Dedication: "{dedication}"
                </Text>
              ) : null}
            </View>

            <View style={styles.buttonRow}>
              <Pressable onPress={() => setStep("format")} style={[styles.secondaryBtn, { borderColor: colors.border }]}>
                <Text style={[styles.secondaryText, { color: colors.text }]}>{"\u{2190}"} Back</Text>
              </Pressable>
              <Pressable onPress={handleProceedToShipping} style={[styles.ctaButton, { backgroundColor: colors.primary, flex: 1 }]}>
                <Text style={styles.ctaText}>Add Shipping {"\u{2192}"}</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* ─── Step: Shipping ──────────────── */}
        {step === "shipping" && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping Address</Text>

            <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={shippingName}
              onChangeText={setShippingName}
              placeholder="John Smith"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Address Line 1 *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={address1}
              onChangeText={setAddress1}
              placeholder="123 Story Lane"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Address Line 2</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={address2}
              onChangeText={setAddress2}
              placeholder="Apt 4B"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: colors.text }]}>City *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="New York"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.label, { color: colors.text }]}>State *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={stateCode}
                  onChangeText={setStateCode}
                  placeholder="NY"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.text }]}>ZIP Code *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={zip}
                  onChangeText={setZip}
                  placeholder="10001"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.label, { color: colors.text }]}>Country</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="US"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={2}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Email (for tracking)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="parent@email.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
            />

            <Pressable
              onPress={handleProceedToPayment}
              disabled={isGeneratingPdf}
              style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            >
              {isGeneratingPdf ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.ctaText, { marginLeft: 8 }]}>Preparing book...</Text>
                </View>
              ) : (
                <Text style={styles.ctaText}>Review Order {"\u{2192}"}</Text>
              )}
            </Pressable>
          </Animated.View>
        )}

        {/* ─── Step: Payment ───────────────── */}
        {step === "payment" && pricing && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>

            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Book</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {PRINT_FORMATS.find((f) => f.id === selectedFormat)?.label}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ${pricing.subtotal.toFixed(2)}
                </Text>
              </View>
              {pricing.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: "#4ECDC4" }]}>
                    Subscriber Discount
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#4ECDC4" }]}>
                    -${pricing.discount.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>Calculated at checkout</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Estimated Total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  ${pricing.total.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={[styles.shippingPreview, { backgroundColor: colors.card }]}>
              <Text style={[styles.previewTitle, { color: colors.text }]}>{"\u{1F4E6}"} Ships to:</Text>
              <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                {shippingName}
              </Text>
              <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                {address1}{address2 ? `, ${address2}` : ""}
              </Text>
              <Text style={[styles.previewDetail, { color: colors.textSecondary }]}>
                {city}, {stateCode} {zip}
              </Text>
            </View>

            <Pressable onPress={handleConfirmOrder} style={[styles.ctaButton, { backgroundColor: "#4ECDC4" }]}>
              <Text style={styles.ctaText}>{"\u{2713}"} Place Order</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ─── Step: Confirmation ──────────── */}
        {step === "confirmation" && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.confirmationView}>
            <Text style={styles.confirmEmoji}>{"\u{1F389}"}</Text>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Order Placed!</Text>
            <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>
              Your personalized storybook is being prepared for printing.
              You'll receive an email with tracking information once it ships.
            </Text>

            <View style={[styles.orderIdBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>Order ID</Text>
              <Text style={[styles.orderIdValue, { color: colors.text }]}>{orderId}</Text>
            </View>

            <Pressable onPress={() => router.replace("/(tabs)")} style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.ctaText}>Back to Stories</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  sectionTitle: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  sectionDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  // Format cards
  formatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  formatIcon: { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
  formatEmoji: { fontSize: 28 },
  formatInfo: { flex: 1, marginLeft: 12 },
  formatLabel: { fontSize: 16, fontWeight: "600" },
  formatDesc: { fontSize: 13, marginTop: 2 },
  formatPrice: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  checkmark: { fontSize: 22, fontWeight: "700" },
  // Inputs
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  textArea: { minHeight: 80, borderRadius: 12, paddingHorizontal: 16, paddingTop: 12, fontSize: 15, borderWidth: 1, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  // CTA
  ctaButton: { paddingVertical: 16, borderRadius: 25, alignItems: "center", marginTop: 24 },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center" },
  secondaryBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 25, borderWidth: 1, marginRight: 12 },
  secondaryText: { fontSize: 15, fontWeight: "500" },
  buttonRow: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  // Preview
  previewBox: { padding: 20, borderRadius: 14, marginBottom: 16 },
  previewTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  previewDetail: { fontSize: 14, lineHeight: 22 },
  // Summary
  summaryCard: { padding: 20, borderRadius: 14, marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "500" },
  totalRow: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 20, fontWeight: "800" },
  shippingPreview: { padding: 16, borderRadius: 14, marginBottom: 8 },
  // Confirmation
  confirmationView: { alignItems: "center", paddingTop: 40 },
  confirmEmoji: { fontSize: 64, marginBottom: 16 },
  confirmTitle: { fontSize: 28, fontWeight: "800", marginBottom: 12 },
  confirmDesc: { fontSize: 15, textAlign: "center", lineHeight: 24, paddingHorizontal: 20, marginBottom: 24 },
  orderIdBox: { padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 24, width: "100%" },
  orderIdLabel: { fontSize: 12, marginBottom: 4 },
  orderIdValue: { fontSize: 18, fontWeight: "700", fontFamily: "monospace" },
});
