/**
 * ElevenLabs Text-to-Speech integration for StoryWeaver
 *
 * Provides high-quality, expressive voice narration with multi-character support.
 * Each story character gets a distinct voice based on their traits, and the narrator
 * uses a warm, bedtime-appropriate voice.
 *
 * Supports both per-page and continuous episode-level audio generation.
 * Includes multilingual TTS support and per-character voice tracking across episodes.
 *
 * Requires ELEVENLABS_API_KEY environment variable.
 */
import { storagePut } from "../storage";
import { ENV } from "./env";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// Voice Configuration
// Pre-mapped ElevenLabs voices optimized for children's storytelling.

export type VoiceRole =
  | "narrator"
  | "child_hero"
  | "wise_old"
  | "friendly_creature"
  | "villain_silly"
  | "magical_being"
  | "animal_small"
  | "animal_large"
  | "robot_friendly";

export type CharacterVoiceConfig = {
  voiceId: string;
  name: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speakerBoost: boolean;
  description: string;
};

export const VOICE_PRESETS: Record<VoiceRole, CharacterVoiceConfig> = {
  narrator: {
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    stability: 0.65,
    similarityBoost: 0.75,
    style: 0.35,
    speakerBoost: true,
    description: "Warm, soothing narrator voice for bedtime",
  },
  child_hero: {
    voiceId: "jBpfAFnaylXitch5owJc",
    name: "Lily",
    stability: 0.55,
    similarityBoost: 0.7,
    style: 0.45,
    speakerBoost: true,
    description: "Young, cheerful voice for the child protagonist",
  },
  wise_old: {
    voiceId: "ODq5zmih8GrVes37Dizd",
    name: "Patrick",
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.25,
    speakerBoost: true,
    description: "Deep, warm, grandfatherly voice for wise characters",
  },
  friendly_creature: {
    voiceId: "N2lVS1w4EtoT3dr4eOWO",
    name: "Callum",
    stability: 0.5,
    similarityBoost: 0.65,
    style: 0.5,
    speakerBoost: true,
    description: "Bright, enthusiastic voice for friendly creatures",
  },
  villain_silly: {
    voiceId: "5Q0t7uMcjvnagumLfvZi",
    name: "Marcus",
    stability: 0.45,
    similarityBoost: 0.6,
    style: 0.6,
    speakerBoost: true,
    description: "Theatrical, over-the-top voice for silly villains",
  },
  magical_being: {
    voiceId: "XB0fDUnXU5powFXDhCwa",
    name: "Charlotte",
    stability: 0.6,
    similarityBoost: 0.75,
    style: 0.4,
    speakerBoost: true,
    description: "Ethereal, dreamy voice for fairies and wizards",
  },
  animal_small: {
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    name: "Aria",
    stability: 0.4,
    similarityBoost: 0.6,
    style: 0.55,
    speakerBoost: true,
    description: "Light, quick voice for small animals",
  },
  animal_large: {
    voiceId: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    stability: 0.7,
    similarityBoost: 0.75,
    style: 0.3,
    speakerBoost: true,
    description: "Deep, gentle voice for large animals",
  },
  robot_friendly: {
    voiceId: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    stability: 0.8,
    similarityBoost: 0.85,
    style: 0.2,
    speakerBoost: true,
    description: "Clear, precise voice with slight robotic quality",
  },
};

export type CharacterTrait =
  | "owl" | "bird" | "mouse" | "rabbit" | "squirrel" | "butterfly" | "bee" | "fish"
  | "bear" | "elephant" | "whale" | "lion" | "dragon" | "dinosaur" | "wolf"
  | "fairy" | "wizard" | "witch" | "unicorn" | "mermaid" | "spirit" | "star" | "moon"
  | "robot" | "alien" | "computer" | "machine"
  | "pirate" | "captain" | "king" | "queen" | "knight"
  | "old_man" | "old_woman" | "grandparent" | "teacher" | "sage"
  | "child" | "kid" | "baby" | "young"
  | "villain" | "trickster" | "shadow" | "monster";

