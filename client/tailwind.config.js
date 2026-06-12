/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#080706",
        surface: "#12100E",
        surfaceSoft: "#1B1714",
        champagne: "#D8B978",
        wood: "#5A3825",
        bronze: "#9C7248",
        text: "#F4EFE7",
        muted: "#A79D91",
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 10px 40px -12px rgba(0,0,0,0.6)",
        glow: "0 0 32px -8px rgba(216,185,120,0.35)",
      },
    },
  },
  plugins: [],
};
