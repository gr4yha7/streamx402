import { radixThemePreset } from "radix-themes-tw";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#9146FF", // Twitch-like purple as primary
        "background-light": "#F7F7F8",
        "background-dark": "#0E0E10", // Very dark background
        "surface-light": "#FFFFFF",
        "surface-dark": "#18181B", // Slightly lighter for cards/panels
        "border-light": "#E5E7EB",
        "border-dark": "#2D2D31",
        "accent-dark": "#1F1F23",
        "chat-bg": "rgba(0, 0, 0, 0.6)", // Semi-transparent black for overlay
      },
      fontFamily: {
        display: ["Spline Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      animation: {
        wiggle: "wiggle 1s ease-in-out infinite",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-15deg)" },
          "50%": { transform: "rotate(15deg)" },
        },
      },
    },
  },
  plugins: [],
  presets: [radixThemePreset],
};
export default config;