const CHARACTER_VOICE_MAP: Record<CharacterTrait, VoiceRole> = {
  owl: "animal_large", bird: "animal_small", mouse: "animal_small",
  rabbit: "animal_small", squirrel: "animal_small", butterfly: "animal_small",
  bee: "animal_small", fish: "animal_small",
  bear: "animal_large", elephant: "animal_large", whale: "animal_large",
  lion: "animal_large", dragon: "animal_large", dinosaur: "animal_large", wolf: "animal_large",
  fairy: "magical_being", wizard: "magical_being", witch: "magical_being",
  unicorn: "magical_being", mermaid: "magical_being", spirit: "magical_being",
  star: "magical_being", moon: "magical_being",
  robot: "robot_friendly", alien: "robot_friendly", computer: "robot_friendly", machine: "robot_friendly",
  pirate: "villain_silly", captain: "wise_old", king: "wise_old",
  queen: "magical_being", knight: "friendly_creature",
  old_man: "wise_old", old_woman: "wise_old", grandparent: "wise_old",
  teacher: "wise_old", sage: "wise_old",
  child: "child_hero", kid: "child_hero", baby: "child_hero", young: "child_hero",
  villain: "villain_silly", trickster: "villain_silly", shadow: "villain_silly", monster: "villain_silly",
};

export function resolveVoiceRole(characterDescription: string): VoiceRole {
  const desc = characterDescription.toLowerCase();
  for (const [trait, role] of Object.entries(CHARACTER_VOICE_MAP)) {
    if (desc.includes(trait)) return role;
  }
  return "friendly_creature";
}

export type StorySegment = {
  type: "narration" | "dialogue";
  character?: string;
  characterTraits?: string;
  text: string;
  voiceRole?: VoiceRole;
};

export type PageAudioResult = {
  audioUrl: string;
  durationMs: number;
  segments: Array<{
    character: string | null;
    voiceRole: VoiceRole;
    startMs: number;
    endMs: number;
  }>;
};

export type EpisodeAudioResult = {
  audioUrl: string;
  totalDurationMs: number;
  pageTimings: Array<{
    pageNumber: number;
    startMs: number;
    endMs: number;
  }>;
  segments: Array<{
    character: string | null;
    voiceRole: VoiceRole;
    startMs: number;
    endMs: number;
    pageNumber: number;
  }>;
};

export type TTSOptions = {
  text: string;
  voiceConfig: CharacterVoiceConfig;
  model?: string;
  language?: string; // ISO 639-1 code (e.g., 'es', 'fr', 'ar')
};

// ─── Per-Character Voice Registry ───────────────────────────────
// Maintains consistent voice assignments across an entire story/episode

export class CharacterVoiceRegistry {
  private assignments: Map<string, { voiceRole: VoiceRole; voiceConfig: CharacterVoiceConfig }> = new Map();
  private usedRoles: Set<VoiceRole> = new Set();

  constructor(characters: Array<{ name: string; traits: string }>) {
    // Pre-assign unique voices to each character at creation time
    // Narrator always gets "narrator"
    this.assignments.set("NARRATOR", { voiceRole: "narrator", voiceConfig: VOICE_PRESETS.narrator });
    this.usedRoles.add("narrator");

    for (const char of characters) {
      this.assignVoice(char.name.toUpperCase(), char.traits);
    }
  }

  private assignVoice(name: string, traits: string): void {
    if (this.assignments.has(name)) return;

    // First try trait-based matching
    const preferredRole = resolveVoiceRole(traits);

    if (!this.usedRoles.has(preferredRole)) {
      // Unique role available
      this.assignments.set(name, { voiceRole: preferredRole, voiceConfig: VOICE_PRESETS[preferredRole] });
      this.usedRoles.add(preferredRole);
    } else {
      // Role already used - find next best unique voice
      const allRoles: VoiceRole[] = ["child_hero", "wise_old", "friendly_creature", "villain_silly",
        "magical_being", "animal_small", "animal_large", "robot_friendly"];
      const available = allRoles.filter(r => !this.usedRoles.has(r));

      if (available.length > 0) {
        const role = available[0];
        this.assignments.set(name, { voiceRole: role, voiceConfig: VOICE_PRESETS[role] });
        this.usedRoles.add(role);
      } else {
        // All roles used - reuse the preferred but with slightly different settings
        const config = { ...VOICE_PRESETS[preferredRole] };
        config.style = Math.min(config.style + 0.15, 0.8); // Shift style to differentiate
        config.stability = Math.max(config.stability - 0.1, 0.3);
        this.assignments.set(name, { voiceRole: preferredRole, voiceConfig: config });
      }
    }
  }

