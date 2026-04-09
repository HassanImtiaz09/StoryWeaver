import { ENV } from "./env";

// ─── Prompt Input Sanitization ────────────────────────────────
// All user-provided text is sanitized before being interpolated into
// LLM prompts to prevent prompt injection attacks. This limits each
// field to alphanumeric characters, basic punctuation, and spaces,
// and enforces a maximum length per field.

const MAX_FIELD_LENGTH = 100;
const MAX_ARRAY_ITEMS = 20;

/** Strip characters that could be used for prompt injection. */
function sanitizeField(value: string | undefined | null, maxLen = MAX_FIELD_LENGTH): string {
  if (!value) return "";
  // Allow letters (any script), digits, spaces, hyphens, apostrophes, commas, periods
  return value.replace(/[^\p{L}\p{N}\s\-',.\u0600-\u06FF\u0900-\u097F\u3040-\u30FF\u4E00-\u9FFF]/gu, "")
    .trim()
    .slice(0, maxLen);
}

/** Sanitize an array of strings (e.g., interests, traits). */
function sanitizeArray(arr: string[] | undefined | null, maxLen = MAX_FIELD_LENGTH): string[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .slice(0, MAX_ARRAY_ITEMS)
    .map((item) => sanitizeField(item, maxLen))
    .filter((item) => item.length > 0);
}

/** Build a sanitized copy of a ChildProfile for use in prompts. */
function sanitizeChildProfile(child: ChildProfile): ChildProfile {
  return {
    ...child,
    name: sanitizeField(child.name, 50),
    nickname: sanitizeField(child.nickname, 50) || undefined,
    gender: sanitizeField(child.gender, 30) || undefined,
    interests: sanitizeArray(child.interests),
    personalityTraits: sanitizeArray(child.personalityTraits) || undefined,
    fears: sanitizeArray(child.fears) || undefined,
    favoriteColor: sanitizeField(child.favoriteColor, 30) || undefined,
    favoriteCharacter: sanitizeField(child.favoriteCharacter, 60) || undefined,
    readingLevel: sanitizeField(child.readingLevel, 30) || undefined,
    language: sanitizeField(child.language, 30) || undefined,
    hairColor: sanitizeField(child.hairColor, 30) || undefined,
    skinTone: sanitizeField(child.skinTone, 30) || undefined,
    communicationStyle: sanitizeField(child.communicationStyle, 50) || undefined,
    storyPacing: sanitizeField(child.storyPacing, 30) || undefined,
  };
}

/** Sanitize a StoryArcContext before interpolation. */
function sanitizeArcContext(arc: StoryArcContext): StoryArcContext {
  return {
    ...arc,
    title: sanitizeField(arc.title, 150),
    theme: sanitizeField(arc.theme, 100),
    educationalValue: sanitizeField(arc.educationalValue, 100),
    previousEpisodeSummary: arc.previousEpisodeSummary
      ? sanitizeField(arc.previousEpisodeSummary, 500)
      : undefined,
  };
}

// ─── Types ─────────────────────────────────────────────────────

export type NeurodivergentInfo = {
  type: string;
  sensoryPreferences?: string[];
  communicationStyle?: string;
  storyPacing?: string;
  customNotes?: string;
};

export type ChildProfile = {
  name: string;
  age: number;
  gender?: string;
  interests: string[];
  personalityTraits?: string[];
  fears?: string[];
  favoriteColor?: string;
  readingLevel?: string;
  language?: string;
  hairColor?: string;
  skinTone?: string;
  nickname?: string;
  favoriteCharacter?: string;
  isNeurodivergent?: boolean;
  neurodivergentProfiles?: NeurodivergentInfo[];
  sensoryPreferences?: string[];
  communicationStyle?: string;
  storyPacing?: string;
};

export type StoryArcContext = {
  title: string;
  theme: string;
  educationalValue: string;
  totalEpisodes: number;
  currentEpisode: number;
  previousEpisodeSummary?: string;
};

export type GeneratedPage = {
  text: string;
  imagePrompt: string;
  mood: string;
  sceneDescription: string;
  soundEffectHint: string;
};

export type GeneratedEpisode = {
  title: string;
  summary: string;
  characters: { name: string; traits: string[]; voiceRole: string }[];
  pages: GeneratedPage[];
  musicMood: string;
  estimatedReadTimeMinutes: number;
};

export type StoryRecommendation = {
  title: string;
  theme: string;
  educationalValue: string;
  synopsis: string;
  imagePrompt: string;
  whyRecommended: string;
  ageAppropriate: boolean;
  estimatedEpisodes: number;
};

// ─── Age Guidance ──────────────────────────────────────────────

function getAgeGuidance(age: number): string {
  if (age <= 3) {
    return `TARGET: Toddler (age ${age}). Use very simple words (1-2 syllables). Short sentences (5-8 words). Lots of repetition and rhyming. Onomatopoeia (whoosh, splash, roar). Each page: 3-5 sentences for a richer experience. Focus on sensory experiences. Always end happily and safely. Add interactive moments ("Can you roar like a dinosaur?").`;
  }
  if (age <= 5) {
    return `TARGET: Preschooler (age ${age}). Simple but varied vocabulary. Sentences of 8-12 words. Introduce 1-2 new words per page. Light humor and wordplay. Each page: 5-8 sentences with descriptive detail. Stories should have clear beginning, middle, end. Gentle lessons woven naturally. Include moments of wonder and discovery.`;
  }
  if (age <= 8) {
    return `TARGET: Early reader (age ${age}). Rich vocabulary with context clues for new words. Sentences of 10-15 words. Use metaphors and similes. Each page: 2-3 paragraphs of 4-6 sentences each. Include meaningful dialogue between characters that reveals personality. Mild suspense is okay but always resolve positively. Add sensory details (sounds, smells, textures).`;
  }
  return `TARGET: Independent reader (age ${age}). Sophisticated vocabulary and complex sentences. Literary devices (foreshadowing, irony). Each page: 3-5 substantial paragraphs with rich descriptions. Nuanced characters with growth arcs. Themes can explore deeper emotions. Internal monologue and character reflection. Still age-appropriate but intellectually engaging.`;
}

// ─── Neurodivergent Guidance ───────────────────────────────────

function getNeurodivergentGuidance(profiles: NeurodivergentInfo[]): string {
  const sections: string[] = [];

  for (const p of profiles) {
    switch (p.type) {
      case "autism":
        sections.push(`
AUTISM SPECTRUM ADAPTATIONS:
- Use clear, literal language. Avoid idioms, sarcasm, or ambiguous phrases.
- Provide explicit emotional labels: "Maya felt happy because..." not just "Maya smiled."
- Include structured, predictable story patterns (beginning signal, middle events, clear ending).
- Social situations should be explained step-by-step: what happened, why, how characters feel.
- Include a character who models asking for help or expressing needs directly.
- Routines and sequences in the story should be consistent.
- Sensory descriptions should be gentle and specific rather than overwhelming.
- Include moments where being different is celebrated as a strength.`);
        break;

      case "adhd":
        sections.push(`
ADHD ADAPTATIONS:
- Keep paragraphs SHORT (2-3 sentences max per paragraph).
- Use frequent scene changes and action to maintain engagement.
- Each page should have a mini-cliffhanger or exciting hook.
- Include physical action: running, jumping, building, exploring.
- Vary sentence length dramatically for rhythm: long, then short. Punchy.
- Use bold character emotions and exaggerated reactions.
- Include moments where the hero's energy/impulsivity saves the day.
- Avoid long descriptive passages. Show, don't tell.`);
        break;

      case "dyslexia":
        sections.push(`
DYSLEXIA ADAPTATIONS:
- Use shorter, simpler sentences (8-10 words max).
- Avoid words that look similar (was/saw, on/no, there/their).
- Use high-frequency, phonetically regular words when possible.
- Keep paragraphs to 2-3 sentences.
- Repeat key vocabulary naturally so the reader gains confidence.
- Use dialogue heavily (it's easier to follow than narration).
- Include context clues for any harder words.
- Each page should be visually simple with fewer words.`);
        break;

      case "anxiety":
        sections.push(`
ANXIETY ADAPTATIONS:
- Begin each page/scene with a grounding detail (a safe place, a warm feeling).
- Challenges should be introduced gradually, never as sudden shocks.
- Always provide a "safety net" character or object the hero can rely on.
- Include breathing/calming moments: "The hero took a deep breath and felt calmer."
- Fears should be faced in tiny, manageable steps with support.
- Endings must be explicitly safe and reassuring.
- Include affirmations: "You are brave. You are safe. You are loved."
- Never include scenes of abandonment or being truly lost without help nearby.`);
        break;

      case "sensory":
        sections.push(`
SENSORY PROCESSING ADAPTATIONS:
- Be intentional about sensory descriptions. Label them: "a soft sound," "a bright color."
- Avoid describing overwhelming sensory environments (loud crowds, flashing lights).
- Include moments where the hero manages sensory input: "It was too loud, so Maya covered her ears and hummed her favorite song."
- Describe textures, temperatures, and sounds gently.
- Include sensory "safe spaces" in the story world.
- Normalize sensory needs: characters can ask for quiet, dim lights, or soft clothes.`);
        break;

      case "giftedness":
        sections.push(`
GIFTED/TWICE-EXCEPTIONAL ADAPTATIONS:
- Include intellectually stimulating puzzles, riddles, or mysteries within the story.
- Use advanced vocabulary appropriate for the child's actual reading ability.
- Explore philosophical or ethical questions naturally through the narrative.
- Include characters who think differently and are celebrated for it.
- Allow for complexity and ambiguity in character motivations.
- Include humor that rewards careful reading (wordplay, clever references).
- Address the emotional experience of feeling "different" from peers.`);
        break;
    }
  }

  if (profiles.some((p) => p.sensoryPreferences?.length)) {
    const prefs = profiles.flatMap((p) => p.sensoryPreferences ?? []);
    sections.push(`SENSORY PREFERENCES: ${prefs.join("; ")}`);
  }

  if (profiles.some((p) => p.communicationStyle)) {
    const styles = profiles.map((p) => p.communicationStyle).filter(Boolean);
    sections.push(`COMMUNICATION STYLE: ${styles.join("; ")}`);
  }

  if (profiles.some((p) => p.storyPacing)) {
    const pacing = profiles[0]?.storyPacing ?? "moderate";
    const pacingMap: Record<string, string> = {
      calm: "PACING: Slow and gentle. Longer descriptive passages. Fewer scene changes. Soothing rhythm.",
      moderate: "PACING: Balanced. Mix of action and reflection. Standard scene transitions.",
      engaging: "PACING: Fast and dynamic. Quick scene changes. Lots of action. Short punchy paragraphs.",
    };
    sections.push(pacingMap[pacing] ?? "");
  }

  if (profiles.some((p) => p.customNotes)) {
    const notes = profiles.map((p) => p.customNotes).filter(Boolean);
    sections.push(`PARENT NOTES: ${notes.join("; ")}`);
  }

  return sections.join("\n\n");
}

// ─── Image Prompt Builder ──────────────────────────────────────

function buildImageStyleGuide(child: ChildProfile, theme: string): string {
  return `Style: Warm watercolor children's book illustration, soft dreamy lighting, gentle colors, no text overlays, safe for children.
Character: A ${child.age}-year-old ${child.gender ?? "child"} with ${child.hairColor ?? "brown"} hair and ${child.skinTone ?? "warm"} skin tone, wearing clothes in ${child.favoriteColor ?? "blue"} tones.
Setting: ${theme} themed environment.
Mood: Magical, warm, and inviting. Golden bedtime lighting.
IMPORTANT: Illustration only, no words or letters in the image. Suitable for professional printing at 300 DPI.`;
}

// ─── Build Episode Prompt ──────────────────────────────────────

function buildEpisodeGenerationPrompt(
  rawChild: ChildProfile,
  rawArc: StoryArcContext,
  episodeNumber: number
): string {
  const child = sanitizeChildProfile(rawChild);
  const arc = sanitizeArcContext(rawArc);
  const ageGuide = getAgeGuidance(child.age);
  const heroName = child.nickname ?? child.name;
  const ndGuide =
    child.isNeurodivergent && child.neurodivergentProfiles?.length
      ? getNeurodivergentGuidance(child.neurodivergentProfiles)
      : "";

  const imageStyle = buildImageStyleGuide(child, arc.theme);

  const pageCount = child.age <= 3 ? 8 : child.age <= 5 ? 10 : 12;

  return `You are a world-class children's story author creating a personalized bedtime story. Create a RICH, DETAILED, ENGAGING story that children will love listening to.

STORY CONTEXT:
- Series: "${arc.title}"
- Theme: ${arc.theme}
- Educational Value: ${arc.educationalValue}
- Episode ${episodeNumber} of ${arc.totalEpisodes}
${arc.previousEpisodeSummary ? `- Previous Episode: ${arc.previousEpisodeSummary}` : "- This is the first episode."}

CHILD PROFILE:
- Hero Name: ${heroName} (age ${child.age})
- Gender: ${child.gender ?? "unspecified"}
- Interests: ${child.interests.join(", ")}
${child.personalityTraits?.length ? `- Personality: ${child.personalityTraits.join(", ")}` : ""}
${child.fears?.length ? `- Fears to gently address: ${child.fears.join(", ")}` : ""}
${child.favoriteColor ? `- Favorite color: ${child.favoriteColor} (feature in scenes)` : ""}
${child.favoriteCharacter ? `- Favorite character/hero: ${child.favoriteCharacter} (incorporate a similar archetype)` : ""}
${child.language && child.language !== "English" ? `- Include occasional ${child.language} words/phrases with context` : ""}

${ageGuide}

${ndGuide ? `\n--- NEURODIVERGENT STORY ADAPTATIONS ---\n${ndGuide}\n---` : ""}

CRITICAL STORYTELLING REQUIREMENTS:
1. STORY LENGTH: Generate exactly ${pageCount} pages. Each page must have SUBSTANTIAL content — not just 1-2 sentences.
2. ENGAGEMENT: Every page should hook the listener. Use vivid sensory details, character emotions, dialogue, and mini-discoveries.
3. PACING: Build tension gradually. Pages 1-2: introduce setting and characters. Pages 3-${Math.floor(pageCount * 0.4)}: rising action with discoveries and challenges. Pages ${Math.floor(pageCount * 0.4) + 1}-${Math.floor(pageCount * 0.8)}: climax and resolution. Final pages: warm wind-down for bedtime.
4. CHARACTERS: Give each character a distinct personality and speaking style. Use at least 3 named characters with meaningful dialogue. The hero (${heroName}) should speak frequently.
5. DIALOGUE: At least 40% of the story should be dialogue. Characters should have back-and-forth conversations, not just single lines.
6. DESCRIPTIONS: Each scene should paint a vivid picture — describe colors, sounds, smells, textures. Make the listener FEEL like they're there.
7. EMOTIONAL ARC: The story should take the listener on an emotional journey: curiosity → excitement → challenge → triumph → warmth → sleepiness.
8. BEDTIME ENDING: The final 2 pages must gently wind down. Use calming language, slowing pace, mentions of stars/moon/sleep/dreams. End with the hero feeling safe, loved, and ready for sleep.

VOICE FORMAT (CRITICAL — follow exactly):
Each line of text MUST start with a speaker label:
- "NARRATOR: " for all narration, scene-setting, descriptions, and transitions
- "CHARACTER_NAME: " for dialogue (use the exact character name, e.g., "LUNA: ", "${heroName.toUpperCase()}: ")
Mix narration and dialogue naturally. NARRATOR lines should describe what characters do and feel between dialogue lines.

Example of good multi-voice format:
NARRATOR: The cave sparkled with a thousand tiny crystals, each one catching the moonlight and sending rainbow reflections dancing across the walls.
${heroName.toUpperCase()}: "Wow, it's like being inside a giant snow globe!" ${heroName} whispered, eyes wide with wonder.
LUNA: "Shh," the fairy giggled softly, pressing a tiny finger to her lips. "The crystals are sleeping. If we're gentle, they'll sing for us."
NARRATOR: ${heroName} tiptoed forward, heart racing with excitement. The air smelled like fresh rain and something sweet — like honey mixed with starlight.

IMAGE PROMPT GUIDELINES:
${imageStyle}

OUTPUT FORMAT:
Return valid JSON with this exact structure:
{
  "title": "Episode title (creative and evocative)",
  "summary": "3-4 sentence summary capturing the emotional arc",
  "musicMood": "whimsical|adventurous|calm|mysterious|triumphant|playful|dreamy|exciting|warm|magical",
  "estimatedReadTimeMinutes": <number based on word count, roughly 150 words per minute for narration>,
  "characters": [
    { "name": "CHARACTER_NAME", "traits": ["trait1", "trait2", "trait3"], "voiceRole": "narrator|child_hero|wise_old|friendly_creature|villain_silly|magical_being|animal_small|animal_large|robot_friendly" }
  ],
  "pages": [
    {
      "text": "NARRATOR: Rich narration text...\\nCHARACTER: \\"Dialogue here.\\"\\nNARRATOR: More narration...",
      "imagePrompt": "Detailed watercolor illustration prompt for this scene. ${imageStyle}",
      "mood": "exciting|calm|mysterious|adventurous|warm|funny|reassuring|triumphant",
      "sceneDescription": "Brief 1-sentence description of the visual scene for sound effect matching",
      "soundEffectHint": "Brief description of ambient sounds that would enhance this scene (e.g., 'gentle forest sounds with birdsong', 'underwater bubbles and whale songs')"
    }
  ]
}

Generate exactly ${pageCount} pages. Make ${heroName} the hero. The story should feel COMPLETE for this episode while building toward the larger arc. Every page should be richly detailed and engaging. The story should be long enough to be a satisfying 5-8 minute listening experience when narrated aloud.

IMPORTANT: Each page's text should be at LEAST 100 words. Short pages make the story feel rushed and unsatisfying. Take your time with descriptions, dialogue, and emotional moments.`;
}

// ─── Build Recommendation Prompt ───────────────────────────────
function buildRecommendationPrompt(rawChild: ChildProfile): string {
  const child = sanitizeChildProfile(rawChild);
  const ndContext =
    child.isNeurodivergent && child.neurodivergentProfiles?.length
      ? `\nThe child is neurodivergent (${child.neurodivergentProfiles
          .map((p) => p.type)
          .join(", ")}). Recommend stories that are especially well-suited for their needs.`
      : "";

  return `Generate 10 personalized story recommendations for a ${child.age}-year-old named ${child.name}.

PROFILE:
- Interests: ${child.interests.join(", ")}
${child.personalityTraits?.length ? `- Personality: ${child.personalityTraits.join(", ")}` : ""}
${child.fears?.length ? `- Fears: ${child.fears.join(", ")}` : ""}
${ndContext}

For each recommendation, create a VIVID, APPEALING cover image prompt that will generate a beautiful watercolor-style children's book cover. The cover should feature the theme prominently and look magical and inviting.

Return JSON array of 10 objects:
[{
  "title": "Creative, evocative story title",
  "theme": "one of: Space Adventure, Ocean Exploration, Enchanted Forest, Dinosaur World, Pirate Voyage, Robot Friends, Fairy Kingdom, Safari Journey, Arctic Expedition, Medieval Quest, Jungle Trek, Candy Land, Musical Adventure, Secret Garden",
  "educationalValue": "one of: Kindness, Bravery, Sharing, Honesty, Curiosity, Friendship, Patience, Empathy, Resilience, Gratitude, Teamwork, Creativity, Respect, Responsibility, Perseverance, Generosity",
  "synopsis": "3-4 sentence synopsis that makes the story sound irresistible",
  "imagePrompt": "Detailed watercolor children's book COVER illustration. Show [specific scene/characters]. Style: warm magical watercolor, soft dreamy lighting, no text. Feature a ${child.age}-year-old ${child.gender ?? "child"} as the hero. ${child.favoriteColor ? `Include ${child.favoriteColor} tones.` : ""} Professional quality, enchanting and inviting.",
  "whyRecommended": "Personal reason why this is perfect for ${child.name}",
  "ageAppropriate": true,
  "estimatedEpisodes": 5
}]`;
}

// ─── API Calls ─────────────────────────────────────────────────

async function callClaudeAPI(prompt: string, maxTokens: number = 16000): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ENV.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text ?? "";
  return text;
}

async function callClaudeAPIRaw(prompt: string): Promise<string> {
  return callClaudeAPI(prompt);
}

// ─── Public Functions ──────────────────────────────────────────

export async function generateEpisodeWithClaude(
  child: ChildProfile,
  arc: StoryArcContext,
  episodeNumber: number
): Promise<GeneratedEpisode> {
  const prompt = buildEpisodeGenerationPrompt(child, arc, episodeNumber);
  const raw = await callClaudeAPI(prompt, 16000);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse episode JSON from Claude response");

  const parsed = JSON.parse(jsonMatch[0]) as GeneratedEpisode;

  // Validate minimum page count and content length
  if (parsed.pages.length < 6) {
    throw new Error(`Episode only has ${parsed.pages.length} pages, minimum is 6`);
  }

  // Add default sceneDescription and soundEffectHint if missing
  for (const page of parsed.pages) {
    if (!page.sceneDescription) {
      page.sceneDescription = page.imagePrompt?.substring(0, 100) ?? "A magical scene";
    }
    if (!page.soundEffectHint) {
      page.soundEffectHint = `Gentle ${arc.theme.toLowerCase()} ambient sounds`;
    }
  }

  // Set defaults for new fields
  if (!parsed.musicMood) parsed.musicMood = "whimsical";
  if (!parsed.estimatedReadTimeMinutes) {
    const totalWords = parsed.pages.reduce((sum, p) => sum + p.text.split(/\s+/).length, 0);
    parsed.estimatedReadTimeMinutes = Math.ceil(totalWords / 150);
  }

  return parsed;
}

export async function generateStoryArcWithClaude(
  child: ChildProfile,
  theme: string,
  educationalValue: string,
  totalEpisodes: number
): Promise<{ title: string; synopsis: string }> {
  const ndContext =
    child.isNeurodivergent && child.neurodivergentProfiles?.length
      ? `\nThis child is neurodivergent (${child.neurodivergentProfiles.map((p) => p.type).join(", ")}). The story arc should be especially well-suited for their needs.`
      : "";

  const prompt = `Create a children's story arc title and synopsis.
Child: ${child.name}, age ${child.age}
Theme: ${theme}
Educational Value: ${educationalValue}
Total Episodes: ${totalEpisodes}
Interests: ${child.interests.join(", ")}
${ndContext}

Return JSON: { "title": "creative story arc title", "synopsis": "2-3 sentence synopsis" }`;

  const raw = await callClaudeAPI(prompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse arc JSON");
  return JSON.parse(jsonMatch[0]);
}

export async function generateRecommendations(
  child: ChildProfile
): Promise<StoryRecommendation[]> {
  const prompt = buildRecommendationPrompt(child);
  const raw = await callClaudeAPI(prompt);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse recommendations JSON");
  return JSON.parse(jsonMatch[0]);
}

export async function generatePageImagePrompt(
  rawChild: ChildProfile,
  storyText: string,
  mood: string,
  theme: string,
  pageNumber: number
): Promise<string> {
  const child = sanitizeChildProfile(rawChild);
  const imageStyle = buildImageStyleGuide(child, sanitizeField(theme, 100));

  const prompt = `Create a detailed image generation prompt for a children's book illustration.

Story Text: "${storyText.substring(0, 500)}"
Mood: ${mood}
Page: ${pageNumber}

${imageStyle}

Return ONLY the image prompt text, nothing else. The prompt should describe:
1. The exact scene composition
2. Character positions and expressions
3. Background environment details
4. Color palette and lighting
5. Emotional tone
6. Art style: watercolor, soft edges, warm tones, children's book illustration, 300 DPI print quality`;

  const raw = await callClaudeAPI(prompt);
  return raw.trim();
}

export { getAgeGuidance, getNeurodivergentGuidance, buildImageStyleGuide };
