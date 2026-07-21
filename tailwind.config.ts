import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-source)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      colors: {
        brand: {
          50: "#F3F6FA",
          100: "#E8EEF6",
          500: "#3A5F96",
          700: "#1F3864",
          800: "#1A2F52",
          950: "#0B1628",
        },
        brass: {
          100: "#F5EEDC",
          500: "#C4A35A",
          700: "#8A6A2F",
        },
        ink: {
          DEFAULT: "#1C2430",
          secondary: "#5A6574",
          muted: "#7A8696",
        },
        paper: {
          page: "#F7F6F3",
          muted: "#F1F0EC",
          surface: "#FFFFFF",
        },
        line: {
          subtle: "#E6E4DE",
          strong: "#D4D1C8",
        },
        success: {
          DEFAULT: "#2F6B4F",
          soft: "rgba(47, 107, 79, 0.14)",
        },
        teal: {
          50: "#E4F3F2",
          600: "#0E7C7B",
          700: "#0B5F5E",
        },
      },
      boxShadow: {
        soft: "0 4px 12px rgba(18, 35, 63, 0.08), 0 16px 40px rgba(18, 35, 63, 0.08)",
        card: "0 1px 2px rgba(18, 35, 63, 0.04), 0 6px 20px rgba(18, 35, 63, 0.05)",
      },
      borderRadius: {
        "4xl": "28px",
      },
      keyframes: {
        "fade-rise": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
