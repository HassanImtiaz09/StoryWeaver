import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { DailyReadingData } from "@/server/_core/analyticsService";
import Animated, { FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 32;
const BAR_WIDTH = 12;
const BAR_MARGIN = 8;

interface ReadingTimeChartProps {
  data: DailyReadingData[];
  isLoading: boolean;
}

interface ChartBar {
  date: string;
  dayName: string;
  minutes: number;
  height: number;
  weekday: number;
}

export function ReadingTimeChart({ data, isLoading }: ReadingTimeChartProps) {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const chartData: ChartBar[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    const maxMinutes = Math.max(...data.map((d) => d.minutes), 1);
    const MAX_HEIGHT = 180;

    return data.map((d) => {
      const date = new Date(d.date);
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return {
        date: d.date,
        dayName: dayNames[date.getDay()],
        minutes: d.minutes,
        height: (d.minutes / maxMinutes) * MAX_HEIGHT,
        weekday: date.getDay(),
      };
    });
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonChart} />
      </View>
    );
  }

  if (chartData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No reading data yet</Text>
          <Text style={styles.emptySubtext}>Start reading to see your progress!</Text>
        </View>
      </View>
    );
  }

  const selectedData = selectedDate
    ? chartData.find((d) => d.date === selectedDate)
    : null;

  const averageMinutes = Math.round(
    chartData.reduce((sum, d) => sum + d.minutes, 0) / chartData.length
  );

  return (
    <Animated.View style={styles.container} entering={FadeInUp.duration(500)}>
      <View style={styles.header}>
        <Text style={styles.title}>Reading Time</Text>
        <Text style={styles.subtitle}>
          Avg: {averageMinutes} min/day
        </Text>
      </View>

      {selectedData && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedDate}>
            {selectedData.dayName}, {selectedData.date}
          </Text>
          <View style={styles.selectedStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{selectedData.minutes}</Text>
              <Text style={styles.statLabel}>minutes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{selectedData.minutes > 0 ? "1" : "0"}</Text>
              <Text style={styles.statLabel}>session(s)</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartContainer}
        scrollEventThrottle={16}
      >
        <View style={styles.chart}>
          {chartData.map((bar, idx) => (
            <TouchableOpacity
              key={bar.date}
              style={styles.barWrapper}
              onPress={() => setSelectedDate(bar.date)}
              accessible={true}
              accessibilityLabel={`${bar.dayName}: ${bar.minutes} minutes`}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: bar.height || 10,
                    backgroundColor:
                      selectedDate === bar.date
                        ? "#9D4EDD"
                        : bar.minutes === 0
                          ? "#E0E0E0"
                          : "#06D6A0",
                  },
                ]}
              />
              <Text
                style={[
                  styles.dayLabel,
                  selectedDate === bar.date && styles.dayLabelSelected,
                ]}
              >
                {bar.dayName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#06D6A0" }]} />
          <Text style={styles.legendLabel}>Reading Time</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#E0E0E0" }]} />
          <Text style={styles.legendLabel}>No Activity</Text>
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
  skeletonChart: {
    backgroundColor: "#F0F0F0",
    height: 220,
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  selectedDate: {
    fontSize: 12,
    color: "#808080",
    marginBottom: 8,
  },
  selectedStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  statLabel: {
    fontSize: 10,
    color: "#808080",
    marginTop: 2,
  },
  chartContainer: {
    paddingHorizontal: 4,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 200,
    paddingHorizontal: 4,
  },
  barWrapper: {
    alignItems: "center",
    marginHorizontal: 6,
  },
  bar: {
    width: BAR_WIDTH,
    minHeight: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 10,
    color: "#808080",
    fontWeight: "500",
  },
  dayLabelSelected: {
    color: "#9D4EDD",
    fontWeight: "700",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
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
  },
});
