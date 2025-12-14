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
        primary: "#7f13ec",
        "background-light": "#f7f6f8",
        "background-dark": "#191022",
        surface: "#1F1F23",
        "surface-secondary": "#2F2F35",
        accent: "#9146FF",
        "text-primary": "#EFEFF1",
        "text-secondary": "#ADADB8",
        "card-light": "#ffffff",
        "card-dark": "#2a2a2d",
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
