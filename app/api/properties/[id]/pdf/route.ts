import { NextResponse } from 'next/server';
import { readJSON } from '@/lib/utils';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await readJSON('properties.json');
    const p = data.find((x: any) => x.id === id);
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();

    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const gold = rgb(0.541, 0.427, 0.247);   // #8A6D3F
    const navy = rgb(0.122, 0.231, 0.173);   // #1F3B2C
    const cream = rgb(0.957, 0.945, 0.922);   // #F4F1EB
    const darkText = rgb(0.1, 0.1, 0.1);
    const lightText = rgb(0.4, 0.4, 0.4);
    const white = rgb(1, 1, 1);

    const PAGE_W = 595, PAGE_H = 842;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const TOP = 770;          // début du contenu sous l'en-tête
    const BOTTOM_LIMIT = 100; // au-dessus du pied de page

    const cleanText = (t: string) => (t ?? '').toString()
      .replace(/[   ]/g, ' ')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/[₂]/g, '2')
      .replace(/[₀-₉]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0x2080 + 48));

    const drawVectorLogo = (page: any, x: number, y: number, size: number, color: any) => {
      const radius = size / 2;
      const cx = x + radius, cy = y + radius;
      const n = 64;
      for (let i = 0; i < n; i++) {
        const a1 = (i / n) * 2 * Math.PI, a2 = ((i + 1) / n) * 2 * Math.PI;
        page.drawLine({
          start: { x: cx + (radius - 1) * Math.cos(a1), y: cy + (radius - 1) * Math.sin(a1) },
          end: { x: cx + (radius - 1) * Math.cos(a2), y: cy + (radius - 1) * Math.sin(a2) },
          thickness: 1.5, color,
        });
      }
      const fs = size * 0.35;
      page.drawText('LP', { x: cx - fs * 0.55, y: cy - fs * 0.35, size: fs, font: fontSerif, color });
    };

    const drawChrome = (page: any) => {
      page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
      // en-tête
      page.drawRectangle({ x: 0, y: 792, width: PAGE_W, height: 50, color: navy });
      page.drawRectangle({ x: 0, y: 787, width: PAGE_W, height: 5, color: gold });
      drawVectorLogo(page, MARGIN, 799.5, 35, gold);
      page.drawText('LEMEILLE PATRIMOINE', { x: MARGIN + 50, y: 811, size: 16, font: fontSerif, color: gold });
      // pied de page
      page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 80, color: navy });
      drawVectorLogo(page, MARGIN, 45, 25, gold);
      page.drawText('06 87 15 72 59', { x: 360, y: 60, size: 9, font: fontBold, color: gold });
      page.drawText('arthur.lemeille@lemeillepatrimoine.com', { x: 360, y: 48, size: 8, font, color: gold });
      page.drawText('www.lemeillepatrimoine.com', { x: 360, y: 36, size: 8, font, color: cream });
      page.drawText('Novus Capital (SIREN 937 847 937)', { x: 360, y: 20, size: 7, font, color: rgb(0.6, 0.6, 0.6) });
    };

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawChrome(page);
    let y = TOP;

    const ensure = (needed: number) => {
      if (y - needed < BOTTOM_LIMIT) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        drawChrome(page);
        y = TOP;
      }
    };

    const heading = (text: string) => {
      ensure(40);
      page.drawLine({ start: { x: MARGIN, y: y + 6 }, end: { x: PAGE_W - MARGIN, y: y + 6 }, thickness: 1, color: gold });
      y -= 14;
      page.drawText(cleanText(text), { x: MARGIN, y, size: 13, font: fontSerif, color: navy });
      y -= 22;
    };

    const keyVal = (label: string, value: string) => {
      ensure(18);
      page.drawText(cleanText(label), { x: MARGIN, y, size: 10, font, color: lightText });
      page.drawText(cleanText(value), { x: MARGIN + 200, y, size: 10, font: fontBold, color: darkText });
      y -= 18;
    };

    const paragraph = (text: string, size = 10) => {
      const words = cleanText(text).split(/\s+/);
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (font.widthOfTextAtSize(test, size) > CONTENT_W && line) {
          ensure(size + 4);
          page.drawText(line, { x: MARGIN, y, size, font, color: darkText });
          y -= size + 4;
          line = w;
        } else {
          line = test;
        }
      }
      if (line) {
        ensure(size + 4);
        page.drawText(line, { x: MARGIN, y, size, font, color: darkText });
        y -= size + 4;
      }
    };

    // ---- Titre + localisation + prix ----
    page.drawText(cleanText(p.title || 'Bien'), { x: MARGIN, y, size: 18, font: fontSerif, color: navy });
    y -= 20;
    const region = (p.region || '').toString().replaceAll('_', ' ');
    page.drawText(cleanText(`${p.city || ''}${region ? ' · ' + region : ''}`), { x: MARGIN, y, size: 12, font, color: lightText });
    y -= 6;

    if (p.price) {
      page.drawRectangle({ x: PAGE_W - MARGIN - 150, y: y + 6, width: 150, height: 34, color: gold });
      page.drawText(cleanText(Number(p.price).toLocaleString('fr-FR') + ' €'), {
        x: PAGE_W - MARGIN - 140, y: y + 17, size: 15, font: fontBold, color: white,
      });
    }
    y -= 26;

    // ---- Photos ----
    if (Array.isArray(p.images) && p.images.length > 0) {
      const toEmbeddable = async (url: string): Promise<{ img: any } | null> => {
        try {
          let bytes: Uint8Array;
          let src = url;
          // Cloudinary : forcer un JPG (pdf-lib ne gère que jpg/png)
          if (/res\.cloudinary\.com\/.+\/upload\//.test(src)) {
            src = src.replace('/upload/', '/upload/f_jpg,q_auto/');
          }
          if (src.startsWith('data:')) {
            const b64 = src.split(',')[1] || '';
            bytes = new Uint8Array(Buffer.from(b64, 'base64'));
          } else {
            const res = await fetch(src);
            bytes = new Uint8Array(await res.arrayBuffer());
          }
          // détection par magic bytes
          const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
          const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
          if (isPng) return { img: await pdfDoc.embedPng(bytes) };
          if (isJpg) return { img: await pdfDoc.embedJpg(bytes) };
          return null;
        } catch {
          return null;
        }
      };

      const embedded: any[] = [];
      for (let i = 0; i < Math.min(6, p.images.length); i++) {
        const e = await toEmbeddable(p.images[i]);
        if (e) embedded.push(e.img);
      }

      // grille 2 colonnes, hauteur de slot fixe
      const cols = 2;
      const gap = 12;
      const slotW = (CONTENT_W - gap * (cols - 1)) / cols;
      const slotH = 150;
      for (let i = 0; i < embedded.length; i++) {
        const col = i % cols;
        if (col === 0) ensure(slotH + gap);
        const slotX = MARGIN + col * (slotW + gap);
        const slotY = y - slotH;
        page.drawRectangle({ x: slotX, y: slotY, width: slotW, height: slotH, color: white });
        const img = embedded[i];
        const scale = Math.min(slotW / img.width, slotH / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        page.drawImage(img, { x: slotX + (slotW - dw) / 2, y: slotY + (slotH - dh) / 2, width: dw, height: dh });
        page.drawRectangle({ x: slotX, y: slotY, width: slotW, height: slotH, borderColor: gold, borderWidth: 1 });
        if (col === cols - 1 || i === embedded.length - 1) y -= slotH + gap;
      }
      y -= 6;
    }

    // ---- Caractéristiques ----
    heading('CARACTÉRISTIQUES');
    const typeLabel = (p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement';
    keyVal('Type de bien', typeLabel);
    keyVal('Surface habitable', `${p.surface ?? '—'} m²`);
    keyVal('Nombre de pièces', `${p.rooms ?? '—'}`);
    if (p.landSize) keyVal('Surface du terrain', `${p.landSize} m²`);
    if (p.annexSurface) keyVal('Surface hors Carrez', `${p.annexSurface} m²`);
    if (p.surface && p.price) keyVal('Prix au m²', `${Math.round(Number(p.price) / Number(p.surface)).toLocaleString('fr-FR')} €/m²`);
    if (p.propertyTaxAmount) keyVal('Taxe foncière', `${Number(p.propertyTaxAmount).toLocaleString('fr-FR')} €/an`);
    if (p.coproChargesMonthly) keyVal('Charges de copropriété', `${Number(p.coproChargesMonthly).toLocaleString('fr-FR')} €/mois`);
    if (p.cadastralReference) keyVal('Référence cadastrale', p.cadastralReference);
    keyVal('Référence du bien', id);
    y -= 8;

    // ---- Atouts ----
    if (Array.isArray(p.features) && p.features.length > 0) {
      heading('ATOUTS DU BIEN');
      const colW = CONTENT_W / 2;
      for (let i = 0; i < p.features.length; i += 2) {
        ensure(15);
        for (let c = 0; c < 2 && i + c < p.features.length; c++) {
          const x = MARGIN + c * colW;
          page.drawText('•', { x, y, size: 10, font, color: gold });
          page.drawText(cleanText(p.features[i + c]), { x: x + 12, y, size: 9, font, color: darkText });
        }
        y -= 15;
      }
      y -= 8;
    }

    // ---- DPE ----
    heading('DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE');
    if (p.dpe) {
      keyVal('Classe énergie', p.dpe.classEnergy || '—');
      keyVal('Classe GES', p.dpe.classGES || '—');
      if (p.dpe.consumptionKwh) keyVal('Consommation', `${p.dpe.consumptionKwh} kWh/m²/an`);
      if (p.dpe.emissionsKg) keyVal('Émissions', `${p.dpe.emissionsKg} kgCO2/m²/an`);
      if (p.dpe.date) keyVal('Date du diagnostic', p.dpe.date);
      if (p.dpe.ref) keyVal('Référence DPE', p.dpe.ref);
    } else {
      keyVal('DPE', 'Non communiqué');
    }
    y -= 8;

    // ---- Description ----
    if (p.description) {
      heading('DESCRIPTION');
      paragraph(p.description);
      y -= 8;
    }

    // ---- Visite vidéo ----
    if (p.videoUrl) {
      heading('VISITE EN VIDÉO');
      paragraph(p.videoUrl, 9);
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}-fiche.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      }
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'PDF generation failed', details: error.message }, { status: 500 });
  }
}
