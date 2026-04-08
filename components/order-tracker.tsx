import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface Status {
  key: "ordered" | "in_production" | "shipped" | "delivered";
  label: string;
  icon: string;
  timestamp?: Date;
}

interface Props {
  currentStatus: string;
  statuses?: Status[];
}

export function OrderTracker({ currentStatus, statuses }: Props) {
  const colors = useColors();

  const defaultStatuses: Status[] = statuses || [
    { key: "ordered", label: "Order Placed", icon: "📦" },
    { key: "in_production", label: "In Production", icon: "🏭" },
    { key: "shipped", label: "Shipped", icon: "🚚" },
    { key: "delivered", label: "Delivered", icon: "✅" },
  ];

  const statusOrder = ["ordered", "in_production", "shipped", "delivered"];
  const currentIndex = statusOrder.indexOf(currentStatus as any);

  return (
    <View style={styles.root}>
      <View style={styles.timelineContainer}>
        {defaultStatuses.map((status, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <View key={status.key} style={styles.statusItem}>
              {/* Timeline dot */}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isCompleted ? colors.primary : colors.muted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.dotIcon}>{status.icon}</Text>
              </View>

              {/* Timeline line (except for last item) */}
              {index < defaultStatuses.length - 1 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: isCompleted ? colors.primary : colors.border,
                    },
                  ]}
                />
              )}

              {/* Status label */}
              <View style={styles.labelContainer}>
                <Text
                  style={[
                    styles.label,
                    {
                      color: isCurrent ? colors.primary : colors.text,
                      fontWeight: isCurrent ? "700" : "600",
                    },
                  ]}
                >
                  {status.label}
                </Text>
                {status.timestamp && (
                  <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                    {status.timestamp.toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  timelineContainer: {
    paddingLeft: 12,
  },
  statusItem: {
    marginBottom: 24,
    position: "relative",
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    left: -30,
    top: 0,
  },
  dotIcon: {
    fontSize: 24,
  },
  line: {
    width: 2,
    height: 64,
    position: "absolute",
    left: 3,
    top: 48,
  },
  labelContainer: {
    paddingLeft: 20,
    paddingTop: 4,
  },
  label: {
    fontSize: 15,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
});
