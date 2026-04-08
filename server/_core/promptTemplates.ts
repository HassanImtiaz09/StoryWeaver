/**
 * Prompt Templates for Story Generation
 * Externalized templates for better maintainability and prompt engineering
 */

import { StoryContext } from "./storyEngine";

/**
 * System prompt for story generation
 */
export const STORY_SYSTEM_PROMPT = `You are a world-class children's story author specializing in personalized, age-appropriate bedtime stories. You create rich, detailed, engaging narratives that children love listening to. Your stories are safe, educational, and emotionally resonant.`;

/**
 * Age-appropriate vocabulary guidelines
 */
export const AGE_VOCABULARY_GUIDELINES: Record<string, string> = {
  "2-4": `Toddler (age 2-4). Use very simple words (1-2 syllables). Short sentences (5-8 words). Lots of repetition and rhyming. Onomatopoeia (whoosh, splash, roar). Each page: 3-5 sentences. Focus on sensory experiences. Always end happily and safely. Add interactive moments ("Can you roar like a dinosaur?").`,

  "5-7": `Preschooler (age 5-7). Simple but varied vocabulary. Sentences of 8-12 words. Introduce 1-2 new words per page. Light humor and wordplay. Each page: 5-8 sentences with descriptive detail. Stories should have clear beginning, middle, end. Gentle lessons woven naturally. Include moments of wonder and discovery.`,

  "8-10": `Early reader (age 8-10). Rich vocabulary with context clues for new words. Sentences of 10-15 words. Use metaphors and similes. Each page: 2-3 paragraphs of 4-6 sentences each. Include meaningful dialogue between characters that reveals personality. Mild suspense is okay but always resolve positively. Add sensory details (sounds, smells, textures).`,

  "11-13": `Independent reader (age 11-13). Sophisticated vocabulary and complex sentences. Literary devices (foreshadowing, irony). Each page: 3-5 substantial paragraphs with rich descriptions. Nuanced characters with growth arcs. Themes can explore deeper emotions. Internal monologue and character reflection. Still age-appropriate but intellectually engaging.`,
};

/**
 * Art style prompts per theme
 */
export const ART_STYLE_PROMPTS: Record<string, string> = {
  space: "Digital illustration, cosmic colors, starfields, bioluminescent planets, friendly spacecraft, soft glowing effects, 300 DPI print quality",
  ocean: "Watercolor style, ocean blues and greens, bioluminescent creatures, coral gardens, soft water effects, dreamy underwater lighting, 300 DPI",
  forest: "Watercolor illustration, misty forest, tall trees, magical glowing mushrooms, soft forest greens and golds, warm dappled sunlight, 300 DPI",
  dinosaur: "Watercolor children's illustration, vibrant prehistoric landscape, friendly dinosaur characters, bright colors, warm sunny lighting, 300 DPI",
  pirate: "Watercolor adventure illustration, pirate ships, treasure maps, tropical islands, bold colors, warm sunset lighting, 300 DPI",
  robot: "Digital illustration, friendly colorful robots, tech environment, glowing buttons and lights, soft metallic sheen, 300 DPI",
  fairy: "Watercolor fantasy, magical forest glades, tiny fairy characters, glowing sparkles, soft pastels, ethereal lighting, 300 DPI",
  safari: "Watercolor illustration, African savanna, friendly animals, acacia trees, warm golden hour lighting, soft earth tones, 300 DPI",
  arctic: "Watercolor snow scenes, ice castles, northern lights, friendly arctic animals, cool blues and purples, magical icy lighting, 300 DPI",
  medieval: "Watercolor fantasy quest, medieval castle, knights, dragons, magical elements, warm torchlight, storybook style, 300 DPI",
  jungle: "Watercolor illustration, lush jungle vegetation, tropical creatures, vines and waterfalls, warm humid colors, dappled sunlight, 300 DPI",
  candy: "Bright watercolor, candy landscapes, sweet pastel colors, gumdrop trees, candy cane elements, magical shimmer effects, 300 DPI",
  musical: "Watercolor illustration, colorful musical notes, magical instruments, dancing characters, bright cheerful colors, warm glowing lighting, 300 DPI",
  garden: "Watercolor botanical illustration, secret garden, blooming flowers, magical plants, soft pastels, golden hour sunlight, 300 DPI",
};

/**
 * Build a system prompt for character voice instruction
 */
