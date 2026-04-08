// Typography System for StoryWeaver
// Pre-configured fonts and text styles using Google Fonts

export const FontFamily = {
  // Headings - playful, rounded, child-friendly
  heading: 'Baloo2_700Bold',
  headingMedium: 'Baloo2_600SemiBold',
  headingLight: 'Baloo2_500Medium',

  // Body text - clean, highly readable
  body: 'Quicksand_400Regular',
  bodyMedium: 'Quicksand_500Medium',
  bodySemiBold: 'Quicksand_600SemiBold',
  bodyBold: 'Quicksand_700Bold',

  // Story narrative - handwritten, immersive
  story: 'PatrickHand_400Regular',

  // Fun/special - badges, callouts, celebrations
  fun: 'BubblegumSans_400Regular',
};

// Pre-built text style presets
export const TextStyles = {
  // Screen titles
  screenTitle: {
    fontFamily: FontFamily.heading,
    fontSize: 28,
    lineHeight: 36,
    color: '#FFD700'
  },

  // Section headers
  sectionHeader: {
    fontFamily: FontFamily.headingMedium,
    fontSize: 20,
    lineHeight: 28
  },

  // Card titles
  cardTitle: {
    fontFamily: FontFamily.headingLight,
    fontSize: 16,
    lineHeight: 22
  },

  // Body text
  bodyLarge: {
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24
  },
  bodyRegular: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20
  },
  bodySmall: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 16
  },

  // Emphasized body
  bodyBold: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    lineHeight: 20
  },

  // Story reading text
  storyText: {
    fontFamily: FontFamily.story,
    fontSize: 22,
    lineHeight: 34,
    letterSpacing: 0.3
  },
  storyTextLarge: {
    fontFamily: FontFamily.story,
    fontSize: 26,
    lineHeight: 40,
    letterSpacing: 0.3
  },

  // Fun/celebration text
  badge: {
    fontFamily: FontFamily.fun,
    fontSize: 14,
    lineHeight: 18
  },
  celebration: {
    fontFamily: FontFamily.fun,
    fontSize: 24,
    lineHeight: 32
  },
  streakCount: {
    fontFamily: FontFamily.fun,
    fontSize: 32,
    lineHeight: 40
  },

  // Navigation
  tabLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14
  },

  // Buttons
  buttonPrimary: {
    fontFamily: FontFamily.headingMedium,
    fontSize: 16,
    lineHeight: 22
  },
  buttonSecondary: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 20
  },

  // Captions & metadata
  caption: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2
  },
  metadata: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  },
};
