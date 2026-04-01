/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00C853",
        accent: "#00E676",
        danger: "#FF5252",
        warning: "#FFB300",
        surface: "#1E1E2E",
        card: "#2A2A3C",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
};
