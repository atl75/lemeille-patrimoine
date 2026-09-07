/**
 * Image de partage par défaut, à utiliser dans TOUT bloc `openGraph`.
 *
 * Next.js REMPLACE l'objet openGraph, il ne le fusionne pas : une page qui
 * redéfinit `openGraph` pour son titre perd l'image déclarée dans le layout
 * racine. Dix-sept pages étaient dans ce cas — dont l'accueil, /contact,
 * /immobilier, /vendre et les onze actualités : un lien partagé sur LinkedIn
 * ou WhatsApp n'affichait qu'une vignette grise.
 *
 * D'où cette constante : toute page qui déclare un openGraph y ajoute
 * `images: OG_IMAGE`, ou son visuel propre s'il en a un.
 */
export const OG_IMAGE = [
  {
    url: '/og-image.jpg?v=5',
    width: 1200,
    height: 630,
    alt: 'Lemeille Patrimoine — agence immobilière et défiscalisation',
  },
];
