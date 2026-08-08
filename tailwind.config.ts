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
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
        heading: ["var(--font-heading)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