export function buildVoiceFormatPrompt(): string {
  return `VOICE FORMAT (CRITICAL — follow exactly):
Each line of text MUST start with a speaker label:
- "NARRATOR: " for all narration, scene-setting, descriptions, and transitions
- "CHARACTER_NAME: " for dialogue (use the exact character name in UPPERCASE)

Mix narration and dialogue naturally. NARRATOR lines should describe what characters do and feel between dialogue lines.

Example of good multi-voice format:
NARRATOR: The cave sparkled with a thousand tiny crystals, each one catching the moonlight and sending rainbow reflections dancing across the walls.
MAYA: "Wow, it's like being inside a giant snow globe!" Maya whispered, eyes wide with wonder.
LUNA: "Shh," the fairy giggled softly, pressing a tiny finger to her lips. "The crystals are sleeping. If we're gentle, they'll sing for us."
NARRATOR: Maya tiptoed forward, heart racing with excitement. The air smelled like fresh rain and something sweet — like honey mixed with starlight.`;
}

/**
 * Generate episode template
 */
export function EPISODE_GENERATION_TEMPLATE(context: StoryContext): string {
  const heroName = context.child.name;
  const pageCount = context.child.age <= 3 ? 8 : context.child.age <= 5 ? 10 : 12;

  let ageGuide = "";
  if (context.child.age <= 4) {
    ageGuide = AGE_VOCABULARY_GUIDELINES["2-4"];
  } else if (context.child.age <= 7) {
    ageGuide = AGE_VOCABULARY_GUIDELINES["5-7"];
  } else if (context.child.age <= 10) {
    ageGuide = AGE_VOCABULARY_GUIDELINES["8-10"];
  } else {
    ageGuide = AGE_VOCABULARY_GUIDELINES["11-13"];
  }

  const previousEpisodeContext = context.previousEpisodes
    ? `- Previous Episodes: ${context.previousEpisodes.map((e) => `"${e.title}": ${e.summary}`).join("; ")}`
    : "- This is the first episode.";

  const customElementsContext = context.customElements
    ? `
CUSTOM ELEMENTS TO INCLUDE:
${context.customElements.characters ? `- Characters: ${context.customElements.characters.join(", ")}` : ""}
${context.customElements.locations ? `- Locations: ${context.customElements.locations.join(", ")}` : ""}
${context.customElements.morals ? `- Moral lessons: ${context.customElements.morals.join(", ")}` : ""}`
    : "";

  const artStyleGuide = ART_STYLE_PROMPTS[context.theme] || ART_STYLE_PROMPTS.forest;

  return `You are a world-class children's story author creating a personalized bedtime story. Create a RICH, DETAILED, ENGAGING story that children will love listening to.

STORY CONTEXT:
- Series: "${context.storyArc?.title || "Adventure"}"
- Theme: ${context.theme}
- Episode ${context.storyArc?.currentEpisode || 1} of ${context.storyArc?.totalEpisodes || 5}
${previousEpisodeContext}

CHILD PROFILE:
- Name: ${heroName} (age ${context.child.age})
- Interests: ${context.child.interests.join(", ")}
${context.child.personality ? `- Personality: ${context.child.personality}` : ""}
${context.child.fears?.length ? `- Fears to gently address: ${context.child.fears.join(", ")}` : ""}

${ageGuide}

${customElementsContext}

CRITICAL STORYTELLING REQUIREMENTS:
1. STORY LENGTH: Generate exactly ${pageCount} pages. Each page must have SUBSTANTIAL content — at least 100 words.
2. ENGAGEMENT: Every page should hook the listener. Use vivid sensory details, character emotions, dialogue, and mini-discoveries.
3. PACING: Build tension gradually. First pages: introduce setting and characters. Middle pages: rising action with discoveries and challenges. Final 2 pages: warm wind-down for bedtime.
4. CHARACTERS: Give each character a distinct personality and speaking style. Use at least 3 named characters with meaningful dialogue. The hero should speak frequently.
5. DIALOGUE: At least 40% of the story should be dialogue. Characters should have back-and-forth conversations.
6. DESCRIPTIONS: Each scene should paint a vivid picture — describe colors, sounds, smells, textures.
7. EMOTIONAL ARC: curiosity → excitement → challenge → triumph → warmth → sleepiness.
8. BEDTIME ENDING: Final 2 pages must gently wind down using calming language, slowing pace, mentions of stars/moon/sleep/dreams.

${buildVoiceFormatPrompt()}

IMAGE PROMPT GUIDELINES:
Style: Warm watercolor children's book illustration, soft dreamy lighting, gentle colors, no text overlays, safe for children.
Character: A ${context.child.age}-year-old child with warm tones, wearing clothes in varied colors.
Setting: ${context.theme} themed environment.
Mood: Magical, warm, and inviting. Golden bedtime lighting.
Art Style: ${artStyleGuide}
IMPORTANT: Illustration only, no words or letters in the image. Suitable for professional printing at 300 DPI.

OUTPUT FORMAT:
Return valid JSON with this exact structure:
{
  "title": "Episode title (creative and evocative)",
  "summary": "3-4 sentence summary capturing the emotional arc",
  "musicMood": "whimsical|adventurous|calm|mysterious|triumphant|playful|dreamy|exciting|warm|magical",
  "estimatedReadTimeMinutes": <number based on word count>,
  "characters": [
    { "name": "CHARACTER_NAME", "traits": ["trait1", "trait2", "trait3"], "voiceRole": "narrator|child_hero|wise_old|friendly_creature|villain_silly|magical_being|animal_small|animal_large|robot_friendly" }
  ],
  "pages": [
    {
      "text": "NARRATOR: Rich narration text...\\nCHARACTER: \\"Dialogue here.\\"\\nNARRATOR: More narration...",
      "imagePrompt": "Detailed watercolor illustration prompt",
      "pageNumber": 1,
      "mood": "exciting|calm|mysterious|adventurous|warm|funny|reassuring|triumphant"
    }
  ]
}

Generate exactly ${pageCount} pages. Make ${heroName} the hero. Every page should be richly detailed and engaging.`;
}

