// All AI-generated asset URLs for the app
export const ASSETS = {
  bgOnboarding: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/nqZ6t9JYthL3KfeNRWgD2F/bg-onboarding-opt_2b79fff3.png",
  themes: {
    space: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/nqZ6t9JYthL3KfeNRWgD2F/theme-space-opt_f9bd6992.png",
    ocean: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/nqZ6t9JYthL3KfeNRWgD2F/theme-ocean-opt_add99ef6.png",
    forest: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/nqZ6t9JYthL3KfeNRWgD2F/theme-forest-opt_9cc2da1e.png",
    dinosaur: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/nqZ6t9JYthL3KfeNRWgD2F/theme-dinosaur-opt_be3e202e.png",
    pirate: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/nqZ6t9JYthL3KfeNRWgD2F/theme-pirate-5CCanzt8d63TWLM8gTTdoc.webp",
    robot: "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/nqZ6t9JYthL3KfeNRWgD2F/theme-robot-JDf8BS8sSTnzQWJpjcF7Ba.webp",
  },
} as const;

export const STORY_THEMES = [
  { id: "space", name: "Space Adventure", image: ASSETS.themes.space, emoji: "\u{1F680}" },
  { id: "ocean", name: "Ocean Explorer", image: ASSETS.themes.ocean, emoji: "\u{1F420}" },
  { id: "forest", name: "Enchanted Forest", image: ASSETS.themes.forest, emoji: "\u{1F332}" },
  { id: "dinosaur", name: "Dinosaur Land", image: ASSETS.themes.dinosaur, emoji: "\u{1F995}" },
  { id: "pirate", name: "Pirate Seas", image: ASSETS.themes.pirate, emoji: "\u{1F3F4}" },
  { id: "robot", name: "Robot City", image: ASSETS.themes.robot, emoji: "\u{1F916}" },
  { id: "fairy", name: "Fairy Kingdom", image: ASSETS.themes.forest, emoji: "\u{1F9DA}" },
  { id: "safari", name: "Safari Quest", image: ASSETS.themes.forest, emoji: "\u{1F992}" },
  { id: "arctic", name: "Arctic Expedition", image: ASSETS.themes.ocean, emoji: "\u{1F427}" },
  { id: "medieval", name: "Castle & Knights", image: ASSETS.themes.forest, emoji: "\u{1F3F0}" },
  { id: "jungle", name: "Jungle Journey", image: ASSETS.themes.forest, emoji: "\u{1F412}" },
  { id: "candy", name: "Candy World", image: ASSETS.themes.robot, emoji: "\u{1F36D}" },
  { id: "music", name: "Musical Land", image: ASSETS.themes.space, emoji: "\u{1F3B5}" },
  { id: "garden", name: "Secret Garden", image: ASSETS.themes.forest, emoji: "\u{1F33B}" },
] as const;

export const EDUCATIONAL_VALUES = [
  { id: "kindness", name: "Kindness", emoji: "\u{1F49B}" },
  { id: "bravery", name: "Bravery", emoji: "\u{1F981}" },
  { id: "sharing", name: "Sharing", emoji: "\u{1F91D}" },
  { id: "honesty", name: "Honesty", emoji: "\u2B50" },
  { id: "curiosity", name: "Curiosity", emoji: "\u{1F50D}" },
  { id: "friendship", name: "Friendship", emoji: "\u{1F308}" },
  { id: "patience", name: "Patience", emoji: "\u{1F422}" },
  { id: "empathy", name: "Empathy", emoji: "\u{1F497}" },
  { id: "resilience", name: "Resilience", emoji: "\u{1F4AA}" },
  { id: "gratitude", name: "Gratitude", emoji: "\u{1F64F}" },
  { id: "teamwork", name: "Teamwork", emoji: "\u{1F91C}\u{1F91B}" },
  { id: "creativity", name: "Creativity", emoji: "\u{1F3A8}" },
  { id: "respect", name: "Respect", emoji: "\u{1F31F}" },
  { id: "responsibility", name: "Responsibility", emoji: "\u{1F6E1}" },
  { id: "perseverance", name: "Perseverance", emoji: "\u{1F3D4}" },
  { id: "generosity", name: "Generosity", emoji: "\u{1F381}" },
] as const;

export const CHILD_INTERESTS = [
  "Space", "Dinosaurs", "Ocean", "Magic", "Animals",
  "Princesses", "Pirates", "Robots", "Nature", "Superheroes",
  "Music", "Art & Crafts", "Sports", "Cooking", "Cars & Trucks",
  "Fairies", "Dragons", "Trains", "Bugs & Insects", "Weather",
  "Building & Lego", "Dancing", "Science", "Gardening", "Books & Reading",
] as const;

export const PERSONALITY_TRAITS = [
  "Adventurous", "Shy", "Curious", "Creative", "Energetic",
  "Gentle", "Funny", "Determined", "Caring", "Imaginative",
  "Brave", "Thoughtful", "Playful", "Independent", "Sensitive",
] as const;

export const CHILDHOOD_FEARS = [
  "The dark", "Monsters under the bed", "Being alone",
  "Loud noises", "New places", "Big animals",
  "Water / swimming", "Heights", "Getting lost",
  "Making mistakes", "Storms & thunder",
] as const;

export const FAVORITE_COLORS = [
  { id: "red", label: "Red", color: "#E74C3C" },
  { id: "blue", label: "Blue", color: "#3498DB" },
  { id: "green", label: "Green", color: "#27AE60" },
  { id: "purple", label: "Purple", color: "#9B59B6" },
  { id: "pink", label: "Pink", color: "#FF69B4" },
  { id: "yellow", label: "Yellow", color: "#F1C40F" },
  { id: "orange", label: "Orange", color: "#E67E22" },
  { id: "rainbow", label: "Rainbow", color: "linear-gradient(90deg, #E74C3C, #F1C40F, #27AE60, #3498DB, #9B59B6)" },
] as const;

export const READING_LEVELS = [
  { id: "listener", label: "Listener Only", description: "Child listens to stories read aloud" },
  { id: "early", label: "Early Reader", description: "Learning letters and simple words" },
  { id: "beginner", label: "Beginner Reader", description: "Can read simple sentences" },
  { id: "intermediate", label: "Intermediate", description: "Reads short books independently" },
  { id: "advanced", label: "Advanced", description: "Reads chapter books independently" },
] as const;

export const STORY_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "it", label: "Italian" },
  { id: "pt", label: "Portuguese" },
  { id: "zh", label: "Chinese (Mandarin)" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "ar", label: "Arabic" },
  { id: "hi", label: "Hindi" },
  { id: "ur", label: "Urdu" },
] as const;

export type StoryThemeId = typeof STORY_THEMES[number]["id"];
export type EducationalValueId = typeof EDUCATIONAL_VALUES[number]["id"];
