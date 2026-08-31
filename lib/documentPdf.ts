import { eurosEnLettres } from '@/lib/enLettres';
import { LEMEILLE_LOGO_BASE64, LEMEILLE_LOGO_RATIO } from '@/lib/lemeilleLogo';
import { SIGNATURE_MANDATAIRE_B64 } from '@/lib/signatureMandataire';

export type DocData = {
  type: 'VISITE' | 'OFFRE';
  number?: string;
  property?: { title?: string; type?: string; rooms?: number; city?: string; region?: string; address?: string; price?: number; surface?: number; cadastralReference?: string };
  client?: { firstName?: string; lastName?: string; email?: string; phone?: string; address?: string };
  offerAmount?: number;
  atAskingPrice?: boolean;
  sequestreAmount?: number;      // Séquestre versé à l'appui de l'offre
  validityDays?: number;          // Durée de validité de l'offre (jours)
  financing?: 'COMPTANT' | 'CREDIT'; // Financement comptant ou à crédit
  place?: string;
  dateStr?: string;
  signature?: { dataUrl?: string; mention?: string; signedAt?: string; ip?: string };
  // Offre d'achat : le vendeur accepte (ou non) l'offre. L'acceptation est un
  // acte juridique distinct de la signature de l'acquéreur, d'où un bloc dédié.
  owner?: { name?: string; email?: string };
  ownerSignature?: { dataUrl?: string; mention?: string; signedAt?: string; ip?: string };
};

