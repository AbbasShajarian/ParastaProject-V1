import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#179bae ", // "#14b8a6"   // فیروزه‌ای
        primaryDark: "#0f766e",
        bg: "#E0E0E0",
        bgcolor: "#FFFFF8",
        // #E0E0E0
        // #E0D2B8
        // #F2E8D5
        textMain: "#0f172a",
        textSub: "#475569",
      },
    },
  },
  plugins: [],
};

export default config;
