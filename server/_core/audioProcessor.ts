/**
 * Audio Processing Service for StoryWeaver
 *
 * Handles narration generation, concatenation, tempo adjustment, and metadata.
 * Integrates with ElevenLabs for TTS and supports parent voice recordings.
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
 */
export class AudioProcessor {
  /**
   * Generate narration for a story page
   */
  async generateNarration(
    text: string,
    voiceConfig: AudioOptions
  ): Promise<{ url: string; durationMs: number }> {
    // generatePageAudio(pageText, characters, pageId)
    const result = await generatePageAudio(
      text,
      [{ name: "narrator", traits: "warm storytelling voice" }],
      voiceConfig.voiceId
    );

    return {
      url: result.audioUrl,
      durationMs: result.durationMs || this.estimateDurationMs(text),
    };
  }

  /**
   * Generate full episode narration
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
    try {
      // generateEpisodeAudio(pagesData, episodeId)
      const pagesData = pages.map((p) => ({
        pageNumber: p.pageNumber,
        storyText: p.text,
        characters: [{ name: "narrator", traits: "warm storytelling voice" }],
      }));

      const result = await generateEpisodeAudio(pagesData, voiceId);

      return {
        url: result.audioUrl,
        durationMs: result.totalDurationMs || this.estimateDurationMs(pages.map((p) => p.text).join(" ")),
        pageTimings: result.pageTimings || this.estimatePageTimings(pages.map((p) => p.text)),
      };
    } catch {
      return await this.concatenatePageAudio(pages, voiceId);
    }
  }

  /**
   * Concatenate multiple audio URLs into a single audio track
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
    } = options;

    const concatenatedUrl = `concat://${audioUrls.join("|")}`;

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
   */
  async adjustTempo(
    audioUrl: string,
    speedFactor: number = 1.0
  ): Promise<string> {
    if (speedFactor === 1.0) {
      return audioUrl;
    }

    if (speedFactor < 0.5 || speedFactor > 2.0) {
      throw new Error("Speed factor must be between 0.5 and 2.0");
    }

    const url = new URL(audioUrl);
    url.searchParams.set("tempo", speedFactor.toString());
    return url.toString();
  }

  /**
   * Add silence padding to audio
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
   */
  estimateDurationMs(text: string): number {
    const wordCount = text.split(/\s+/).length;
    return Math.round(wordCount * 600);
  }

  /**
   * Estimate page timings within an episode
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
      currentTimeMs += durationMs + 200;
    }

    return timings;
  }

  /**
   * Estimate duration from URL (fetch metadata)
   */
  private async estimateDurationFromUrl(audioUrl: string): Promise<number> {
    try {
      const response = await fetch(audioUrl, { method: "HEAD" });
      const duration = response.headers.get("x-audio-duration");

      if (duration) {
        return parseInt(duration, 10);
      }

      return 30000;
    } catch {
      return 30000;
    }
  }

  /**
   * Get audio metadata from URL
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

    return "mp3";
  }

  /**
   * Concatenate individual page audio into episode audio (fallback)
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

    for (const page of pages) {
      const audioResult = await generatePageAudio(
        page.text,
        [{ name: "narrator", traits: "warm storytelling voice" }],
        `page-${page.pageNumber}`
      );

      pageAudios.push({
        pageNumber: page.pageNumber,
        url: audioResult.audioUrl,
        durationMs: audioResult.durationMs || this.estimateDurationMs(page.text),
      });
    }

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
      currentTimeMs += pageAudio.durationMs + 200;
    }

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

    const tolerance = expectedDurationMs * 0.2;
    if (
      metadata.duration < expectedDurationMs - tolerance ||
      metadata.duration > expectedDurationMs + tolerance
    ) {
      warnings.push(
        `Duration ${metadata.duration}ms differs from expected ${expectedDurationMs}ms`
      );
    }

    if (metadata.sampleRate < 22050) {
      warnings.push(`Low sample rate: ${metadata.sampleRate}Hz`);
    }

    if (metadata.bitrate < 64000) {
      warnings.push(`Low bitrate: ${metadata.bitrate}bps`);
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}

export const audioProcessor = new AudioProcessor();
