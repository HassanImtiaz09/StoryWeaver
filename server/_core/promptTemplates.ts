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
 * Build accessibility instructions for story generation
 */
export function buildAccessibilityInstructions(
  syllableBreaks: boolean = false,
  largePrint: boolean = false,
  simplifiedVocabulary: boolean = false
): string {
  let instructions = "";

  if (syllableBreaks) {
    instructions += `
SYLLABLE BREAKS:
For words that may be challenging for early readers, include syllable breaks in parentheses:
Example: "adventure (ad-ven-ture)" or use hyphenated format in narrative: "the ad-ven-ture was exciting"
Include syllable breaks for words with 3+ syllables that are not common.`;
  }

  if (largePrint) {
    instructions += `
LARGE PRINT MODE:
- Reduce words per page to 80-120 words (instead of typical 120-180)
- Use shorter sentences (average 8-12 words)
- Use more line breaks and whitespace
- Choose vocabulary that is concrete and familiar`;
  }

  if (simplifiedVocabulary) {
    instructions += `
SIMPLIFIED VOCABULARY:
- Prioritize common, everyday words
- Define any unfamiliar words within the text naturally
- Use words from the Dolch sight word list when possible
- Avoid complex words with multiple syllables unless necessary`;
  }

  return instructions;
}

/**
 * Build narration pacing and SSML markup instructions
 */
export function buildNarrationPacingPrompt(): string {
  return `NARRATION PACING & DELIVERY MARKUP (CRITICAL for natural-sounding audio):

You MUST embed pacing cues directly in the story text using these markers:

PAUSE MARKERS (processed by text-to-speech):
- <break time="0.5s"/> — Short breath pause (between sentences within action)
- <break time="1.0s"/> — Medium pause (between paragraphs, scene shifts, before dramatic reveals)
- <break time="1.5s"/> — Long pause (page transitions, dramatic tension, before climax moments)
- <break time="2.0s"/> — Extended pause (after emotional moments, before the final page wind-down)

PACING RULES:
1. NEVER have more than 3 sentences without at least a short <break time="0.5s"/>
2. Place <break time="1.0s"/> before any character speaks for the first time on a page
3. Place <break time="1.5s"/> after any emotional revelation or surprise
4. The FINAL PAGE must have <break time="2.0s"/> after every 2 sentences to slow the pace for sleep
5. Dialogue should have natural pauses — <break time="0.3s"/> between back-and-forth exchanges
6. After a question, add <break time="0.8s"/> before the answer

TONE MODULATION (embedded in text):
- For whispered lines: wrap in *asterisks* and add "(softly)" before the line
- For excited lines: use ! naturally and add "(excitedly)" before the line
- For slow, dreamy lines: use ellipses "..." and add "(slowly, dreamily)" before the line
- For the bedtime wind-down: add "(gently, getting quieter)" before narrator lines

EXAMPLE of properly paced text:
NARRATOR: The forest was quiet tonight. <break time="0.5s"/> Moonlight filtered through the canopy, painting silver patterns on the mossy path below. <break time="1.0s"/>
MAYA: (excitedly) "Look! The fireflies are spelling something!" <break time="0.8s"/>
LUNA: (softly) *"Shhh... watch carefully..."* <break time="1.5s"/>
NARRATOR: (slowly, dreamily) And there, dancing in the warm summer air... <break time="0.5s"/> the tiny lights spelled out a single word... <break time="2.0s"/> "Home."

This pacing creates a NATURAL listening experience — not robotic monotone. The pauses give the listener time to imagine, feel, and drift toward sleep.`;
}

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
 * @param context Story context
 * @param accessibilityOptions Optional accessibility settings for story generation
 */