// Génère un PDF « Bon de visite » ou « Offre d'achat » signé (une page A4).
export async function buildDocumentPdf(d: DocData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const lpLogo = await pdfDoc.embedPng(Buffer.from(LEMEILLE_LOGO_BASE64, 'base64'));

  const navy = rgb(0.122, 0.231, 0.173), gold = rgb(0.722, 0.612, 0.427), dark = rgb(0.13, 0.13, 0.13), grey = rgb(0.42, 0.42, 0.42), rule = rgb(0.8, 0.8, 0.8), white = rgb(1, 1, 1);
  const PW = 595, PH = 842, M = 52, CW = PW - M * 2;
  const clean = (t: any) => String(t ?? '').replace(/[   ​⁠]/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/[^\x00-\xFF€œŒ]/g, '');
  let page = pdfDoc.addPage([PW, PH]);
  let y = PH;

  const eur = (n?: number) => (n || n === 0) ? Math.round(Number(n)).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' €' : '..........';
  const wrapLines = (text: string, size: number, maxW: number, f: any = font) => {
    const out: string[] = [];
    for (const src of clean(text).split('\n')) {
      const words = src.split(/\s+/).filter(Boolean); let line = '';
      for (const w of words) { const test = line ? line + ' ' + w : w; if (f.widthOfTextAtSize(test, size) > maxW && line) { out.push(line); line = w; } else line = test; }
      out.push(line);
    }
    return out;
  };
  const para = (text: string, opts: any = {}) => {
    const size = opts.size || 10, f = opts.bold ? fontBold : font, color = opts.color || dark;
    for (const line of wrapLines(text, size, CW, f)) { y -= size + 3; page.drawText(line, { x: M, y, size, font: f, color }); }
    y -= (opts.after ?? 4);
  };
  const kv = (k: string, v: string) => {
    y -= 15; page.drawText(clean(k), { x: M, y, size: 9.5, font: fontBold, color: navy });
    const vx = M + 150; for (const line of wrapLines(v || '-', 9.5, CW - 150)) { page.drawText(line, { x: vx, y, size: 9.5, font, color: dark }); y -= 13; } y += 13; y -= 3;
  };

  // ---- En-tête ----
  // En-tête clair plutôt qu'un aplat vert pleine largeur : le logo porte
  // l'identité, un filet doré suffit à asseoir le document. Un bandeau plein
  // alourdit un document contractuel et écrase le logo.
  const lpH = 34, lpW = lpH * LEMEILLE_LOGO_RATIO;
  page.drawImage(lpLogo, { x: M, y: PH - 20 - lpH, width: lpW, height: lpH });
  page.drawText(clean('Immobilier & défiscalisation'), { x: M + 4, y: PH - 20 - lpH - 12, size: 7.5, font, color: grey });

  // Entité juridique, à droite et discrète.
  const legal = 'NOVUS CAPITAL SAS';
  page.drawText(legal, { x: PW - M - fontBold.widthOfTextAtSize(legal, 9), y: PH - 30, size: 9, font: fontBold, color: navy });
  const cpi = 'CPI 7606 2024 000 000 038';
  page.drawText(cpi, { x: PW - M - font.widthOfTextAtSize(cpi, 7.5), y: PH - 42, size: 7.5, font, color: grey });

  page.drawLine({ start: { x: M, y: PH - 78 }, end: { x: PW - M, y: PH - 78 }, thickness: 1.2, color: gold });
  y = PH - 78 - 26;

  const isOffre = d.type === 'OFFRE';
  const title = isOffre ? "OFFRE D'ACHAT" : 'BON DE VISITE';
  page.drawText(title, { x: M, y, size: 17, font: timesBold, color: navy }); y -= 6;
  if (d.number) { page.drawText(`N° ${clean(d.number)}`, { x: PW - M - 90, y: y + 4, size: 10, font, color: grey }); }
  y -= 8; page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 1, color: gold }); y -= 6;

  // ---- Parties ----
  const clientName = [d.client?.firstName, d.client?.lastName].filter(Boolean).join(' ') || '..........';
  kv(isOffre ? "L'acquéreur" : 'Le visiteur', clientName);
  const clientContact = [d.client?.phone ? `Tél : ${d.client.phone}` : '', d.client?.email ? `Email : ${d.client.email}` : ''].filter(Boolean).join('  -  ');
  if (clientContact) kv('Coordonnées', clientContact);
  if (d.client?.address) kv('Adresse', d.client.address);

  // ---- Le bien ----
  const p = d.property || {};
  const typeLabel = ((p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement') + (p.rooms ? ` T${p.rooms}` : '');
  const address = p.address || [p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');
  y -= 4; kv('Bien concerné', `${typeLabel}${p.surface ? ` - ${p.surface} m²` : ''}`);
  kv('Adresse du bien', address);
  if (p.cadastralReference) kv('Référence cadastrale', p.cadastralReference);
  if (!isOffre && p.price) kv('Prix affiché', `${eur(p.price)} (FAI)`);

  y -= 6; page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.5, color: rule }); y -= 4;

  const dateStr = d.dateStr || '';
  if (isOffre) {
    const amount = d.atAskingPrice ? Number(p.price || 0) : Number(d.offerAmount || 0);
    para(`Je soussigné(e) ${clientName}, déclare faire une offre d'achat ferme portant sur le bien désigné ci-dessus, au prix de :`, { after: 4 });
    page.drawText(`${eur(amount)}${d.atAskingPrice ? '  (au prix affiché)' : ''}`, { x: M, y: y - 12, size: 13, font: fontBold, color: navy }); y -= 20;
    para(`Soit ${eurosEnLettres(amount)}.`, { size: 9.5, color: grey, after: 6 });
    const days = Number(d.validityDays) > 0 ? Number(d.validityDays) : 10;
    const seq = Number(d.sequestreAmount) > 0 ? Number(d.sequestreAmount) : 0;
    const isCredit = d.financing === 'CREDIT';
    kv('Financement', isCredit ? 'Recours à un prêt immobilier (crédit)' : 'Paiement comptant (sans recours à un prêt)');
    kv('Séquestre proposé', seq > 0 ? eur(seq) : 'Aucun séquestre versé à ce stade');
    kv("Validité de l'offre", `${days} jours à compter de la signature`);
    y -= 2;
    para(`Cette offre est valable ${days} jour(s) à compter de sa signature. Elle est faite sous réserve de l'accord du vendeur${isCredit ? " et de l'obtention d'un prêt immobilier (condition suspensive au sens de l'article L.313-41 du Code de la consommation)" : ", l'acquéreur déclarant financer l'acquisition sans recours à un prêt"}. La vente ne sera définitivement formée qu'après acceptation écrite du vendeur, signature d'un compromis et respect du délai de rétractation légal de l'acquéreur (article L.271-1 du CCH).${seq > 0 ? ` Un séquestre de ${eur(seq)} sera versé entre les mains du notaire lors de la signature du compromis.` : " Aucune somme n'est versée à l'appui de la présente offre."}`, { size: 9, after: 6 });
  } else {
    para(`Je soussigné(e) ${clientName}, reconnais avoir visité ce jour, en compagnie du cabinet NOVUS CAPITAL (Lemeille Patrimoine), le bien immobilier désigné ci-dessus.`, { after: 6 });
    para("Je reconnais que ce bien m'a été présenté par le cabinet et m'engage à ne pas traiter directement ou indirectement, ni par personne interposée, avec le propriétaire, sans le concours du cabinet, pendant une durée de 24 mois. À défaut, je serais redevable envers le cabinet d'une indemnité égale au montant des honoraires convenus. Le présent bon ne vaut ni offre ni engagement d'achat.", { size: 9, after: 6 });
  }

  // ---- Fait à / le ----
  y -= 2; kv('Fait à', d.place || p.city || '..........');
  kv('Le', dateStr);

  // ---- Signatures ----
  y -= 8;
  const colW = (CW - 24) / 2;
  const sigTop = y;
  // Mandataire (agence)
  try {
    const png = await pdfDoc.embedPng(Buffer.from(SIGNATURE_MANDATAIRE_B64, 'base64'));
    const sw = 96, sh = sw * (png.height / png.width);
    page.drawText('Le Cabinet (NOVUS CAPITAL)', { x: M, y: sigTop, size: 9, font: fontBold, color: navy });
    page.drawImage(png, { x: M, y: sigTop - 12 - sh, width: sw, height: sh });
    page.drawLine({ start: { x: M, y: sigTop - 16 - sh }, end: { x: M + colW, y: sigTop - 16 - sh }, thickness: 0.7, color: rule });
  } catch { /* logo signature indispo */ }

  // Client
  const cx = M + colW + 24;
  page.drawText(isOffre ? "L'acquéreur" : 'Le visiteur', { x: cx, y: sigTop, size: 9, font: fontBold, color: navy });
  const sig = d.signature;
  if (sig?.dataUrl && /^data:image\/png;base64,/.test(sig.dataUrl)) {
    try {
      const img = await pdfDoc.embedPng(Buffer.from(sig.dataUrl.split(',')[1], 'base64'));
      const dim = img.scale(1); const sc = Math.min(colW / dim.width, 46 / dim.height, 1); const w = dim.width * sc, h = dim.height * sc;
      page.drawImage(img, { x: cx, y: sigTop - 12 - h, width: w, height: h });
      page.drawLine({ start: { x: cx, y: sigTop - 16 - h }, end: { x: cx + colW, y: sigTop - 16 - h }, thickness: 0.7, color: rule });
      let when = sig.signedAt; try { when = new Date(sig.signedAt || '').toLocaleString('fr-FR'); } catch { /* brut */ }
      page.drawText(clean(`Signé électroniquement le ${when}${sig.ip ? ` - IP ${sig.ip}` : ''}`), { x: cx, y: sigTop - 28 - h, size: 6.5, font, color: grey });
      page.drawText(clean(`Mention : « ${sig.mention || (isOffre ? 'Bon pour offre' : 'Lu et approuvé')} » - Signature électronique simple (eIDAS).`), { x: cx, y: sigTop - 37 - h, size: 6.5, font, color: grey });
    } catch { page.drawLine({ start: { x: cx, y: sigTop - 60 }, end: { x: cx + colW, y: sigTop - 60 }, thickness: 0.7, color: rule }); }
  } else {
    page.drawLine({ start: { x: cx, y: sigTop - 60 }, end: { x: cx + colW, y: sigTop - 60 }, thickness: 0.7, color: rule });
  }

  // ---- Acceptation du vendeur (offre d'achat uniquement) ----
  const osig = d.ownerSignature;
  if (isOffre && osig?.dataUrl && /^data:image\/png;base64,/.test(osig.dataUrl)) {
    let ay = sigTop - 90;
    // Pas assez de place en pied de page : l'acceptation passe sur une 2e page.
    if (ay < 150) { page = pdfDoc.addPage([PW, PH]); ay = PH - 90; }

    page.drawRectangle({ x: M, y: ay - 96, width: CW, height: 104, borderColor: gold, borderWidth: 0.8, color: white });
    page.drawText(clean("ACCEPTATION DU VENDEUR"), { x: M + 12, y: ay - 4, size: 9, font: fontBold, color: gold });
    page.drawText(
      clean(`Je soussigné(e) ${d.owner?.name || '..........'}, propriétaire du bien désigné ci-dessus, déclare accepter l'offre d'achat`),
      { x: M + 12, y: ay - 20, size: 8.5, font, color: dark });
    page.drawText(clean("aux prix et conditions qui y sont énoncés."), { x: M + 12, y: ay - 31, size: 8.5, font, color: dark });

    try {
      const img = await pdfDoc.embedPng(Buffer.from(osig.dataUrl.split(',')[1], 'base64'));
      const dim = img.scale(1); const sc = Math.min(160 / dim.width, 40 / dim.height, 1);
      page.drawImage(img, { x: M + 12, y: ay - 78, width: dim.width * sc, height: dim.height * sc });
    } catch { /* signature illisible */ }
    page.drawLine({ start: { x: M + 12, y: ay - 82 }, end: { x: M + 12 + 200, y: ay - 82 }, thickness: 0.7, color: rule });

    let owhen = osig.signedAt; try { owhen = new Date(osig.signedAt || '').toLocaleString('fr-FR'); } catch { /* brut */ }
    page.drawText(
      clean(`Signé électroniquement le ${owhen}${osig.ip ? ` - IP ${osig.ip}` : ''} - Mention : « ${osig.mention || "Bon pour acceptation"} » - Signature électronique simple (eIDAS).`),
      { x: M + 12, y: ay - 92, size: 6.5, font, color: grey });
  }

  // ---- Pied ----
  page.drawText(clean('NOVUS CAPITAL SAS - CPI 7606 2024 000 000 038 - 50 rue de la Garenne, 76130 Mont-Saint-Aignan - +33 6 87 15 72 59'), { x: M, y: 34, size: 7, font, color: grey });

  return await pdfDoc.save();
}
