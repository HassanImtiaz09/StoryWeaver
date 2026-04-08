import { useCallback, useState, useEffect } from "react";
import { useVoiceAssistantStore, parseVoiceCommand, type VoiceCommand } from "@/lib/voice-assistant";
import { trpc } from "@/app/_layout";
import { getSettings } from "@/lib/settings-store";

export interface UseVoiceAssistantOptions {
  episodeId: number;
  pageNumber: number;
  childId: number;
  storyContext: {
    title: string;
    currentPageText: string;
    previousPages?: string[];
    characters: string[];
    setting: string;
  };
  childProfile: {
    name: string;
    age: number;
    interests?: string[];
    fears?: string[];
  };
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions) {
  const store = useVoiceAssistantStore();
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getSettings>> | null>(null);
  const voiceCommandMutation = trpc.voice.processCommand.useMutation();

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const loaded = await getSettings();
      setSettings(loaded);
    };
    loadSettings();
  }, []);

  // Handle transcript completion
  const handleTranscriptComplete = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        return;
      }

      store.setProcessing(true);

      // Parse the command to get category and intent
      const parsed = parseVoiceCommand(transcript);

      // Record the command in history
      const command: VoiceCommand = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        transcript,
        category: parsed.category,
        intent: parsed.intent,
        confidence: parsed.confidence,
      };
      store.recordCommand(command);

      // Send to server for processing
      try {
        const result = await voiceCommandMutation.mutateAsync({
          command: transcript,
          episodeId: options.episodeId,
          pageNumber: options.pageNumber,
          childId: options.childId,
          storyContext: options.storyContext,
          childProfile: options.childProfile,
        });

        store.setProcessing(false);
        store.clearTranscript();

        return result;
      } catch (error) {
        console.error("Voice command error:", error);
        store.setProcessing(false);
        return {
          type: "error" as const,
          content: "Sorry, something went wrong. Try again!",
          approved: false,
        };
      }
    },
    [options, store, voiceCommandMutation]
  );

  const startListening = useCallback(async () => {
    // Check if voice assistant is enabled
    if (!settings?.voiceAssistantEnabled) {
      return;
    }

    // In a real implementation, this would trigger the speech recognition API
    // For now, we'll just update the UI state
    await store.startListening();

    // Simulate speech recognition for demo purposes
    // In production, you'd integrate with:
    // - Web Speech API on web
    // - expo-speech or react-native-voice on mobile
    // - Platform-specific speech recognition
  }, [store, settings]);

  const stopListening = useCallback(async () => {
    await store.stopListening();
  }, [store]);

  const resetVoiceState = useCallback(() => {
    store.clearTranscript();
    store.clearError();
  }, [store]);

  const isEnabled = settings?.voiceAssistantEnabled ?? true;
  const showHints = settings?.voiceCommandHints ?? true;

  return {
    // State
    isListening: store.isListening,
    isProcessing: store.isProcessing,
    transcript: store.transcript,
    lastCommand: store.lastCommand,
    error: store.error,
    isVoiceEnabled: isEnabled,
    showCommandHints: showHints,

    // Actions
    startListening,
    stopListening,
    handleTranscriptComplete,
    resetVoiceState,
    setTranscript: (text: string) => store.setTranscript(text),
  };
}