  getVoice(characterName: string): { voiceRole: VoiceRole; voiceConfig: CharacterVoiceConfig } {
    const upper = characterName.toUpperCase();
    if (this.assignments.has(upper)) return this.assignments.get(upper)!;
    // Late-arriving character - assign on the fly
    this.assignVoice(upper, characterName);
    return this.assignments.get(upper)!;
  }

  getAssignments(): Map<string, { voiceRole: VoiceRole; voiceConfig: CharacterVoiceConfig }> {
    return new Map(this.assignments);
  }
}

// ─── Process narration pacing markup for ElevenLabs ──────────────

/**
 * Process narration pacing markup for ElevenLabs.
 * - Keeps <break> tags as-is (ElevenLabs processes them natively)
 * - Extracts tone directions like (softly), (excitedly) and adjusts voice settings
 * - Handles *whispered text* by adjusting stability
 */
export function processNarrationMarkup(
  text: string,
  baseConfig: CharacterVoiceConfig
): { processedText: string; adjustedConfig: CharacterVoiceConfig } {
  const config = { ...baseConfig };
  let processed = text;

  // Detect tone modulation markers
  const toneMatch = processed.match(/\((softly|excitedly|slowly, dreamily|gently, getting quieter|whispered|urgently|sadly|happily)\)/i);
  if (toneMatch) {
    const tone = toneMatch[1].toLowerCase();
    processed = processed.replace(/\([^)]*(?:softly|excitedly|slowly|gently|whispered|urgently|sadly|happily)[^)]*\)/gi, "").trim();

    switch (tone) {
      case "softly":
      case "whispered":
        config.stability = Math.min(config.stability + 0.15, 0.95);
        config.style = Math.max(config.style - 0.15, 0.05);
        config.similarityBoost = Math.min(config.similarityBoost + 0.1, 0.95);
        break;
      case "excitedly":
        config.style = Math.min(config.style + 0.2, 0.8);
        config.stability = Math.max(config.stability - 0.1, 0.3);
        break;
      case "slowly, dreamily":
      case "gently, getting quieter":
        config.stability = Math.min(config.stability + 0.2, 0.95);
        config.style = Math.max(config.style - 0.2, 0.05);
        break;
      case "urgently":
        config.style = Math.min(config.style + 0.15, 0.75);
        config.stability = Math.max(config.stability - 0.15, 0.25);
        break;
      case "sadly":
        config.stability = Math.min(config.stability + 0.1, 0.9);
        config.style = Math.max(config.style - 0.1, 0.1);
        break;
      case "happily":
        config.style = Math.min(config.style + 0.1, 0.7);
        break;
    }
  }

  // Handle *whispered text* — remove asterisks, already adjusted config above
  processed = processed.replace(/\*([^*]+)\*/g, "$1");

  // Keep <break> tags as-is — ElevenLabs eleven_multilingual_v2 processes them natively
  // But validate break times are within ElevenLabs limits (max 3s)
  processed = processed.replace(/<break time="(\d+\.?\d*)s"\/>/g, (match, seconds) => {
    const s = parseFloat(seconds);
    if (s > 3.0) return '<break time="3.0s"/>';
    return match;
  });

  return { processedText: processed, adjustedConfig: config };
}

// ─── Generate a short silence buffer for pauses ─────────────────

function generateSilence(durationMs: number): Buffer {
  // Generate silence as empty MP3 frames (approximate)
  // At 128kbps MP3, we need roughly 16 bytes per millisecond
  const bytesNeeded = Math.round((durationMs / 1000) * 16000);
  return Buffer.alloc(bytesNeeded, 0);
}

// ─── Core TTS Function ──────────────────────────────────────────

