import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { HeatmapData } from "@/server/_core/analyticsService";
import Animated, { FadeInUp } from "react-native-reanimated";

interface ReadingHeatmapProps {
  data: HeatmapData[];
  isLoading: boolean;
}

const CELL_SIZE = 14;
const CELL_MARGIN = 2;

const INTENSITY_COLORS = [
  "#F0F0F0", // 0 - no activity
  "#AED6F1", // 1 - light
  "#5DADE2", // 2 - medium
  "#2874A6", // 3 - heavy
  "#1B4965", // 4 - very heavy
];

export function ReadingHeatmap({ data, isLoading }: ReadingHeatmapProps) {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const heatmapGrid = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group data by weeks
    const weeks: HeatmapData[][] = [];
    let currentWeek: HeatmapData[] = [];

    for (const day of data) {
      const date = new Date(day.date);
      if (date.getDay() === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeatmap} />
      </View>
    );
  }

  if (heatmapGrid.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No reading activity yet</Text>
          <Text style={styles.emptySubtext}>
            Start reading to fill your activity heatmap!
          </Text>
        </View>
      </View>
    );
  }

  const selectedData = selectedDate
    ? data.find((d) => d.date === selectedDate)
    : null;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDate = new Date(data[data.length - 1].date);
  const minDate = new Date(data[0].date);
  const monthRange =
    minDate.toLocaleDateString("en-US", { month: "short" }) +
    " - " +
    maxDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <Animated.View style={styles.container} entering={FadeInUp.duration(500)}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Heatmap</Text>
        <Text style={styles.subtitle}>{monthRange}</Text>
      </View>

      {selectedData && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedDate}>{selectedData.date}</Text>
          <View style={styles.selectedStats}>
            <Text style={styles.selectedMinutes}>{selectedData.minutes}</Text>
            <Text style={styles.selectedLabel}>
              minute{selectedData.minutes !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heatmapScroll}
      >
        <View style={styles.heatmapContainer}>
          {/* Day labels */}
          <View style={styles.dayLabels}>
            <View style={styles.dayLabelsCorner} />
            {dayNames.map((day, idx) => (
              <Text key={day} style={styles.dayLabel}>
                {idx % 2 === 0 ? day : ""}
              </Text>
            ))}
          </View>

          {/* Heatmap grid */}
          {heatmapGrid.map((week, weekIdx) => (
            <View key={weekIdx} style={styles.week}>
              {/* Month label for first week of month */}
              {week[0] && new Date(week[0].date).getDate() <= 7 && (
                <Text style={styles.monthLabel}>
                  {new Date(week[0].date).toLocaleDateString("en-US", {
                    month: "short",
                  })}
                </Text>
              )}
              {(!week[0] || new Date(week[0].date).getDate() > 7) && (
                <View style={styles.monthLabel} />
              )}

              {/* Days in week */}
              {week.map((day) => (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.cell,
                    {
                      backgroundColor:
                        INTENSITY_COLORS[day.intensity] || "#F0F0F0",
                      borderColor:
                        selectedDate === day.date ? "#9D4EDD" : "transparent",
                      borderWidth: selectedDate === day.date ? 2 : 0,
                    },
                  ]}
                  onPress={() =>
                    setSelectedDate(
                      selectedDate === day.date ? null : day.date
                    )
                  }
                  accessible={true}
                  accessibilityLabel={`${day.date}: ${day.minutes} minutes`}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Reading Level:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendCell,
                { backgroundColor: INTENSITY_COLORS[0] },
              ]}
            />
            <Text style={styles.legendLabel}>None</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendCell,
                { backgroundColor: INTENSITY_COLORS[1] },
              ]}
            />
            <Text style={styles.legendLabel}>Low</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendCell,
                { backgroundColor: INTENSITY_COLORS[2] },
              ]}
            />
            <Text style={styles.legendLabel}>Med</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendCell,
                { backgroundColor: INTENSITY_COLORS[3] },
              ]}
            />
            <Text style={styles.legendLabel}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendCell,
                { backgroundColor: INTENSITY_COLORS[4] },
              ]}
            />
            <Text style={styles.legendLabel}>Max</Text>
          </View>
        </View>
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
  skeletonHeatmap: {
    backgroundColor: "#F0F0F0",
    height: 240,
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
  selectedInfo: {
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  selectedDate: {
    fontSize: 12,
    color: "#808080",
    marginBottom: 4,
  },
  selectedStats: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  selectedMinutes: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F1F1F",
    marginRight: 6,
  },
  selectedLabel: {
    fontSize: 12,
    color: "#808080",
  },
  heatmapScroll: {
    paddingRight: 8,
  },
  heatmapContainer: {
    marginBottom: 12,
  },
  dayLabels: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayLabelsCorner: {
    width: 36,
    height: CELL_SIZE,
  },
  dayLabel: {
    width: CELL_SIZE + CELL_MARGIN,
    height: CELL_SIZE,
    fontSize: 9,
    color: "#808080",
    fontWeight: "500",
    textAlign: "center",
  },
  week: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: CELL_MARGIN,
  },
  monthLabel: {
    width: 36,
    height: CELL_SIZE,
    fontSize: 9,
    color: "#808080",
    fontWeight: "500",
    textAlign: "right",
    paddingRight: 6,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
    marginRight: CELL_MARGIN,
  },
  legend: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#808080",
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  legendItem: {
    alignItems: "center",
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 9,
    color: "#808080",
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
