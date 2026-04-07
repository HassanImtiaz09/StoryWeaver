/**
 * Claude-powered Story Generation Engine for StoryWeaver
 * Uses Anthropic's Claude API for high-quality children's story generation.
 */
import { ENV } from "./env";
import { invokeLLM, type InvokeResult } from "./llm";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type ChildProfile = {
  name: string;
  age: number;
  gender?: string;
  interests: string[];
  hairColor?: string;
  skinTone?: string;
  favoriteColor?: string;
  personalityTraits?: string[];
  fears?: string[];
  language?: string;
  readingLevel?: string;
};

export type StoryArcContext = {
  title: string;
  theme: string;
  educationalValue: string;
  synopsis: string;
  totalEpisodes: number;
  currentEpisode: number;
  previousEpisodeSummaries: string[];
  recurringCharacters?: Array<{ name: string; traits: string; voiceRole: string }>;
};

export type GeneratedEpisode = {
  title: string;
  summary: string;
  characters: Array<{ name: string; traits: string; voiceRole: string }>;
  pages: Array<{
    text: string;
    imagePrompt: string;
    mood: string;
  }>;
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

function getAgeGuidance(age: number): string {
  if (age <= 3) {
    return "VOCABULARY: Very simple words (1-2 syllables). Short sentences (5-8 words). Lots of repetition. Onomatopoeia. TONE: Gentle, sing-song. PAGES: 2-3 short paragraphs.";
  }
  if (age <= 5) {
    return "VOCABULARY: Simple but varied. Sentences 8-12 words. 1-2 new big words per page. Simple similes. TONE: Warm, enthusiastic, full of wonder. PAGES: 2-3 paragraphs.";
  }
  if (age <= 8) {
    return "VOCABULARY: Rich with context-embedded learning. 10-15 word sentences. Metaphors welcome. TONE: Engaging, adventurous, humorous. PAGES: 3-4 paragraphs.";
  }
  return "VOCABULARY: Sophisticated. Complex sentences. Literary devices. TONE: Mature with nuance. PAGES: 3-5 paragraphs with world-building.";
}

function buildEpisodeGenerationPrompt(child: ChildProfile, arc: StoryArcContext, episodeNumber: number): string {
  const ageGuide = getAgeGuidance(child.age);
  const isFirstEpisode = episodeNumber === 1;
  const isFinalEpisode = episodeNumber === arc.totalEpisodes;

  const personalityNote = child.personalityTraits?.length
    ? `The child's personality traits: ${child.personalityTraits.join(", ")}. Weave these into how ${child.name} responds to challenges.`
    : "";

  const fearsNote = child.fears?.length
    ? `The child has fears about: ${child.fears.join(", ")}. The story should gently address and overcome these fears.`
    : "";

  return `You are a world-class children's story writer creating a bedtime story episode.

CHILD PROFILE:
Name: ${child.name} (the HERO)
Age: ${child.age}, Gender: ${child.gender || "not specified"}
Interests: ${child.interests.join(", ")}
${child.hairColor ? "Hair: " + child.hairColor : ""}
${child.skinTone ? "Skin tone: " + child.skinTone : ""}
${child.favoriteColor ? "Favorite color: " + child.favoriteColor + " (feature this!)" : ""}
${personalityNote}
${fearsNote}

AGE GUIDELINES: ${ageGuide}

STORY ARC: "${arc.title}" - Theme: ${arc.theme}, Value: ${arc.educationalValue}
Synopsis: ${arc.synopsis}
Episode: ${episodeNumber} of ${arc.totalEpisodes}
${arc.previousEpisodeSummaries.length > 0 ? "PREVIOUS: " + arc.previousEpisodeSummaries.map((s, i) => "Ep" + (i+1) + ": " + s).join("; ") : ""}

EPISODE TYPE: ${isFirstEpisode ? "FIRST - Introduce world and characters with wonder." : isFinalEpisode ? "FINAL - Satisfying conclusion with warm wind-down." : "MIDDLE - Advance quest with new challenges."}

MULTI-VOICE FORMAT (CRITICAL):
NARRATOR: Descriptive text here.
CHARACTER_NAME: "Dialogue here."

SENSORY RICHNESS: Every page needs 2+ sensory details (sight, sound, touch, smell).

BEDTIME PACING: Pages 1-2 engaging, 3-4 adventurous, 5-6 calming wind-down.

OUTPUT JSON:
{
  "title": "Episode title",
  "summary": "2-3 sentence summary",
  "characters": [{ "name": "NAME", "traits": "description", "voiceRole": "narrator|child_hero|wise_old|friendly_creature|villain_silly|magical_being|animal_small|animal_large|robot_friendly" }],
  "pages": [{ "text": "Page text with voice markers", "imagePrompt": "Illustration prompt", "mood": "exciting|calm|mysterious|adventurous|warm|funny" }]
}

Generate EXACTLY 6 pages. Make it magical.`;
}

function buildRecommendationPrompt(child: ChildProfile): string {
  return `You are a children's literature expert. Generate 10 personalized story arc recommendations.

CHILD: ${child.name}, age ${child.age}, interests: ${child.interests.join(", ")}
${child.personalityTraits?.length ? "Personality: " + child.personalityTraits.join(", ") : ""}
${child.fears?.length ? "Fears to address: " + child.fears.join(", ") : ""}
${child.favoriteColor ? "Favorite color: " + child.favoriteColor : ""}

REQUIREMENTS: 10 unique recommendations, different themes/settings/values, magical titles, mix genres.
Each should have whyRecommended explaining personalization. Image prompts for cover art.

Return JSON: { "recommendations": [{ "title": "...", "theme": "...", "educationalValue": "...", "synopsis": "...", "imagePrompt": "...", "whyRecommended": "...", "ageAppropriate": true, "estimatedEpisodes": 5-10 }] }`;
}

export async function generateEpisodeWithClaude(child: ChildProfile, arc: StoryArcContext, episodeNumber: number): Promise<GeneratedEpisode> {
  const systemPrompt = buildEpisodeGenerationPrompt(child, arc, episodeNumber);

  if (ENV.anthropicApiKey) {
    return callClaudeAPI(systemPrompt, `Generate episode ${episodeNumber} of "${arc.title}" now. Make it unforgettable.`);
  }

  const result = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate episode ${episodeNumber} of "${arc.title}" now.` },
    ],
    response_format: { type: "json_object" },
  });
  return parseEpisodeResponse(result);
}

export async function generateRecommendations(child: ChildProfile): Promise<StoryRecommendation[]> {
  const systemPrompt = buildRecommendationPrompt(child);

  if (ENV.anthropicApiKey) {
    const result = await callClaudeAPIRaw(systemPrompt, `Generate 10 personalized story recommendations for ${child.name}.`);
    try { return JSON.parse(result).recommendations || []; } catch { return []; }
  }

  const result = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate 10 recommendations for ${child.name}.` },
    ],
    response_format: { type: "json_object" },
  });
  try {
    const content = result.choices[0].message.content;
    return JSON.parse(typeof content === "string" ? content : "{}").recommendations || [];
  } catch { return []; }
}

