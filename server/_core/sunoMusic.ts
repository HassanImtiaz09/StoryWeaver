/**
 * Suno AI Music Generation for StoryWeaver
 *
 * Generates custom background music and ambient sound effects for stories
 * based on theme, mood, and scene context. Each story gets a unique musical
 * accompaniment that enhances the listening experience.
 *
 * Requires SUNO_API_KEY environment variable.
 */
import { storagePut } from "../storage";
import { ENV } from "./env";

const SUNO_BASE_URL = "https://studio-api.suno.ai/api";

// ─── Types ─────────────────────────────────────────────────────

export type MusicMood =
  | "whimsical"
  | "adventurous"
  | "calm"
  | "mysterious"
  | "triumphant"
  | "playful"
  | "dreamy"
  | "exciting"
  | "warm"
  | "magical";

export type MusicGenerationRequest = {
  theme: string;
  mood: MusicMood;
  durationSeconds: number;
  description?: string;
  instrumental?: boolean;
};

export type MusicGenerationResult = {
  musicUrl: string;
  durationMs: number;
  title: string;
};

export type SoundEffectRequest = {
  description: string;
  durationSeconds?: number;
};

export type SoundEffectResult = {
  effectUrl: string;
  durationMs: number;
};

// ─── Mood → Music Style Mapping ────────────────────────────────

const MOOD_MUSIC_STYLES: Record<MusicMood, string> = {
  whimsical:
    "gentle xylophone and pizzicato strings, light playful melody, music box tinkling, soft woodwinds, children's storybook soundtrack",
  adventurous:
    "orchestral adventure theme, bold brass, energetic strings, timpani accents, heroic melody, fantasy exploration soundtrack",
  calm:
    "soft piano lullaby, gentle harp arpeggios, warm pads, ambient nature sounds, soothing bedtime music for children",
  mysterious:
    "ethereal pads, soft celesta, gentle wind chimes, minor key melody, curious and wonder-filled, light mystery soundtrack",
  triumphant:
    "uplifting orchestral fanfare, bright brass, soaring strings, celebration theme, joyful achievement melody",
  playful:
    "bouncy ukulele, cheerful whistling, light percussion, kazoo accents, fun and silly children's music",
  dreamy:
    "ambient synth pads, gentle music box, soft choir, floating melody, magical sleepy-time soundscape",
  exciting:
    "energetic orchestral, fast strings, building tension, exciting crescendo, action-packed children's adventure music",
  warm:
    "acoustic guitar fingerpicking, soft cello, warm string quartet, heartfelt melody, cozy fireside feeling",
  magical:
    "sparkling bells, ethereal choir, harp glissandos, celestial pads, enchanted forest soundtrack, fairy tale music",
};

// ─── Theme → Sound Effect Mapping ──────────────────────────────

export const THEME_AMBIENT_SOUNDS: Record<string, string[]> = {
  "Space Adventure": ["soft spaceship hum", "twinkling stars", "gentle rocket whoosh", "alien chirps"],
  "Ocean Exploration": ["gentle waves", "underwater bubbles", "dolphin clicks", "seagull calls"],
  "Enchanted Forest": ["rustling leaves", "bird song", "babbling brook", "gentle wind"],
  "Dinosaur World": ["distant thunder", "jungle ambience", "gentle roars", "prehistoric birds"],
  "Pirate Voyage": ["creaking ship", "ocean waves", "seagulls", "treasure chest opening"],
  "Robot Friends": ["gentle beeps", "servo whirrs", "digital chimes", "mechanical clicks"],
  "Fairy Kingdom": ["fairy bells", "sparkle sounds", "gentle fluttering", "magical chimes"],
  "Safari Journey": ["savanna wind", "distant drums", "animal calls", "rustling grass"],
  "Arctic Expedition": ["howling wind", "crunching snow", "cracking ice", "penguin calls"],
  "Medieval Quest": ["castle horns", "horse hooves", "sword clinks", "creaking drawbridge"],
  "Jungle Trek": ["tropical birds", "monkey chatter", "waterfall splash", "insect chorus"],
  "Candy Land": ["pop and fizz", "bouncy sounds", "sweet chimes", "bubbly effects"],
  "Musical Adventure": ["instrument warm-ups", "concert hall ambience", "gentle notes", "rhythmic taps"],
  "Secret Garden": ["gentle rain", "birdsong", "rustling flowers", "buzzing bees"],
};

// ─── Map story moods to music moods ────────────────────────────

