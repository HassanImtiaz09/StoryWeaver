import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

interface PlanOption {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: PlanOption[] = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    period: "Forever",
    features: [
      "3 stories per month",
      "Basic themes",
      "1 child profile",
      "Story reading",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$9.99",
    period: "/month",
    highlighted: true,
    features: [
      "Unlimited stories",
      "All themes",
      "Multiple children",
      "Custom characters",
      "Collaborative stories",
      "Offline downloads",
      "Ad-free experience",
    ],
  },
  {
    id: "family",
    name: "Family",
    price: "$14.99",
    period: "/month",
    features: [
      "Everything in Premium",
      "Up to 5 children",
      "Parent controls",
      "Reading analytics",
      "Print books",
      "Priority support",
    ],
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleSubscribe = (planId: string) => {
    Alert.alert(
      "Subscribe",
      `Subscribe to ${planId.charAt(0).toUpperCase() + planId.slice(1)}?`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Continue",
          onPress: () => {
            Alert.alert("Success", "Subscription feature coming soon!");
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              Unlock Unlimited Stories
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose a plan that works for your family
            </Text>
          </View>
        </Animated.View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan, index) => (
            <Animated.View
              key={plan.id}
              entering={FadeInDown.delay(100 + index * 100).duration(400)}
            >
              <Pressable
                onPress={() => handleSubscribe(plan.id)}
                style={({ pressed }) => [
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderWidth: plan.highlighted ? 2 : 1,
                    borderColor: plan.highlighted ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                ]}
              >
                {plan.highlighted && (
                  <LinearGradient
                    colors={[colors.primary, colors.primary + "CC"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badge}
                  >
                    <Text style={styles.badgeText}>POPULAR</Text>
                  </LinearGradient>
                )}

                <Text style={[styles.planName, { color: colors.text }]}>
                  {plan.name}
                </Text>

                <View style={styles.priceContainer}>
                  <Text style={[styles.price, { color: colors.text }]}>
                    {plan.price}
                  </Text>
                  {plan.period !== "Forever" && (
                    <Text style={[styles.period, { color: colors.textSecondary }]}>
                      {plan.period}
                    </Text>
                  )}
                </View>

                <View style={styles.featuresContainer}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={[styles.feature, { color: colors.text }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={[
                    styles.ctaButton,
                    {
                      backgroundColor: plan.highlighted
                        ? colors.primary
                        : "rgba(255,255,255,0.1)",
                    },
                  ]}
                  onPress={() => handleSubscribe(plan.id)}
                >
                  <Text
                    style={[
                      styles.ctaButtonText,
                      {
                        color: plan.highlighted ? "#0A0E1A" : colors.primary,
                      },
                    ]}
                  >
                    {plan.id === "free" ? "Current Plan" : "Subscribe"}
                  </Text>
                </Pressable>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Benefits Section */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.benefitsSection}
        >
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            Why upgrade?
          </Text>

          <View style={[styles.benefitCard, { backgroundColor: colors.card }]}>
            <Ionicons name="book" size={24} color={colors.primary} />
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitName, { color: colors.text }]}>
                Unlimited Stories
              </Text>
              <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                Create unlimited personalized stories every day
              </Text>
            </View>
          </View>

          <View style={[styles.benefitCard, { backgroundColor: colors.card }]}>
            <Ionicons name="star" size={24} color={colors.primary} />
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitName, { color: colors.text }]}>
                Premium Features
              </Text>
              <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                Access all themes, characters, and advanced options
              </Text>
            </View>
          </View>

          <View style={[styles.benefitCard, { backgroundColor: colors.card }]}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitName, { color: colors.text }]}>
                Family Accounts
              </Text>
              <Text style={[styles.benefitDesc, { color: colors.textSecondary }]}>
                Manage multiple children with tailored content
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* FAQ */}
        <Animated.View
          entering={FadeInDown.delay(450).duration(400)}
          style={styles.faqSection}
        >
          <Text style={[styles.faqTitle, { color: colors.text }]}>
            Questions?
          </Text>
          <Pressable style={styles.faqLink}>
            <Text style={[styles.faqLinkText, { color: colors.primary }]}>
              View our pricing FAQ
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
    gap: 12,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 32,
  },
  planCard: {
    padding: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  badgeText: {
    color: "#0A0E1A",
    fontSize: 10,
    fontWeight: "800",
  },
  planName: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  price: {
    fontSize: 32,
    fontWeight: "800",
  },
  period: {
    fontSize: 14,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 10,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feature: {
    fontSize: 13,
    flex: 1,
  },
  ctaButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  benefitsSection: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  benefitCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  benefitContent: {
    flex: 1,
  },
  benefitName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  faqSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  faqLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  faqLinkText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
