import { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput, Alert,
  Dimensions, Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LinearGradient } from "expo-linear-gradient";
import { ASSETS } from "@/constants/assets";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type BookFormat = "hardcover" | "softcover" | "premium";

const BOOK_FORMATS: { id: BookFormat; name: string; price: string; priceNum: number; description: string; features: string[] }[] = [
  {
    id: "softcover",
    name: "Softcover",
    price: "\u00A314.99",
    priceNum: 14.99,
    description: "Perfect for everyday reading",
    features: ["Matte finish cover", "High-quality paper", "Full color illustrations", "24-32 pages"],
  },
  {
    id: "hardcover",
    name: "Hardcover",
    price: "\u00A324.99",
    priceNum: 24.99,
    description: "Built to last a lifetime",
    features: ["Durable hardcover binding", "Premium glossy pages", "Full color illustrations", "24-32 pages", "Dust jacket included"],
  },
  {
    id: "premium",
    name: "Premium Gift Edition",
    price: "\u00A339.99",
    priceNum: 39.99,
    description: "The ultimate keepsake gift",
    features: ["Linen-wrapped hardcover", "Archival quality paper", "Gold foil title", "Gift box included", "Personalized dedication page", "24-32 pages"],
  },
];

type OrderStep = "preview" | "format" | "details" | "confirmation";

