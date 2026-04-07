import { ENV } from "./env";

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
};

export type GeneratedEpisode = {
  title: string;
  summary: string;
  characters: { name: string; traits: string[]; voiceRole: string }[];
  pages: GeneratedPage[];
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
    return `TARGET: Toddler (age ${age}). Use very simple words (1-2 syllables). Short sentences (5-8 words). Lots of repetition and rhyming. Onomatopoeia (whoosh, splash, roar). Each page: 2-3 sentences max. Focus on sensory experiences. Always end happily and safely.`;
  }
  if (age <= 5) {
    return `TARGET: Preschooler (age ${age}). Simple but varied vocabulary. Sentences of 8-12 words. Introduce 1-2 new words per page. Light humor and wordplay. Each page: 3-5 sentences. Stories should have clear beginning, middle, end. Gentle lessons woven naturally.`;
  }
  if (age <= 8) {
    return `TARGET: Early reader (age ${age}). Rich vocabulary with context clues for new words. Sentences of 10-15 words. Use metaphors and similes. Each page: 3-4 paragraphs. Include dialogue between characters. Mild suspense is okay but always resolve positively.`;
  }
  return `TARGET: Independent reader (age ${age}). Sophisticated vocabulary and complex sentences. Literary devices (foreshadowing, irony). Each page: 3-5 substantial paragraphs. Nuanced characters with growth arcs. Themes can explore deeper emotions. Still age-appropriate.`;
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
  child: ChildProfile,
  arc: StoryArcContext,
  episodeNumber: number
): string {
  const ageGuide = getAgeGuidance(child.age);
  const heroName = child.nickname ?? child.name;
  const ndGuide =
    child.isNeurodivergent && child.neurodivergentProfiles?.length
      ? getNeurodivergentGuidance(child.neurodivergentProfiles)
      : "";

  const imageStyle = buildImageStyleGuide(child, arc.theme);

  return `You are a world-class children's story author creating a personalized bedtime story.

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

IMAGE PROMPT GUIDELINES:
${imageStyle}

VOICE FORMAT:
Use multi-voice format for narration. Each line must start with a speaker label:
- "NARRATOR: " for narration and scene-setting
- "CHARACTER_NAME: " for dialogue (use the actual character's name)

OUTPUT FORMAT:
Return valid JSON with this exact structure:
{
  "title": "Episode title",
  "summary": "2-3 sentence summary",
  "characters": [
    { "name": "character name", "traits": ["trait1", "trait2"], "voiceRole": "narrator|child_hero|wise_old|friendly_creature|villain_silly|magical_being|animal_small|animal_large|robot_friendly" }
  ],
  "pages": [
    {
      "text": "NARRATOR: narration text\\nCHARACTER: dialogue",
      "imagePrompt": "Detailed watercolor illustration prompt describing this specific scene. Include character appearance, setting details, mood, and action. ${imageStyle}",
      "mood": "exciting|calm|mysterious|adventurous|warm|funny|reassuring|triumphant"
    }
  ]
}

Generate exactly 6 pages. Make ${heroName} the hero. The story should feel complete for this episode while building toward the larger arc. End on a warm, satisfying note appropriate for bedtime.

Each imagePrompt must be a complete, detailed description for an AI image generator to create a unique watercolor illustration. Include specific visual details about colors, composition, characters, and environment.`;
}

// ─── Build Recommendation Prompt ───────────────────────────────
function buildRecommendationPrompt(child: ChildProfile): string {
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

Return JSON array of 10 objects:
[{
  "title": "Story title",
  "theme": "one of: Space Adventure, Ocean Exploration, Enchanted Forest, Dinosaur World, Pirate Voyage, Robot Friends, Fairy Kingdom, Safari Journey, Arctic Expedition, Medieval Quest, Jungle Trek, Candy Land, Musical Adventure, Secret Garden",
  "educationalValue": "one of: Kindness, Bravery, Sharing, Honesty, Curiosity, Friendship, Patience, Empathy, Resilience, Gratitude, Teamwork, Creativity, Respect, Responsibility, Perseverance, Generosity",
  "synopsis": "2-3 sentence synopsis",
  "imagePrompt": "Cover illustration prompt in watercolor style",
  "whyRecommended": "Why this story is perfect for this child",
  "ageAppropriate": true,
  "estimatedEpisodes": 5
}]`;
}

// ─── API Calls ─────────────────────────────────────────────────
async function callClaudeAPI(prompt: string): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ENV.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
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
  const raw = await callClaudeAPI(prompt);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse episode JSON from Claude response");

  const parsed = JSON.parse(jsonMatch[0]) as GeneratedEpisode;
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
  child: ChildProfile,
  storyText: string,
  mood: string,
  theme: string,
  pageNumber: number
): Promise<string> {
  const imageStyle = buildImageStyleGuide(child, theme);

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
