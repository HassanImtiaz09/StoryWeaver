import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ThemeBreakdownData } from "@/server/_core/analyticsService";
import Animated, { FadeIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const PIE_SIZE = 140;

interface ThemePieChartProps {
  data: ThemeBreakdownData[];
  isLoading: boolean;
}

export function ThemePieChart({ data, isLoading }: ThemePieChartProps) {
  const [selectedTheme, setSelectedTheme] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonChart} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No theme data yet</Text>
          <Text style={styles.emptySubtext}>
            Read more stories to see your favorite themes!
          </Text>
        </View>
      </View>
    );
  }

  const totalStories = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(500)}>
      <View style={styles.header}>
        <Text style={styles.title}>Story Themes</Text>
        <Text style={styles.subtitle}>
          {totalStories} total {totalStories === 1 ? "story" : "stories"}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Pie Representation */}
        <View style={styles.pieContainer}>
          <View style={styles.pie}>
            {data.map((theme, idx) => {
              const angle = (theme.percentage / 100) * 360;
              const startAngle = data
                .slice(0, idx)
                .reduce((sum, t) => sum + (t.percentage / 100) * 360, 0);

              return (
                <View
                  key={theme.theme}
                  style={[
                    styles.pieSegment,
                    {
                      backgroundColor: theme.color,
                      opacity: selectedTheme === theme.theme ? 1 : 0.7,
                    },
                  ]}
                >
                  {theme.percentage > 15 && (
                    <Text style={styles.percentageLabel}>
                      {theme.percentage}%
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.centerLabel}>
            <Text style={styles.centerValue}>{totalStories}</Text>
            <Text style={styles.centerUnit}>
              {totalStories === 1 ? "Story" : "Stories"}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <ScrollView style={styles.legend} showsVerticalScrollIndicator={false}>
          {data.map((theme) => (
            <TouchableOpacity
              key={theme.theme}
              style={[
                styles.legendItem,
                selectedTheme === theme.theme && styles.legendItemSelected,
              ]}
              onPress={() =>
                setSelectedTheme(
                  selectedTheme === theme.theme ? null : theme.theme
                )
              }
              accessible={true}
              accessibilityLabel={`${theme.theme}: ${theme.count} stories, ${theme.percentage}%`}
            >
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: theme.color },
                ]}
              />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendTheme}>{theme.theme}</Text>
                <Text style={styles.legendStats}>
                  {theme.count} {theme.count === 1 ? "story" : "stories"} •{" "}
                  {theme.percentage}%
                </Text>
              </View>
              <Text style={styles.legendArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  skeletonChart: {
    backgroundColor: "#F0F0F0",
    height: 300,
    borderRadius: 12,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#808080",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  pieContainer: {
    alignItems: "center",
    marginRight: 16,
    flex: 0,
  },
  pie: {
    width: PIE_SIZE,
    height: PIE_SIZE,
    borderRadius: PIE_SIZE / 2,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  pieSegment: {
    width: "50%",
    height: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  percentageLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  centerUnit: {
    fontSize: 10,
    color: "#808080",
    marginTop: 2,
  },
  legend: {
    flex: 1,
    maxHeight: 250,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F8F8F8",
  },
  legendItemSelected: {
    backgroundColor: "#F0F0F0",
    borderLeftWidth: 3,
    borderLeftColor: "#9D4EDD",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendTheme: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 2,
    textTransform: "capitalize",
  },
  legendStats: {
    fontSize: 11,
    color: "#808080",
  },
  legendArrow: {
    fontSize: 16,
    color: "#C0C0C0",
    marginLeft: 8,
  },
  emptyState: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#808080",
    textAlign: "center",
  },
});
