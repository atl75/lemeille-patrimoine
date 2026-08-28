import cloudinaryLoader from '@/lib/cloudinaryLoader';

// Renvoie l'URL Cloudinary optimisée (f_auto/q_auto + largeur) pour une image
// hébergée sur Cloudinary ; laisse toute autre source (base64, locale) intacte.
// Utilisé pour les <img> bruts (plans, galerie projections) afin de servir des
// formats modernes sans les contraintes de dimensions de next/image.
export function cldImg(src: string, width: number, quality: string | number = 'auto'): string {
  return cloudinaryLoader({ src, width, quality });
}
