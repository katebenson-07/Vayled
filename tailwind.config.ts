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
        charcoal: "#5d1217",
        gold: "#6F5F4D",
        beige: "#DDD9C9",
      },
      fontFamily: {
        // Cormorant Garamond is the default everywhere (serif/heading, and
        // the site-wide body-text default set in globals.css). DM Sans is
        // the explicit sans role, kept for anything that needs even digits.
        // font-script and font-logo are free lookalikes for the paid Sloop
        // Script Pro / Black Gold fonts — see app/layout.tsx.
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        script: ["var(--font-script-display)", "Georgia", "serif"],
        heading: ["var(--font-serif)", "Georgia", "serif"],
        logo: ["var(--font-logo-display)", "Georgia", "serif"],
        tagline: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
