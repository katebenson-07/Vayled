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
        // Lora is the one universal text font — every text role except
        // font-script and font-logo resolves to the same --font-sans
        // variable, so serif/sans/heading/tagline are intentionally
        // identical here rather than four different fonts. font-script is
        // Abril Fatface, chosen by Kate over Bellefair/Playfair/Marcellus/
        // Prata/EB Garamond from a side-by-side comparison. font-logo is
        // Italiana (free lookalike for paid Black Gold) — see
        // app/layout.tsx.
        serif: ["var(--font-sans)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Georgia", "serif"],
        script: ["var(--font-script-display)", "Georgia", "serif"],
        heading: ["var(--font-sans)", "Georgia", "serif"],
        logo: ["var(--font-logo-display)", "Georgia", "serif"],
        tagline: ["var(--font-sans)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