export function storyMoodToMusicMood(storyMood: string): MusicMood {
  const mapping: Record<string, MusicMood> = {
    exciting: "exciting",
    calm: "calm",
    mysterious: "mysterious",
    adventurous: "adventurous",
    warm: "warm",
    funny: "playful",
    reassuring: "dreamy",
    triumphant: "triumphant",
  };
  return mapping[storyMood] ?? "whimsical";
}

// ─── Build Music Prompt ────────────────────────────────────────

function buildMusicPrompt(request: MusicGenerationRequest): string {
  const styleGuide = MOOD_MUSIC_STYLES[request.mood] ?? MOOD_MUSIC_STYLES.whimsical;

  return `${styleGuide}. ${request.theme} themed. ${
    request.description ?? ""
  } Instrumental only, no vocals. Safe and soothing for children aged 3-12. Approximately ${
    request.durationSeconds
  } seconds long. Professional quality, suitable for a children's audiobook.`.trim();
}

// ─── Suno API Calls ────────────────────────────────────────────

async function callSunoGenerate(prompt: string, durationSeconds: number): Promise<{
  audioUrl: string;
  title: string;
  durationMs: number;
}> {
  const apiKey = ENV.sunoApiKey;
  if (!apiKey) {
    throw new Error("SUNO_API_KEY is not configured");
  }

  // Create generation task
  const createResp = await fetch(`${SUNO_BASE_URL}/generate/v2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      make_instrumental: true,
      wait_audio: false,
    }),
  });

  if (!createResp.ok) {
    const errText = await createResp.text().catch(() => "");
    throw new Error(`Suno API generation failed (${createResp.status}): ${errText}`);
  }

  const createData = (await createResp.json()) as Array<{ id: string; title: string; status: string }>;
  if (!createData.length) {
    throw new Error("No generation IDs returned from Suno");
  }

  const generationId = createData[0].id;
  const generationTitle = createData[0].title ?? "Story Music";

  // Poll for completion (max 120 seconds)
  let audioUrl = "";
  let actualDurationMs = durationSeconds * 1000;
  let consecutiveErrors = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));

    try {
      const statusResp = await fetch(`${SUNO_BASE_URL}/feed/${generationId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!statusResp.ok) {
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          throw new Error(`Suno polling failed after ${consecutiveErrors} consecutive HTTP errors (last: ${statusResp.status})`);
        }
        continue;
      }
      consecutiveErrors = 0;

      const statusData = (await statusResp.json()) as Array<{
        id: string;
        status: string;
        audio_url?: string;
        duration?: number;
      }>;

      const item = statusData.find((s) => s.id === generationId);
      if (item?.status === "complete" && item.audio_url) {
        audioUrl = item.audio_url;
        actualDurationMs = (item.duration ?? durationSeconds) * 1000;
        break;
      }

      if (item?.status === "error") {
        throw new Error("Suno music generation failed");
      }
    } catch (pollError) {
      if (pollError instanceof Error && pollError.message.includes("Suno")) throw pollError;
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        throw new Error(`Suno polling failed: network error after ${consecutiveErrors} retries`);
      }
    }
  }

  if (!audioUrl) {
    throw new Error("Suno generation timed out after 120 seconds");
  }

  return { audioUrl, title: generationTitle, durationMs: actualDurationMs };
}

// ─── Sound Effect Generation ───────────────────────────────────

