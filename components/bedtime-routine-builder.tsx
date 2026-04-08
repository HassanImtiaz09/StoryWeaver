import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface BedtimeStep {
  type: "dim_lights" | "play_music" | "read_story" | "lights_off" | "ambient_sound" | "voice_command";
  duration: number;
  config: Record<string, any>;
}

interface BedtimeRoutineBuilderProps {
  initialSteps?: BedtimeStep[];
  onSave?: (steps: BedtimeStep[], scheduledTime: string) => void;
  routineName?: string;
  onNameChange?: (name: string) => void;
}

const STEP_TYPES = [
  { id: "dim_lights", label: "Dim Lights", emoji: "🌙", defaultDuration: 300 },
  { id: "ambient_sound", label: "Ambient Sound", emoji: "🎵", defaultDuration: 600 },
  { id: "play_music", label: "Play Music", emoji: "🎶", defaultDuration: 900 },
  { id: "read_story", label: "Read Story", emoji: "📚", defaultDuration: 1200 },
  { id: "lights_off", label: "Lights Off", emoji: "⏱️", defaultDuration: 60 },
];

export default function BedtimeRoutineBuilder({
  initialSteps = [],
  onSave,
  routineName = "Bedtime Routine",
  onNameChange,
}: BedtimeRoutineBuilderProps) {
  const { text, background, border, accent } = useColors();
  const [steps, setSteps] = useState<BedtimeStep[]>(initialSteps);
  const [scheduledTime, setScheduledTime] = useState("21:00");
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [currentName, setCurrentName] = useState(routineName);

  const addStep = (stepType: string) => {
    const stepTemplate = STEP_TYPES.find((s) => s.id === stepType);
    if (!stepTemplate) return;

    const newStep: BedtimeStep = {
      type: stepType as any,
      duration: stepTemplate.defaultDuration,
      config: {},
    };

    setSteps([...steps, newStep]);
    setShowAddStepModal(false);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStepDuration = (index: number, duration: number) => {
    const updated = [...steps];
    updated[index].duration = duration;
    setSteps(updated);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSteps.length) return;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSave = () => {
    if (steps.length === 0) {
      Alert.alert("Error", "Please add at least one step to the routine");
      return;
    }
    onSave?.(steps, scheduledTime);
    onNameChange?.(currentName);
  };

  const getTotalDuration = () => {
    return steps.reduce((sum, step) => sum + step.duration, 0);
  };

  const getStepLabel = (stepType: string) => {
    return STEP_TYPES.find((s) => s.id === stepType)?.label || stepType;
  };

  const getStepEmoji = (stepType: string) => {
    return STEP_TYPES.find((s) => s.id === stepType)?.emoji || "⚙️";
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <View className={`flex-1 rounded-lg border ${border} p-4`} style={{ backgroundColor: background }}>
      {/* Routine Name */}
      <View className="mb-4">
        <Text className={`text-xs font-semibold ${text} opacity-60 mb-2`}>Routine Name</Text>
        <TextInput
          value={currentName}
          onChangeText={setCurrentName}
          placeholder="Enter routine name"
          className={`border ${border} rounded-lg px-3 py-2 ${text}`}
          placeholderTextColor={text + "60"}
        />
      </View>

      {/* Scheduled Time */}
      <View className="mb-4">
        <Text className={`text-xs font-semibold ${text} opacity-60 mb-2`}>Scheduled Time</Text>
        <View className={`border ${border} rounded-lg px-3 py-2 flex-row items-center`}>
          <Text className={`text-lg mr-2`}>🕘</Text>
          <TextInput
            value={scheduledTime}
            onChangeText={setScheduledTime}
            placeholder="HH:MM"
            className={`flex-1 ${text}`}
            placeholderTextColor={text + "60"}
          />
        </View>
      </View>

      {/* Steps List */}
      <View className="mb-4">
        <Text className={`text-sm font-semibold ${text} mb-3`}>Routine Steps</Text>

        {steps.length === 0 ? (
          <View className={`border ${border} border-dashed rounded-lg p-4 items-center justify-center`}>
            <Text className={`text-sm ${text} opacity-60`}>No steps added yet</Text>
          </View>
        ) : (
          <ScrollView nestedScrollEnabled>
            {steps.map((step, index) => (
              <View
                key={index}
                className={`border ${border} rounded-lg p-3 mb-2 flex-row items-center justify-between`}
              >
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-lg mr-2">{getStepEmoji(step.type)}</Text>
                    <Text className={`text-sm font-semibold ${text}`}>{getStepLabel(step.type)}</Text>
                  </View>

                  <View className="flex-row items-center mt-2">
                    <Text className={`text-xs ${text} opacity-60 mr-2`}>Duration:</Text>
                    <TextInput
                      value={step.duration.toString()}
                      onChangeText={(val) => updateStepDuration(index, parseInt(val) || 0)}
                      placeholder="Seconds"
                      keyboardType="number-pad"
                      className={`border ${border} rounded px-2 py-1 ${text} flex-1 text-xs`}
                      placeholderTextColor={text + "60"}
                    />
                    <Text className={`text-xs ${text} opacity-60 ml-2`}>{formatDuration(step.duration)}</Text>
                  </View>
                </View>

                <View className="flex-row ml-2">
                  {index > 0 && (
                    <TouchableOpacity
                      onPress={() => moveStep(index, "up")}
                      className="px-2 py-2 rounded"
                      style={{ backgroundColor: accent + "15" }}
                    >
                      <Text className="text-lg">⬆️</Text>
                    </TouchableOpacity>
                  )}
                  {index < steps.length - 1 && (
                    <TouchableOpacity
                      onPress={() => moveStep(index, "down")}
                      className="px-2 py-2 rounded ml-1"
                      style={{ backgroundColor: accent + "15" }}
                    >
                      <Text className="text-lg">⬇️</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => removeStep(index)}
                    className="px-2 py-2 rounded ml-1"
                    style={{ backgroundColor: "#FF4444" + "20" }}
                  >
                    <Text className="text-lg">🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Total Duration */}
      <View className={`border ${border} rounded-lg p-3 mb-4 bg-opacity-50`} style={{ backgroundColor: accent + "10" }}>
        <View className="flex-row justify-between items-center">
          <Text className={`text-sm font-semibold ${text}`}>Total Duration</Text>
          <Text className="text-lg font-bold" style={{ color: accent }}>
            {formatDuration(getTotalDuration())}
          </Text>
        </View>
      </View>

      {/* Add Step Button */}
      <TouchableOpacity
        onPress={() => setShowAddStepModal(true)}
        className="w-full py-3 rounded-lg items-center mb-4"
        style={{ backgroundColor: accent + "30", borderColor: accent, borderWidth: 2 }}
      >
        <Text className="font-semibold" style={{ color: accent }}>
          + Add Step
        </Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        className="w-full py-3 rounded-lg items-center"
        style={{ backgroundColor: accent }}
      >
        <Text className="text-white font-semibold">Save Routine</Text>
      </TouchableOpacity>

      {/* Modal for selecting step type */}
      <Modal visible={showAddStepModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-2xl p-4`} style={{ backgroundColor: background }}>
            <Text className={`text-lg font-bold ${text} mb-4`}>Add Step</Text>

            <ScrollView>
              {STEP_TYPES.map((stepType) => (
                <TouchableOpacity
                  key={stepType.id}
                  onPress={() => addStep(stepType.id)}
                  className={`flex-row items-center border ${border} rounded-lg p-3 mb-2`}
                >
                  <Text className="text-2xl mr-3">{stepType.emoji}</Text>
                  <View className="flex-1">
                    <Text className={`text-base font-semibold ${text}`}>{stepType.label}</Text>
                    <Text className={`text-xs ${text} opacity-60`}>{formatDuration(stepType.defaultDuration)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowAddStepModal(false)}
              className="w-full py-3 rounded-lg items-center mt-4"
              style={{ backgroundColor: accent + "20" }}
            >
              <Text className="font-semibold" style={{ color: accent }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
