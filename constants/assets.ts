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
  { id: "space", name: "Space Adventure", image: ASSETS.themes.space, emoji: "🚀" },
  { id: "ocean", name: "Ocean Explorer", image: ASSETS.themes.ocean, emoji: "🐠" },
  { id: "forest", name: "Enchanted Forest", image: ASSETS.themes.forest, emoji: "🌲" },
  { id: "dinosaur", name: "Dinosaur Land", image: ASSETS.themes.dinosaur, emoji: "🦕" },
  { id: "pirate", name: "Pirate Seas", image: ASSETS.themes.pirate, emoji: "🏴‍☠️" },
  { id: "robot", name: "Robot City", image: ASSETS.themes.robot, emoji: "🤖" },
] as const;

export const EDUCATIONAL_VALUES = [
  { id: "kindness", name: "Kindness", emoji: "💛" },
  { id: "bravery", name: "Bravery", emoji: "🦁" },
  { id: "sharing", name: "Sharing", emoji: "🤝" },
  { id: "honesty", name: "Honesty", emoji: "⭐" },
  { id: "curiosity", name: "Curiosity", emoji: "🔍" },
  { id: "friendship", name: "Friendship", emoji: "🌈" },
] as const;

export const CHILD_INTERESTS = [
  "Space", "Dinosaurs", "Ocean", "Magic", "Animals",
  "Princesses", "Pirates", "Robots", "Nature", "Superheroes",
] as const;

export type StoryThemeId = typeof STORY_THEMES[number]["id"];
export type EducationalValueId = typeof EDUCATIONAL_VALUES[number]["id"];
