/**
 * Share Card Image Generator for StoryWeaver
 * Generates beautiful share card data structures that can be rendered
 * as images on the client side for social media sharing
 */

export type CardTemplate = "classic" | "magical" | "adventure" | "bedtime";

export interface ShareCardImage {
  template: CardTemplate;
  title: string;
  childName: string;
  childAge: number;
  theme: string;
  themeIcon: string;
  coverImageUrl: string | null;
  firstLinePreview: string;
  pageCount: number;
  readingTimeMinutes: number;
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  watermark: string;
}

// Template configurations with colors and styling
const TEMPLATES: Record<CardTemplate, { colors: any; description: string }> = {
  classic: {
    colors: {
      primary: "#8B4513",
      secondary: "#D2B48C",
      text: "#2F1B0C",
      accent: "#FFD700",
    },
    description: "Traditional storybook style",
  },
  magical: {
    colors: {
      primary: "#6B46C1",
      secondary: "#A78BFA",
      text: "#FFFFFF",
      accent: "#EC4899",
    },
    description: "Magical and whimsical",
  },
  adventure: {
    colors: {
      primary: "#DC2626",
      secondary: "#FCA5A5",
      text: "#FFFFFF",
      accent: "#FBBF24",
    },
    description: "Bold adventure theme",
  },
  bedtime: {
    colors: {
      primary: "#1E3A8A",
      secondary: "#3B82F6",
      text: "#FFFFFF",
      accent: "#F59E0B",
    },
    description: "Calm bedtime theme",
  },
};

// Theme to template mapping
const THEME_TO_TEMPLATE: Record<string, CardTemplate> = {
  space: "adventure",
  ocean: "magical",
  forest: "classic",
  fairy: "magical",
  adventure: "adventure",
  bedtime: "bedtime",
  mystery: "magical",
  magic: "magical",
};

/**
 * Generate share card image data structure
 * This data can be rendered as an image on the client side
 */
export function generateShareCardImage(storyData: {
  title: string;
  childName: string;
  childAge: number;
  theme: string;
  themeIcon: string;
  coverImageUrl: string | null;
  firstLinePreview: string;
  pageCount: number;
  readingTimeMinutes: number;
  selectedTemplate?: CardTemplate;
}): ShareCardImage {
  // Select template based on theme or explicit selection
  const template =
    storyData.selectedTemplate || THEME_TO_TEMPLATE[storyData.theme.toLowerCase()] || "classic";

  const templateConfig = TEMPLATES[template];

  return {
    template,
    title: storyData.title,
    childName: storyData.childName,
    childAge: storyData.childAge,
    theme: storyData.theme,
    themeIcon: storyData.themeIcon,
    coverImageUrl: storyData.coverImageUrl,
    firstLinePreview: storyData.firstLinePreview,
    pageCount: storyData.pageCount,
    readingTimeMinutes: storyData.readingTimeMinutes,
    colors: templateConfig.colors,
    watermark: "Created with StoryWeaver",
  };
}

/**
 * Get all available card templates
 */
export function getAvailableTemplates(): Array<{
  id: CardTemplate;
  name: string;
  description: string;
  colors: any;
}> {
  return Object.entries(TEMPLATES).map(([id, config]) => ({
    id: id as CardTemplate,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    description: config.description,
    colors: config.colors,
  }));
}

/**
 * Format reading time estimate for display
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) {
    return "Less than a minute";
  } else if (minutes === 1) {
    return "1 minute read";
  } else if (minutes <= 5) {
    return `${minutes} minute read`;
  } else if (minutes <= 15) {
    return `${minutes} minute read`;
  } else {
    return `${Math.ceil(minutes / 5) * 5} minute read`;
  }
}

/**
 * Generate optimized card data for social media
 * Includes metadata for different platforms (OG tags)
 */
export function generateSocialCardMetadata(
  cardImage: ShareCardImage,
  shareUrl: string
): {
  title: string;
  description: string;
  imageUrl: string | null;
  ogTags: Record<string, string>;
} {
  const readingTime = formatReadingTime(cardImage.readingTimeMinutes);

  return {
    title: `${cardImage.title} - A story by ${cardImage.childName}`,
    description: `A ${readingTime} story created with StoryWeaver. "${cardImage.firstLinePreview}..."`,
    imageUrl: cardImage.coverImageUrl,
    ogTags: {
      "og:title": `${cardImage.title} - ${cardImage.childName}'s Story`,
      "og:description": `A beautiful ${cardImage.theme} story for ages ${Math.max(cardImage.childAge - 2, 2)}-${cardImage.childAge + 2}. ${readingTime}.`,
      "og:url": shareUrl,
      "og:type": "website",
      "og:image": cardImage.coverImageUrl || "https://storyweaver.app/default-card.png",
      "twitter:card": "summary_large_image",
      "twitter:title": `${cardImage.title} by ${cardImage.childName}`,
      "twitter:description": `A ${cardImage.theme} story created with StoryWeaver`,
      "twitter:image": cardImage.coverImageUrl || "https://storyweaver.app/default-card.png",
    },
  };
}

/**
 * Validate card data before generation
 */
export function validateCardData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== "string" || data.title.length === 0) {
    errors.push("Story title is required");
  }

  if (!data.childName || typeof data.childName !== "string" || data.childName.length === 0) {
    errors.push("Child name is required");
  }

  if (!data.theme || typeof data.theme !== "string") {
    errors.push("Theme is required");
  }

  if (data.pageCount && data.pageCount < 1) {
    errors.push("Page count must be at least 1");
  }

  if (data.readingTimeMinutes && data.readingTimeMinutes < 0) {
    errors.push("Reading time cannot be negative");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
