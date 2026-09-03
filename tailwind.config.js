/** @type {import('tailwindcss').Config} */

// ATTENTION — c'est CE fichier que Tailwind charge, pas tailwind.config.ts.
// La résolution teste .js avant .ts : un `tailwind.config.ts` a longtemps
// coexisté ici sans jamais être lu, emportant avec lui les deux greffons qu'il
// déclarait. Conséquence visible : les quatre pages légales employaient
// `prose` sans qu'aucune règle de typographie n'existe dans le CSS produit —
// paragraphes collés, listes sans puces. Le .ts a été supprimé ; ne pas en
// recréer un.
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
      borderRadius: { "2xl": "1.25rem" },

      // Typographie des pages de texte long (mentions légales, barème,
      // confidentialité, cookies), calée sur la palette du site.
      typography: {
        DEFAULT: {
          css: {
            // Le doré de marque (#B89C6D) ne tient que 2,3:1 sur le fond crème :
            // insuffisant pour du texte. Les liens prennent une version assombrie
            // à 5,2:1, la couleur de marque restant réservée aux fonds sombres.
            "--tw-prose-body": "#2A2A2A",
            "--tw-prose-headings": "#1F3B2C",
            "--tw-prose-links": "#7A6134",
            "--tw-prose-bold": "#1F3B2C",
            "--tw-prose-bullets": "#B89C6D",
            "--tw-prose-counters": "#7A6134",
            "--tw-prose-hr": "rgba(0,0,0,0.08)",
            "--tw-prose-quotes": "#1F3B2C",
            "--tw-prose-quote-borders": "#B89C6D",
            maxWidth: "none",
            h2: {
              fontFamily: 'var(--font-playfair), Georgia, "Times New Roman", serif',
              fontWeight: "500",
              letterSpacing: "0.01em",
            },
            h3: {
              fontFamily: 'var(--font-playfair), Georgia, "Times New Roman", serif',
              fontWeight: "500",
            },
            a: { textUnderlineOffset: "2px" },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