/**
 * Story arc generation template
 */
export function STORY_ARC_TEMPLATE(
  context: Omit<StoryContext, "customElements">,
  numEpisodes: number
): string {
  return `Create a children's story arc for ${numEpisodes} episodes.

CHILD PROFILE:
- Name: ${context.child.name}, age ${context.child.age}
- Interests: ${context.child.interests.join(", ")}
${context.child.personality ? `- Personality: ${context.child.personality}` : ""}

STORY REQUIREMENTS:
- Theme: ${context.theme}
- Total Episodes: ${numEpisodes}
- Educational Focus: ${context.storyArc?.title || "General"}

Create an engaging overarching narrative that:
1. Has a compelling main character (${context.child.name})
2. Introduces a central quest or challenge
3. Allows for episodic discoveries and character growth
4. Builds toward a satisfying conclusion
5. Is age-appropriate and educationally valuable

Return JSON:
{
  "title": "Creative story arc title",
  "synopsis": "2-3 sentence synopsis",
  "episodeOutlines": [
    { "episodeNumber": 1, "title": "Episode title", "summary": "One sentence summary" }
  ]
}`;
}

/**
 * Image prompt generation template
 */
export function IMAGE_PROMPT_TEMPLATE(
  pageText: string,
  artStyle: string,
  childAge: number,
  theme: string
): string {
  return `Create a detailed image generation prompt for a children's book illustration.

Story Excerpt: "${pageText.substring(0, 300)}"
Theme: ${theme}
Child Age: ${childAge}

The image should:
1. Directly visualize the story scene
2. Include the main character appropriately for a ${childAge}-year-old
3. Use warm, safe, child-friendly colors
4. Be rendered as ${artStyle}
5. Include no text or letters
6. Be suitable for 300 DPI professional printing

Return ONLY the detailed image prompt text. Be specific about:
- Scene composition and layout
- Character positions and expressions
- Background environment details
- Color palette and lighting
- Emotional tone and mood`;
}

/**
 * Reading level adaptation template
 */
export function READING_LEVEL_ADAPTATION(text: string, targetAge: number): string {
  const ageGroup =
    targetAge <= 4 ? "2-4" : targetAge <= 7 ? "5-7" : targetAge <= 10 ? "8-10" : "11-13";

  return `Adapt the following text to a ${ageGroup}-year-old reading level:

Original text:
"${text}"

Guidelines for adaptation:
${AGE_VOCABULARY_GUIDELINES[ageGroup]}

Return the adapted text maintaining the same story content but with appropriate vocabulary and sentence complexity. Keep the same emotional tone and meaning.`;
}

/**
 * Quality assessment prompt
 */
export function QUALITY_ASSESSMENT_TEMPLATE(
  episode: {
    title: string;
    summary: string;
    pages: Array<{ text: string }>;
  },
  childAge: number
): string {
  const totalWords = episode.pages.reduce((sum, p) => sum + p.text.split(/\s+/).length, 0);

  return `Assess the quality of this children's story episode for a ${childAge}-year-old.

EPISODE:
- Title: ${episode.title}
- Summary: ${episode.summary}
- Total Words: ${totalWords}
- Total Pages: ${episode.pages.length}

CONTENT SAMPLE (first 200 words):
${episode.pages[0]?.text.substring(0, 200) || ""}

Evaluate and return JSON:
{
  "readability": 0-100,
  "engagement": 0-100,
  "ageAppropriateness": 0-100,
  "educationalValue": 0-100,
  "narrativeCoherence": 0-100,
  "overall": 0-100,
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "passesQuality": true|false
}

Criteria:
- Readability: Clear, age-appropriate vocabulary and sentence structure
- Engagement: Hooks listener, maintains interest, compelling narrative
- Age Appropriateness: Content, themes, language suitable for age group
- Educational Value: Meaningful lessons or learning opportunities
- Narrative Coherence: Story flows logically, characters consistent, satisfying arc`;
}
