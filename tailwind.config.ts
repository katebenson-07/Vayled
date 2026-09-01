import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#EAECE4",
        charcoal: "#33181C",
        gold: "#6F5F4D",
        beige: "#DDD9C9",
      },
      fontFamily: {
        // Two typefaces total, reused across every role: Cormorant Garamond
        // (serif/heading/logo/script) and DM Sans (sans/tagline). See
        // app/layout.tsx for why.
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        script: ["var(--font-serif)", "Georgia", "serif"],
        heading: ["var(--font-serif)", "Georgia", "serif"],
        logo: ["var(--font-serif)", "Georgia", "serif"],
        tagline: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
