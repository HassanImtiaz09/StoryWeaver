import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";

interface ShippingFormData {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  stateCode: string;
  countryCode: string;
  zip: string;
  phone?: string;
}

interface Props {
  initialData?: Partial<ShippingFormData>;
  onSubmit: (data: ShippingFormData) => void | Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ShippingAddressForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = "Save Address",
}: Props) {
  const colors = useColors();
  const [data, setData] = useState<ShippingFormData>({
    name: initialData?.name || "",
    address1: initialData?.address1 || "",
    address2: initialData?.address2 || "",
    city: initialData?.city || "",
    stateCode: initialData?.stateCode || "",
    countryCode: initialData?.countryCode || "US",
    zip: initialData?.zip || "",
    phone: initialData?.phone || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.name.trim()) newErrors.name = "Name is required";
    if (!data.address1.trim()) newErrors.address1 = "Address is required";
    if (!data.city.trim()) newErrors.city = "City is required";
    if (!data.stateCode.trim()) newErrors.stateCode = "State/Province is required";
    if (!data.zip.trim()) newErrors.zip = "ZIP/Postal code is required";
    if (!data.countryCode.trim()) newErrors.countryCode = "Country is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await onSubmit(data);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save address");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      {/* Full Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: errors.name ? "#e74c3c" : colors.border,
            },
          ]}
          placeholder="John Smith"
          placeholderTextColor={colors.textSecondary}
          value={data.name}
          onChangeText={(text) => {
            setData({ ...data, name: text });
            if (errors.name) setErrors({ ...errors, name: "" });
          }}
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}
      </View>

      {/* Address Line 1 */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Address Line 1 *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: errors.address1 ? "#e74c3c" : colors.border,
            },
          ]}
          placeholder="123 Main Street"
          placeholderTextColor={colors.textSecondary}
          value={data.address1}
          onChangeText={(text) => {
            setData({ ...data, address1: text });
            if (errors.address1) setErrors({ ...errors, address1: "" });
          }}
        />
        {errors.address1 && <Text style={styles.error}>{errors.address1}</Text>}
      </View>

      {/* Address Line 2 */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Address Line 2 (optional)</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Apt 4B"
          placeholderTextColor={colors.textSecondary}
          value={data.address2}
          onChangeText={(text) => setData({ ...data, address2: text })}
        />
      </View>

      {/* City */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>City *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: errors.city ? "#e74c3c" : colors.border,
            },
          ]}
          placeholder="New York"
          placeholderTextColor={colors.textSecondary}
          value={data.city}
          onChangeText={(text) => {
            setData({ ...data, city: text });
            if (errors.city) setErrors({ ...errors, city: "" });
          }}
        />
        {errors.city && <Text style={styles.error}>{errors.city}</Text>}
      </View>

      {/* State and ZIP - Row */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.label, { color: colors.text }]}>State/Province *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: errors.stateCode ? "#e74c3c" : colors.border,
              },
            ]}
            placeholder="NY"
            placeholderTextColor={colors.textSecondary}
            value={data.stateCode}
            onChangeText={(text) => {
              setData({ ...data, stateCode: text.toUpperCase() });
              if (errors.stateCode) setErrors({ ...errors, stateCode: "" });
            }}
            maxLength={3}
          />
          {errors.stateCode && <Text style={styles.error}>{errors.stateCode}</Text>}
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>ZIP Code *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: errors.zip ? "#e74c3c" : colors.border,
              },
            ]}
            placeholder="10001"
            placeholderTextColor={colors.textSecondary}
            value={data.zip}
            onChangeText={(text) => {
              setData({ ...data, zip: text });
              if (errors.zip) setErrors({ ...errors, zip: "" });
            }}
            keyboardType="number-pad"
          />
          {errors.zip && <Text style={styles.error}>{errors.zip}</Text>}
        </View>
      </View>

      {/* Country */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Country *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: errors.countryCode ? "#e74c3c" : colors.border,
            },
          ]}
          placeholder="US"
          placeholderTextColor={colors.textSecondary}
          value={data.countryCode}
          onChangeText={(text) => {
            setData({ ...data, countryCode: text.toUpperCase() });
            if (errors.countryCode) setErrors({ ...errors, countryCode: "" });
          }}
          maxLength={2}
        />
        {errors.countryCode && <Text style={styles.error}>{errors.countryCode}</Text>}
      </View>

      {/* Phone */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Phone (optional)</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="+1 (555) 123-4567"
          placeholderTextColor={colors.textSecondary}
          value={data.phone}
          onChangeText={(text) => setData({ ...data, phone: text })}
          keyboardType="phone-pad"
        />
      </View>

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={isLoading}
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.submitText}>
          {isLoading ? "Saving..." : submitLabel}
        </Text>
      </Pressable>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  error: {
    color: "#e74c3c",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