export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const apiKey = ENV.elevenLabsApiKey;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const { text, voiceConfig, model = "eleven_multilingual_v2", language } = options;

  const requestBody: Record<string, unknown> = {
    text,
    model_id: model,
    voice_settings: {
      stability: voiceConfig.stability,
      similarity_boost: voiceConfig.similarityBoost,
      style: voiceConfig.style,
      use_speaker_boost: voiceConfig.speakerBoost,
    },
  };

  // Include language_code if provided (for multilingual support)
  if (language) {
    requestBody.language_code = language;
  }

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceConfig.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify(requestBody),
    }
  );
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// ─── Per-Page Audio Generation ──────────────────────────────────

export async function generatePageAudio(
  pageText: string,
  characters: Array<{ name: string; traits: string }>,
  pageId: number | string,
  language?: string,
  voiceRegistry?: CharacterVoiceRegistry
): Promise<PageAudioResult> {
  const segments = parseStorySegments(pageText, characters);
  const audioBuffers: Buffer[] = [];
  const segmentMeta: PageAudioResult["segments"] = [];
  let currentMs = 0;

  // Use provided registry or create a temporary one for this page
  const registry = voiceRegistry || new CharacterVoiceRegistry(characters);

  for (const segment of segments) {
    let voiceConfig = VOICE_PRESETS["narrator"];
    let voiceRole: VoiceRole = "narrator";

    if (segment.type === "dialogue" && segment.character) {
      const voiceAssignment = registry.getVoice(segment.character);
      voiceRole = voiceAssignment.voiceRole;
      voiceConfig = voiceAssignment.voiceConfig;
    } else if (segment.voiceRole) {
      voiceRole = segment.voiceRole;
      voiceConfig = VOICE_PRESETS[voiceRole];
    }

    const enhancedText = addVocalQuirks(segment.text, segment.characterTraits || "", voiceRole);
    const { processedText, adjustedConfig } = processNarrationMarkup(enhancedText, voiceConfig);
    const audioBuffer = await generateSpeech({ text: processedText, voiceConfig: adjustedConfig, language });
    const estimatedDurationMs = Math.round((audioBuffer.length / 16000) * 1000);

    audioBuffers.push(audioBuffer);
    segmentMeta.push({
      character: segment.character || null,
      voiceRole,
      startMs: currentMs,
      endMs: currentMs + estimatedDurationMs,
    });
    currentMs += estimatedDurationMs;

    // Add a short pause between segments for natural pacing
    const pauseMs = segment.type === "narration" ? 400 : 250;
    audioBuffers.push(generateSilence(pauseMs));
    currentMs += pauseMs;
  }

  const fullAudio = Buffer.concat(audioBuffers);
  const { url } = await storagePut(
    `audio/pages/${pageId}_${Date.now()}.mp3`,
    fullAudio,
    "audio/mpeg"
  );

  return { audioUrl: url, durationMs: currentMs, segments: segmentMeta };
}

// ─── Continuous Episode Audio Generation ────────────────────────
// Generates a single continuous audio file for the entire episode,
// with natural pauses between pages and proper pacing for listeners.

