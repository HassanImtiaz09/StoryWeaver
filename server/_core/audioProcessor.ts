/**
 * Audio Processing Service for StoryWeaver
 *
 * Handles narration generation, concatenation, tempo adjustment, and metadata.
 * Integrates with ElevenLabs for TTS and supports parent voice recordings.
 *
 * Features:
 * - Multi-voice narration support
 * - Audio concatenation for continuous playback
 * - Tempo adjustment for reading pacing
 * - Silence padding for visual synchronization
 * - Duration estimation for progress tracking
 */

import { generatePageAudio, generateEpisodeAudio, VOICE_PRESETS } from "./elevenlabs";

export interface AudioMetadata {
  duration: number;
  format: string;
  sampleRate: number;
  bitrate: number;
  channels: number;
  url: string;
}

export interface AudioOptions {
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export interface ConcatenationOptions {
  silenceBetweenMs?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
}

/**
 * Audio Processor Service
 *
 * Handles all audio generation and processing for the media pipeline.
 */
export class AudioProcessor {
  /**
   * Generate narration for a story page
   *
   * Uses ElevenLabs TTS with character voices or parent recording.
   */
  async generateNarration(
    text: string,
    voiceConfig: AudioOptions
  ): Promise<{ url: string; durationMs: number }> {
    // Use ElevenLabs API
    const result = await generatePageAudio({
      text,
      voiceId: voiceConfig.voiceId,
    });

    return {
      url: result.url,
      durationMs: result.durationMs || this.estimateDurationMs(text),
    };
  }

  /**
   * Generate full episode narration
   *
   * Concatenates narration from all pages into a single continuous audio track.
   * Returns page timings for syncing visual page transitions.
   */
  async generateEpisodeNarration(
    pages: Array<{ text: string; pageNumber: number }>,
    voiceId: string
  ): Promise<{
    url: string;
    durationMs: number;
    pageTimings: Array<{
      pageNumber: number;
      startMs: number;
      endMs: number;
    }>;
  }> {
    const pageTexts = pages.map((p) => p.text);

    try {
      // Use ElevenLabs continuous generation if available
      const result = await generateEpisodeAudio({
        pages: pageTexts,
        voiceId,
      });

      // Estimate page timings based on text length
      const pageTimings = this.estimatePageTimings(pageTexts);

      return {
        url: result.url,
        durationMs: result.durationMs || this.estimateDurationMs(pageTexts.join(" ")),
        pageTimings,
      };
    } catch {
      // Fallback: concatenate individual page audio
      return await this.concatenatePageAudio(pages, voiceId);
    }
  }

  /**
   * Concatenate multiple audio URLs into a single audio track
   *
   * Combines page narration with optional silences and fades.
   */
  async concatenateAudio(
    audioUrls: string[],
    options: ConcatenationOptions = {}
  ): Promise<{
    url: string;
    durationMs: number;
  }> {
    const {
      silenceBetweenMs = 500,
      fadeInMs = 200,
      fadeOutMs = 200,
    } = options;

    // In production, would use audio processing library (e.g., ffmpeg)
    // For now, return merged URL that represents concatenated audio
    const concatenatedUrl = `concat://${audioUrls.join("|")}`;

    // Estimate duration
    let totalDurationMs = 0;
    for (const url of audioUrls) {
      totalDurationMs += await this.estimateDurationFromUrl(url);
    }
    totalDurationMs += silenceBetweenMs * (audioUrls.length - 1);

    return {
      url: concatenatedUrl,
      durationMs: totalDurationMs,
    };
  }

  /**
   * Adjust audio tempo/speed
   *
   * Speeds up or slows down audio for different reading paces.
   * Maintains pitch (no chipmunk effect).
   */
  async adjustTempo(
    audioUrl: string,
    speedFactor: number = 1.0
  ): Promise<string> {
    // Speed factor: 1.0 = normal, 1.5 = 50% faster, 0.8 = 20% slower
    if (speedFactor === 1.0) {
      return audioUrl;
    }

    if (speedFactor < 0.5 || speedFactor > 2.0) {
      throw new Error("Speed factor must be between 0.5 and 2.0");
    }

    // In production, would process audio
    // For now, return URL with tempo parameter
    const url = new URL(audioUrl);
    url.searchParams.set("tempo", speedFactor.toString());
    return url.toString();
  }

  /**
   * Add silence padding to audio
   *
   * Adds silence at the beginning and/or end of audio.
   * Useful for synchronizing with visual page transitions.
   */
  async addSilencePadding(
    audioUrl: string,
    startMs: number = 0,
    endMs: number = 0
  ): Promise<{
    url: string;
    durationMs: number;
  }> {
    const originalDurationMs = await this.estimateDurationFromUrl(audioUrl);
    const totalDurationMs = originalDurationMs + startMs + endMs;

    // In production, would actually prepend/append silence
    // For now, return URL with padding parameters
    const url = new URL(audioUrl);
    if (startMs > 0) {
      url.searchParams.set("padding_start", startMs.toString());
    }
    if (endMs > 0) {
      url.searchParams.set("padding_end", endMs.toString());
    }

    return {
      url: url.toString(),
      durationMs: totalDurationMs,
    };
  }

  /**
   * Estimate audio duration in milliseconds from text
   *
   * Average adult reading speed: ~150 words per minute = ~2.5 words per second
   * For children's stories with slower pacing: ~100 wpm = ~1.67 words per second
   */
  estimateDurationMs(text: string): number {
    const wordCount = text.split(/\s+/).length;
    // ~0.6 seconds per word for children's bedtime stories
    return Math.round(wordCount * 600);
  }

