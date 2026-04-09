/**
 * Privacy Policy Screen
 *
 * COPPA-compliant privacy policy written in child-friendly language
 * suitable for parents to understand StoryWeaver's data practices.
 *
 * Covers: data collection, usage, parental rights, retention, and contact.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { announce } from "@/lib/a11y-helpers";

const POLICY_SECTIONS = [
  {
    id: "what-we-collect",
    title: "What We Collect",
    icon: "document-text" as const,
    content: `StoryWeaver collects information to make the app work better and safer for children:

• Stories created by the child (text, images, voice recordings)
• Reading progress and bookmarks
• Achievements and points earned
• Bedtime routine preferences
• Language preferences
• Basic device information (to ensure compatibility)

We do NOT collect:
• Location data
• Device contacts or photos library (unless the parent explicitly chooses to share them)
• Biometric data
• Browsing history outside the app`,
  },
  {
    id: "how-we-use",
    title: "How We Use It",
    icon: "settings" as const,
    content: `Your child's information is used to:

• Personalize their storytelling experience
• Track progress and show achievements
• Improve app stability and performance
• Provide better story recommendations
• Create a safe, child-appropriate environment

We never:
• Sell your data to advertisers
• Share it with third parties for marketing
• Use it to target ads to your child
• Share it without your explicit permission`,
  },
  {
    id: "data-storage",
    title: "How Data is Stored",
    icon: "shield-checkmark" as const,
    content: `Your child's data is stored safely:

• Data is stored locally on your device first
• Optional cloud backup is encrypted
• We use industry-standard security practices
• Data is never stored on servers unless you enable cloud backup
• All data transmission is protected with encryption

StoryWeaver takes data security seriously and regularly reviews our practices to keep your child's information safe.`,
  },
  {
    id: "parental-rights",
    title: "Your Rights as a Parent",
    icon: "person" as const,
    content: `COPPA gives you these rights:

• Request to see what data we have about your child
• Request to delete your child's data at any time
• Opt out of optional data collection
• Withdraw consent and stop using the app
• Update or correct your child's information
• Deny or revoke permission for further collection

To exercise these rights, contact us at: privacy@storyweaver.app

We will respond to all requests within 30 days.`,
  },
  {
    id: "data-retention",
    title: "How Long We Keep Data",
    icon: "time" as const,
    content: `We keep your child's data only as long as needed:

• Active account data: kept while account is active
• After account deletion: removed within 30 days
• Backups: automatically deleted after 1 year of inactivity
• Optional cloud storage: kept as long as you maintain the account
• Parents can request deletion at any time

When data is deleted, it is permanently removed from our systems.`,
  },
  {
    id: "contact-us",
    title: "Contact Us",
    icon: "mail" as const,
    content: `Questions about privacy or your child's data?

Email: privacy@storyweaver.app
Mail: StoryWeaver, Inc.
      Data Protection Team
      [Your Address]
      [City, State, ZIP]

We're happy to help and typically respond within 2 business days.

This privacy policy is effective as of [Date] and was last updated on [Date].

For questions about COPPA, visit the FTC website: www.ftc.gov/coppa`,
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleGoBack = useCallback(() => {
    announce("Going back to previous screen");
    router.back();
  }, [router]);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.muted,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    introCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    introText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.foreground,
      marginBottom: 12,
    },
    introHighlight: {
      fontWeight: "600",
      color: colors.primary,
    },
    sectionContainer: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 12,
    },
    sectionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "15",
      justifyContent: "center",
      alignItems: "center",
    },
    sectionTitleContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.foreground,
    },
    sectionContent: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 14,
      marginLeft: 52,
    },
    sectionText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.foreground,
      marginBottom: 8,
    },
    bulletPoint: {
      marginBottom: 8,
      paddingLeft: 8,
    },
    bulletText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.foreground,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 8,
    },
    bullet: {
      width: 24,
      fontSize: 16,
      color: colors.primary,
      fontWeight: "600",
      marginTop: -2,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lastUpdated: {
      fontSize: 12,
      color: colors.muted,
      textAlign: "center",
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });

  const renderBulletList = (items: string[]) => {
    return items.map((item, idx) => (
      <View key={idx} style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={[styles.bulletText, { flex: 1 }]}>{item}</Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleGoBack}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to the previous screen"
        >
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerSubtitle}>
            How we protect your child's data
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollContent}
        accessible
        accessibilityLabel="Privacy policy content"
        accessibilityRole="none"
      >
        {/* Introduction */}
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            At <Text style={styles.introHighlight}>StoryWeaver</Text>, we take
            your child's privacy seriously. This policy explains how we collect,
            use, and protect their information.
          </Text>
          <Text style={styles.introText}>
            We comply with COPPA (Children's Online Privacy Protection Act) and
            treat your child's data with care.
          </Text>
        </View>

        {/* Policy Sections */}
        {POLICY_SECTIONS.map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons
                  name={section.icon}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            </View>

            <View style={styles.sectionContent}>
              {section.content.split("\n\n").map((paragraph, idx) => (
                <View key={idx}>
                  {paragraph.includes("•") ? (
                    <View>
                      {paragraph.split("\n").map((line, lineIdx) => {
                        if (line.startsWith("•")) {
                          return (
                            <View
                              key={lineIdx}
                              style={[
                                styles.listItem,
                                {
                                  paddingHorizontal: 0,
                                  marginBottom: 8,
                                },
                              ]}
                            >
                              <Text style={styles.bullet}>•</Text>
                              <Text
                                style={[
                                  styles.bulletText,
                                  { flex: 1, marginLeft: -8 },
                                ]}
                              >
                                {line.replace("• ", "")}
                              </Text>
                            </View>
                          );
                        } else if (line.trim()) {
                          return (
                            <Text
                              key={lineIdx}
                              style={[styles.sectionText, { fontWeight: "600" }]}
                            >
                              {line}
                            </Text>
                          );
                        }
                        return null;
                      })}
                    </View>
                  ) : (
                    <Text style={styles.sectionText}>{paragraph}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>
          Last updated: April 2024{"\n"}
          Effective date: April 1, 2024
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