export function EPISODE_GENERATION_TEMPLATE(
  context: StoryContext,
  accessibilityOptions?: {
    syllableBreaks?: boolean;
    largePrint?: boolean;
    simplifiedVocabulary?: boolean;
  }
): string {
  const heroName = context.child.name;

  // IMPROVEMENT 1: Optimal bedtime story length based on age and narration pace (~100 words/min)
  // Ages 2-4: 5-8 min → 500-800 words → 6 pages × ~100 words
  // Ages 5-7: 8-12 min → 800-1200 words → 8 pages × ~125 words
  // Ages 8-10: 12-18 min → 1200-1800 words → 10 pages × ~150 words
  // Ages 11-13: 15-20 min → 1500-2000 words → 12 pages × ~170 words
  let pageCount: number;
  let wordsPerPage: number;
  let targetNarrationMinutes: string;

  if (context.child.age <= 4) {
    pageCount = 6;
    wordsPerPage = 100;
    targetNarrationMinutes = "5-8";
  } else if (context.child.age <= 7) {
    pageCount = 8;
    wordsPerPage = 125;
    targetNarrationMinutes = "8-12";
  } else if (context.child.age <= 10) {
    pageCount = 10;
    wordsPerPage = 150;
    targetNarrationMinutes = "12-18";
  } else {
    pageCount = 12;
    wordsPerPage = 170;
    targetNarrationMinutes = "15-20";
  }

  // Adjust for accessibility options
  if (accessibilityOptions?.largePrint) {
    pageCount = Math.ceil(pageCount * 1.2); // More pages with fewer words each
    wordsPerPage = Math.ceil(wordsPerPage * 0.85);
  }

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

  // Add accessibility notes to age guide
  if (accessibilityOptions?.simplifiedVocabulary) {
    ageGuide += `\n\nACCESSIBILITY NOTE: Prioritize the most common words. Keep vocabulary simple and concrete.`;
  }

  const previousEpisodeContext = context.previousEpisodes
    ? `- Previous Episodes: ${context.previousEpisodes.map((e) => `"${e.title}": ${e.summary}`).join("; ")}`
    : "- This is the first episode.";

  const episodeNumber = context.storyArc?.currentEpisode || 1;
  const totalEpisodes = context.storyArc?.totalEpisodes || 5;

  // IMPROVEMENT 3: Episode consistency - narrative phase guidance
  let narrativePhaseGuide = "";
  if (episodeNumber === 1) {
    narrativePhaseGuide = `NARRATIVE PHASE: INTRODUCTION (Episode 1 of ${totalEpisodes})
  - Establish the world, introduce the main character and their ordinary life
  - End with a "call to adventure" — something disrupts the ordinary world
  - Introduce 1-2 key side characters who will recur throughout the series
  - Plant seeds of the overarching mystery/quest`;
  } else if (episodeNumber <= Math.ceil(totalEpisodes * 0.3)) {
    narrativePhaseGuide = `NARRATIVE PHASE: RISING ACTION (Episode ${episodeNumber} of ${totalEpisodes})
  - Build on the quest/challenge established in episode 1
  - Introduce new allies or obstacles
  - Deepen the main character's motivation
  - Each discovery should raise MORE questions
  - Reference specific events and characters from previous episodes`;
  } else if (episodeNumber <= Math.ceil(totalEpisodes * 0.7)) {
    narrativePhaseGuide = `NARRATIVE PHASE: MIDPOINT & ESCALATION (Episode ${episodeNumber} of ${totalEpisodes})
  - Stakes are higher now — the challenge is more serious
  - Main character faces a setback or learns a difficult lesson
  - Relationships deepen between characters
  - New information changes the hero's understanding of the quest
  - Reference previous episodes — characters should remember and grow`;
  } else if (episodeNumber < totalEpisodes) {
    narrativePhaseGuide = `NARRATIVE PHASE: CLIMAX APPROACH (Episode ${episodeNumber} of ${totalEpisodes})
  - The biggest challenge yet — the hero must use everything they've learned
  - All major characters should appear or be referenced
  - Build toward the climactic moment but don't resolve it yet
  - The hero should demonstrate growth from earlier episodes`;
  } else {
    narrativePhaseGuide = `NARRATIVE PHASE: RESOLUTION (Episode ${episodeNumber} of ${totalEpisodes} — FINAL EPISODE)
  - Resolve the overarching quest/challenge
  - The hero succeeds using lessons learned across ALL previous episodes
  - Give every recurring character a satisfying conclusion
  - Reference key moments from the series
  - End with a sense of accomplishment and gentle closure for bedtime`;
  }

  // IMPROVEMENT 2: Multiple morals support
  const customElementsContext = context.customElements
    ? `
CUSTOM ELEMENTS TO INCLUDE:
${context.customElements.characters ? `- Characters: ${context.customElements.characters.join(", ")}` : ""}
${context.customElements.locations ? `- Locations: ${context.customElements.locations.join(", ")}` : ""}
${
  context.customElements.morals?.length
    ? `
MORAL LESSONS TO WEAVE INTO THE STORY (important — these should emerge naturally through the narrative, NOT be lectured):
${context.customElements.morals.map((m, i) => `${i + 1}. ${m} — show this through character actions and consequences, not dialogue about the lesson`).join("\n")}
`
    : ""
}`
    : "";

  const artStyleGuide = ART_STYLE_PROMPTS[context.theme] || ART_STYLE_PROMPTS.forest;

  return `You are a world-class children's story author creating a personalized bedtime story. Create a RICH, DETAILED, ENGAGING story that children will love listening to.

STORY CONTEXT:
- Series: "${context.storyArc?.title || "Adventure"}"
- Theme: ${context.theme}
- Episode ${episodeNumber} of ${totalEpisodes}
${previousEpisodeContext}

CHILD PROFILE:
- Name: ${heroName} (age ${context.child.age})
- Interests: ${context.child.interests.join(", ")}
${context.child.personality ? `- Personality: ${context.child.personality}` : ""}
${context.child.fears?.length ? `- Fears to gently address: ${context.child.fears.join(", ")}` : ""}

${ageGuide}

${narrativePhaseGuide}

${customElementsContext}

CRITICAL STORYTELLING REQUIREMENTS:
1. STORY LENGTH: Generate exactly ${pageCount} pages. Target ${wordsPerPage} words per page (total ~${pageCount * wordsPerPage} words). This should produce a ${targetNarrationMinutes} minute bedtime narration at a calm reading pace. Do NOT exceed ${Math.round(pageCount * wordsPerPage * 1.2)} total words — children need rest, not marathons.
2. ENGAGEMENT: Every page should hook the listener. Use vivid sensory details, character emotions, dialogue, and mini-discoveries.
3. PACING: Build tension gradually. First pages: introduce setting and characters. Middle pages: rising action with discoveries and challenges. Final 2 pages: warm wind-down for bedtime.
4. CHARACTERS: Give each character a distinct personality and speaking style. Use at least 3 named characters with meaningful dialogue. The hero should speak frequently.
5. DIALOGUE: At least 40% of the story should be dialogue. Characters should have back-and-forth conversations.
6. DESCRIPTIONS: Each scene should paint a vivid picture — describe colors, sounds, smells, textures.
7. EMOTIONAL ARC: curiosity → excitement → challenge → triumph → warmth → sleepiness.
8. BEDTIME ENDING: Final 2 pages must gently wind down using calming language, slowing pace, mentions of stars/moon/sleep/dreams.

SERIES CONTINUITY (CRITICAL):
- All characters introduced in previous episodes MUST be referenced consistently (same names, same traits, same relationships)
- The hero should explicitly remember and reference events from previous episodes
- Settings established earlier should remain consistent
- Any items, powers, or tools gained in previous episodes should still be available
- Character growth should be cumulative — the hero at episode ${episodeNumber} should be noticeably more mature/capable than episode 1

${buildVoiceFormatPrompt()}

${buildNarrationPacingPrompt()}

${
  accessibilityOptions
    ? buildAccessibilityInstructions(
        accessibilityOptions.syllableBreaks,
        accessibilityOptions.largePrint,
        accessibilityOptions.simplifiedVocabulary
      )
    : ""
}

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
  theme: string,
  characterDirective?: string
): string {
  const characterSection = characterDirective
    ? `\nCHARACTER CONSISTENCY:\n${characterDirective}\n`
    : "";

  return `Create a detailed image generation prompt for a children's book illustration.

Story Excerpt: "${pageText.substring(0, 300)}"
Theme: ${theme}
Child Age: ${childAge}
${characterSection}

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
 * Inject a character directive into an image prompt
 * Ensures the character appears consistently across all story illustrations
 */
export function injectCharacterIntoImagePrompt(
  basePrompt: string,
  characterDirective: string
): string {
  // Insert character directive at the beginning of the prompt
  return `${characterDirective}\n\n${basePrompt}`;
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

/**
 * Multilingual language guidelines for story generation
 * Maps language_ageGroup to vocabulary and grammar rules
 */
export const LANGUAGE_VOCABULARY_GUIDELINES: Record<string, string> = {
  // English
  en_default: `English: Use clear, simple vocabulary. Sentences 5-15 words. Include sensory descriptions. Follow natural English word order.`,

  // Spanish
  es_default: `Spanish: Use present tense frequently. Include diminutives for endearment (ito/ita). Maintain subject-verb-object order. Use "hay" for existence.`,

  // French
  fr_default: `French: Use present and passé composé tenses. Include liaisons and proper pronunciation guides. Use formal address with children (vous). Maintain French article usage.`,

  // German
  de_default: `German: Use present tense. Include articles (der/die/das). Maintain German word order (verb-final in clauses). Use diminutives (chen/lein). Separate prefixes clearly.`,

  // Italian
  it_default: `Italian: Use present tense. Include proper article agreements. Use "c'è/ci sono" for existence. Maintain Italian syntax. Include diminutive endings naturally.`,

  // Portuguese
  pt_default: `Portuguese: Use present tense. Include diminutives naturally. Use "há" for time expressions. Maintain Portuguese phonetics and rhythm.`,

  // Mandarin Chinese
  zh_default: `Mandarin Chinese: Use simplified characters when possible. Keep sentences short (subject-verb-object). Use measure words correctly (个/条/只). Include emotional particles (呀/啊). Use present tense (no verb conjugation).`,

  // Japanese
  ja_default: `Japanese: Use hiragana, katakana, and kanji appropriately. Use polite forms (ます). Keep sentences 5-8 words. Use particles correctly (は/を/に). Include onomatopoeia naturally.`,

  // Korean
  ko_default: `Korean: Use polite formal style (습니다). Include particles correctly (을/를/이/가). Use present tense. Keep sentences moderate length. Include particles for emotion and emphasis.`,

  // Arabic
  ar_default: `Arabic (Modern Standard): Use Modern Standard Arabic. Include proper diacritics. Use present tense. Keep sentences 5-12 words. Use appropriate formality level for children. Include cultural expressions naturally.`,

  // Hindi
  hi_default: `Hindi: Use present tense. Include articles correctly. Use postpositions properly. Maintain Devanagari script consistency. Use honorifics appropriately.`,

  // Russian
  ru_default: `Russian: Use present tense (imperfective aspects). Maintain case agreement (nominative, accusative, etc.). Include articles sparingly. Use correct gender agreements. Include Russian diminutives naturally.`,

  // Dutch
  nl_default: `Dutch: Use present tense. Maintain Dutch word order (verb-second in main clauses). Include articles correctly (de/het). Use simple compound sentences.`,

  // Swedish
  sv_default: `Swedish: Use present tense. Include articles correctly (en/ett). Maintain Swedish word order. Use simple, clear phrasing. Include common Swedish words naturally.`,

  // Turkish
  tr_default: `Turkish: Use present tense. Maintain subject-object-verb order. Use agglutination correctly. Include Turkish suffixes for case. Use appropriate formality.`,
};

/**
 * Translation template for converting story pages
 */
export function TRANSLATION_TEMPLATE(
  sourceText: string,
  sourceLanguage: string,
  targetLanguage: string,
  childAge: number,
  ageGroup: string,
  vocabGuidelines: string,
  context?: string
): string {
  const sourceContext = context ? `\n\nPrevious context: ${context}` : "";

  return `Translate the following children's story text from ${sourceLanguage} to ${targetLanguage}.

TRANSLATION REQUIREMENTS:
1. Maintain the original emotional tone and pacing
2. Keep cultural references appropriate for a ${childAge}-year-old
3. Adjust vocabulary to be age-appropriate for the target language
4. Preserve all names, character voices, and dialogue structure
5. Use natural phrasing that sounds native to ${targetLanguage}

VOCABULARY AND GRAMMAR GUIDELINES:
${vocabGuidelines}

${sourceContext}

SOURCE TEXT (${sourceLanguage}):
"${sourceText}"

TRANSLATION INSTRUCTIONS:
- Do NOT use formal/academic language
- DO use conversational, child-friendly phrasing
- Preserve sentence structure where possible
- Translate idioms to equivalent ${targetLanguage} expressions
- Keep the same number of lines/paragraphs
- Maintain all dialogue formatting (Speaker: "dialogue")

Return ONLY the translated text, no explanations or metadata.`;
}

/**
 * Bilingual vocabulary template for language learning
 */
export function BILINGUAL_VOCABULARY_TEMPLATE(
  pageText: string,
  sourceLanguage: string,
  targetLanguage: string,
  ageGroup: string
): string {
  const wordCountByAge: Record<string, number> = {
    "2-4": 3,
    "5-7": 5,
    "8-10": 7,
    "11-13": 10,
  };

  const count = wordCountByAge[ageGroup] || 5;

  return `Extract the top ${count} most important vocabulary words from this children's story text for a child to learn in ${targetLanguage}.

SELECTION CRITERIA:
1. Choose words that are:
   - Key to understanding the story
   - New or challenging for a ${ageGroup}-year-old
   - Frequently used in the language
   - Cultural or interesting

2. For each word, provide:
   - Word in original text
   - Translation to ${targetLanguage}
   - Phonetic pronunciation guide
   - Simple definition appropriate for a child
   - Example sentence from the text or new simple sentence

SOURCE TEXT (${sourceLanguage}):
"${pageText}"

Return valid JSON:
{
  "vocabularyWords": [
    {
      "word": "original word",
      "translation": "translation in ${targetLanguage}",
      "pronunciation": "phonetic guide",
      "definition": "simple definition for children",
      "exampleSentence": "simple example sentence"
    }
  ]
}

Make sure the words are appropriate for learning and memorable for the child.`;
}