export default function PrintBookScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ arcId: string; title: string }>();

  const [step, setStep] = useState<OrderStep>("preview");
  const [selectedFormat, setSelectedFormat] = useState<BookFormat>("hardcover");
  const [dedication, setDedication] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [processing, setProcessing] = useState(false);

  const storyTitle = params.title || "A Magical Adventure";
  const selectedBook = BOOK_FORMATS.find((b) => b.id === selectedFormat)!;

  const handlePlaceOrder = () => {
    if (!recipientName.trim() || !shippingAddress.trim()) {
      Alert.alert("Missing Information", "Please fill in the recipient name and shipping address.");
      return;
    }
    setProcessing(true);
    // Simulate order processing
    setTimeout(() => {
      setProcessing(false);
      setStep("confirmation");
    }, 2000);
  };

  // Preview Step
  const renderPreview = () => (
    <>
      <Animated.View entering={FadeIn.duration(600)} style={styles.bookPreviewContainer}>
        <View style={styles.bookMockup}>
          <Image
            source={{ uri: ASSETS.themes.forest }}
            style={styles.bookCover}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            locations={[0.4, 1]}
            style={styles.bookGradient}
          >
            <Text style={styles.bookTitle}>{storyTitle}</Text>
            <Text style={styles.bookSubtitle}>A Personalized Bedtime Story</Text>
          </LinearGradient>
          <View style={styles.bookSpine} />
        </View>
        <View style={styles.bookShadow} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.previewInfo}>
        <Text style={[styles.previewTitle, { color: colors.foreground }]}>
          Turn This Adventure Into a Real Book
        </Text>
        <Text style={[styles.previewDesc, { color: colors.muted }]}>
          Every page of your child's personalized story, beautifully printed with AI-generated illustrations. A keepsake they'll treasure forever.
        </Text>

        <View style={styles.featureGrid}>
          {[
            { icon: "sparkles" as const, title: "AI Illustrations", desc: "Every page beautifully illustrated" },
            { icon: "gift.fill" as const, title: "Perfect Gift", desc: "Arrives in beautiful packaging" },
            { icon: "printer.fill" as const, title: "Premium Print", desc: "Archival quality materials" },
            { icon: "star.fill" as const, title: "Personalized", desc: "Your child is the hero" },
          ].map((feat, idx) => (
            <View key={idx} style={[styles.featureCard, { backgroundColor: colors.surface }]}>
              <IconSymbol name={feat.icon} size={24} color="#FFD700" />
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{feat.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.muted }]}>{feat.desc}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Pressable
        onPress={() => setStep("format")}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <IconSymbol name="cart.fill" size={20} color="#0A0E1A" />
        <Text style={styles.primaryBtnText}>Choose Book Format</Text>
      </Pressable>

      <Text style={[styles.startingPrice, { color: colors.muted }]}>
        Starting from {"\u00A3"}14.99 {"\u00B7"} Free shipping on Premium plans
      </Text>
    </>
  );

  // Format Selection Step
  const renderFormatSelection = () => (
    <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Choose Your Format</Text>
        <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
          Select the perfect format for "{storyTitle}"
        </Text>
      </Animated.View>

      {BOOK_FORMATS.map((format, idx) => (
        <Animated.View key={format.id} entering={FadeInDown.delay(idx * 100).duration(400)}>
          <Pressable
            onPress={() => setSelectedFormat(format.id)}
            style={({ pressed }) => [
              styles.formatCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedFormat === format.id && { borderColor: "#FFD700", borderWidth: 2 },
              pressed && { opacity: 0.85 },
            ]}
          >
            {format.id === "hardcover" && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Most Popular</Text>
              </View>
            )}
            <View style={styles.formatHeader}>
              <View>
                <Text style={[styles.formatName, { color: colors.foreground }]}>{format.name}</Text>
                <Text style={[styles.formatDesc, { color: colors.muted }]}>{format.description}</Text>
              </View>
              <Text style={[styles.formatPrice, { color: "#FFD700" }]}>{format.price}</Text>
            </View>
            <View style={styles.formatFeatures}>
              {format.features.map((feat, fIdx) => (
                <View key={fIdx} style={styles.formatFeatureRow}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color={selectedFormat === format.id ? "#FFD700" : colors.muted} />
                  <Text style={[styles.formatFeatureText, { color: colors.muted }]}>{feat}</Text>
                </View>
              ))}
            </View>
            {selectedFormat === format.id && (
              <View style={styles.selectedIndicator}>
                <IconSymbol name="checkmark.circle.fill" size={24} color="#FFD700" />
              </View>
            )}
          </Pressable>
        </Animated.View>
      ))}

      <Pressable
        onPress={() => setStep("details")}
        style={({ pressed }) => [
          styles.primaryBtn,
          { marginTop: 8 },
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={styles.primaryBtnText}>Continue - {selectedBook.price}</Text>
      </Pressable>
    </>
  );

  // Details Step
  const renderDetails = () => (
    <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>Personalize & Ship</Text>
        <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
          Add a personal touch and tell us where to send it
        </Text>
      </Animated.View>

      {/* Order Summary */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Book</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{storyTitle}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Format</Text>
          <Text style={[styles.summaryValue, { color: colors.foreground }]}>{selectedBook.name}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={[styles.summaryLabel, { color: colors.foreground, fontWeight: "700" }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: "#FFD700", fontWeight: "800", fontSize: 20 }]}>{selectedBook.price}</Text>
        </View>
      </Animated.View>

      {/* Dedication */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.inputCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Dedication (optional)</Text>
        <Text style={[styles.inputHint, { color: colors.muted }]}>
          Add a personal message on the first page
        </Text>
        <TextInput
          value={dedication}
          onChangeText={setDedication}
          placeholder="For my little explorer, with all my love..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
          style={[styles.textInput, { color: colors.foreground, borderColor: colors.border }]}
          returnKeyType="done"
        />
      </Animated.View>

      {/* Shipping */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.inputCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.inputLabel, { color: colors.foreground }]}>Shipping Details</Text>
        <TextInput
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Recipient Name"
          placeholderTextColor={colors.muted}
          style={[styles.textInputSingle, { color: colors.foreground, borderColor: colors.border }]}
          returnKeyType="next"
        />
        <TextInput
          value={shippingAddress}
          onChangeText={setShippingAddress}
          placeholder="Full Shipping Address"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
          style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, marginTop: 10 }]}
          returnKeyType="done"
        />
      </Animated.View>

      <Pressable
        onPress={handlePlaceOrder}
        disabled={processing}
        style={({ pressed }) => [
          styles.primaryBtn,
          { marginTop: 8 },
          processing && { opacity: 0.6 },
          pressed && !processing && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        {processing ? (
          <Text style={styles.primaryBtnText}>Processing...</Text>
        ) : (
          <>
            <IconSymbol name="creditcard.fill" size={20} color="#0A0E1A" />
            <Text style={styles.primaryBtnText}>Place Order - {selectedBook.price}</Text>
          </>
        )}
      </Pressable>

      <Text style={[styles.securityNote, { color: colors.muted }]}>
        Secure checkout {"\u00B7"} Ships in 5-7 business days
      </Text>
    </>
  );

  // Confirmation Step
  const renderConfirmation = () => (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.confirmationContainer}>
      <View style={styles.confirmCheckmark}>
        <IconSymbol name="checkmark.circle.fill" size={72} color="#4ADE80" />
      </View>
      <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Order Placed!</Text>
      <Text style={[styles.confirmSubtitle, { color: colors.muted }]}>
        Your personalized copy of "{storyTitle}" is being prepared. We'll send you a tracking number once it ships.
      </Text>

      <View style={[styles.confirmDetails, { backgroundColor: colors.surface }]}>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: colors.muted }]}>Order #</Text>
          <Text style={[styles.confirmValue, { color: colors.foreground }]}>SW-{Date.now().toString().slice(-6)}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: colors.muted }]}>Format</Text>
          <Text style={[styles.confirmValue, { color: colors.foreground }]}>{selectedBook.name}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: colors.muted }]}>Shipping to</Text>
          <Text style={[styles.confirmValue, { color: colors.foreground }]}>{recipientName}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={[styles.confirmLabel, { color: colors.muted }]}>Est. Delivery</Text>
          <Text style={[styles.confirmValue, { color: colors.foreground }]}>5-7 business days</Text>
        </View>
        <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.confirmLabel, { color: colors.muted }]}>Total</Text>
          <Text style={[styles.confirmValue, { color: "#FFD700", fontWeight: "800" }]}>{selectedBook.price}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.replace("/")}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={styles.primaryBtnText}>Back to Home</Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => {
            if (step === "preview" || step === "confirmation") router.back();
            else if (step === "format") setStep("preview");
            else if (step === "details") setStep("format");
          }} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {step === "confirmation" ? "Order Confirmed" : "Print Book"}
          </Text>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <IconSymbol name="xmark" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Step Indicator */}
        {step !== "confirmation" && (
          <View style={styles.stepIndicator}>
            {(["preview", "format", "details"] as OrderStep[]).map((s, idx) => (
              <View key={s} style={styles.stepDotRow}>
                <View style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      s === step ? "#FFD700" :
                      (["preview", "format", "details"].indexOf(step) > idx) ? "#4ADE80" :
                      colors.border,
                  },
                ]} />
                {idx < 2 && <View style={[styles.stepLine, {
                  backgroundColor: (["preview", "format", "details"].indexOf(step) > idx) ? "#4ADE80" : colors.border,
                }]} />}
              </View>
            ))}
          </View>
        )}

        {step === "preview" && renderPreview()}
        {step === "format" && renderFormatSelection()}
        {step === "details" && renderDetails()}
        {step === "confirmation" && renderConfirmation()}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  stepIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  stepDotRow: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },

  // Preview
  bookPreviewContainer: { alignItems: "center", marginBottom: 28, paddingTop: 16 },
  bookMockup: { width: SCREEN_WIDTH * 0.55, height: SCREEN_WIDTH * 0.75, borderRadius: 8, overflow: "hidden", position: "relative", elevation: 8, shadowColor: "#000", shadowOffset: { width: 4, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
  bookCover: { width: "100%", height: "100%" },
  bookGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", justifyContent: "flex-end", padding: 16 },
  bookTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bookSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  bookSpine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "rgba(0,0,0,0.2)" },
  bookShadow: { width: SCREEN_WIDTH * 0.5, height: 20, backgroundColor: "rgba(0,0,0,0.1)", borderRadius: 100, marginTop: -4 },

  previewInfo: { alignItems: "center", marginBottom: 24 },
  previewTitle: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  previewDesc: { fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: 8 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20, width: "100%" },
  featureCard: { width: (SCREEN_WIDTH - 50) / 2 - 5, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  featureTitle: { fontSize: 13, fontWeight: "700" },
  featureDesc: { fontSize: 11, textAlign: "center" },

  primaryBtn: { backgroundColor: "#FFD700", borderRadius: 16, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, width: "100%", marginTop: 16 },
  primaryBtnText: { color: "#0A0E1A", fontSize: 17, fontWeight: "700" },
  startingPrice: { fontSize: 13, textAlign: "center", marginTop: 10 },

  // Format
  stepTitle: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  stepSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  formatCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 12, position: "relative" },
  popularBadge: { position: "absolute", top: -10, right: 16, backgroundColor: "#FFD700", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  popularText: { color: "#0A0E1A", fontSize: 11, fontWeight: "700" },
  formatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  formatName: { fontSize: 18, fontWeight: "700" },
  formatDesc: { fontSize: 13, marginTop: 2 },
  formatPrice: { fontSize: 22, fontWeight: "800" },
  formatFeatures: { gap: 4 },
  formatFeatureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  formatFeatureText: { fontSize: 13 },
  selectedIndicator: { position: "absolute", bottom: 16, right: 16 },

  // Details
  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  summaryTotal: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", marginTop: 4, paddingTop: 12 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  inputCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  inputLabel: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  inputHint: { fontSize: 13, marginBottom: 10 },
  textInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: "top" },
  textInputSingle: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, height: 48 },
  securityNote: { fontSize: 12, textAlign: "center", marginTop: 10 },

  // Confirmation
  confirmationContainer: { alignItems: "center", paddingTop: 32 },
  confirmCheckmark: { marginBottom: 20 },
  confirmTitle: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  confirmSubtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 28, paddingHorizontal: 16 },
  confirmDetails: { borderRadius: 16, padding: 16, width: "100%", marginBottom: 24 },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  confirmLabel: { fontSize: 14 },
  confirmValue: { fontSize: 14, fontWeight: "600" },
});
