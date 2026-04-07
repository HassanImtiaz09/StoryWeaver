import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  PLAN_DETAILS,
  activateSubscription,
  activateTrial,
  restorePurchases,
  type PlanDetails,
  type SubscriptionPlan,
} from "@/lib/subscription-store";

export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    source?: string;
    childName?: string;
  }>();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("monthly");
  const [processing, setProcessing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Animated glow for CTA
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const selectedPlanDetails = PLAN_DETAILS.find((p) => p.id === selectedPlan);

  const getHeaderMessage = () => {
    switch (params.source) {
      case "story_limit":
        return {
          emoji: "\u{1F31F}",
          title: "Your Free Stories Are Up!",
          subtitle: params.childName
            ? `${params.childName} loved those stories! Unlock unlimited bedtime adventures.`
            : "Unlock unlimited bedtime adventures for your little one.",
        };
      case "hd_voice":
        return {
          emoji: "\u{1F3A4}",
          title: "Unlock HD Voices",
          subtitle: "Premium character voices bring stories to life with ElevenLabs HD narration.",
        };
      case "nd_modes":
        return {
          emoji: "\u{1F9E9}",
          title: "Unlock ND Story Modes",
          subtitle: "Specialized story adaptations for neurodivergent children.",
        };
      default:
        return {
          emoji: "\u{2728}",
          title: "Unlock StoryWeaver Pro",
          subtitle: "Unlimited stories, HD voices, and magical illustrations every night.",
        };
    }
  };

  const headerMsg = getHeaderMessage();

  const handleSubscribe = async () => {
    if (!selectedPlanDetails || processing) return;
    setProcessing(true);

    try {
      if (selectedPlanDetails.trialDays) {
        Alert.alert(
          `Start ${selectedPlanDetails.trialDays}-Day Free Trial`,
          `Try ${selectedPlanDetails.name} free for ${selectedPlanDetails.trialDays} days. You'll be charged ${selectedPlanDetails.price}${selectedPlanDetails.period} after the trial ends. Cancel anytime.`,
          [
            {
              text: "Start Free Trial",
              onPress: async () => {
                await activateTrial(selectedPlan, selectedPlanDetails.trialDays);
                Alert.alert(
                  "Trial Activated!",
                  `Your ${selectedPlanDetails.trialDays}-day free trial has started. Enjoy unlimited stories!`,
                  [{ text: "Let's Go!", onPress: () => router.back() }]
                );
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      } else {
        Alert.alert(
          `Subscribe to ${selectedPlanDetails.name}`,
          `You'll be charged ${selectedPlanDetails.price}${selectedPlanDetails.period}. In production, this opens the App Store / Play Store payment sheet.`,
          [
            {
              text: "Subscribe",
              onPress: async () => {
                await activateSubscription(selectedPlan);
                Alert.alert(
                  "Subscribed!",
                  `Welcome to StoryWeaver ${selectedPlanDetails.name}! Enjoy unlimited bedtime stories.`,
                  [{ text: "Let's Go!", onPress: () => router.back() }]
                );
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.restored) {
        Alert.alert("Purchases Restored", `Your ${result.plan} subscription has been restored.`, [
          { text: "Great!", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases associated with your account.");
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A0E1A", "#1A1040", "#0A0E1A"] as const}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
        {/* Close button */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <IconSymbol name="xmark" size={22} color={colors.muted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          {/* Hero */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.hero}>
            <Text style={styles.heroEmoji}>{headerMsg.emoji}</Text>
            <Text style={styles.heroTitle}>{headerMsg.title}</Text>
            <Text style={styles.heroSubtitle}>{headerMsg.subtitle}</Text>
          </Animated.View>

          {/* Plan Cards */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.plansSection}>
            {PLAN_DETAILS.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
                delay={index * 100}
              />
            ))}
          </Animated.View>

          {/* Features for selected plan */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What you get</Text>
            {selectedPlanDetails?.features.map((feature, idx) => (
              <Animated.View key={feature} entering={FadeInDown.delay(450 + idx * 50).duration(300)} style={styles.featureRow}>
                <View style={[styles.featureCheck, { backgroundColor: (selectedPlanDetails.color ?? "#FFD700") + "20" }]}>
                  <IconSymbol name="checkmark.circle.fill" size={18} color={selectedPlanDetails.color} />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Social Proof */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.socialProof}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Text key={i} style={styles.starEmoji}>{"\u2B50"}</Text>
              ))}
            </View>
            <Text style={styles.socialText}>
              "My daughter asks for StoryWeaver every night. The personalized stories are magical!"
            </Text>
            <Text style={styles.socialAuthor}>- Sarah M., parent of 2</Text>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.ctaSection}>
            <Pressable
              onPress={handleSubscribe}
              disabled={processing}
              style={({ pressed }) => [styles.ctaButton, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Animated.View style={[styles.ctaGlow, glowStyle]} />
              <LinearGradient
                colors={[selectedPlanDetails?.color ?? "#FFD700", shiftColor(selectedPlanDetails?.color ?? "#FFD700", -30)] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                {processing ? (
                  <ActivityIndicator color="#0A0E1A" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>
                      {selectedPlanDetails?.trialDays
                        ? `Start ${selectedPlanDetails.trialDays}-Day Free Trial`
                        : `Subscribe for ${selectedPlanDetails?.price}${selectedPlanDetails?.period}`}
                    </Text>
                    {selectedPlanDetails?.trialDays ? (
                      <Text style={styles.ctaSubtext}>
                        then {selectedPlanDetails.price}{selectedPlanDetails.period}
                      </Text>
                    ) : null}
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Restore + Terms */}
          <Animated.View entering={FadeIn.delay(700).duration(400)} style={styles.footer}>
            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.6 }]}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={colors.muted} />
              ) : (
                <Text style={[styles.restoreText, { color: colors.muted }]}>Restore Purchases</Text>
              )}
            </Pressable>

            <Text style={[styles.termsText, { color: colors.muted }]}>
              Payment will be charged to your App Store account. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            </Text>

            <View style={styles.termsLinks}>
              <Pressable style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.termLink, { color: colors.primary }]}>Terms of Service</Text>
              </Pressable>
              <Text style={[styles.termsDot, { color: colors.muted }]}>{"\u00B7"}</Text>
              <Pressable style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                <Text style={[styles.termLink, { color: colors.primary }]}>Privacy Policy</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Plan Card ─────────────────────────────────────────────────
function PlanCard({ plan, isSelected, onSelect, delay }: { plan: PlanDetails; isSelected: boolean; onSelect: () => void; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(200 + delay).duration(400)}>
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [
          styles.planCard,
          {
            borderColor: isSelected ? plan.color : "rgba(255,255,255,0.08)",
            backgroundColor: isSelected ? plan.color + "10" : "rgba(255,255,255,0.03)",
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        {plan.recommended ? (
          <View style={[styles.recommendedBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.recommendedText}>Most Popular</Text>
          </View>
        ) : null}

        {plan.savings ? (
          <View style={[styles.savingsBadge, { backgroundColor: "#4ADE80" }]}>
            <Text style={styles.savingsText}>{plan.savings}</Text>
          </View>
        ) : null}

        <View style={styles.planCardContent}>
          <View style={[styles.radio, { borderColor: isSelected ? plan.color : "#9BA1A6" }]}>
            {isSelected ? <View style={[styles.radioInner, { backgroundColor: plan.color }]} /> : null}
          </View>

          <View style={styles.planInfo}>
            <Text style={[styles.planName, { color: isSelected ? plan.color : "#ECEDEE" }]}>{plan.name}</Text>
            {plan.trialDays ? <Text style={styles.trialBadge}>{plan.trialDays}-day free trial</Text> : null}
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Text style={styles.planPeriod}>{plan.period}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────
function shiftColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  hero: { alignItems: "center", paddingTop: 8, paddingBottom: 24 },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#FFFFFF", textAlign: "center", marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 16, color: "#9BA1A6", textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },

  plansSection: { gap: 10, marginBottom: 24 },
  planCard: { borderRadius: 16, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 16, position: "relative", overflow: "visible" },
  planCardContent: { flexDirection: "row", alignItems: "center" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: "center", alignItems: "center", marginRight: 12 },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  planInfo: { flex: 1 },
  planName: { fontSize: 17, fontWeight: "700" },
  trialBadge: { fontSize: 12, fontWeight: "600", marginTop: 2, color: "#4ADE80" },
  priceSection: { alignItems: "flex-end" },
  planPrice: { fontSize: 20, fontWeight: "800", color: "#ECEDEE" },
  planPeriod: { fontSize: 12, fontWeight: "500", color: "#9BA1A6" },
  recommendedBadge: { position: "absolute", top: -10, left: 16, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  recommendedText: { color: "#0A0E1A", fontSize: 11, fontWeight: "800" },
  savingsBadge: { position: "absolute", top: -10, right: 16, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  savingsText: { color: "#0A0E1A", fontSize: 10, fontWeight: "800" },

  featuresSection: { marginBottom: 20 },
  featuresTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginBottom: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  featureCheck: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  featureText: { fontSize: 15, color: "#E5E7EB", fontWeight: "500", flex: 1 },

  socialProof: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 18, marginBottom: 24, alignItems: "center" },
  starsRow: { flexDirection: "row", gap: 2, marginBottom: 8 },
  starEmoji: { fontSize: 16 },
  socialText: { fontSize: 14, color: "#E5E7EB", textAlign: "center", lineHeight: 20, fontStyle: "italic", marginBottom: 6 },
  socialAuthor: { fontSize: 12, color: "#8B8FA3", fontWeight: "600" },

  ctaSection: { marginBottom: 16 },
  ctaButton: { borderRadius: 16, overflow: "hidden", position: "relative" },
  ctaGlow: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: 18, backgroundColor: "rgba(255,215,0,0.15)" },
  ctaGradient: { paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: 18, fontWeight: "800", color: "#0A0E1A", letterSpacing: -0.3 },
  ctaSubtext: { fontSize: 13, fontWeight: "600", color: "#0A0E1A", opacity: 0.7, marginTop: 2 },

  footer: { alignItems: "center", paddingBottom: 20 },
  restoreBtn: { paddingVertical: 12, paddingHorizontal: 20, marginBottom: 12 },
  restoreText: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
  termsText: { fontSize: 11, textAlign: "center", lineHeight: 16, paddingHorizontal: 20, marginBottom: 8 },
  termsLinks: { flexDirection: "row", alignItems: "center", gap: 8 },
  termLink: { fontSize: 12, fontWeight: "600" },
  termsDot: { fontSize: 12 },
});
