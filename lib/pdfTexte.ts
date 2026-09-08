/**
 * Texte d'un PDF, lu DANS LE NAVIGATEUR.
 *
 * POURQUOI CÔTÉ CLIENT. Le fichier ne quitte pas le poste, l'instance Cloud
 * Run — 1 Gio, une seule instance — n'a pas à digérer un PDF de plusieurs
 * mégaoctets, et pdfjs-dist est déjà chargé de cette façon par le lecteur de
 * documents. Seul le texte extrait part vers le serveur.
 *
 * POURQUOI LE TITRE À PART. Une impression de page d'annonce embarque le
 * <title> du navigateur dans ses métadonnées, et sur les portails ce titre est
 * normalisé : « Appartement à vendre T3-F3 56.59 m² 735000 € Montmartre Paris
 * (75018) » porte le type, les pièces, la surface, le prix, la ville et le
 * code postal, sans un seul chiffre parasite. C'est la source la plus sûre du
 * document — bien plus que son corps, qui mélange les biens similaires.
 */

/** Ce que le navigateur tire d'une impression PDF. */
export type LecturePdf = {
  titre: string;
  texte: string;
  pages: number;
  pagesLues: number;
};

/**
 * Nombre de pages dont on lit le texte.
 *
 * Une impression d'annonce fait couramment quinze pages : la fiche, puis les
 * photos, puis les « biens similaires » — dont les prix pollueraient l'analyse.
 * Les premières pages portent le bien lui-même.
 */
const PAGES_LUES = 4;

export async function texteDepuisPdf(fichier: File | Blob): Promise<LecturePdf> {
  const pdfjs: any = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

  const donnees = new Uint8Array(await fichier.arrayBuffer());
  const pdf = await pdfjs.getDocument({
    data: donnees,
    // Sans cela, les accents des polices de substitution sortent de travers.
    standardFontDataUrl: '/pdfjs/standard_fonts/',
  }).promise;

  let titre = '';
  try {
    const meta = await pdf.getMetadata();
    titre = String(meta?.info?.Title ?? '').trim();
  } catch { /* métadonnées absentes : le corps suffira */ }

  // À défaut de métadonnées, le nom du fichier porte le même titre : macOS
  // nomme l'impression d'après le <title> de la page.
  if (!titre && 'name' in fichier && typeof (fichier as File).name === 'string') {
    titre = (fichier as File).name.replace(/\.pdf$/i, '').trim();
  }

  const pagesLues = Math.min(pdf.numPages, PAGES_LUES);
  const morceaux: string[] = [];
  for (let n = 1; n <= pagesLues; n++) {
    const page = await pdf.getPage(n);
    const contenu = await page.getTextContent();
    // Les éléments arrivent morcelés : on les recolle avec un espace, sans
    // quoi « 56,59 » et « m² » se retrouveraient soudés à leurs voisins.
    morceaux.push(contenu.items.map((i: any) => i.str ?? '').join(' '));
  }

  return {
    titre,
    texte: morceaux.join('\n').replace(/[ \t]+/g, ' '),
    pages: pdf.numPages,
    pagesLues,
  };
}
