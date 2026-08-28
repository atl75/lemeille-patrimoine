import { eurosEnLettres } from '@/lib/enLettres';
import { NOVUS_LOGO_BASE64 } from '@/lib/novusLogo';
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
};

// Génère un PDF « Bon de visite » ou « Offre d'achat » signé (une page A4).
export async function buildDocumentPdf(d: DocData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const logoImg = await pdfDoc.embedPng(Buffer.from(NOVUS_LOGO_BASE64, 'base64'));

  const navy = rgb(0.122, 0.231, 0.173), gold = rgb(0.722, 0.612, 0.427), dark = rgb(0.13, 0.13, 0.13), grey = rgb(0.42, 0.42, 0.42), rule = rgb(0.8, 0.8, 0.8), white = rgb(1, 1, 1);
  const PW = 595, PH = 842, M = 52, CW = PW - M * 2;
  const clean = (t: any) => String(t ?? '').replace(/[   ​⁠]/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/€/g, 'EUR').replace(/²/g, '2').replace(/œ/g, 'oe').replace(/[^\x00-\xFF]/g, '');
  const page = pdfDoc.addPage([PW, PH]);
  let y = PH;

  const eur = (n?: number) => (n || n === 0) ? Math.round(Number(n)).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' EUR' : '..........';
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
  page.drawRectangle({ x: 0, y: PH - 66, width: PW, height: 66, color: navy });
  const lw = 40, lh = lw * (logoImg.height / logoImg.width);
  page.drawImage(logoImg, { x: M, y: PH - 33 - lh / 2, width: lw, height: lh });
  page.drawText('NOVUS CAPITAL', { x: M + lw + 12, y: PH - 30, size: 14, font: timesBold, color: white });
  page.drawText('Lemeille Patrimoine - Immobilier & defiscalisation', { x: M + lw + 12, y: PH - 46, size: 8.5, font, color: rgb(0.85, 0.85, 0.85) });
  y = PH - 66 - 24;

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
  y -= 4; kv('Bien concerné', `${typeLabel}${p.surface ? ` - ${p.surface} m2` : ''}`);
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
    kv('Financement', isCredit ? 'Recours a un pret immobilier (credit)' : 'Paiement comptant (sans recours a un pret)');
    kv('Sequestre propose', seq > 0 ? eur(seq) : 'Aucun sequestre verse a ce stade');
    kv("Validite de l'offre", `${days} jours a compter de la signature`);
    y -= 2;
    para(`Cette offre est valable ${days} jour(s) a compter de sa signature. Elle est faite sous reserve de l'accord du vendeur${isCredit ? " et de l'obtention d'un pret immobilier (condition suspensive au sens de l'article L.313-41 du Code de la consommation)" : ", l'acquereur declarant financer l'acquisition sans recours a un pret"}. La vente ne sera definitivement formee qu'apres acceptation ecrite du vendeur, signature d'un compromis et respect du delai de retractation legal de l'acquereur (article L.271-1 du CCH).${seq > 0 ? ` Un sequestre de ${eur(seq)} sera verse entre les mains du notaire lors de la signature du compromis.` : " Aucune somme n'est versee a l'appui de la presente offre."}`, { size: 9, after: 6 });
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

  // ---- Pied ----
  page.drawText(clean('NOVUS CAPITAL SAS - CPI 7606 2024 000 000 038 - 50 rue de la Garenne, 76130 Mont-Saint-Aignan - +33 6 87 15 72 59'), { x: M, y: 34, size: 7, font, color: grey });

  return await pdfDoc.save();
}
