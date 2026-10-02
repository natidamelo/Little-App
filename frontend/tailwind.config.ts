import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        purple: { 600: "#7c3aed", 400: "#a78bfa" },
        blue: { 500: "#3b82f6" },
        cyan: { 400: "#06b6d4" },
        emerald: { 500: "#10b981" },
        rose: { 500: "#f43f5e" },
        amber: { 500: "#f59e0b" },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
