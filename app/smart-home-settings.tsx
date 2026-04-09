import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput } from "react-native";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import SmartHomeDeviceCard from "@/components/smart-home-device-card";
import MoodLightingPreview from "@/components/mood-lighting-preview";
import AmbientSoundPicker from "@/components/ambient-sound-picker";
import BedtimeRoutineBuilder from "@/components/bedtime-routine-builder";
import { useSmartHomeStore, SmartHomeDevice, BedtimeRoutine, BedtimeStep } from "@/lib/smart-home-store";
import { trpc } from "@/lib/trpc";

export default function SmartHomeSettings() {
  const { text, background, border, accent } = useColors();
  const {
    connectedDevices,
    bedtimeRoutines,
    isSmartHomeEnabled,
    ambientSoundEnabled,
    moodLightingEnabled,
    setConnectedDevices,
    setSmartHomeEnabled,
    setBedtimeRoutines,
    addBedtimeRoutine,
  } = useSmartHomeStore();

  const [activeTab, setActiveTab] = useState<
    "devices" | "mood_lighting" | "ambient_sounds" | "bedtime_routines"
  >("devices");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDevicePlatform, setNewDevicePlatform] = useState<
    "philips_hue" | "alexa" | "google_home" | "other"
  >("philips_hue");
  const [showBedtimeBuilder, setShowBedtimeBuilder] = useState(false);

  // tRPC queries and mutations
  const getConfigQuery = trpc.smartHome.getConfig.useQuery();
  const updateConfigMutation = trpc.smartHome.updateConfig.useMutation();
  const disconnectDeviceMutation = trpc.smartHome.disconnectDevice.useMutation();
  const enableDeviceMutation = trpc.smartHome.enableDevice.useMutation();
  const getBedtimeRoutinesQuery = trpc.smartHome.getBedtimeRoutines.useQuery();
  const createBedtimeRoutineMutation = trpc.smartHome.createBedtimeRoutine.useMutation();
  const triggerLightingMutation = trpc.smartHome.triggerLighting.useMutation();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (getConfigQuery.data) {
          setConnectedDevices(getConfigQuery.data.devices);
        }
        if (getBedtimeRoutinesQuery.data) {
          setBedtimeRoutines(getBedtimeRoutinesQuery.data);
        }
      } catch (error) {
        console.error("Error loading smart home data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getConfigQuery.data, getBedtimeRoutinesQuery.data]);

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) {
      Alert.alert("Error", "Please enter a device name");
      return;
    }

    try {
      await updateConfigMutation.mutateAsync({
        platform: newDevicePlatform,
        deviceName: newDeviceName,
        deviceId: `${newDevicePlatform}-${Date.now()}`,
      });

      Alert.alert("Success", "Device added successfully");
      setNewDeviceName("");
      setShowAddDeviceModal(false);
      getConfigQuery.refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to add device");
      console.error(error);
    }
  };

  const handleToggleDevice = async (deviceId: string, isCurrentlyEnabled: boolean) => {
    try {
      if (isCurrentlyEnabled) {
        await disconnectDeviceMutation.mutateAsync({ deviceId });
      } else {
        await enableDeviceMutation.mutateAsync({ deviceId });
      }
      getConfigQuery.refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to update device");
      console.error(error);
    }
  };

  const handleRemoveDevice = (deviceId: string, deviceName: string) => {
    Alert.alert("Remove Device", `Are you sure you want to disconnect "${deviceName}"?`, [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Disconnect",
        onPress: async () => {
          try {
            await disconnectDeviceMutation.mutateAsync({ deviceId });
            getConfigQuery.refetch();
          } catch (error) {
            Alert.alert("Error", "Failed to remove device");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleTestLights = async (mood: string) => {
    try {
      await triggerLightingMutation.mutateAsync({
        scene: mood,
        brightness: 75,
      });
      Alert.alert("Success", "Lights activated!");
    } catch (error) {
      Alert.alert("Error", "Failed to trigger lights");
      console.error(error);
    }
  };

  const handleCreateBedtimeRoutine = async (
    steps: BedtimeStep[],
    scheduledTime: string,
    routineName: string
  ) => {
    try {
      await createBedtimeRoutineMutation.mutateAsync({
        name: routineName,
        steps,
        scheduledTime,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      });

      Alert.alert("Success", "Bedtime routine created!");
      setShowBedtimeBuilder(false);
      getBedtimeRoutinesQuery.refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to create routine");
      console.error(error);
    }
  };

  const tabs = [
    { id: "devices", label: "Devices", emoji: "🔌" },
    { id: "mood_lighting", label: "Mood Lighting", emoji: "💡" },
    { id: "ambient_sounds", label: "Sounds", emoji: "🎵" },
    { id: "bedtime_routines", label: "Bedtime", emoji: "🛌" },
  ];

  if (isLoading) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerTitle: "Smart Home" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accent} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ headerTitle: "Smart Home Settings" }} />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Smart Home Toggle */}
        <View className={`rounded-lg border ${border} p-4 mb-4`} style={{ backgroundColor: background }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className={`text-lg font-bold ${text}`}>Smart Home</Text>
              <Text className={`text-xs ${text} opacity-60 mt-1`}>
                {isSmartHomeEnabled ? "Active" : "Inactive"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSmartHomeEnabled(!isSmartHomeEnabled)}
              className={`w-12 h-12 rounded-full items-center justify-center`}
              style={{
                backgroundColor: isSmartHomeEnabled ? accent : accent + "30",
              }}
            >
              <Text className="text-xl">{isSmartHomeEnabled ? "✓" : "✗"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isSmartHomeEnabled && (
          <View className={`rounded-lg border ${border} p-4 mb-4`} style={{ backgroundColor: accent + "15" }}>
            <Text className={`text-sm ${text}`}>
              Smart home features are disabled. Enable them to connect devices and create automations.
            </Text>
          </View>
        )}

        {/* Tab Navigation */}
        <View className="flex-row mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg mr-2 flex-row items-center border ${
                activeTab === tab.id ? "border-transparent" : border
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? accent : "transparent",
              }}
            >
              <Text className="text-lg mr-1">{tab.emoji}</Text>
              <Text
                className={`text-xs font-semibold ${activeTab === tab.id ? "text-white" : text}`}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}

        {/* Devices Tab */}
        {activeTab === "devices" && (
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-base font-bold ${text}`}>Connected Devices</Text>
              <Text className={`text-sm ${text} opacity-60`}>
                {connectedDevices.length} device{connectedDevices.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {connectedDevices.length === 0 ? (
              <View className={`rounded-lg border ${border} border-dashed p-6 items-center justify-center mb-4`}>
                <Text className="text-3xl mb-2">📱</Text>
                <Text className={`text-sm font-semibold ${text} mb-1`}>No devices connected</Text>
                <Text className={`text-xs ${text} opacity-60 text-center`}>
                  Connect your smart home devices to get started
                </Text>
              </View>
            ) : (
              connectedDevices.map((device) => (
                <SmartHomeDeviceCard
                  key={device.deviceId}
                  deviceName={device.deviceName}
                  platform={device.platform}
                  isEnabled={device.isEnabled}
                  isConnected={true}
                  onToggle={(enabled) => handleToggleDevice(device.deviceId, device.isEnabled)}
                  onConfigure={() => handleRemoveDevice(device.deviceId, device.deviceName)}
                />
              ))
            )}

            <TouchableOpacity
              onPress={() => setShowAddDeviceModal(true)}
              className="w-full py-3 rounded-lg items-center"
              style={{ backgroundColor: accent }}
            >
              <Text className="text-white font-semibold">+ Add Device</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mood Lighting Tab */}
        {activeTab === "mood_lighting" && (
          <View>
            <Text className={`text-base font-bold ${text} mb-4`}>Customize Lighting</Text>
            <MoodLightingPreview
              currentMood="calm"
              onTestLights={() => handleTestLights("calm")}
            />
            <Text className={`text-xs ${text} opacity-60 text-center mt-4`}>
              Lights will change color based on the story's mood during reading
            </Text>
          </View>
        )}

        {/* Ambient Sounds Tab */}
        {activeTab === "ambient_sounds" && (
          <View>
            <Text className={`text-base font-bold ${text} mb-4`}>Ambient Sounds</Text>
            <AmbientSoundPicker />
            <Text className={`text-xs ${text} opacity-60 text-center mt-4`}>
              Background sounds play quietly while your child reads
            </Text>
          </View>
        )}

        {/* Bedtime Routines Tab */}
        {activeTab === "bedtime_routines" && (
          <View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-base font-bold ${text}`}>Bedtime Routines</Text>
              <Text className={`text-sm ${text} opacity-60`}>
                {bedtimeRoutines.length} routine{bedtimeRoutines.length !== 1 ? "s" : ""}
              </Text>
            </View>

            {bedtimeRoutines.length === 0 ? (
              <View className={`rounded-lg border ${border} border-dashed p-6 items-center justify-center mb-4`}>
                <Text className="text-3xl mb-2">🛌</Text>
                <Text className={`text-sm font-semibold ${text} mb-1`}>No routines created</Text>
                <Text className={`text-xs ${text} opacity-60 text-center`}>
                  Create a bedtime routine to automate your child's nighttime
                </Text>
              </View>
            ) : (
              bedtimeRoutines.map((routine) => (
                <View key={routine.id} className={`rounded-lg border ${border} p-4 mb-3`}>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className={`text-sm font-bold ${text}`}>{routine.name}</Text>
                    <View
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: accent + "20" }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: accent }}>
                        {routine.scheduledTime}
                      </Text>
                    </View>
                  </View>
                  <Text className={`text-xs ${text} opacity-60`}>
                    {routine.steps.length} steps • {routine.daysOfWeek.length} days/week
                  </Text>
                </View>
              ))
            )}

            <TouchableOpacity
              onPress={() => setShowBedtimeBuilder(true)}
              className="w-full py-3 rounded-lg items-center"
              style={{ backgroundColor: accent }}
            >
              <Text className="text-white font-semibold">+ Create Routine</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Device Modal */}
      <Modal visible={showAddDeviceModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-2xl p-4`} style={{ backgroundColor: background }}>
            <Text className={`text-lg font-bold ${text} mb-4`}>Add Smart Device</Text>

            <View className="mb-4">
              <Text className={`text-sm font-semibold ${text} mb-2`}>Device Name</Text>
              <TextInput
                value={newDeviceName}
                onChangeText={setNewDeviceName}
                placeholder="e.g., Living Room Light"
                className={`border ${border} rounded-lg px-3 py-2 ${text}`}
                placeholderTextColor={text + "60"}
              />
            </View>

            <View className="mb-6">
              <Text className={`text-sm font-semibold ${text} mb-2`}>Platform</Text>
              <View className="flex-row flex-wrap">
                {(["philips_hue", "alexa", "google_home", "other"] as const).map((platform) => (
                  <TouchableOpacity
                    key={platform}
                    onPress={() => setNewDevicePlatform(platform)}
                    className={`flex-1 mr-2 mb-2 py-2 rounded-lg border ${
                      newDevicePlatform === platform ? "border-transparent" : border
                    }`}
                    style={{
                      backgroundColor: newDevicePlatform === platform ? accent : "transparent",
                    }}
                  >
                    <Text
                      className={`text-xs font-semibold text-center ${
                        newDevicePlatform === platform ? "text-white" : text
                      }`}
                    >
                      {platform === "philips_hue" ? "Hue" : platform === "google_home" ? "Google" : platform}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowAddDeviceModal(false)}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: accent + "20" }}
              >
                <Text className="font-semibold" style={{ color: accent }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddDevice}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: accent }}
              >
                <Text className="text-white font-semibold">Add Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bedtime Routine Builder Modal */}
      <Modal visible={showBedtimeBuilder} transparent animationType="slide">
        <View className="flex-1 bg-black/50" style={{ paddingTop: 40 }}>
          <View className="flex-1" style={{ backgroundColor: background }}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: border }}>
              <Text className={`text-lg font-bold ${text}`}>Create Bedtime Routine</Text>
              <TouchableOpacity onPress={() => setShowBedtimeBuilder(false)}>
                <Text className="text-2xl">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
              <BedtimeRoutineBuilder
                onSave={(steps, scheduledTime) =>
                  handleCreateBedtimeRoutine(steps, scheduledTime, "New Bedtime Routine")
                }
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
