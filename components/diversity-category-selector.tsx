// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ListRenderItem,
} from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useColors } from "@/hooks/use-colors";
import type { DiversityCategory } from "@/server/_core/diversityService";

interface DiversityCategorySelectorProps {
  categories: DiversityCategory[];
  selectedIds: Record<string, string[]>;
  onChange: (categoryId: string, selectedIds: string[]) => void;
}

export default function DiversityCategorySelector({
  categories,
  selectedIds,
  onChange,
}: DiversityCategorySelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const colors = useColors();

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategory(
      expandedCategory === categoryId ? null : categoryId
    );
  };

  const toggleOption = (categoryId: string, optionId: string) => {
    const current = selectedIds[categoryId] || [];
    const updated = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    onChange(categoryId, updated);
  };

  const selectAll = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      onChange(
        categoryId,
        category.options.map((o) => o.id)
      );
    }
  };

  const clearAll = (categoryId: string) => {
    onChange(categoryId, []);
  };

  const renderOption: ListRenderItem<{
    id: string;
    label: string;
    description: string;
    icon?: string;
  }> = ({ item: option }) => {
    const categoryId =
      categories.find((c) => c.options.some((o) => o.id === option.id))?.id ||
      "";
    const isSelected =
      (selectedIds[categoryId] || []).includes(option.id) || false;

    return (
      <TouchableOpacity
        onPress={() => toggleOption(categoryId, option.id)}
        className="mb-3"
      >
        <View
          className={`flex-row items-center px-4 py-3 rounded-lg border-2 ${
            isSelected
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-200 bg-white"
          }`}
          style={{
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? `${colors.primary}15` : colors.surface,
          }}
        >
          <View
            className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
              isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
            }`}
            style={{
              backgroundColor: isSelected ? colors.primary : "transparent",
              borderColor: isSelected ? colors.primary : colors.border,
            }}
          >
            {isSelected && (
              <Text className="text-white font-bold text-xs">✓</Text>
            )}
          </View>

          <View className="flex-1">
            <Text
              className="font-semibold text-gray-900"
              style={{ color: colors.text }}
            >
              {option.label}
            </Text>
            <Text
              className="text-xs text-gray-600 mt-0.5"
              style={{ color: colors.textSecondary }}
            >
              {option.description}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {categories.map((category) => {
        const isExpanded = expandedCategory === category.id;
        const selectedCount = (selectedIds[category.id] || []).length;

        return (
          <View key={category.id} className="mb-4">
            <TouchableOpacity
              onPress={() => toggleCategoryExpanded(category.id)}
              className="px-4 py-4 rounded-lg flex-row items-center justify-between"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-1">
                <Text
                  className="text-lg font-bold text-gray-900"
                  style={{ color: colors.text }}
                >
                  {category.label}
                </Text>
                <Text
                  className="text-xs text-gray-600 mt-1"
                  style={{ color: colors.textSecondary }}
                >
                  {category.description}
                </Text>
                {selectedCount > 0 && (
                  <View className="mt-2 flex-row items-center gap-2">
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${colors.primary}20` }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.primary }}
                      >
                        {selectedCount} selected
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              {isExpanded ? (
                <ChevronUp size={20} color={colors.primary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {isExpanded && (
              <View className="px-4 py-3 bg-gray-50 mt-1 rounded-b-lg">
                <View className="flex-row gap-2 mb-3">
                  <TouchableOpacity
                    onPress={() => selectAll(category.id)}
                    className="flex-1 px-3 py-2 rounded-lg border border-indigo-500"
                    style={{ borderColor: colors.primary }}
                  >
                    <Text
                      className="text-center text-xs font-semibold text-indigo-600"
                      style={{ color: colors.primary }}
                    >
                      Select All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => clearAll(category.id)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300"
                  >
                    <Text className="text-center text-xs font-semibold text-gray-600">
                      Clear All
                    </Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  scrollEnabled={false}
                  data={category.options}
                  renderItem={renderOption}
                  keyExtractor={(item) => item.id}
                />
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
