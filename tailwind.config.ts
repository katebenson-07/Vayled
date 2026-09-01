import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#fdf9f2",
        charcoal: "#2a1a14",
        gold: "#6F5F4D",
        beige: "#DDD9C9",
      },
      fontFamily: {
        // Jost is the one universal text font — every text role except
        // font-script and font-logo resolves to the same --font-sans
        // variable, so serif/sans/heading/tagline are intentionally
        // identical here rather than four different fonts. font-script is
        // Bellefair (free lookalike for the paid Sloop Script Pro font Kate
        // wants). font-logo is Italiana (free lookalike for paid Black
        // Gold) — see app/layout.tsx.
        serif: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        script: ["var(--font-script-display)", "Georgia", "serif"],
        heading: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        logo: ["var(--font-logo-display)", "Georgia", "serif"],
        tagline: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
