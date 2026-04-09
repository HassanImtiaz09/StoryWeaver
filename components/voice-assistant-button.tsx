import React, { useState, useEffect } from "react";
import { View, Pressable, Text, ActivityIndicator } from "react-native";
import { useVoiceAssistantStore } from "@/lib/voice-assistant";
import Animated, { withSpring, withRepeat, withSequence } from "react-native-reanimated";
import { useSharedValue, useAnimatedStyle } from "react-native-reanimated";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface VoiceAssistantButtonProps {
  onTranscriptComplete: (transcript: string) => void;
  isSpeaking?: boolean;
  onInterruptSpeech?: () => void;
  enabled?: boolean;
}

export function VoiceAssistantButton({
  onTranscriptComplete,
  isSpeaking = false,
  onInterruptSpeech,
  enabled = true,
}: VoiceAssistantButtonProps) {
  const store = useVoiceAssistantStore();
  const [transcriptDisplay, setTranscriptDisplay] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  // Pulse animation for listening state
  const scale = useSharedValue(1);

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Start pulse animation when listening
  useEffect(() => {
    if (store.isListening) {
      scale.value = withRepeat(
        withSequence(
          withSpring(1.15, { damping: 10 }),
          withSpring(1, { damping: 10 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1, { damping: 10 });
    }
  }, [store.isListening, scale]);

  // Handle transcript updates
  useEffect(() => {
    if (store.transcript) {
      setTranscriptDisplay(store.transcript);
      setShowTranscript(true);

      const timer = setTimeout(() => {
        setShowTranscript(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [store.transcript]);

  // Handle button press
  const handlePress = async () => {
    if (!enabled || !store.voiceEnabled) {
      return;
    }

    // If speaking, interrupt the speech
    if (isSpeaking) {
      onInterruptSpeech?.();
      return;
    }

    if (store.isListening) {
      // Stop listening
      await store.stopListening();
      if (store.transcript) {
        onTranscriptComplete(store.transcript);
      }
      store.clearTranscript();
    } else {
      // Start listening
      // In a real implementation, this would trigger the speech recognition
      // For now, we'll just show the UI state
      await store.startListening();
    }
  };

  const getButtonColor = () => {
    if (!enabled || !store.voiceEnabled) return "#D1D5DB";
    if (isSpeaking) return "#6366F1"; // Indigo for speaking
    if (store.isProcessing) return "#F59E0B";
    if (store.isListening) return "#EF4444";
    return "#3B82F6";
  };

  const getIconName = () => {
    if (isSpeaking) return "speaker.wave.2";
    if (store.isProcessing) return "waveform.circle";
    if (store.isListening) return "mic.fill";
    return "mic";
  };

  return (
    <View className="absolute bottom-6 right-6 items-center gap-2">
      {/* Transcript display */}
      {showTranscript && (
        <View className="bg-white rounded-lg px-3 py-2 max-w-xs shadow-lg">
          <Text className="text-gray-800 text-sm text-center">
            {transcriptDisplay}
          </Text>
        </View>
      )}

      {/* Microphone button */}
      <Animated.View style={pulseAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          disabled={!enabled || !store.voiceEnabled || store.isProcessing}
          className="w-16 h-16 rounded-full items-center justify-center shadow-lg active:shadow-md"
          style={{
            backgroundColor: getButtonColor(),
            opacity: !enabled || !store.voiceEnabled ? 0.5 : 1,
          }}
        >
          {store.isProcessing ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <IconSymbol
              // @ts-expect-error - type assertion needed
              name={getIconName()}
              size={24}
              color="white"
              weight="semibold"
            />
          )}
        </Pressable>
      </Animated.View>

      {/* Status indicator text */}
      {isSpeaking && (
        <Text className="text-indigo-500 text-xs font-semibold">Speaking...</Text>
      )}
      {store.isListening && (
        <Text className="text-red-500 text-xs font-semibold">Listening...</Text>
      )}
      {store.isProcessing && (
        <Text className="text-amber-500 text-xs font-semibold">
          Processing...
        </Text>
      )}
    </View>
  );
}
