/**
 * Speech Recognition Module
 * Platform-aware wrapper for speech-to-text functionality
 * Supports Web Speech API and Expo modules
 */

import { Platform } from "react-native";

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface SpeechRecognitionError {
  code: string;
  message: string;
}

export interface SpeechRecognitionListener {
  onStart?: () => void;
  onResult: (result: SpeechRecognitionResult) => void;
  onError?: (error: SpeechRecognitionError) => void;
  onEnd?: () => void;
}

/**
 * Web Speech API implementation (for web platform)
 */
class WebSpeechRecognition implements SpeechRecognitionEngine {
  private recognition: any;
  private isListening = false;

  constructor() {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.setupListeners();
      }
    }
  }

  private setupListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  async startListening(
    language: string = "en-US",
    listener: SpeechRecognitionListener
  ): Promise<void> {
    if (!this.recognition) {
      listener.onError?.({
        code: "NOT_SUPPORTED",
        message: "Speech Recognition is not supported in this browser",
      });
      return;
    }

    this.recognition.language = language;
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      listener.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript || interimTranscript) {
        listener.onResult({
          transcript: finalTranscript || interimTranscript,
          isFinal: !!finalTranscript,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0.5,
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      listener.onError?.({
        code: event.error,
        message: `Speech recognition error: ${event.error}`,
      });
    };

    this.recognition.onend = () => {
      listener.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      listener.onError?.({
        code: "START_ERROR",
        message: "Failed to start speech recognition",
      });
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  abort(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }
}

/**
 * Native/Expo implementation placeholder
 * This would be implemented using expo-speech or react-native-voice
 */
class NativeSpeechRecognition implements SpeechRecognitionEngine {
  private isListening = false;

  async startListening(
    language: string = "en-US",
    listener: SpeechRecognitionListener
  ): Promise<void> {
    // TODO: Implement native speech recognition
    // Options:
    // 1. Use expo-speech (primarily TTS, but can be extended)
    // 2. Use react-native-voice (if added to dependencies)
    // 3. Use native modules via expo-modules
    // 4. Use platform-specific APIs (iOS: Speech, Android: SpeechRecognizer)

    console.warn(
      "Native speech recognition not yet implemented. Please add expo-speech or react-native-voice integration."
    );

    listener.onError?.({
      code: "NOT_IMPLEMENTED",
      message: "Native speech recognition not yet implemented",
    });
  }

  stopListening(): void {
    this.isListening = false;
  }

  abort(): void {
    this.isListening = false;
  }

  isSupported(): boolean {
    return false; // Until implemented
  }
}

/**
 * Speech recognition engine interface
 */
interface SpeechRecognitionEngine {
  startListening(
    language: string,
    listener: SpeechRecognitionListener
  ): Promise<void>;
  stopListening(): void;
  abort(): void;
  isSupported(): boolean;
}

/**
 * Factory to get the appropriate speech recognition engine
 */
let engine: SpeechRecognitionEngine | null = null;

export function getSpeechRecognitionEngine(): SpeechRecognitionEngine {
  if (!engine) {
    if (Platform.OS === "web") {
      engine = new WebSpeechRecognition();
    } else {
      engine = new NativeSpeechRecognition();
    }
  }
  return engine;
}

/**
 * Main speech recognition manager
 */
export class SpeechRecognitionManager {
  private engine: SpeechRecognitionEngine;
  private currentListener: SpeechRecognitionListener | null = null;

  constructor() {
    this.engine = getSpeechRecognitionEngine();
  }

  async start(
    language: string = "en-US",
    listener: SpeechRecognitionListener
  ): Promise<void> {
    this.currentListener = listener;
    await this.engine.startListening(language, listener);
  }

  stop(): void {
    this.engine.stopListening();
  }

  abort(): void {
    this.engine.abort();
  }

  isListening(): boolean {
    return this.currentListener !== null;
  }

  isSupported(): boolean {
    return this.engine.isSupported();
  }
}

/**
 * Create a singleton instance
 */
let managerInstance: SpeechRecognitionManager | null = null;

export function getSpeechRecognitionManager(): SpeechRecognitionManager {
  if (!managerInstance) {
    managerInstance = new SpeechRecognitionManager();
  }
  return managerInstance;
}
