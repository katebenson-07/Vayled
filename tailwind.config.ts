import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF8F5",
        charcoal: "#231815",
        wine: "#4D0E12",
        gold: "#4A2E27",
        beige: "#E8DFD8",
      },
      fontFamily: {
        // Lora is the one universal text font — every text role except
        // font-script and font-logo resolves to the same --font-sans
        // variable, so serif/sans/heading/tagline are intentionally
        // identical here rather than four different fonts. font-script is
        // Spectral, chosen by Kate after Abril Fatface felt too big/heavy
        // (earlier rounds also tried Bellefair/Playfair/Marcellus/Prata/EB
        // Garamond/Fraunces/Crimson Pro/Cormorant SC/Cardo). font-logo is
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
