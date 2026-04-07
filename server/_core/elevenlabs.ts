/**
 * ElevenLabs Text-to-Speech integration for StoryWeaver
 *
 * Provides high-quality, expressive voice narration with multi-character support.
 * Each story character gets a distinct voice based on their traits, and the narrator
 * uses a warm, bedtime-appropriate voice.
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
    similarityBoost: 0.70,
    style: 0.45,
    speakerBoost: true,
    description: "Young, cheerful voice for the child protagonist",
  },
  wise_old: {
    voiceId: "ODq5zmih8GrVes37Dizd",
    name: "Patrick",
    stability: 0.70,
    similarityBoost: 0.80,
    style: 0.25,
    speakerBoost: true,
    description: "Deep, warm, grandfatherly voice for wise characters",
  },
  friendly_creature: {
    voiceId: "N2lVS1w4EtoT3dr4eOWO",
    name: "Callum",
    stability: 0.50,
    similarityBoost: 0.65,
    style: 0.50,
    speakerBoost: true,
    description: "Bright, enthusiastic voice for friendly creatures",
  },
  villain_silly: {
    voiceId: "5Q0t7uMcjvnagumLfvZi",
    name: "Marcus",
    stability: 0.45,
    similarityBoost: 0.60,
    style: 0.60,
    speakerBoost: true,
    description: "Theatrical, over-the-top voice for silly villains",
  },
  magical_being: {
    voiceId: "XB0fDUnXU5powFXDhCwa",
    name: "Charlotte",
    stability: 0.60,
    similarityBoost: 0.75,
    style: 0.40,
    speakerBoost: true,
    description: "Ethereal, dreamy voice for fairies and wizards",
  },
  animal_small: {
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    name: "Aria",
    stability: 0.40,
    similarityBoost: 0.60,
    style: 0.55,
    speakerBoost: true,
    description: "Light, quick voice for small animals",
  },
  animal_large: {
    voiceId: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    stability: 0.70,
    similarityBoost: 0.75,
    style: 0.30,
    speakerBoost: true,
    description: "Deep, gentle voice for large animals",
  },
  robot_friendly: {
    voiceId: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    stability: 0.80,
    similarityBoost: 0.85,
    style: 0.20,
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

export type TTSOptions = {
  text: string;
  voiceConfig: CharacterVoiceConfig;
  model?: string;
};

export async function generateSpeech(options: TTSOptions): Promise<Buffer> {
  const apiKey = ENV.elevenLabsApiKey;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const { text, voiceConfig, model = "eleven_multilingual_v2" } = options;

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceConfig.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: voiceConfig.stability,
          similarity_boost: voiceConfig.similarityBoost,
          style: voiceConfig.style,
          use_speaker_boost: voiceConfig.speakerBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function generatePageAudio(
  pageText: string,
  characters: Array<{ name: string; traits: string }>,
  pageId: number | string
): Promise<PageAudioResult> {
  const segments = parseStorySegments(pageText, characters);
  const audioBuffers: Buffer[] = [];
  const segmentMeta: PageAudioResult["segments"] = [];
  let currentMs = 0;

  for (const segment of segments) {
    const voiceRole = segment.voiceRole || resolveVoiceRole(segment.characterTraits || "");
    const voiceConfig = VOICE_PRESETS[voiceRole];
    const enhancedText = addVocalQuirks(segment.text, segment.characterTraits || "", voiceRole);

    const audioBuffer = await generateSpeech({ text: enhancedText, voiceConfig });
    const estimatedDurationMs = Math.round((audioBuffer.length / 16000) * 1000);

    audioBuffers.push(audioBuffer);
    segmentMeta.push({
      character: segment.character || null,
      voiceRole,
      startMs: currentMs,
      endMs: currentMs + estimatedDurationMs,
    });
    currentMs += estimatedDurationMs;
  }

  const fullAudio = Buffer.concat(audioBuffers);
  const { url } = await storagePut(
    `audio/pages/${pageId}_${Date.now()}.mp3`,
    fullAudio,
    "audio/mpeg"
  );

  return { audioUrl: url, durationMs: currentMs, segments: segmentMeta };
}

export function parseStorySegments(
  text: string,
  characters: Array<{ name: string; traits: string }>
): StorySegment[] {
  const segments: StorySegment[] = [];
  const lines = text.split("\n").filter((l) => l.trim());
  const charLookup = new Map<string, string>();
  for (const char of characters) {
    charLookup.set(char.name.toUpperCase(), char.traits);
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const dialogueMatch = trimmed.match(/^([A-Z_]+(?:\s[A-Z_]+)*):\s*(.+)$/);
    if (dialogueMatch) {
      const charName = dialogueMatch[1];
      const dialogue = dialogueMatch[2].replace(/^["\u201C]|["\u201D]$/g, "");
      if (charName === "NARRATOR") {
        segments.push({ type: "narration", text: dialogue, voiceRole: "narrator" });
      } else {
        const traits = charLookup.get(charName) || charName.toLowerCase();
        segments.push({ type: "dialogue", character: charName, characterTraits: traits, text: dialogue });
      }
    } else {
      segments.push({ type: "narration", text: trimmed, voiceRole: "narrator" });
    }
  }
  return segments;
}

function addVocalQuirks(text: string, traits: string, voiceRole: VoiceRole): string {
  const lowerTraits = traits.toLowerCase();
  if (lowerTraits.includes("owl")) return text.replace(/([.!?])\s*/g, " hoo-hoo!$1 ");
  if (lowerTraits.includes("cat")) return text.replace(/([.!?])\s*/g, " purrr...$1 ");
  if (lowerTraits.includes("dog") || lowerTraits.includes("puppy")) return text.replace(/([!])\s*/g, " woof woof!$1 ");
  if (lowerTraits.includes("mouse")) return text.replace(/([.!?])\s*/g, " squeak!$1 ");
  if (lowerTraits.includes("dragon")) return text.replace(/([.])\s*/g, " rrrumble...$1 ");
  if (lowerTraits.includes("robot") || voiceRole === "robot_friendly") return text.replace(/([.])\s*/g, " beep-boop.$1 ");
  if (lowerTraits.includes("pirate")) return text.replace(/([!])\s*/g, " arrr!$1 ");
  if (lowerTraits.includes("fairy") || lowerTraits.includes("pixie")) return text.replace(/([.!?])\s*/g, " tee-hee...$1 ");
  if (lowerTraits.includes("bear")) return text.replace(/([.])\s*/g, " grrr...$1 ");
  if (lowerTraits.includes("bee")) return text.replace(/([.!?])\s*/g, " bzzz...$1 ");
  if (lowerTraits.includes("frog") || lowerTraits.includes("toad")) return text.replace(/([.])\s*/g, " ribbit.$1 ");
  if (lowerTraits.includes("snake") || lowerTraits.includes("serpent")) return text.replace(/s/gi, "sss");
  return text;
}

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
