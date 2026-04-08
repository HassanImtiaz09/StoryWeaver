const { themeColors } = require("./theme.config");
const plugin = require("tailwindcss/plugin");

const tailwindColors = Object.fromEntries(
  Object.entries(themeColors).map(([name, swatch]) => [
    name,
    {
      DEFAULT: `var(--color-${name})`,
      light: swatch.light,
      dark: swatch.dark,
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // Scan all component and app files for Tailwind classes
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./lib/**/*.{js,ts,tsx}", "./hooks/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        'heading': ['Baloo2_700Bold'],
        'heading-medium': ['Baloo2_600SemiBold'],
        'heading-light': ['Baloo2_500Medium'],
        'body': ['Quicksand_400Regular'],
        'body-medium': ['Quicksand_500Medium'],
        'body-semibold': ['Quicksand_600SemiBold'],
        'body-bold': ['Quicksand_700Bold'],
        'story': ['PatrickHand_400Regular'],
        'fun': ['BubblegumSans_400Regular'],
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("light", ':root:not([data-theme="dark"]) &');
      addVariant("dark", ':root[data-theme="dark"] &');
    }),
  ],
};
