import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F8F9FA",
        charcoal: "#1C1B1B",
        wine: "#4D0E12",
        gold: "#4D0E12",
        beige: "#E8DFD8",
      },
      // Squarer, quieter corners: hairline-bordered cards instead of soft pills.
      // Pills (rounded-full) are left alone on purpose.
      borderRadius: {
        none: "0",
        sm: "1px",
        DEFAULT: "2px",
        md: "2px",
        lg: "3px",
        xl: "4px",
        "2xl": "6px",
        full: "9999px",
      },
      // Everything is Hanken Grotesk (see app/layout.tsx). The role names stay so
      // existing pages keep working; they simply all resolve to the one sans.
      fontFamily: {
        serif: ["var(--font-sans)", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        script: ["var(--font-sans)", "Arial", "sans-serif"],
        heading: ["var(--font-sans)", "Arial", "sans-serif"],
        logo: ["var(--font-display)", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Arial", "sans-serif"],
        tagline: ["var(--font-sans)", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
