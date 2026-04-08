import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface BookFormatOption {
  id: string;
  label: string;
  description: string;
  basePrice: number;
  perPagePrice: number;
}

interface Props {
  formats: BookFormatOption[];
  selectedId?: string;
  onSelect: (formatId: string) => void;
}

export function BookFormatSelector({ formats, selectedId, onSelect }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      scrollEventThrottle={16}
    >
      {formats.map((fmt) => (
        <Pressable
          key={fmt.id}
          onPress={() => onSelect(fmt.id)}
          style={[
            styles.card,
            {
              backgroundColor: selectedId === fmt.id ? colors.primary + "15" : colors.card,
              borderColor: selectedId === fmt.id ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>{fmt.label}</Text>
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{fmt.description}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>
            From ${fmt.basePrice.toFixed(2)}
          </Text>
          {selectedId === fmt.id && (
            <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  card: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  checkmarkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
