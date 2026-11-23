import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';

type Data = Record<string, any>;
const green = rgb(31 / 255, 59 / 255, 44 / 255);
const gold = rgb(.65, .55, .35);
const ink = rgb(.17, .20, .18);
const muted = rgb(.40, .44, .41);
const border = rgb(.82, .85, .82);
const pale = rgb(.96, .97, .95);
const clean = (v: unknown) => String(v ?? '').normalize('NFC')
  .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u2013\u2014]/g, '-').replace(/[^\u0020-\u00FF\u20AC\n]/g, ' ');
const value = (v: unknown) => clean(v).trim() || 'À compléter';
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
  ? v.split('-').reverse().join('/') : value(v);

/** Export only: never changes the delegation, its status or any signature. */
export async function createDelegationPdf(d: Data, mandate: Data): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Délégation de mandat - ' + value(mandate.mandateNumber || d.mandateNumber));
  pdf.setAuthor('Lemeille Patrimoine');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const title = await pdf.embedFont(StandardFonts.TimesRoman);
  const form = pdf.getForm();
  const M = 44, W = 507;
  let page!: PDFPage;
  let y = 726;
  const wrap = (text: unknown, width = W, size = 10, font: PDFFont = regular) => {
    const lines: string[] = [];
    for (const para of value(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        if (font.widthOfTextAtSize((line ? line + ' ' : '') + word, size) <= width) {
          line += (line ? ' ' : '') + word; continue;
        }
        if (line) lines.push(line); line = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ''; }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  const newPage = () => {
    page = pdf.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 754, width: 595, height: 88, color: green });
    page.drawText('LEMEILLE PATRIMOINE', { x: M, y: 805, size: 12, font: bold, color: rgb(1, 1, 1) });
    page.drawText('Délégation de mandat', { x: M, y: 774, size: 23, font: title, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: M, y: 752, width: 48, height: 3, color: gold });
    page.drawText('PARTENARIAT IMMOBILIER', { x: 390, y: 807, size: 8, font: regular, color: rgb(.85, .89, .85) });
    y = 726;
  };
  const ensure = (height: number) => { if (y - height < 66) newPage(); };
  const paragraph = (text: unknown, size = 10, color = ink) => {
    for (const line of wrap(text, W, size)) {
      ensure(15); page.drawText(line, { x: M, y, size, font: regular, color }); y -= 15;
    }
    y -= 7;
  };
  const section = (n: string, text: string) => {
    ensure(62); y -= 8;
    page.drawText(n, { x: M, y, size: 10, font: bold, color: gold });
    page.drawText(text, { x: M + 26, y: y - 1, size: 15, font: title, color: green });
    y -= 13;
    page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: .6, color: border }); y -= 23;
  };
  const row = (label: string, content: unknown) => {
    const lines = wrap(content, W - 130);
    ensure(30);
    page.drawText(label, { x: M, y, size: 9, font: bold, color: muted });
    for (const line of lines) {
      ensure(15); page.drawText(line, { x: M + 130, y, size: 10, font: regular, color: ink }); y -= 15;
    }
    y -= 7;
  };
  newPage();
  paragraph('Exemplaire à compléter et à signer par les deux parties.', 9, muted);
  section('01', "Mandat d'origine et bien concerné");
  row('Numéro de mandat', mandate.mandateNumber || d.mandateNumber);
  row('Désignation du bien', mandate.designation || mandate.title || d.propertyTitle);
  row('Adresse du bien', mandate.map?.query || mandate.address || mandate.city);
  row('Mandant(s)', (mandate.owners || []).map((o: Data) => o.type === 'COMPANY'
    ? o.name : [o.firstName, o.lastName].filter(Boolean).join(' ')).join(', '));
  section('02', 'Les parties');
  const parties = [
    { heading: 'LE DÉLÉGANT', name: 'NOVUS CAPITAL SAS', lines: ['Enseigne : Lemeille Patrimoine', 'SIREN : 937 847 937', '50 rue de la Garenne', '76130 Mont-Saint-Aignan', 'Représentant : Arthur Lemeille', 'CPI 7606 2024 000 000 038'] },
    { heading: 'LE DÉLÉGATAIRE', name: value(d.partnerName), lines: ['SIREN : ' + value(d.partnerSiren), 'Adresse : ' + value(d.partnerAddress), 'Représentant : ' + value(d.representative), 'Carte professionnelle : ' + value(d.partnerCard), 'Email : ' + value(d.partnerEmail), 'Téléphone : ' + value(d.partnerPhone)] },
  ];
  const cardW = (W - 15) / 2;
  const cards = parties.map(p => ({ ...p, nameLines: wrap(p.name, cardW - 24, 11, bold), body: p.lines.flatMap(l => wrap(l, cardW - 24, 9)) }));
  const cardH = Math.max(...cards.map(p => 52 + p.nameLines.length * 15 + p.body.length * 13));
  ensure(cardH + 10);
  cards.forEach((p, i) => {
    const x = M + i * (cardW + 15);
    page.drawRectangle({ x, y: y - cardH + 10, width: cardW, height: cardH, color: pale, borderColor: border, borderWidth: .5 });
    let cy = y - 9;
    page.drawText(p.heading, { x: x + 12, y: cy, size: 8, font: bold, color: green }); cy -= 23;
    for (const line of p.nameLines) { page.drawText(line, { x: x + 12, y: cy, size: 11, font: bold, color: ink }); cy -= 15; }
    cy -= 8;
    for (const line of p.body) { page.drawText(line, { x: x + 12, y: cy, size: 9, font: regular, color: ink }); cy -= 13; }
  });
  y -= cardH + 10;
  section('03', 'Périmètre et durée');
  row('Mission confiée', d.scope);
  ensure(60);
  row('Secteur géographique', d.territory);
  row('Période', 'Du ' + date(d.startDate) + ' au ' + date(d.endDate));

  // Financial terms and both signatures remain together for normal-length exports.
  if (y < 500) newPage();
  section('04', 'Honoraires et conditions de collaboration');
  row('Part du délégataire', typeof d.feeSharePercent === 'number' && Number.isFinite(d.feeSharePercent)
    ? d.feeSharePercent.toLocaleString('fr-FR') + ' % des honoraires' : null);
  paragraph('Conditions renseignées par les parties :', 9, muted);
  paragraph(d.feeNotes);
  paragraph("Les modalités ci-dessus sont à rapprocher du mandat d'origine. Les informations non renseignées restent à compléter avant signature.", 9, muted);
  ensure(390);
  section('05', 'Signatures des parties');
  paragraph('Chaque signataire renseigne son nom, sa qualité, le lieu et la date, puis signe dans le cadre prévu.', 9, muted);
  const top = y, panelH = 278;
  const field = (name: string, label: string, x: number, fy: number, width: number, text = '') => {
    page.drawText(label, { x, y: fy, size: 8, font: regular, color: muted });
    const f = form.createTextField(name); f.setMaxLength(180); f.setText(clean(text));
    f.addToPage(page, { x, y: fy - 25, width, height: 20, borderWidth: .5, borderColor: border, backgroundColor: rgb(1, 1, 1), textColor: ink, font: regular });
    f.setFontSize(9);
  };
  for (const [i, prefix, heading, name] of [[0, 'delegant', 'Pour le délégant', 'Arthur Lemeille'], [1, 'delegataire', 'Pour le délégataire', clean(d.representative)]] as const) {
    const x = M + i * (cardW + 15), inner = x + 12, width = cardW - 24;
    page.drawRectangle({ x, y: top - panelH, width: cardW, height: panelH, borderColor: border, borderWidth: .8 });
    page.drawRectangle({ x, y: top - 32, width: cardW, height: 32, color: pale });
    page.drawText(heading, { x: inner, y: top - 21, size: 11, font: bold, color: green });
    field(prefix + '_nom', 'Nom du signataire', inner, top - 49, width, name);
    field(prefix + '_qualite', 'Qualité du signataire', inner, top - 92, width);
    field(prefix + '_lieu', 'Fait à', inner, top - 135, width * .58 - 5);
    field(prefix + '_date', 'Le (JJ/MM/AAAA)', inner + width * .58 + 5, top - 135, width * .42 - 5);
    page.drawText('Signature et cachet', { x: inner, y: top - 180, size: 8, font: bold, color: muted });
    page.drawRectangle({ x: inner, y: top - panelH + 12, width, height: 77, borderColor: border, borderWidth: .5 });
  }
  y = top - panelH - 20;
  paragraph("Les champs remplissables ne constituent pas une signature électronique. Aucune signature n'est apposée par le site.", 8, muted);
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 48 }, end: { x: M + W, y: 48 }, thickness: .5, color: border });
    p.drawText('LEMEILLE PATRIMOINE  /  DÉLÉGATION DE MANDAT', { x: M, y: 33, size: 7, font: regular, color: muted });
    p.drawText(`${i + 1} / ${pages.length}`, { x: 527, y: 33, size: 8, font: regular, color: muted });
  });
  form.updateFieldAppearances(regular);
  return pdf.save();
}
