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
import { usePrintStore } from "@/lib/print-store";
import { BookFormatSelector } from "@/components/book-format-selector";
import { BookPreviewCard } from "@/components/book-preview-card";
import { OrderTracker } from "@/components/order-tracker";
import { ShippingAddressForm } from "@/components/shipping-address-form";

type PrintStep = "format" | "preview" | "shipping" | "payment" | "confirmation";

export default function PrintBookScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ arcId: string; childId: string; episodeId?: string }>();
  const printStore = usePrintStore();

  const [step, setStep] = useState<PrintStep>("format");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedSize, setSelectedSize] = useState("8x10");
  const [dedication, setDedication] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [bookProductId, setBookProductId] = useState<number | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  // Shipping form state
  const [shippingName, setShippingName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [email, setEmail] = useState("");

  // Load formats on mount
  useEffect(() => {
    printStore.loadFormats().catch((err) => {
      console.error("Failed to load formats:", err);
    });
  }, []);

  const handleSelectFormat = useCallback((formatId: string) => {
    setSelectedFormat(formatId);
  }, []);

  const handleProceedToPreview = useCallback(async () => {
    if (!selectedFormat) {
      Alert.alert("Select a format", "Please choose a book format to continue.");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Extract format and size from selected format ID
      const [format, size] = selectedFormat.split("_").slice(0, 2);
      const product = await printStore.createBookProduct({
        storyArcId: parseInt(params.arcId ?? "0", 10),
        childId: parseInt(params.childId ?? "0", 10),
        format,
        size: size ? `${size.charAt(0)}x${size.slice(1)}` : "8x10",
        dedication,
      });

      setBookProductId(product.id);
      setStep("preview");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to prepare book. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [selectedFormat, dedication, params.arcId, params.childId, printStore]);

  const handleProceedToShipping = useCallback(async () => {
    if (!bookProductId) {
      Alert.alert("Error", "Book product not found");
      return;
    }
    setStep("shipping");
  }, [bookProductId]);

  const handleProceedToPayment = useCallback(async () => {
    if (!shippingName || !address1 || !city || !stateCode || !zip) {
      Alert.alert("Missing info", "Please fill in all required shipping fields.");
      return;
    }

    if (!bookProductId) {
      Alert.alert("Error", "Book product not found");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const result = await printStore.estimateShipping({
        bookProductId,
        address: {
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

      setStep("payment");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to estimate shipping. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    bookProductId, shippingName, address1, address2, city, stateCode, zip, country, email,
    printStore,
  ]);

  const handleConfirmOrder = useCallback(async () => {
    if (!bookProductId) {
      Alert.alert("Error", "Book product not found");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const order = await printStore.placeOrder({
        bookProductId,
        shippingAddress: {
          name: shippingName,
          address1,
          address2: address2 || undefined,
          city,
          stateCode,
          zip,
          countryCode: country,
          email: email || undefined,
        },
        shippingRateId: "standard",
      });

      setCurrentOrder(order);
      setStep("confirmation");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to place order.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [bookProductId, shippingName, address1, address2, city, stateCode, zip, country, email, printStore]);

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

            {printStore.availableFormats.length > 0 && (
              <BookFormatSelector
                formats={printStore.availableFormats}
                selectedId={selectedFormat}
                onSelect={handleSelectFormat}
              />
            )}

            {PRINT_FORMATS.map((fmt) => (
              <Pressable
                key={fmt.id}
                onPress={() => {
                  handleSelectFormat(fmt.id);
                  setSelectedSize(fmt.id.split("_")[1] || "8x10");
                }}
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
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Where should we send your personalized storybook?
            </Text>

            <ShippingAddressForm
              initialData={{
                name: shippingName,
                address1,
                address2,
                city,
                stateCode,
                countryCode: country,
                zip,
                phone: email,
              }}
              onSubmit={(data) => {
                setShippingName(data.name);
                setAddress1(data.address1);
                setAddress2(data.address2 || "");
                setCity(data.city);
                setStateCode(data.stateCode);
                setCountry(data.countryCode);
                setZip(data.zip);
                setEmail(data.phone || "");
                handleProceedToPayment();
              }}
              isLoading={isGeneratingPdf}
              submitLabel="Continue to Payment"
            />
          </Animated.View>
        )}

        {/* ─── Step: Payment ───────────────── */}
        {step === "payment" && printStore.currentPricing && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>

            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Book Format</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {PRINT_FORMATS.find((f) => f.id === selectedFormat)?.label || selectedFormat}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Base Cost</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ${printStore.currentPricing.baseCost.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Markup</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  +${printStore.currentPricing.markup.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  ${printStore.currentPricing.shippingEstimate.toFixed(2)}
                </Text>
              </View>
              {printStore.currentPricing.tax > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tax</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    ${printStore.currentPricing.tax.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  ${printStore.currentPricing.total.toFixed(2)}
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

            <Pressable
              onPress={handleConfirmOrder}
              disabled={isGeneratingPdf}
              style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            >
              {isGeneratingPdf ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.ctaText, { marginLeft: 8 }]}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.ctaText}>{"\u{2713}"} Place Order</Text>
              )}
            </Pressable>
          </Animated.View>
        )}

        {/* ─── Step: Confirmation ──────────── */}
        {step === "confirmation" && currentOrder && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.confirmationView}>
            <Text style={styles.confirmEmoji}>{"\u{1F389}"}</Text>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Order Placed!</Text>
            <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>
              Your personalized storybook is being prepared for printing.
              You'll receive an email with tracking information once it ships.
            </Text>

            <View style={[styles.orderIdBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>Order ID</Text>
              <Text style={[styles.orderIdValue, { color: colors.text }]}>{currentOrder.id}</Text>
            </View>

            <OrderTracker currentStatus={currentOrder.status} />

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
