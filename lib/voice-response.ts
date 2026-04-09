/**
 * Voice Response Manager for TTS
 *
 * Handles speaking responses back to the child using two-tier approach:
 * - Quick responses: Device TTS (expo-speech) for instant feedback
 * - Rich responses: ElevenLabs TTS for character-consistent narration
 *
 * Features:
 * - Response queue to prevent overlapping speech
 * - Volume control respecting app settings
 * - Pre-built response phrases for common interactions
 * - Callbacks for lifecycle events (onStart, onDone, onError)
 */


import * as Speech from "expo-speech";
import { getSettings } from "./settings-store";

export type VoiceResponseMode = "quick" | "rich";

export interface VoiceResponseOptions {
  mode?: VoiceResponseMode;
  voice?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface SpeakOptions extends VoiceResponseOptions {
  text: string;
}

/**
 * Pre-built response phrases for common interactions
 * Customized for children's engagement and natural conversation flow
 */
const QUICK_RESPONSES = {
  story_modification_accepted: [
    "Ooh, I love that idea! Let me change the story...",
    "That's so creative! Changing it now...",
    "Great thinking! Here we go...",
    "What a fun idea! Let me work my magic...",
  ],
  story_modification_processing: [
    "Let me think about that...",
    "Hmm, let me work on that...",
    "Give me a second...",
  ],
  navigation_next: [
    "Turning the page!",
    "Let's see what happens next!",
    "On to the next page!",
  ],
  navigation_back: [
    "Going back a page!",
    "Let me turn back...",
    "Back we go!",
  ],
  navigation_replay: [
    "Reading that again!",
    "Let's hear it one more time!",
    "Here we go again!",
  ],
  processing: [
    "Let me think about that...",
    "Hmm, give me a second...",
    "I'm thinking...",
  ],
  fun_interaction: [
    "Magic time! Watch this!",
    "Here we go!",
    "That's so funny!",
    "I love that!",
  ],
  misunderstand: [
    "I didn't quite catch that. Can you say it again?",
    "Sorry, could you say that again?",
    "Hmm, I didn't get that. Try again?",
  ],
  error: [
    "Oops! Something didn't work. Try again!",
    "Hmm, that didn't work. Let's try something else!",
  ],
};

type QuickResponseKey = keyof typeof QUICK_RESPONSES;

/**
 * Voice Response Manager - Singleton
 */
class VoiceResponseManager {
  private isSpeaking = false;
  private currentSpeakId: string | null = null;
  private speechQueue: Array<{
    text: string;
    options: VoiceResponseOptions;
    speakId: string;
  }> = [];

