import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useGamificationStore } from "@/lib/gamification-store";
import { fetchProgress } from "@/lib/gamification-actions";
import { AchievementsGallery } from "@/components/achievements-gallery";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function AchievementsScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ childId: string; childName: string }>();
  const gamificationStore = useGamificationStore();
  const [loading, setLoading] = useState(true);

  const childId = params?.childId ? parseInt(params.childId, 10) : null;

  const loadAchievements = useCallback(async () => {
    if (childId) {
      await fetchProgress(childId);
    }
    setLoading(false);
  }, [childId]);

  useFocusEffect(
    useCallback(() => {
      loadAchievements();
    }, [loadAchievements])
  );

  if (loading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FFD700" />
      </ScreenContainer>
    );
  }

  const childProgress = childId ? gamificationStore.childProgress.get(childId) : null;
  const achievements = childProgress?.achievements || [];

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
              Achievements
            </Text>
            {params?.childName && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {params.childName}'s collection
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Stats Summary */}
        {childProgress && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.statsSection}
          >
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={styles.statContent}>
                <Ionicons name="trophy" size={32} color="#FFD700" />
                <View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total Achievements
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {achievements.length}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={styles.statContent}>
                <Ionicons name="star" size={32} color="#FFD700" />
                <View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Level
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {childProgress.level}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Achievements Gallery */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          {achievements.length > 0 ? (
            <AchievementsGallery
              achievements={achievements}
              isLoading={loading}
              onAchievementPress={(achievement) => {
                // Could show a detail modal here
              }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Achievements Yet
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                Keep reading stories to unlock achievements!
              </Text>
            </View>
          )}
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
    marginBottom: 24,
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
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statsSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  statContent: {
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: "80%",
  },
});