async function callSunoSoundEffect(description: string, durationSeconds: number = 5): Promise<{
  audioUrl: string;
  durationMs: number;
}> {
  const apiKey = ENV.sunoApiKey;
  if (!apiKey) throw new Error("SUNO_API_KEY is not configured");

  const resp = await fetch(`${SUNO_BASE_URL}/generate/sound-effects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      text: description,
      duration_seconds: Math.min(durationSeconds, 22),
      make_instrumental: true,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Suno SFX failed (${resp.status}): ${errText}`);
  }

  const data = (await resp.json()) as { id: string; status: string; audio_url?: string };

  // Poll for completion
  let audioUrl = "";
  let actualDurationMs = durationSeconds * 1000;
  let sfxConsecutiveErrors = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));

    try {
      const statusResp = await fetch(`${SUNO_BASE_URL}/feed/${data.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!statusResp.ok) {
        sfxConsecutiveErrors++;
        if (sfxConsecutiveErrors >= 5) {
          throw new Error(`Suno SFX polling failed after ${sfxConsecutiveErrors} consecutive errors`);
        }
        continue;
      }
      sfxConsecutiveErrors = 0;

      const statusData = (await statusResp.json()) as Array<{
        id: string;
        status: string;
        audio_url?: string;
        duration?: number;
      }>;

      const item = statusData.find((s) => s.id === data.id);
      if (item?.status === "complete" && item.audio_url) {
        audioUrl = item.audio_url;
        actualDurationMs = (item.duration ?? durationSeconds) * 1000;
        break;
      }

      if (item?.status === "error") {
        throw new Error("Suno sound effect generation failed");
      }
    } catch (pollError) {
      if (pollError instanceof Error && pollError.message.includes("Suno")) throw pollError;
      sfxConsecutiveErrors++;
      if (sfxConsecutiveErrors >= 5) {
        throw new Error(`Suno SFX polling failed: network error after ${sfxConsecutiveErrors} retries`);
      }
    }
  }

  if (!audioUrl) throw new Error("Sound effect generation timed out");

  return { audioUrl, durationMs: actualDurationMs };
}

// ─── Public Functions ──────────────────────────────────────────

/**
 * Generate background music for a story episode.
 * Returns a URL to the generated music file.
 */
export async function generateStoryMusic(
  request: MusicGenerationRequest
): Promise<MusicGenerationResult> {
  const prompt = buildMusicPrompt(request);
  const result = await callSunoGenerate(prompt, request.durationSeconds);

  // Download and re-upload to our S3 for persistence
  const audioResp = await fetch(result.audioUrl);
  if (!audioResp.ok) throw new Error("Failed to download generated music");

  const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
  const { url } = await storagePut(
    `audio/music/${Date.now()}_${request.mood}.mp3`,
    audioBuffer,
    "audio/mpeg"
  );

  return {
    musicUrl: url,
    durationMs: result.durationMs,
    title: result.title,
  };
}

/**
 * Generate ambient sound effects for a story scene.
 */
export async function generateSoundEffect(
  request: SoundEffectRequest
): Promise<SoundEffectResult> {
  const result = await callSunoSoundEffect(
    request.description,
    request.durationSeconds ?? 10
  );

  // Download and re-upload to our S3
  const audioResp = await fetch(result.audioUrl);
  if (!audioResp.ok) throw new Error("Failed to download sound effect");

  const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
  const { url } = await storagePut(
    `audio/sfx/${Date.now()}.mp3`,
    audioBuffer,
    "audio/mpeg"
  );

  return { effectUrl: url, durationMs: result.durationMs };
}

/**
 * Generate background music matched to a story's dominant mood.
 * Analyzes all page moods and generates music that fits the overall tone.
 */
export async function generateEpisodeMusic(
  theme: string,
  pageMoods: string[],
  estimatedDurationSeconds: number
): Promise<MusicGenerationResult> {
  // Find the dominant mood across all pages
  const moodCounts = new Map<string, number>();
  for (const mood of pageMoods) {
    moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
  }

  let dominantMood = "warm";
  let maxCount = 0;
  for (const [mood, count] of moodCounts) {
    if (count > maxCount) {
      dominantMood = mood;
      maxCount = count;
    }
  }

  const musicMood = storyMoodToMusicMood(dominantMood);

  // Build a descriptive prompt that covers the story arc
  const moodProgression = pageMoods.map((m) => storyMoodToMusicMood(m));
  const uniqueMoods = [...new Set(moodProgression)];
  const progressionDesc =
    uniqueMoods.length > 1
      ? `The music should subtly transition through these moods: ${uniqueMoods.join(" → ")}.`
      : "";
  return generateStoryMusic({
    theme,
    mood: musicMood,
    durationSeconds: estimatedDurationSeconds,
    description: `Background music for a children's bedtime story. ${progressionDesc} Should loop smoothly and not overpower narration. Keep volume gentle and consistent.`,
    instrumental: true,
  });
}

/**
 * Generate scene-specific ambient sound effects for a page.
 */
export async function generatePageSoundEffect(
  theme: string,
  mood: string,
  sceneDescription: string
): Promise<SoundEffectResult> {
  const themeAmbient = THEME_AMBIENT_SOUNDS[theme] ?? THEME_AMBIENT_SOUNDS["Enchanted Forest"];
  const ambientHint = themeAmbient[Math.floor(Math.random() * themeAmbient.length)];

  return generateSoundEffect({
    description: `Gentle ${ambientHint} sound effect. ${sceneDescription}. Soft and child-friendly, suitable for a ${mood} scene in a ${theme} story. Not too loud or startling.`,
    durationSeconds: 8,
  });
}
