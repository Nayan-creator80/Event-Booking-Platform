/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0F172A",      // Deep slate background
        darkCard: "#1E293B",    // Card panels
        accentBlue: "#0EA5E9",  // Vibrant blue
        accentPurple: "#8B5CF6",// Elegant purple
        accentEmerald: "#10B981",// Success/confirm emerald
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
