/**
 * Largeur à laquelle la visionneuse affiche une photo.
 *
 * Partagée entre la visionneuse et la galerie qui l'ouvre. Sans cet accord,
 * chacune visait sa propre URL Cloudinary : les vignettes chargeaient du 384,
 * la visionneuse demandait du 1600, et le premier clic sur une photo payait
 * une transformation que Cloudinary n'avait jamais fabriquée — mesuré à
 * 0,89 s contre 0,17 s une fois l'URL chaude, avant même le téléchargement.
 *
 * La galerie précharge donc au survol à CETTE largeur exactement.
 */
export function largeurVisionneuse(): number {
  if (typeof window === "undefined") return 1600;
  const px = Math.round(
    window.innerWidth * 0.92 * Math.min(window.devicePixelRatio || 1, 2)
  );
  return px <= 900 ? 828 : px <= 1400 ? 1200 : px <= 1900 ? 1600 : 2400;
}

/**
 * Largeur de l'aperçu affiché immédiatement, le temps que la pleine définition
 * arrive. C'est la largeur que les vignettes de la galerie ont déjà chargée :
 * l'aperçu sort donc du cache du navigateur, sans un octet de réseau.
 */
export const LARGEUR_APERCU = 384;
