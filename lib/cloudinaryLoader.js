/**
 * Loader d'images pour next/image.
 *
 * Les photos hébergées sur Cloudinary sont servies DIRECTEMENT depuis le CDN
 * Cloudinary (optimisation f_auto/q_auto + redimensionnement à la volée, cache
 * mondial), sans passer par l'optimiseur next/image de Cloud Run — qui, sur une
 * instance unique, ralentissait le chargement des fiches biens.
 *
 * Les images locales / autres sources sont renvoyées telles quelles.
 */
export default function cloudinaryLoader({ src, width, quality }) {
  if (typeof src === 'string' && src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    const params = ['f_auto', `q_${quality || 'auto'}`, 'c_limit', `w_${width}`];
    return src.replace('/upload/', `/upload/${params.join(',')}/`);
  }
  return src;
}
