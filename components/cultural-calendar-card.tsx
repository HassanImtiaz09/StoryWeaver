import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
} from "react-native";
import { BookOpen, Calendar } from "lucide-react-native";
import { useColors } from "@/hooks/use-colors";
import type { CulturalEvent } from "@/server/_core/diversityService";

interface CulturalCalendarCardProps {
  events: CulturalEvent[];
  onGenerateStory?: (event: CulturalEvent) => void;
}

const getMonthName = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
};

const renderEventCard: ListRenderItem<CulturalEvent> = ({ item: event }) => {
  const colors = useColors();

  return (
    <View
      className="mx-4 mb-4 p-4 rounded-xl border-l-4"
      style={{
        backgroundColor: colors.surface,
        borderLeftColor: colors.primary,
      }}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-2xl">{event.icon || "🎉"}</Text>
            <Text
              className="font-bold text-lg flex-1"
              style={{ color: colors.text }}
            >
              {event.name}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 mb-2">
            <Calendar size={14} color={colors.textSecondary} />
            <Text
              className="text-xs text-gray-600"
              style={{ color: colors.textSecondary }}
            >
              {getMonthName(event.date)}
            </Text>
          </View>
        </View>
      </View>

      <Text
        className="text-sm text-gray-700 mb-3 leading-relaxed"
        style={{ color: colors.text }}
      >
        {event.description}
      </Text>

      {event.cultures.length > 0 && (
        <View className="mb-3">
          <Text
            className="text-xs font-semibold text-gray-600 mb-1"
            style={{ color: colors.textSecondary }}
          >
            Cultures & Traditions:
          </Text>
          <View className="flex-row flex-wrap gap-1">
            {event.cultures.map((culture, idx) => (
              <View
                key={idx}
                className="px-2 py-1 rounded-full"
                style={{
                  backgroundColor: `${colors.primary}20`,
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: colors.primary }}
                >
                  {culture}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {event.storyIdeas.length > 0 && (
        <View className="mb-3">
          <Text
            className="text-xs font-semibold text-gray-600 mb-1"
            style={{ color: colors.textSecondary }}
          >
            Story Ideas:
          </Text>
          <View className="gap-1">
            {event.storyIdeas.map((idea, idx) => (
              <Text
                key={idx}
                className="text-xs text-gray-700"
                style={{ color: colors.text }}
              >
                • {idea}
              </Text>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={() => {}}
        className="px-4 py-2 rounded-lg flex-row items-center justify-center gap-2"
        style={{ backgroundColor: colors.primary }}
      >
        <BookOpen size={16} color="white" />
        <Text className="text-white font-semibold text-sm">
          Generate Story
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function CulturalCalendarCard({
  events,
  onGenerateStory,
}: CulturalCalendarCardProps) {
  const colors = useColors();

  return (
    <View className="mb-4">
      <View className="px-4 py-3 mb-2">
        <Text
          className="text-lg font-bold text-gray-900"
          style={{ color: colors.text }}
        >
          Cultural Calendar
        </Text>
        <Text
          className="text-xs text-gray-600 mt-1"
          style={{ color: colors.textSecondary }}
        >
          Upcoming celebrations and traditions
        </Text>
      </View>

      <FlatList
        scrollEnabled={false}
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
      />

      {events.length === 0 && (
        <View className="px-4 py-6 items-center">
          <Text
            className="text-gray-600 text-sm"
            style={{ color: colors.textSecondary }}
          >
            No upcoming cultural events
          </Text>
        </View>
      )}
    </View>
  );
}