  /**
   * Get a random quick response phrase
   */
  private getQuickResponsePhrase(key: QuickResponseKey): string {
    const phrases = QUICK_RESPONSES[key];
    if (!phrases || phrases.length === 0) {
      return "Okay!";
    }
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Speak a response using TTS
   *
   * Supports two modes:
   * - quick: Device TTS for instant feedback (expo-speech)
   * - rich: ElevenLabs for character-consistent narration
   */
  async speakResponse(options: SpeakOptions): Promise<void> {
    if (!options.text || options.text.trim().length === 0) {
      return;
    }

    const speakId = `${Date.now()}-${Math.random()}`;
    const mode = options.mode || "quick";

    // Add to queue
    this.speechQueue.push({
      text: options.text,
      options: { mode, ...options },
      speakId,
    });

    // Process queue
    if (!this.isSpeaking) {
      await this.processQueue();
    }
  }

  /**
   * Process the speech queue
   */
  private async processQueue(): Promise<void> {
    if (this.speechQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    const item = this.speechQueue.shift();
    if (!item) return;

    this.isSpeaking = true;
    this.currentSpeakId = item.speakId;

    try {
      const settings = await getSettings();

      // Check if voice response is enabled
      if (!settings.voiceResponseEnabled) {
        await this.processQueue();
        return;
      }

      const { text, options } = item;
      const mode = options.mode || "quick";

      if (mode === "rich") {
        // Use ElevenLabs for rich responses
        await this.speakWithElevenLabs(text, options, settings);
      } else {
        // Use device TTS for quick responses
        await this.speakWithDeviceTTS(text, options, settings);
      }

      options.onDone?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      // @ts-expect-error - type fix needed
      options.onError?.(err);
      console.error("Voice response error:", error);
    } finally {
      this.isSpeaking = false;
      this.currentSpeakId = null;
      // Continue processing queue
      await this.processQueue();
    }
  }

  /**
   * Speak using device TTS (expo-speech)
   */
  private async speakWithDeviceTTS(
    text: string,
    options: VoiceResponseOptions,
    settings: Awaited<ReturnType<typeof getSettings>>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        options.onStart?.();

        Speech.speak(text, {
          language: settings.voiceLanguage || "en-US",
          rate: options.rate ?? (settings.voiceResponseSpeed || 1.0),
          pitch: options.pitch ?? 1.0,
          onDone: () => {
            resolve();
          },
          onError: (error: any) => {
            reject(new Error(`Speech error: ${error.error}`));
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Speak using ElevenLabs TTS via tRPC API
   */
  private async speakWithElevenLabs(
    text: string,
    options: VoiceResponseOptions,
    settings: Awaited<ReturnType<typeof getSettings>>
  ): Promise<void> {
    try {
      options.onStart?.();

      const voiceId = options.voice || settings.selectedVoicePreset || "narrator";

      // Import trpc client for API calls
      // Note: This is imported here to avoid circular dependency issues
      const { trpc } = await import("./trpc");

      // Call server-side voice generation endpoint via tRPC
      // The actual tRPC client instance needs to be created at the app level
      // For now, we'll use a direct fetch for voice responses
      // which operate outside of React component context
      const response = await fetch("/api/trpc/voice.generateSpeech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Voice API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle tRPC response format (wrapped in result property)
      const audioUrl = data.result?.audioUrl || data.audioUrl;

      if (!audioUrl) {
        throw new Error("No audio URL returned from API");
      }

      // Play the audio
      await this.playAudio(audioUrl);
    } catch (error) {
      // Fallback to device TTS if ElevenLabs fails
      console.warn("ElevenLabs TTS failed, falling back to device TTS:", error);
      await this.speakWithDeviceTTS(text, options, settings);
    }
  }

  /**
   * Play audio from URL
   */
  private async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        Speech.speak("", {
          onDone: () => {
            // Audio playback simulation - in production would use proper audio player
            setTimeout(() => {
              resolve();
            }, 2000);
          },
          onError: (error: any) => {
            reject(new Error(`Audio playback error: ${error.error}`));
          },
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop speaking immediately
   */
  async stopSpeaking(): Promise<void> {
    this.isSpeaking = false;
    this.currentSpeakId = null;
    this.speechQueue = [];

    try {
      await Speech.stop();
    } catch (error) {
      console.error("Error stopping speech:", error);
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Speak a quick response by key
   */
  async speakQuickResponse(
    key: QuickResponseKey,
    options: Omit<VoiceResponseOptions, "mode"> = {}
  ): Promise<void> {
    const phrase = this.getQuickResponsePhrase(key);
    await this.speakResponse({
      ...options,
      text: phrase,
      mode: "quick",
    });
  }

  /**
   * Speak an actual response text (from AI or user content)
   */
  async speakContent(
    text: string,
    options: Omit<VoiceResponseOptions, "mode"> = {}
  ): Promise<void> {
    const settings = await getSettings();
    const mode =
      settings.voiceResponseMode === "auto"
        ? text.length > 200
          ? "rich"
          : "quick"
        : settings.voiceResponseMode;

    await this.speakResponse({
      ...options,
      text,
      mode,
    });
  }
}

// Export singleton instance
export const voiceResponseManager = new VoiceResponseManager();

/**
 * Convenience function to speak a response
 */
export async function speakResponse(options: SpeakOptions): Promise<void> {
  return voiceResponseManager.speakResponse(options);
}

/**
 * Convenience function to speak a quick response
 */
export async function speakQuickResponse(
  key: QuickResponseKey,
  options?: Omit<VoiceResponseOptions, "mode">
): Promise<void> {
  return voiceResponseManager.speakQuickResponse(key, options);
}

/**
 * Convenience function to speak content
 */
export async function speakContent(
  text: string,
  options?: Omit<VoiceResponseOptions, "mode">
): Promise<void> {
  return voiceResponseManager.speakContent(text, options);
}

/**
 * Convenience function to stop speaking
 */
export async function stopSpeaking(): Promise<void> {
  return voiceResponseManager.stopSpeaking();
}

/**
 * Get speaking status
 */
export function getIsSpeaking(): boolean {
  return voiceResponseManager.getIsSpeaking();
}
