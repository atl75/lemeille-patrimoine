/**
 * Loader d'images pour next/image.
 *
 * 1. Photos Cloudinary : servies DIRECTEMENT depuis le CDN Cloudinary
 *    (f_auto/q_auto + redimensionnement à la volée, cache mondial), sans passer
 *    par l'optimiseur next/image de Cloud Run — qui, sur une instance unique,
 *    ralentissait le chargement des fiches biens.
 *
 * 2. Images de bandeau locales (/hero-*.jpg) : servies en WebP pré-généré à la
 *    largeur demandée (public/hero/{nom}-{largeur}.webp). Sans cela, le srcset
 *    renvoyait le même JPG pleine taille à toutes les largeurs — cause
 *    principale d'un LCP dégradé sur mobile.
 *
 * 3. Autres images locales : renvoyées telles quelles.
 */
const HERO_WIDTHS = [640, 828, 1200, 1600, 2400];

export default function cloudinaryLoader({ src, width, quality }) {
  if (typeof src === 'string' && src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    const params = ['f_auto', `q_${quality || 'auto'}`, 'c_limit', `w_${width}`];
    return src.replace('/upload/', `/upload/${params.join(',')}/`);
  }

  const hero = typeof src === 'string' && src.match(/^\/hero-([a-z0-9-]+)\.jpg$/i);
  if (hero) {
    const w = HERO_WIDTHS.find((x) => x >= width) || HERO_WIDTHS[HERO_WIDTHS.length - 1];
    return `/hero/${hero[1]}-${w}.webp`;
  }

  return src;
}