export async function generateStoryArcWithClaude(child: ChildProfile, theme: string, educationalValue: string): Promise<{ title: string; synopsis: string }> {
  const prompt = `You are a children's story writer. Create a story arc title and synopsis.
CHILD: ${child.name}, age ${child.age}, interests: ${child.interests.join(", ")}
Theme: ${theme}, Educational Value: ${educationalValue}
Create a MAGICAL title and 2-3 sentence synopsis mentioning ${child.name}.
Return JSON: { "title": "...", "synopsis": "..." }`;

  if (ENV.anthropicApiKey) {
    const raw = await callClaudeAPIRaw(prompt, "Generate the story arc title and synopsis.");
    try { return JSON.parse(raw); } catch { return { title: `${child.name}'s ${theme} Adventure`, synopsis: "A magical adventure awaits..." }; }
  }

  const result = await invokeLLM({
    messages: [{ role: "system", content: prompt }, { role: "user", content: "Generate the story arc title and synopsis." }],
    response_format: { type: "json_object" },
  });
  try {
    const content = result.choices[0].message.content;
    return JSON.parse(typeof content === "string" ? content : "{}");
  } catch { return { title: `${child.name}'s ${theme} Adventure`, synopsis: "A magical adventure awaits..." }; }
}

async function callClaudeAPI(systemPrompt: string, userMessage: string): Promise<GeneratedEpisode> {
  const raw = await callClaudeAPIRaw(systemPrompt, userMessage);
  try {
    return JSON.parse(raw) as GeneratedEpisode;
  } catch (e) {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as GeneratedEpisode;
    throw new Error("Failed to parse Claude episode response as JSON");
  }
}

async function callClaudeAPIRaw(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ENV.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Claude API failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
  const textContent = data.content.find((c) => c.type === "text");
  if (!textContent) throw new Error("No text content in Claude response");
  return textContent.text;
}

function parseEpisodeResponse(result: InvokeResult): GeneratedEpisode {
  const content = result.choices[0].message.content;
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  try {
    return JSON.parse(raw) as GeneratedEpisode;
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as GeneratedEpisode;
    throw new Error("Failed to parse episode response");
  }
}
