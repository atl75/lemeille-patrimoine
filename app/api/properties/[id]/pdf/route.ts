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

    const gold = rgb(0.722, 0.612, 0.427);   // #B89C6D
    const navy = rgb(0.122, 0.231, 0.173);   // #1F3B2C
    const darkText = rgb(0.15, 0.15, 0.15);
    const lightText = rgb(0.45, 0.45, 0.45);
    const rule = rgb(0.86, 0.83, 0.77);       // filet clair
    const white = rgb(1, 1, 1);

    // Barème DPE : échelles officielles A→G (énergie vert→rouge, GES violet)
    const hexColor = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
    const DPE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const ENERGY_COLORS = ['#2e7d32', '#558b2f', '#9e9d24', '#f9a825', '#fb8c00', '#f4511e', '#c62828'];
    const GES_COLORS = ['#8e6fc4', '#7e57c2', '#6f42b5', '#5e35b1', '#512da8', '#45279a', '#3a2185'];

    const PAGE_W = 595, PAGE_H = 842;
    const MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const TOP = 758;         // début du contenu sous l'en-tête
    const BOTTOM_LIMIT = 72; // au-dessus du pied de page

    const cleanText = (t: string) => (t ?? '').toString()
      .replace(/[\u00A0\u2007\u2009\u2000-\u200A\u202F\u205F\u3000\uFEFF\u2060\u200B]/g, ' ')
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
      // Fond blanc, en-tête et pied minimalistes (filets dorés discrets).
      // En-tête : monogramme + nom
      drawVectorLogo(page, MARGIN, 788, 22, gold);
      page.drawText('LEMEILLE PATRIMOINE', { x: MARGIN + 32, y: 795, size: 13, font: fontSerif, color: navy });
      page.drawLine({ start: { x: MARGIN, y: 780 }, end: { x: PAGE_W - MARGIN, y: 780 }, thickness: 0.8, color: gold });
      // Pied : filet + coordonnées sur une ligne
      page.drawLine({ start: { x: MARGIN, y: 54 }, end: { x: PAGE_W - MARGIN, y: 54 }, thickness: 0.8, color: gold });
      const contact = '+33 6 87 15 72 59    ·    arthur.lemeille@lemeillepatrimoine.com    ·    www.lemeillepatrimoine.com';
      const cw = font.widthOfTextAtSize(contact, 8);
      page.drawText(contact, { x: (PAGE_W - cw) / 2, y: 40, size: 8, font, color: lightText });
      const siren = 'Lemeille Patrimoine — Novus Capital · SIREN 937 847 937';
      const sw = font.widthOfTextAtSize(siren, 7);
      page.drawText(siren, { x: (PAGE_W - sw) / 2, y: 29, size: 7, font, color: rule });
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
      ensure(34);
      page.drawText(cleanText(text), { x: MARGIN, y, size: 10, font: fontBold, color: gold });
      y -= 7;
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.8, color: rule });
      y -= 16;
    };

    const keyVal = (label: string, value: string) => {
      ensure(16);
      page.drawText(cleanText(label), { x: MARGIN, y, size: 9.5, font, color: lightText });
      page.drawText(cleanText(value), { x: MARGIN + 180, y, size: 10, font: fontBold, color: darkText });
      y -= 16;
    };

    // Dessine une échelle DPE A→G (7 cases colorées), la classe du bien encadrée.
    const drawDpeScale = (label: string, colors: string[], value: any) => {
      const cellH = 16, gap = 3;
      const cellW = (CONTENT_W - gap * 6) / 7;
      ensure(cellH + 20);
      page.drawText(cleanText(label), { x: MARGIN, y, size: 9, font: fontBold, color: darkText });
      y -= 13;
      const active = String(value || '').toUpperCase();
      for (let i = 0; i < 7; i++) {
        const x = MARGIN + i * (cellW + gap);
        page.drawRectangle({ x, y: y - cellH, width: cellW, height: cellH, color: hexColor(colors[i]) });
        if (DPE_LETTERS[i] === active) {
          page.drawRectangle({ x: x - 1.5, y: y - cellH - 1.5, width: cellW + 3, height: cellH + 3, borderColor: navy, borderWidth: 1.6 });
        }
        const lw = fontBold.widthOfTextAtSize(DPE_LETTERS[i], 9);
        page.drawText(DPE_LETTERS[i], { x: x + (cellW - lw) / 2, y: y - cellH + 4.5, size: 9, font: fontBold, color: white });
      }
      y -= cellH + 8;
    };

    const paragraph = (text: string, size = 10) => {
      // On préserve les sauts de ligne saisis : chaque ligne du texte est
      // traitée séparément, puis coupée automatiquement si elle est trop large.
      const sourceLines = cleanText(text).replace(/\r\n?/g, '\n').split('\n');
      for (const src of sourceLines) {
        if (src.trim() === '') {
          // Ligne vide = espacement entre paragraphes
          ensure(size + 4);
          y -= size + 4;
          continue;
        }
        const words = src.split(/\s+/).filter(Boolean);
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
      }
    };

    // ---- Titre (multi-lignes) + localisation + prix ----
    {
      const titleSize = 21;
      const words = cleanText(p.title || 'Bien').split(/\s+/).filter(Boolean);
      let line = '';
      const flush = () => {
        if (!line) return;
        ensure(titleSize + 6);
        page.drawText(line, { x: MARGIN, y, size: titleSize, font: fontSerif, color: navy });
        y -= titleSize + 6;
        line = '';
      };
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (fontSerif.widthOfTextAtSize(test, titleSize) > CONTENT_W && line) { flush(); line = w; }
        else line = test;
      }
      flush();
    }

    const region = (p.region || '').toString().replaceAll('_', ' ');
    const loc = cleanText(`${p.city || ''}${region ? ' · ' + region : ''}`);
    if (loc.trim()) {
      y -= 2;
      page.drawText(loc, { x: MARGIN, y, size: 11, font, color: lightText });
      y -= 22;
    } else {
      y -= 8;
    }

    if (p.priceOnRequest) {
      page.drawText(cleanText('Nous consulter'), {
        x: MARGIN, y, size: 19, font: fontBold, color: gold,
      });
      y -= 16;
    } else if (p.price) {
      page.drawText(cleanText(Number(p.price).toLocaleString('fr-FR') + ' €'), {
        x: MARGIN, y, size: 19, font: fontBold, color: gold,
      });
      const priceStr = cleanText(Number(p.price).toLocaleString('fr-FR') + ' €');
      page.drawText('FAI', { x: MARGIN + fontBold.widthOfTextAtSize(priceStr, 19) + 8, y: y + 3, size: 8, font, color: lightText });
      y -= 16;
    }
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 0.8, color: rule });
    y -= 14;

    // ---- Photos ----
    if (Array.isArray(p.images) && p.images.length > 0) {
      const toEmbeddable = async (url: string): Promise<{ img: any } | null> => {
        try {
          let bytes: Uint8Array;
          let src = url;
          // Cloudinary : JPG allégé (pdf-lib ne gère que jpg/png ; largeur bornée
          // pour garder un PDF léger même avec beaucoup de photos)
          if (/res\.cloudinary\.com\/.+\/upload\//.test(src)) {
            src = src.replace('/upload/', '/upload/f_jpg,q_auto,c_limit,w_1000/');
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

      // Toutes les photos, récupérées en parallèle (ordre préservé).
      const results = await Promise.all(p.images.map((u: string) => toEmbeddable(u)));
      const embedded: any[] = results.filter(Boolean).map((e: any) => e.img);

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
        page.drawRectangle({ x: slotX, y: slotY, width: slotW, height: slotH, borderColor: rule, borderWidth: 0.8 });
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
    if (p.type === 'MAISON' && p.landSize) keyVal('Surface du terrain', `${p.landSize} m²`);
    if (p.annexSurface) keyVal('Surface hors Carrez', `${p.annexSurface} m²`);
    if (p.surface && p.price && !p.priceOnRequest) keyVal('Prix au m²', `${Math.round(Number(p.price) / Number(p.surface)).toLocaleString('fr-FR')} €/m²`);
    if (p.propertyTaxAmount) keyVal('Taxe foncière', `${Number(p.propertyTaxAmount).toLocaleString('fr-FR')} €/an`);
    if (p.coproChargesMonthly) keyVal('Charges de copropriété', `${Number(p.coproChargesMonthly).toLocaleString('fr-FR')} €/mois`);
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
      drawDpeScale('Classe énergie (consommation)', ENERGY_COLORS, p.dpe.classEnergy);
      drawDpeScale('Classe climat (GES)', GES_COLORS, p.dpe.classGES);
      y -= 2;
      if (p.dpe.consumptionKwh) keyVal('Consommation', `${p.dpe.consumptionKwh} kWh/m²/an`);
      if (p.dpe.emissionsKg) keyVal('Émissions', `${p.dpe.emissionsKg} kgCO2/m²/an`);
      if (p.dpe.date) keyVal('Date du diagnostic', p.dpe.date);
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
        // « inline » : le PDF s'affiche dans l'onglet (consultable), avec un nom
        // de fichier proposé si l'utilisateur choisit de le télécharger.
        'Content-Disposition': `inline; filename="${id}-fiche.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      }
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'PDF generation failed', details: error.message }, { status: 500 });
  }
}
