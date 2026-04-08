import { db } from "../db";
import { diversityProfiles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export interface DiversityProfile {
  ethnicities: string[];
  familyStructures: string[];
  abilities: string[];
  culturalBackgrounds: string[];
  genderExpression: string[];
  bodyTypes: string[];
  languages: string[];
  religiousSpiritual: string[];
  preferMirrorFamily: boolean;
  diversityLevel: "mirror_family" | "balanced" | "maximum_diversity";
}

export interface DiversityCategory {
  id: string;
  label: string;
  description: string;
  options: Array<{
    id: string;
    label: string;
    description: string;
    icon?: string;
  }>;
}

export interface CulturalEvent {
  id: string;
  name: string;
  date: string;
  cultures: string[];
  description: string;
  storyIdeas: string[];
  icon?: string;
}

export interface RepresentationStats {
  totalStories: number;
  ethnicityDistribution: Record<string, number>;
  familyStructureDistribution: Record<string, number>;
  abilitiesIncluded: Record<string, number>;
  culturalsRepresented: Record<string, number>;
  representationScore: number;
}

const DEFAULT_PROFILE: DiversityProfile = {
  ethnicities: ["caucasian", "african", "asian", "latinx", "middle_eastern"],
  familyStructures: ["two-parent", "single-parent"],
  abilities: [],
  culturalBackgrounds: [],
  genderExpression: ["traditional", "non-stereotypical"],
  bodyTypes: ["average", "athletic"],
  languages: ["english"],
  religiousSpiritual: [],
  preferMirrorFamily: false,
  diversityLevel: "balanced",
};

const DIVERSITY_CATEGORIES: DiversityCategory[] = [
  {
    id: "ethnicities",
    label: "Ethnicity & Race",
    description: "Affects character appearances, names, and cultural contexts",
    options: [
      {
        id: "caucasian",
        label: "Caucasian/White",
        description: "European heritage characters",
      },
      {
        id: "african",
        label: "African & Black",
        description: "African, African American, Caribbean heritage",
      },
      {
        id: "asian",
        label: "Asian",
        description: "East, South, and Southeast Asian heritage",
      },
      {
        id: "latinx",
        label: "Latinx/Hispanic",
        description: "Latin American and Hispanic heritage",
      },
      {
        id: "middle_eastern",
        label: "Middle Eastern & North African",
        description: "MENA heritage characters",
      },
      {
        id: "indigenous",
        label: "Indigenous",
        description: "Native American, Aboriginal, and Indigenous peoples",
      },
      { id: "pacific", label: "Pacific Islander", description: "Pacific heritage" },
      {
        id: "multiracial",
        label: "Multiracial",
        description: "Characters with mixed heritage",
      },
    ],
  },
  {
    id: "familyStructures",
    label: "Family Structure",
    description: "Types of families and household compositions",
    options: [
      {
        id: "two-parent",
        label: "Two Parent Households",
        description: "Married or committed partners",
      },
      {
        id: "single-parent",
        label: "Single Parent",
        description: "One parent household",
      },
      {
        id: "grandparent-led",
        label: "Grandparent-Led",
        description: "Grandparents raising children",
      },
      {
        id: "foster",
        label: "Foster & Adoptive",
        description: "Foster and adoptive families",
      },
      {
        id: "same-sex",
        label: "Same-Sex Parents",
        description: "LGBTQ+ family structures",
      },
      {
        id: "blended",
        label: "Blended Family",
        description: "Families with step-siblings or step-parents",
      },
      {
        id: "multigenerational",
        label: "Multigenerational",
        description: "Multiple generations under one roof",
      },
      {
        id: "extended",
        label: "Extended Family",
        description: "Aunts, uncles, cousins as primary caregivers",
      },
    ],
  },
  {
    id: "abilities",
    label: "Abilities & Accessibility",
    description: "Positive representation of people with disabilities",
    options: [
      {
        id: "wheelchair",
        label: "Wheelchair User",
        description: "Characters who use wheelchairs",
      },
      {
        id: "visual",
        label: "Blind/Low Vision",
        description: "Visual impairment representation",
      },
      {
        id: "hearing",
        label: "Deaf/Hard of Hearing",
        description: "Deaf and HoH characters and sign language",
      },
      {
        id: "prosthetic",
        label: "Prosthetics/Limb Difference",
        description: "Characters with prosthetics or limb differences",
      },
      {
        id: "autism",
        label: "Autistic Characters",
        description: "Autistic representation (avoid inspiration porn)",
      },
      {
        id: "adhd",
        label: "ADHD",
        description: "Characters with ADHD",
      },
      {
        id: "learning_differences",
        label: "Learning Differences",
        description: "Dyslexia, dyscalculia, and other learning differences",
      },
      {
        id: "chronic_illness",
        label: "Chronic Illness",
        description: "Characters managing chronic conditions",
      },
    ],
  },
  {
    id: "culturalBackgrounds",
    label: "Cultural Background & Traditions",
    description: "Celebrations, food, clothing, and traditions",
    options: [
      {
        id: "diwali",
        label: "Diwali/Hindu Traditions",
        description: "Indian cultural celebrations and traditions",
      },
      {
        id: "chinese_lunar",
        label: "Chinese Lunar New Year",
        description: "Chinese cultural celebrations",
      },
      {
        id: "eid",
        label: "Eid/Islamic Traditions",
        description: "Islamic holidays and practices",
      },
      {
        id: "hanukkah",
        label: "Hanukkah/Jewish Traditions",
        description: "Jewish holidays and traditions",
      },
      {
        id: "día_muertos",
        label: "Día de Muertos",
        description: "Mexican cultural traditions",
      },
      {
        id: "kwanzaa",
        label: "Kwanzaa",
        description: "African American cultural celebration",
      },
      {
        id: "christmas",
        label: "Christmas",
        description: "Christian holiday traditions",
      },
      {
        id: "ramadan",
        label: "Ramadan",
        description: "Islamic holy month",
      },
    ],
  },
  {
    id: "genderExpression",
    label: "Gender Expression",
    description: "Varied interests and non-stereotypical roles",
    options: [
      {
        id: "traditional",
        label: "Traditional Roles",
        description: "Traditional gender expressions",
      },
      {
        id: "non-stereotypical",
        label: "Non-Stereotypical Roles",
        description:
          "Girls in STEM, stay-at-home dads, nurses of all genders, etc.",
      },
      {
        id: "nonbinary",
        label: "Non-Binary Characters",
        description: "Non-binary and genderqueer representation",
      },
      {
        id: "varied_interests",
        label: "Varied Interests",
        description:
          "All genders with diverse hobbies and passions regardless of stereotype",
      },
    ],
  },
  {
    id: "bodyTypes",
    label: "Body Type & Size Diversity",
    description: "Positive representation of various body types",
    options: [
      {
        id: "average",
        label: "Average Build",
        description: "Standard body proportions",
      },
      {
        id: "athletic",
        label: "Athletic/Muscular",
        description: "Athletic and muscular characters",
      },
      {
        id: "plus_size",
        label: "Plus Size",
        description: "Larger body types represented positively",
      },
      {
        id: "thin",
        label: "Thin/Petite",
        description: "Smaller or thinner body types",
      },
    ],
  },
  {
    id: "languages",
    label: "Languages & Communication",
    description: "Multilingual elements and cultural greetings",
    options: [
      { id: "english", label: "English", description: "English language" },
      { id: "spanish", label: "Spanish", description: "Spanish words and phrases" },
      {
        id: "mandarin",
        label: "Mandarin Chinese",
        description: "Mandarin words and phrases",
      },
      { id: "hindi", label: "Hindi", description: "Hindi words and phrases" },
      { id: "arabic", label: "Arabic", description: "Arabic words and phrases" },
      { id: "french", label: "French", description: "French words and phrases" },
      {
        id: "tagalog",
        label: "Tagalog/Filipino",
        description: "Tagalog words and phrases",
      },
      {
        id: "asl",
        label: "Sign Language References",
        description: "American Sign Language and other sign languages",
      },
    ],
  },
  {
    id: "religiousSpiritual",
    label: "Religious & Spiritual Traditions",
    description: "Respectful mention of various faith traditions (optional)",
    options: [
      {
        id: "christian",
        label: "Christian",
        description: "Christian faith and practices",
      },
      { id: "jewish", label: "Jewish", description: "Jewish faith and practices" },
      { id: "islamic", label: "Islamic", description: "Islamic faith and practices" },
      {
        id: "hindu",
        label: "Hindu",
        description: "Hindu faith and practices",
      },
      {
        id: "buddhist",
        label: "Buddhist",
        description: "Buddhist faith and practices",
      },
      {
        id: "indigenous_spiritual",
        label: "Indigenous Spiritual",
        description: "Indigenous spiritual practices",
      },
      {
        id: "secular",
        label: "Secular/Non-Religious",
        description: "Non-religious characters",
      },
    ],
  },
];

const CULTURAL_CALENDAR: CulturalEvent[] = [
  {
    id: "chinese_new_year",
    name: "Chinese Lunar New Year",
    date: "2026-01-29",
    cultures: ["chinese", "asian"],
    description: "Celebration of new beginnings with family gatherings",
    storyIdeas: [
      "A child discovers the meaning of the zodiac animal of their birth year",
      "A multicultural family celebrates Lunar New Year together",
      "A character learns about red lanterns and their significance",
    ],
    icon: "🏮",
  },
  {
    id: "diwali",
    name: "Diwali (Festival of Lights)",
    date: "2026-10-29",
    cultures: ["indian", "hindu", "asian"],
    description: "Festival celebrating the victory of light over darkness",
    storyIdeas: [
      "A child helps prepare for Diwali celebrations",
      "A character learns about the Ramayana through Diwali traditions",
      "A family creates decorations from natural materials",
    ],
    icon: "🪔",
  },
  {
    id: "eid_al_fitr",
    name: "Eid al-Fitr",
    date: "2026-04-10",
    cultures: ["muslim", "middle_eastern", "arabic"],
    description: "Celebration marking the end of Ramadan",
    storyIdeas: [
      "A child prepares for Eid celebrations with family",
      "A character shares traditional Eid foods with friends",
      "A family visits the mosque and celebrates together",
    ],
    icon: "🌙",
  },
  {
    id: "hanukkah",
    name: "Hanukkah",
    date: "2026-12-25",
    cultures: ["jewish", "middle_eastern"],
    description: "Festival of lights celebrating Jewish heritage",
    storyIdeas: [
      "A child lights the menorah for the first time",
      "A character learns the story of the Maccabees",
      "A family celebrates Hanukkah traditions",
    ],
    icon: "🕯️",
  },
  {
    id: "día_muertos",
    name: "Día de Muertos (Day of the Dead)",
    date: "2026-11-01",
    cultures: ["mexican", "latinx", "spanish"],
    description: "Celebration honoring loved ones who have passed",
    storyIdeas: [
      "A child creates an ofrenda with their family",
      "A character learns about marigold flowers and their significance",
      "A family shares stories and photos of ancestors",
    ],
    icon: "🌼",
  },
  {
    id: "kwanzaa",
    name: "Kwanzaa",
    date: "2026-12-26",
    cultures: ["african_american", "african"],
    description:
      "Week-long celebration of African heritage and principles of unity",
    storyIdeas: [
      "A family celebrates the seven principles of Kwanzaa",
      "A child lights the kinara and learns about each principle",
      "A community gathers to celebrate African heritage",
    ],
    icon: "🕯️",
  },
  {
    id: "passover",
    name: "Passover",
    date: "2026-04-25",
    cultures: ["jewish", "middle_eastern"],
    description: "Festival commemorating the exodus from Egypt",
    storyIdeas: [
      "A family prepares for the Seder meal",
      "A child learns the story of the Ten Plagues",
      "A multigenerational family gathers for Passover",
    ],
    icon: "🍷",
  },
  {
    id: "cinco_de_mayo",
    name: "Cinco de Mayo",
    date: "2026-05-05",
    cultures: ["mexican", "latinx", "spanish"],
    description: "Celebration of Mexican culture and heritage",
    storyIdeas: [
      "A community celebrates with music and dance",
      "A child learns about the Battle of Puebla",
      "A family shares traditional foods and stories",
    ],
    icon: "🎉",
  },
];

export async function getDiversityProfile(
  userId: number
): Promise<DiversityProfile> {
  const existing = await db
    .select()
    .from(diversityProfiles)
    .where(eq(diversityProfiles.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    return DEFAULT_PROFILE;
  }

  const row = existing[0];
  return {
    ethnicities: (row.ethnicities as string[]) || [],
    familyStructures: (row.familyStructures as string[]) || [],
    abilities: (row.abilities as string[]) || [],
    culturalBackgrounds: (row.culturalBackgrounds as string[]) || [],
    genderExpression: (row.genderExpression as string[]) || [],
    bodyTypes: (row.bodyTypes as string[]) || [],
    languages: (row.languages as string[]) || [],
    religiousSpiritual: (row.religiousSpiritual as string[]) || [],
    preferMirrorFamily: row.preferMirrorFamily || false,
    diversityLevel: (row.diversityLevel as
      | "mirror_family"
      | "balanced"
      | "maximum_diversity") || "balanced",
  };
}

export async function updateDiversityProfile(
  userId: number,
  profile: DiversityProfile
): Promise<DiversityProfile> {
  const existing = await db
    .select()
    .from(diversityProfiles)
    .where(eq(diversityProfiles.userId, userId))
    .limit(1);

  const now = new Date();

  if (existing.length === 0) {
    await db.insert(diversityProfiles).values({
      userId,
      ethnicities: profile.ethnicities,
      familyStructures: profile.familyStructures,
      abilities: profile.abilities,
      culturalBackgrounds: profile.culturalBackgrounds,
      genderExpression: profile.genderExpression,
      bodyTypes: profile.bodyTypes,
      languages: profile.languages,
      religiousSpiritual: profile.religiousSpiritual,
      preferMirrorFamily: profile.preferMirrorFamily,
      diversityLevel: profile.diversityLevel,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(diversityProfiles)
      .set({
        ethnicities: profile.ethnicities,
        familyStructures: profile.familyStructures,
        abilities: profile.abilities,
        culturalBackgrounds: profile.culturalBackgrounds,
        genderExpression: profile.genderExpression,
        bodyTypes: profile.bodyTypes,
        languages: profile.languages,
        religiousSpiritual: profile.religiousSpiritual,
        preferMirrorFamily: profile.preferMirrorFamily,
        diversityLevel: profile.diversityLevel,
        updatedAt: now,
      })
      .where(eq(diversityProfiles.userId, userId));
  }

  return profile;
}

export function getDiversityCategories(): DiversityCategory[] {
  return DIVERSITY_CATEGORIES;
}

export function generateDiversityPromptInjection(
  profile: DiversityProfile,
  childAge?: number
): string {
  const parts: string[] = [
    "DIVERSITY & REPRESENTATION GUIDANCE:",
    "Naturally incorporate the following elements into the story WITHOUT making diversity the main topic.",
    "Integration should feel organic to the plot and characters.",
    "",
  ];

  if (profile.ethnicities.length > 0) {
    const ethnicityLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "ethnicities"
    )?.options
      .filter((o) => profile.ethnicities.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Character Ethnicities: Include characters with ${ethnicityLabels} backgrounds. Vary names, physical descriptions, and cultural contexts naturally.`
    );
  }

  if (profile.familyStructures.length > 0) {
    const familyLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "familyStructures"
    )?.options
      .filter((o) => profile.familyStructures.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Family Structures: Feature ${familyLabels}. Normalize diverse family units as simply being families.`
    );
  }

  if (profile.abilities.length > 0) {
    const abilityLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "abilities"
    )?.options
      .filter((o) => profile.abilities.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Disabilities & Abilities: Include characters who are ${abilityLabels}. Show them as capable protagonists, not inspiration stories. Accessibility features and assistive technology should be matter-of-fact.`
    );
  }

  if (profile.genderExpression.length > 0) {
    const genderLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "genderExpression"
    )?.options
      .filter((o) => profile.genderExpression.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Gender Expression: Characters should have ${genderLabels}. Break stereotypes naturally (girls in STEM, nurturing male characters, etc.).`
    );
  }

  if (profile.bodyTypes.length > 0) {
    const bodyLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "bodyTypes"
    )?.options
      .filter((o) => profile.bodyTypes.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Body Diversity: Include characters with ${bodyLabels}. All body types are shown positively without focus on appearance.`
    );
  }

  if (profile.languages.length > 0) {
    const langLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "languages"
    )?.options
      .filter((o) => profile.languages.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Languages: Include greetings, phrases, or multilingual elements from ${langLabels} naturally woven into dialogue.`
    );
  }

  if (profile.culturalBackgrounds.length > 0) {
    const cultLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "culturalBackgrounds"
    )?.options
      .filter((o) => profile.culturalBackgrounds.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Cultural Elements: Weave in celebrations, foods, clothing, and traditions from ${cultLabels} authentically and respectfully.`
    );
  }

  if (profile.religiousSpiritual.length > 0) {
    const relLabels = DIVERSITY_CATEGORIES.find(
      (c) => c.id === "religiousSpiritual"
    )?.options
      .filter((o) => profile.religiousSpiritual.includes(o.id))
      .map((o) => o.label)
      .join(", ");

    parts.push(
      `Spiritual/Religious Representation: Respectfully reference ${relLabels} traditions when relevant to character backgrounds.`
    );
  }

  parts.push("", "TONE: Celebrate diversity as normal, not exceptional.");

  return parts.join("\n");
}

export function getRepresentationStats(
  _userId: number
): RepresentationStats {
  return {
    totalStories: 0,
    ethnicityDistribution: {},
    familyStructureDistribution: {},
    abilitiesIncluded: {},
    culturalsRepresented: {},
    representationScore: 0,
  };
}

export function getDefaultProfile(): DiversityProfile {
  return { ...DEFAULT_PROFILE };
}

export function getCulturalCalendar(): CulturalEvent[] {
  return CULTURAL_CALENDAR;
}

export function validateCulturalAccuracy(
  storyText: string,
  _cultures: string[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  const stereotypePhrases = [
    "exotic",
    "primitive",
    "third world",
    "backward",
    "savage",
  ];
  stereotypePhrases.forEach((phrase) => {
    if (storyText.toLowerCase().includes(phrase)) {
      warnings.push(
        `Potential stereotype detected: "${phrase}" - consider alternative wording`
      );
    }
  });

  const tokenismPatterns = [
    /the \w+ character/i,
    /the \w+ person/i,
  ];
  tokenismPatterns.forEach((pattern) => {
    if (pattern.test(storyText)) {
      warnings.push(
        "Potential tokenism: Characters should be named and developed, not categorized by identity"
      );
    }
  });

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
