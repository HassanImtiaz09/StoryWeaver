import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  getLocalChildren,
  deleteLocalChild,
  type LocalChild,
} from "@/lib/onboarding-store";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function FamilyScreen() {
  const router = useRouter();
  const colors = useColors();
  const [children, setChildren] = useState<LocalChild[]>([]);

  const loadChildren = useCallback(async () => {
    const kids = await getLocalChildren();
    setChildren(kids);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChildren();
    }, [loadChildren])
  );

  const handleDelete = (child: LocalChild) => {
    Alert.alert(
      "Remove Profile",
      `Are you sure you want to remove ${child.name}'s profile? This will also remove their story history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await deleteLocalChild(child.id);
            loadChildren();
          },
        },
      ]
    );
  };

  const renderChild = ({ item, index }: { item: LocalChild; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(400)}>
      <View
        style={[
          styles.childCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.childCardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]}</Text>
          </View>
          <View style={styles.childInfo}>
            <Text style={[styles.childName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.childAge, { color: colors.muted }]}>
              Age {item.age} {item.gender ? `| ${item.gender}` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => handleDelete(item)}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={{ color: colors.error, fontSize: 14, fontWeight: "600" }}>Remove</Text>
          </Pressable>
        </View>

        {item.interests.length > 0 && (
          <View style={styles.interestRow}>
            {item.interests.map((interest) => (
              <View
                key={interest}
                style={[styles.interestBadge, { backgroundColor: "rgba(255, 215, 0, 0.1)" }]}
              >
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}

        {item.hairColor || item.skinTone ? (
          <View style={styles.detailRow}>
            {item.hairColor && (
              <Text style={[styles.detailText, { color: colors.muted }]}>
                Hair: {item.hairColor}
              </Text>
            )}
            {item.skinTone && (
              <Text style={[styles.detailText, { color: colors.muted }]}>
                Skin: {item.skinTone}
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Family</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              Manage your children's profiles
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/create-child")}
            style={({ pressed }) => [
              styles.addButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.addButtonText}>+ Add Child</Text>
          </Pressable>
        </Animated.View>

        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Profiles Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Add your children's profiles to personalize their bedtime stories
            </Text>
            <Pressable
              onPress={() => router.push("/create-child")}
              style={({ pressed }) => [
                styles.createButton,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.createButtonText}>Create First Profile</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={children}
            renderItem={renderChild}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: "#0A0E1A",
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    gap: 14,
  },
  childCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  childCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFD700",
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: "700",
  },
  childAge: {
    fontSize: 14,
    marginTop: 2,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  interestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  interestText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FFD700",
  },
  detailRow: {
    flexDirection: "row",
    gap: 16,
  },
  detailText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  createButton: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  createButtonText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "700",
  },
});