export async function generateEpisodeAudio(
  pagesData: Array<{
    pageNumber: number;
    storyText: string;
    characters: Array<{ name: string; traits: string }>;
    mood?: string;
  }>,
  episodeId: number | string,
  language?: string
): Promise<EpisodeAudioResult> {
  const allBuffers: Buffer[] = [];
  const pageTimings: EpisodeAudioResult["pageTimings"] = [];
  const allSegments: EpisodeAudioResult["segments"] = [];
  let currentMs = 0;

  // Create a SINGLE voice registry for the entire episode to ensure consistency
  const allCharacters: Array<{ name: string; traits: string }> = [];
  const seenNames = new Set<string>();

  for (const page of pagesData) {
    for (const char of page.characters) {
      if (!seenNames.has(char.name.toUpperCase())) {
        allCharacters.push(char);
        seenNames.add(char.name.toUpperCase());
      }
    }
  }

  const voiceRegistry = new CharacterVoiceRegistry(allCharacters);

  for (let i = 0; i < pagesData.length; i++) {
    const page = pagesData[i];
    const pageStartMs = currentMs;
    const segments = parseStorySegments(page.storyText, page.characters);

    for (const segment of segments) {
      let voiceConfig: CharacterVoiceConfig;
      let voiceRole: VoiceRole;

      if (segment.type === "dialogue" && segment.character) {
        const voiceAssignment = voiceRegistry.getVoice(segment.character);
        voiceRole = voiceAssignment.voiceRole;
        voiceConfig = { ...voiceAssignment.voiceConfig };
      } else {
        voiceRole = "narrator";
        voiceConfig = { ...VOICE_PRESETS["narrator"] };
      }

      // Adjust pacing based on mood — slower for calm/dreamy, faster for exciting
      if (page.mood === "calm" || page.mood === "reassuring") {
        voiceConfig.stability = Math.min(voiceConfig.stability + 0.1, 0.9);
        voiceConfig.style = Math.max(voiceConfig.style - 0.1, 0.1);
      } else if (page.mood === "exciting" || page.mood === "adventurous") {
        voiceConfig.style = Math.min(voiceConfig.style + 0.1, 0.7);
      }

      // For final pages (bedtime wind-down), make narration extra soothing
      if (i >= pagesData.length - 2 && voiceRole === "narrator") {
        voiceConfig.stability = 0.8;
        voiceConfig.style = 0.15;
      }

      const enhancedText = addVocalQuirks(segment.text, segment.characterTraits || "", voiceRole);
      const { processedText, adjustedConfig } = processNarrationMarkup(enhancedText, voiceConfig);
      const audioBuffer = await generateSpeech({ text: processedText, voiceConfig: adjustedConfig, language });
      const estimatedDurationMs = Math.round((audioBuffer.length / 16000) * 1000);

      allBuffers.push(audioBuffer);
      allSegments.push({
        character: segment.character || null,
        voiceRole,
        startMs: currentMs,
        endMs: currentMs + estimatedDurationMs,
        pageNumber: page.pageNumber,
      });
      currentMs += estimatedDurationMs;

      // Natural pause between segments within a page
      const intraPagePause = segment.type === "narration" ? 350 : 200;
      allBuffers.push(generateSilence(intraPagePause));
      currentMs += intraPagePause;
    }

    const pageEndMs = currentMs;
    pageTimings.push({
      pageNumber: page.pageNumber,
      startMs: pageStartMs,
      endMs: pageEndMs,
    });

    // Add a longer pause between pages for natural page-turn feeling
    // Longer pauses for the wind-down section
    if (i < pagesData.length - 1) {
      const isWindDown = i >= pagesData.length - 3;
      const interPagePauseMs = isWindDown ? 1500 : 800;
      allBuffers.push(generateSilence(interPagePauseMs));
      currentMs += interPagePauseMs;
    }
  }

  const fullEpisodeAudio = Buffer.concat(allBuffers);
  const { url } = await storagePut(
    `audio/episodes/${episodeId}_${Date.now()}.mp3`,
    fullEpisodeAudio,
    "audio/mpeg"
  );

  return {
    audioUrl: url,
    totalDurationMs: currentMs,
    pageTimings,
    segments: allSegments,
  };
}

// ─── Text Parsing ───────────────────────────────────────────────

