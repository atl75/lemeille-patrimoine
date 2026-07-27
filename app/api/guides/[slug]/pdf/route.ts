import { NextResponse } from 'next/server';
import { getGuide } from '@/lib/guides';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const guide = getGuide(slug);
    if (!guide) return NextResponse.json({ error: 'Guide introuvable' }, { status: 404 });

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const gold = rgb(0.541, 0.427, 0.247);
    const navy = rgb(0.122, 0.231, 0.173);
    const darkText = rgb(0.15, 0.15, 0.15);
    const lightText = rgb(0.45, 0.45, 0.45);
    const rule = rgb(0.86, 0.83, 0.77);
    const cream = rgb(0.957, 0.945, 0.922);

    const PAGE_W = 595, PAGE_H = 842, MARGIN = 50;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const TOP = 758, BOTTOM_LIMIT = 78;

    const clean = (t: string) => (t ?? '').toString()
      .replace(/[    -   　﻿⁠​]/g, ' ')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-');

    const drawVectorLogo = (page: any, x: number, y: number, size: number) => {
      const r = size / 2, cx = x + r, cy = y + r, n = 48;
      for (let i = 0; i < n; i++) {
        const a1 = (i / n) * 2 * Math.PI, a2 = ((i + 1) / n) * 2 * Math.PI;
        page.drawLine({ start: { x: cx + (r - 1) * Math.cos(a1), y: cy + (r - 1) * Math.sin(a1) }, end: { x: cx + (r - 1) * Math.cos(a2), y: cy + (r - 1) * Math.sin(a2) }, thickness: 1.5, color: gold });
      }
      page.drawText('LP', { x: cx - size * 0.19, y: cy - size * 0.12, size: size * 0.35, font: fontSerif, color: gold });
    };

    const drawChrome = (page: any) => {
      drawVectorLogo(page, MARGIN, 788, 22);
      page.drawText('LEMEILLE PATRIMOINE', { x: MARGIN + 32, y: 795, size: 13, font: fontSerif, color: navy });
      page.drawLine({ start: { x: MARGIN, y: 780 }, end: { x: PAGE_W - MARGIN, y: 780 }, thickness: 0.8, color: gold });
      page.drawLine({ start: { x: MARGIN, y: 54 }, end: { x: PAGE_W - MARGIN, y: 54 }, thickness: 0.8, color: gold });
      const contact = '06 87 15 72 59    ·    arthur.lemeille@lemeillepatrimoine.com    ·    www.lemeillepatrimoine.com';
      const cw = font.widthOfTextAtSize(contact, 8);
      page.drawText(contact, { x: (PAGE_W - cw) / 2, y: 40, size: 8, font, color: lightText });
      const siren = 'Lemeille Patrimoine — Novus Capital · CIF ORIAS 23 003 614';
      const sw = font.widthOfTextAtSize(siren, 7);
      page.drawText(siren, { x: (PAGE_W - sw) / 2, y: 29, size: 7, font, color: rule });
    };

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawChrome(page);
    let y = TOP;
    const ensure = (n: number) => { if (y - n < BOTTOM_LIMIT) { page = pdfDoc.addPage([PAGE_W, PAGE_H]); drawChrome(page); y = TOP; } };

    const wrap = (text: string, size: number, f: any, maxW: number, color: any, x = MARGIN) => {
      for (const src of clean(text).split('\n')) {
        const words = src.split(/\s+/).filter(Boolean);
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (f.widthOfTextAtSize(test, size) > maxW && line) { ensure(size + 4); page.drawText(line, { x, y, size, font: f, color }); y -= size + 4; line = w; }
          else line = test;
        }
        if (line) { ensure(size + 4); page.drawText(line, { x, y, size, font: f, color }); y -= size + 4; }
      }
    };

    const heading = (t: string) => { ensure(30); page.drawText(clean(t), { x: MARGIN, y, size: 12, font: fontBold, color: gold }); y -= 7; page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.8, color: rule }); y -= 16; };

    // ---- Titre ----
    page.drawText('GUIDE', { x: MARGIN, y, size: 10, font: fontBold, color: gold }); y -= 22;
    wrap(guide.title, 24, fontSerif, CONTENT_W, navy); y -= 2;
    wrap(guide.subtitle, 12, font, CONTENT_W, lightText); y -= 10;
    page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 0.8, color: rule }); y -= 14;

    // ---- Chiffres clés ----
    ensure(64);
    const boxH = 52, cols = guide.keyFigures.length, gap = 10;
    const boxW = (CONTENT_W - gap * (cols - 1)) / cols;
    guide.keyFigures.forEach((kf, i) => {
      const x = MARGIN + i * (boxW + gap);
      page.drawRectangle({ x, y: y - boxH, width: boxW, height: boxH, color: cream });
      const vw = fontSerif.widthOfTextAtSize(clean(kf.value), 15);
      page.drawText(clean(kf.value), { x: x + (boxW - vw) / 2, y: y - 24, size: 15, font: fontSerif, color: navy });
      const lw = font.widthOfTextAtSize(clean(kf.label), 7.5);
      page.drawText(clean(kf.label), { x: x + Math.max(4, (boxW - lw) / 2), y: y - 40, size: 7.5, font, color: lightText });
    });
    y -= boxH + 16;

    // ---- Intro ----
    wrap(guide.intro, 10.5, font, CONTENT_W, darkText); y -= 12;

    // ---- Sections ----
    for (const s of guide.sections) {
      heading(s.heading);
      for (const p of s.paragraphs || []) { wrap(p, 10, font, CONTENT_W, darkText); y -= 5; }
      for (const b of s.bullets || []) {
        ensure(14);
        page.drawText('•', { x: MARGIN, y, size: 10, font, color: gold });
        wrap(b, 10, font, CONTENT_W - 14, darkText, MARGIN + 14);
        y -= 3;
      }
      y -= 8;
    }

    // ---- Accompagnement + avertissement ----
    heading('Notre accompagnement');
    wrap('Lemeille Patrimoine vous accompagne de l\'étude à la livraison : analyse de votre situation fiscale, sélection d\'une opération de qualité au bon emplacement, montage juridique et financier, suivi du chantier et mise en location. Prenons rendez-vous pour étudier votre projet.', 10, font, CONTENT_W, darkText);
    y -= 12;
    wrap('Ce guide est fourni à titre informatif et ne constitue pas un conseil personnalisé. Les avantages fiscaux dépendent de votre situation et de la réglementation en vigueur, susceptible d\'évoluer. Arthur Lemeille — conseiller en investissements financiers immatriculé ORIAS n° 23 003 614, membre de l\'ANACOFI-CIF.', 8, font, CONTENT_W, lightText);

    const bytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="guide-${slug}-lemeille-patrimoine.pdf"`,
        'Content-Length': bytes.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Guide PDF error:', error);
    return NextResponse.json({ error: 'PDF generation failed', details: error.message }, { status: 500 });
  }
}
