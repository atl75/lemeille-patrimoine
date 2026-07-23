/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { luxe: "#1F3B2C", gold: "#B89C6D", cream: "#F4F1EB" },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,0.08)" },
      borderRadius: { "2xl": "1.25rem" }
    }
  },
  plugins: []
};