export function parseStorySegments(
  text: string,
  characters: Array<{ name: string; traits: string }>
): StorySegment[] {
  const segments: StorySegment[] = [];
  const lines = text.split("\n").filter((l) => l.trim());

  // Build lookup with multiple name variants
  const charLookup = new Map<string, string>();
  for (const char of characters) {
    charLookup.set(char.name.toUpperCase(), char.traits);
    // Also add underscore variant for names with spaces
    charLookup.set(char.name.toUpperCase().replace(/\s+/g, "_"), char.traits);
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Try multiple dialogue patterns:
    // 1. "CHARACTER_NAME: dialogue" (uppercase with underscores)
    // 2. "Character Name: dialogue" (title case)
    // 3. "CHARACTER NAME: dialogue" (uppercase with spaces)
    const dialogueMatch = trimmed.match(/^([A-Za-z_]+(?:[\s_][A-Za-z_]+)*):\s*(.+)$/);

    if (dialogueMatch) {
      const rawName = dialogueMatch[1];
      const dialogue = dialogueMatch[2].replace(/^["\u201C]|["\u201D]$/g, "");
      const normalizedName = rawName.toUpperCase().replace(/\s+/g, "_");

      if (normalizedName === "NARRATOR") {
        segments.push({ type: "narration", text: dialogue, voiceRole: "narrator" });
      } else {
        // Try to find character in lookup
        const traits = charLookup.get(normalizedName)
          || charLookup.get(rawName.toUpperCase())
          || findClosestCharacter(rawName, charLookup)
          || rawName.toLowerCase();

        segments.push({
          type: "dialogue",
          character: normalizedName,
          characterTraits: traits,
          text: dialogue,
        });
      }
    } else {
      segments.push({ type: "narration", text: trimmed, voiceRole: "narrator" });
    }
  }
  return segments;
}

// Fuzzy match for character names (handles partial matches like "LUNA" matching "LUNA_THE_FAIRY")
function findClosestCharacter(name: string, lookup: Map<string, string>): string | null {
  const upper = name.toUpperCase();
  for (const [key, traits] of lookup.entries()) {
    if (key.startsWith(upper) || upper.startsWith(key)) return traits;
  }
  return null;
}

function addVocalQuirks(text: string, traits: string, voiceRole: VoiceRole): string {
  const lowerTraits = traits.toLowerCase();
  if (lowerTraits.includes("owl")) return text.replace(/([.!?])\s*/g, " hoo-hoo!$1 ");
  if (lowerTraits.includes("cat")) return text.replace(/([.!?])\s*/g, " purrr...$1 ");
  if (lowerTraits.includes("dog") || lowerTraits.includes("puppy")) return text.replace(/(!)\s*/g, " woof woof!$1 ");
  if (lowerTraits.includes("mouse")) return text.replace(/([.!?])\s*/g, " squeak!$1 ");
  if (lowerTraits.includes("dragon")) return text.replace(/(\.)\s*/g, " rrrumble...$1 ");
  if (lowerTraits.includes("robot") || voiceRole === "robot_friendly") return text.replace(/(\.)\s*/g, " beep-boop.$1 ");
  if (lowerTraits.includes("pirate")) return text.replace(/(!)\s*/g, " arrr!$1 ");
  if (lowerTraits.includes("fairy") || lowerTraits.includes("pixie")) return text.replace(/([.!?])\s*/g, " tee-hee...$1 ");
  if (lowerTraits.includes("bear")) return text.replace(/(\.)\s*/g, " grrr...$1 ");
  if (lowerTraits.includes("bee")) return text.replace(/([.!?])\s*/g, " bzzz...$1 ");
  if (lowerTraits.includes("frog") || lowerTraits.includes("toad")) return text.replace(/(\.)\s*/g, " ribbit.$1 ");
  if (lowerTraits.includes("snake") || lowerTraits.includes("serpent")) return text.replace(/s/gi, "sss");
  return text;
}

// ─── Utility Functions ──────────────────────────────────────────

export async function listAvailableVoices(): Promise<Array<{ voiceId: string; name: string; category: string }>> {
  const apiKey = ENV.elevenLabsApiKey;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, { headers: { "xi-api-key": apiKey } });
  if (!response.ok) throw new Error("Failed to fetch ElevenLabs voices");
  const data = (await response.json()) as { voices: Array<{ voice_id: string; name: string; category: string }> };
  return data.voices.map((v) => ({ voiceId: v.voice_id, name: v.name, category: v.category }));
}

export async function getVoiceQuota(): Promise<{ characterCount: number; characterLimit: number; remainingCharacters: number }> {
  const apiKey = ENV.elevenLabsApiKey;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const response = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, { headers: { "xi-api-key": apiKey } });
  if (!response.ok) throw new Error("Failed to fetch ElevenLabs subscription info");
  const data = (await response.json()) as { character_count: number; character_limit: number };
  return {
    characterCount: data.character_count,
    characterLimit: data.character_limit,
    remainingCharacters: data.character_limit - data.character_count,
  };
}
