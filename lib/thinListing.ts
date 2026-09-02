// Une fiche de bien vendu sans description ni photos n'apporte rien à un
// visiteur et pèse sur la qualité perçue du domaine : 19 pages quasi identiques
// affichant « Description . ».
//
// On les retire de l'index plutôt que de les rediriger : l'URL continue de
// fonctionner pour qui aurait un ancien lien, et il suffit de renseigner une
// description et quelques photos pour qu'elles redeviennent indexables.
export function isThinListing(p: any): boolean {
  if (!p) return false;
  const vendu = !!p.sold || p.status === 'SOLD' || p.status === 'UNDER_OFFER';
  if (!vendu) return false;
  const desc = String(p.description || '').trim();
  const photos = Array.isArray(p.images) ? p.images.length : 0;
  return desc.length < 40 && photos <= 1;
}
