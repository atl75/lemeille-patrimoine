import { eurosEnLettres } from '@/lib/enLettres';
import { NOVUS_LOGO_BASE64 } from '@/lib/novusLogo';
import { SIGNATURE_MANDATAIRE_B64 } from '@/lib/signatureMandataire';

/**
 * Avenant au mandat de vente — changement de prix.
 *
 * Un mandat signé est FIGÉ : l'API refuse toute modification (409). C'est la
 * règle, et c'est précisément pourquoi l'avenant existe. Baisser le prix ne se
 * fait pas en réécrivant le contrat, mais en signant un acte qui s'y ajoute et
 * qui porte l'ancien prix autant que le nouveau — sans quoi rien ne prouverait
 * ce sur quoi les parties s'étaient entendues au départ.
 *
 * Le document tient sur une page : il ne rejoue pas le mandat, il le modifie
 * sur un point et déclare le reste inchangé.
 */
export async function buildAvenantPdf(mandat: any, avenant: any): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoImg = await pdfDoc.embedPng(Buffer.from(NOVUS_LOGO_BASE64, 'base64'));

  const navyH = rgb(0.125, 0.149, 0.196);
  const gold = rgb(0.722, 0.612, 0.427);
  const dark = rgb(0.13, 0.13, 0.13);
  const grey = rgb(0.42, 0.42, 0.42);
  const rule = rgb(0.8, 0.8, 0.8);

  const PW = 595, PH = 842, M = 52, BAND = 58;
  const CW = PW - M * 2;

  // pdf-lib n'embarque ici que les fontes standard, limitées au jeu WinAnsi :
  // tout caractère hors de ce jeu ferait échouer le rendu. Même nettoyage que
  // le mandat, pour que les deux documents se ressemblent au caractère près.
  const clean = (t: any) => String(t ?? '')
    // Espaces exotiques désignées par leur point de code : insécable, fine
    // insécable, fine, demi-cadratin, cadratin, sans chasse, joint de mot.
    // toLocaleString('fr-FR') sépare les milliers par U+202F, que les fontes
    // standard de pdf-lib ne savent pas encoder — le PDF échouait dessus.
    .replace(/[\u00A0\u202F\u2009\u2002\u2003\u200B\u2060]/g, ' ')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/€/g, 'EUR').replace(/²/g, '2')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/[^\x00-\xFF]/g, '');

  // Passe par clean() : c'est lui qui neutralise les espaces que les fontes
  // standard ne savent pas encoder.
  const eur = (n: any) =>
    (n || n === 0) ? clean(Math.round(Number(n)).toLocaleString('fr-FR')) + ' EUR' : '-';

  let page: any = pdfDoc.addPage([PW, PH]);
  let y = 0;

  const wrap = (text: string, size: number, maxW: number, f: any = font): string[] => {
    const out: string[] = [];
    for (const src of clean(text).split('\n')) {
      const mots = src.split(/\s+/).filter(Boolean);
      let ligne = '';
      for (const w of mots) {
        const essai = ligne ? ligne + ' ' + w : w;
        if (f.widthOfTextAtSize(essai, size) > maxW && ligne) { out.push(ligne); ligne = w; }
        else ligne = essai;
      }
      out.push(ligne);
    }
    return out.length ? out : [''];
  };

  const header = () => {
    page.drawRectangle({ x: 0, y: PH - BAND, width: PW, height: BAND, color: navyH });
    page.drawRectangle({ x: 0, y: PH - BAND, width: PW, height: 2, color: gold });
    const ls = 40;
    page.drawImage(logoImg, { x: M, y: PH - BAND + (BAND - ls) / 2 - 1, width: ls, height: ls });
    const t = 'AVENANT AU MANDAT DE VENTE';
    const tw = fontBold.widthOfTextAtSize(t, 13);
    page.drawText(t, { x: (PW - tw) / 2, y: PH - 24, size: 13, font: fontBold, color: gold });
    const sub = 'NOVUS CAPITAL - 50 rue de la Garenne - 76130 Mont-Saint-Aignan';
    const sw = font.widthOfTextAtSize(clean(sub), 7);
    page.drawText(clean(sub), { x: (PW - sw) / 2, y: PH - 38, size: 7, font, color: rgb(0.85, 0.85, 0.88) });
    y = PH - BAND - 26;
  };

  const titre = (t: string) => {
    page.drawText(clean(t), { x: M, y, size: 9.5, font: fontBold, color: navyH });
    page.drawLine({ start: { x: M, y: y - 4 }, end: { x: M + 26, y: y - 4 }, thickness: 0.8, color: gold });
    y -= 16;
  };

  const para = (t: string, o: { size?: number; color?: any; after?: number; f?: any } = {}) => {
    const size = o.size ?? 8.6;
    const f = o.f ?? font;
    for (const l of wrap(t, size, CW, f)) {
      page.drawText(l, { x: M, y, size, font: f, color: o.color ?? dark });
      y -= size * 1.42;
    }
    y -= o.after ?? 6;
  };

  const ligne = (libelle: string, valeur: string, o: { gras?: boolean } = {}) => {
    page.drawText(clean(libelle), { x: M, y, size: 8.6, font, color: grey });
    page.drawText(clean(valeur), {
      x: M + 150, y, size: 8.6,
      font: o.gras ? fontBold : font,
      color: o.gras ? navyH : dark,
    });
    y -= 12.5;
  };

  // ── En-tête ──────────────────────────────────────────────────────────────
  header();

  const num = mandat.mandateNumber ? `N° ${mandat.mandateNumber}` : '';
  const dateMandat = mandat.createdAt ? new Date(mandat.createdAt).toLocaleDateString('fr-FR') : '-';
  const typeMandat = mandat.mandateType === 'EXCLUSIF' ? 'exclusif' : 'simple';

  titre('LE MANDAT MODIFIE');
  ligne('Mandat de vente :', `${typeMandat} ${num}`.trim(), { gras: true });
  ligne('En date du :', dateMandat);
  const typeBien = (mandat.type === 'MAISON' ? 'Maison' : 'Appartement') + (mandat.rooms ? ` T${mandat.rooms}` : '');
  ligne('Bien :', `${typeBien}${mandat.surface ? ` - ${mandat.surface} m2` : ''}`);
  ligne('Situé :', mandat.map?.query || [mandat.city, String(mandat.region || '').replaceAll('_', ' ')].filter(Boolean).join(', '));
  if (mandat.designation) ligne('Désignation :', mandat.designation);
  y -= 6;

  // ── Les parties ──────────────────────────────────────────────────────────
  const mandants: any[] = Array.isArray(mandat.owners) ? mandat.owners : [];
  const nomMandant = (o: any) => o?.type === 'COMPANY'
    ? [o.name, o.legalForm ? `(${o.legalForm})` : '', o.siren ? `SIREN ${o.siren}` : ''].filter(Boolean).join(' ')
    : [o?.firstName, o?.lastName].filter(Boolean).join(' ');

  titre('ENTRE LES SOUSSIGNES');
  para('Le Mandataire : NOVUS CAPITAL, SAS au capital social, dont le siège est 50 rue de la Garenne, 76130 Mont-Saint-Aignan, SIREN 937 847 937, titulaire de la carte professionnelle CPI 7606 2024 000 000 038 delivree par la CCI Rouen Metropole.', { after: 4 });
  para(mandants.length
    ? 'Le(s) Mandant(s) : ' + mandants.map(nomMandant).filter(Boolean).join(' ; ')
    : 'Le(s) Mandant(s) : ' + (mandat.mandateSignerName || '-'), { after: 8 });

  // ── Article 1 : ce qui change ────────────────────────────────────────────
  titre('ARTICLE 1 - MODIFICATION DU PRIX');
  para("Les parties conviennent de modifier le prix de vente stipule au mandat vise ci-dessus. Les conditions financieres sont desormais les suivantes :", { after: 8 });

  const a = avenant?.ancien || {};
  const n = avenant?.nouveau || {};

  // Tableau ancien / nouveau : la comparaison est l'objet même du document.
  const colL = M, col1 = M + 170, col2 = M + 330;
  const enTete = (t: string, x: number) =>
    page.drawText(clean(t), { x, y, size: 8, font: fontBold, color: navyH });
  enTete('', colL); enTete('Mandat initial', col1); enTete('Apres avenant', col2);
  y -= 4;
  page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.6, color: gold });
  y -= 12;

  const rang = (libelle: string, av: any, ap: any, gras = false) => {
    const f = gras ? fontBold : font;
    page.drawText(clean(libelle), { x: colL, y, size: 8.6, font, color: grey });
    page.drawText(clean(eur(av)), { x: col1, y, size: 8.6, font, color: dark });
    page.drawText(clean(eur(ap)), { x: col2, y, size: 8.6, font: f, color: gras ? navyH : dark });
    // Le filet se trace SOUS la ligne courante, avant de descendre. Tracé
    // après la descente, il tombait au milieu du texte suivant et le barrait.
    page.drawLine({ start: { x: M, y: y - 4.5 }, end: { x: PW - M, y: y - 4.5 }, thickness: 0.3, color: rule });
    y -= 13;
  };

  rang('Prix de vente FAI', a.price, n.price, true);
  rang('Honoraires du Mandataire', a.commissionAmount, n.commissionAmount);
  rang('Prix net vendeur', a.netSellerAmount, n.netSellerAmount, true);
  y -= 8;

  const pct = n.commissionPercentage ?? a.commissionPercentage;
  para(`Soit un prix de vente FAI de ${eur(n.price)} - ${eurosEnLettres(Number(n.price) || 0)}${pct != null ? `, honoraires du Mandataire de ${pct} % du prix FAI` : ''}, a la charge ${mandat.mandateHonorairesCharge === 'VENDEUR' ? 'du Vendeur' : "de l'Acquereur"}.`, { after: 6 });

  if (avenant?.motif) para(`Motif : ${avenant.motif}`, { size: 8.2, color: grey, after: 8 });

  // ── Article 2 : ce qui ne change pas ─────────────────────────────────────
  titre('ARTICLE 2 - DISPOSITIONS INCHANGEES');
  para("Toutes les autres clauses et conditions du mandat de vente vise a l'article 1 demeurent inchangees et conservent leur plein effet, notamment sa duree, sa nature et les obligations respectives des parties. Le present avenant fait partie integrante du mandat auquel il s'ajoute.", { after: 10 });

  // ── Signatures ───────────────────────────────────────────────────────────
  const dateAvenant = avenant?.createdAt ? new Date(avenant.createdAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
  para(`Fait a ${clean(mandat.mandatePlace || mandat.city || '')}, le ${dateAvenant}, en autant d'exemplaires que de parties.`, { after: 10 });

  const signataires: any[] = Array.isArray(avenant?.signers) ? avenant.signers : [];
  const hauteurBloc = 52;

  const bloc = async (titreBloc: string, nom: string, sg: any, pngB64?: string) => {
    // Un bloc déborderait sous le pied : on passe à une seconde page plutôt
    // que d'écrire par-dessus la marge.
    if (y - hauteurBloc < 60) {
      page = pdfDoc.addPage([PW, PH]);
      header();
    }
    page.drawText(clean(titreBloc), { x: M, y, size: 8.6, font: fontBold, color: navyH });
    y -= 11;
    if (nom) { page.drawText(clean(nom), { x: M, y, size: 8.2, font, color: dark }); y -= 11; }
    const b64 = pngB64 || (sg?.dataUrl && /^data:image\/png;base64,/.test(sg.dataUrl) ? sg.dataUrl.split(',')[1] : '');
    if (b64) {
      try {
        const img = await pdfDoc.embedPng(Buffer.from(b64, 'base64'));
        const h = 30, w = Math.min(120, (img.width / img.height) * h);
        page.drawImage(img, { x: M, y: y - h, width: w, height: h });
        // 10 pt sous l'image : à 4, les hampes de la mention mordaient dessus.
        y -= h + 10;
        if (sg?.signedAt) {
          page.drawText(clean(`Mention : « ${sg.mention || 'Bon pour avenant'} » - Signature electronique simple (eIDAS) - ${new Date(sg.signedAt).toLocaleString('fr-FR')}`),
            { x: M, y, size: 7, font, color: grey });
          y -= 12;
        } else { y -= 8; }
      } catch { y -= 34; }
    } else {
      page.drawLine({ start: { x: M, y: y - 22 }, end: { x: M + 170, y: y - 22 }, thickness: 0.5, color: rule });
      y -= 30;
    }
    y -= 8;
  };

  para('Signature precedee de la mention manuscrite « Bon pour avenant »', { size: 8, color: grey, after: 8 });

  await bloc('Le Mandataire', 'NOVUS CAPITAL - Arthur Lemeille', null, SIGNATURE_MANDATAIRE_B64);
  if (mandants.length) {
    for (let i = 0; i < mandants.length; i++) {
      const sg = signataires.find((s: any) => s.ownerIndex === i) || null;
      await bloc(mandants.length > 1 ? `Le Mandant ${i + 1}` : 'Le Mandant', nomMandant(mandants[i]), sg);
    }
  } else {
    await bloc('Le Mandant', mandat.mandateSignerName || '', signataires[0] || null);
  }

  return pdfDoc.save();
}