  /**
   * Estimate page timings within an episode
   *
   * Calculates when each page should transition based on narration length.
   * Used for synchronizing page flips with continuous audio.
   */
  private estimatePageTimings(
    pageTexts: string[]
  ): Array<{
    pageNumber: number;
    startMs: number;
    endMs: number;
  }> {
    const timings = [];
    let currentTimeMs = 0;

    for (let i = 0; i < pageTexts.length; i++) {
      const durationMs = this.estimateDurationMs(pageTexts[i]);
      timings.push({
        pageNumber: i + 1,
        startMs: currentTimeMs,
        endMs: currentTimeMs + durationMs,
      });
      currentTimeMs += durationMs + 200; // 200ms pause between pages
    }

    return timings;
  }

  /**
   * Estimate duration from URL (fetch metadata)
   *
   * In production, would extract actual duration from audio file.
   */
  private async estimateDurationFromUrl(audioUrl: string): Promise<number> {
    try {
      // Try to get audio metadata from URL
      const response = await fetch(audioUrl, { method: "HEAD" });
      const duration = response.headers.get("x-audio-duration");

      if (duration) {
        return parseInt(duration, 10);
      }

      // Fallback: return default duration
      return 30000; // 30 seconds default
    } catch {
      return 30000; // 30 seconds default
    }
  }

  /**
   * Get audio metadata from URL
   *
   * Extracts technical information about audio file.
   */
  async getAudioMetadata(audioUrl: string): Promise<AudioMetadata> {
    try {
      const response = await fetch(audioUrl, { method: "HEAD" });

      return {
        duration: parseInt(response.headers.get("x-audio-duration") || "0", 10),
        format: this.extractFormatFromUrl(audioUrl),
        sampleRate: parseInt(response.headers.get("x-sample-rate") || "44100", 10),
        bitrate: parseInt(response.headers.get("x-bitrate") || "128000", 10),
        channels: parseInt(response.headers.get("x-channels") || "2", 10),
        url: audioUrl,
      };
    } catch {
      return {
        duration: 0,
        format: this.extractFormatFromUrl(audioUrl),
        sampleRate: 44100,
        bitrate: 128000,
        channels: 2,
        url: audioUrl,
      };
    }
  }

  /**
   * Extract audio format from URL
   */
  private extractFormatFromUrl(audioUrl: string): string {
    const url = new URL(audioUrl);
    const pathname = url.pathname.toLowerCase();

    if (pathname.includes(".mp3")) return "mp3";
    if (pathname.includes(".wav")) return "wav";
    if (pathname.includes(".m4a")) return "m4a";
    if (pathname.includes(".ogg")) return "ogg";

    // Default to mp3
    return "mp3";
  }

  /**
   * Concatenate individual page audio into episode audio
   *
   * Fallback when continuous generation is not available.
   */
  private async concatenatePageAudio(
    pages: Array<{ text: string; pageNumber: number }>,
    voiceId: string
  ): Promise<{
    url: string;
    durationMs: number;
    pageTimings: Array<{
      pageNumber: number;
      startMs: number;
      endMs: number;
    }>;
  }> {
    const pageAudios: Array<{
      pageNumber: number;
      url: string;
      durationMs: number;
    }> = [];

    // Generate audio for each page
    for (const page of pages) {
      const audioResult = await generatePageAudio({
        text: page.text,
        voiceId,
      });

      pageAudios.push({
        pageNumber: page.pageNumber,
        url: audioResult.url,
        durationMs: audioResult.durationMs || this.estimateDurationMs(page.text),
      });
    }

    // Calculate timings
    const pageTimings: Array<{
      pageNumber: number;
      startMs: number;
      endMs: number;
    }> = [];
    let currentTimeMs = 0;

    for (const pageAudio of pageAudios) {
      pageTimings.push({
        pageNumber: pageAudio.pageNumber,
        startMs: currentTimeMs,
        endMs: currentTimeMs + pageAudio.durationMs,
      });
      currentTimeMs += pageAudio.durationMs + 200; // 200ms pause
    }

    // Concatenate URLs
    const audioUrls = pageAudios.map((pa) => pa.url);
    const concatenated = await this.concatenateAudio(audioUrls);

    return {
      url: concatenated.url,
      durationMs: concatenated.durationMs,
      pageTimings,
    };
  }

  /**
   * Validate audio for quality and completeness
   */
  validateAudio(
    metadata: AudioMetadata,
    expectedDurationMs: number
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check if duration is within reasonable bounds
    const tolerance = expectedDurationMs * 0.2; // 20% tolerance
    if (
      metadata.duration < expectedDurationMs - tolerance ||
      metadata.duration > expectedDurationMs + tolerance
    ) {
      warnings.push(
        `Duration ${metadata.duration}ms differs from expected ${expectedDurationMs}ms`
      );
    }

    // Check sample rate
    if (metadata.sampleRate < 22050) {
      warnings.push(`Low sample rate: ${metadata.sampleRate}Hz`);
    }

    // Check bitrate
    if (metadata.bitrate < 64000) {
      warnings.push(`Low bitrate: ${metadata.bitrate}bps`);
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

// Global audio processor instance
export const audioProcessor = new AudioProcessor();
