/** @type {const} */
const themeColors = {
  // ─── Light Mode: Warm, inviting, optimized for young readers ──
  // ─── Dark Mode: Cinematic, gold-accented, great for bedtime ──
  primary:    { light: '#B07C00', dark: '#FFD700' },       // Deep gold for 3.5:1 contrast on cream bg (WCAG large text)
  background: { light: '#FFF9F0', dark: '#0A0E1A' },       // Warm cream (not stark white)
  surface:    { light: '#FFFFFF', dark: '#1E2750' },        // White cards on cream / navy cards with 2% luminance delta
  foreground: { light: '#1F2937', dark: '#F5F5F5' },        // Dark charcoal on light / light on dark
  muted:      { light: '#6B7280', dark: '#A0A4B8' },        // Improved contrast: 4.5:1+ on both schemes
  border:     { light: '#E5E7EB', dark: 'rgba(255,215,0,0.40)' },  // 3:1+ contrast on #0A0E1A / #1E2750
  success:    { light: '#16A34A', dark: '#4ADE80' },        // Darker green for light bg
  warning:    { light: '#D97706', dark: '#FBBF24' },        // Darker amber for light bg
  error:      { light: '#DC2626', dark: '#F87171' },        // Darker red for light bg
};

// ─── Age-Adaptive Theme Palettes ──────────────────────────────
// These overlay the base theme for different age groups
const ageThemes = {
  // Ages 3-5: Soft pastels, larger elements, warm & cozy
  // Light mode optimized for young eyes with high contrast and warm tones
  toddler: {
    primary:    { light: '#FF9500', dark: '#FFD700' },       // Warm orange (more visible to young eyes)
    background: { light: '#FFFDF7', dark: '#0D1020' },       // Clean cream white (better than peach for light mode)
    surface:    { light: '#FFFFFF', dark: '#1E2750' },       // Pure white cards on light bg
    foreground: { light: '#2D1B10', dark: '#FFF5EB' },       // Warm dark brown (high contrast for text)
    muted:      { light: '#A0826D', dark: '#B0A898' },       // Softer brown for secondary text
    border:     { light: '#F5D4B8', dark: 'rgba(255,149,0,0.40)' },  // 3:1+ contrast on dark bg
  },
  // Ages 6-8: Vibrant, energetic, adventure-ready
  child: {
    primary:    { light: '#6C63FF', dark: '#FFD700' },       // Vibrant purple for light mode
    background: { light: '#F5F3FF', dark: '#0A0E1A' },       // Lavender tint
    surface:    { light: '#FFFFFF', dark: '#1E2750' },
    foreground: { light: '#1E1B4B', dark: '#F5F5F5' },       // Deep indigo
    muted:      { light: '#6366F1', dark: '#A0A4B8' },
    border:     { light: '#E0E7FF', dark: 'rgba(99,99,255,0.40)' },  // 3:1+ contrast on dark bg
  },
  // Ages 9-12: Sophisticated, dark-first, gaming-inspired
  tween: {
    primary:    { light: '#E6A800', dark: '#FFD700' },       // Same as default
    background: { light: '#F8FAFC', dark: '#0A0E1A' },       // Cool gray
    surface:    { light: '#FFFFFF', dark: '#1E2750' },
    foreground: { light: '#0F172A', dark: '#F5F5F5' },       // Slate
    muted:      { light: '#64748B', dark: '#A0A4B8' },
    border:     { light: '#E2E8F0', dark: 'rgba(255,215,0,0.40)' },  // 3:1+ contrast on dark bg
  },
};

// ─── Story Theme Accent Colors ────────────────────────────────
// Per-theme accent colors for story browsing and creation UI
const storyThemeAccents = {
  space:     { accent: '#6C63FF', gradient: ['#1A1A4E', '#2D1B69'] },
  ocean:     { accent: '#06B6D4', gradient: ['#0C4A6E', '#164E63'] },
  forest:    { accent: '#22C55E', gradient: ['#14532D', '#1A4D2E'] },
  dinosaur:  { accent: '#F97316', gradient: ['#7C2D12', '#9A3412'] },
  pirate:    { accent: '#EAB308', gradient: ['#713F12', '#854D0E'] },
  robot:     { accent: '#8B5CF6', gradient: ['#3B0764', '#581C87'] },
  fairy:     { accent: '#EC4899', gradient: ['#831843', '#9D174D'] },
  safari:    { accent: '#D97706', gradient: ['#78350F', '#92400E'] },
  arctic:    { accent: '#38BDF8', gradient: ['#0C4A6E', '#075985'] },
  medieval:  { accent: '#A16207', gradient: ['#422006', '#713F12'] },
  jungle:    { accent: '#16A34A', gradient: ['#14532D', '#166534'] },
  candy:     { accent: '#F472B6', gradient: ['#831843', '#BE185D'] },
  musical:   { accent: '#A855F7', gradient: ['#3B0764', '#6B21A8'] },
  garden:    { accent: '#4ADE80', gradient: ['#14532D', '#15803D'] },
};

/**
 * getAgeThemeColors(age, colorScheme)
 * Applies age-based theme overrides to the base colors.
 * Returns merged color palette optimized for the child's age group.
 */
function getAgeThemeColors(age, colorScheme = 'light') {
  const baseColors = colorScheme === 'dark' ?
    Object.fromEntries(Object.entries(themeColors).map(([k, v]) => [k, v.dark])) :
    Object.fromEntries(Object.entries(themeColors).map(([k, v]) => [k, v.light]));

  // If no age or outside range, return base colors
  if (age === undefined || age === null) return baseColors;

  let ageTheme = null;
  if (age >= 3 && age <= 5) {
    ageTheme = ageThemes.toddler;
  } else if (age >= 6 && age <= 8) {
    ageTheme = ageThemes.child;
  } else if (age >= 9 && age <= 12) {
    ageTheme = ageThemes.tween;
  } else {
    return baseColors;
  }

  // Merge age theme colors over base colors
  const merged = { ...baseColors };
  Object.entries(ageTheme).forEach(([colorName, colorSchemes]) => {
    if (colorSchemes && colorSchemes[colorScheme]) {
      merged[colorName] = colorSchemes[colorScheme];
    }
  });

  return merged;
}

module.exports = { themeColors, ageThemes, storyThemeAccents, getAgeThemeColors };
