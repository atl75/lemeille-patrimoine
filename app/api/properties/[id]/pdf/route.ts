import { NextResponse } from 'next/server';
import { readJSON } from '@/lib/utils';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await readJSON('properties.json');
    const p = data.find((x: any) => x.id === id);
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Import pdf-lib dynamically to avoid issues
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    
    // Fonts - use Times for serif (luxury) and Helvetica for body
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors - from site design
    const gold = rgb(0.722, 0.612, 0.427); // #B89C6D
    const navy = rgb(0.122, 0.231, 0.173); // #1F3B2C
    const cream = rgb(0.957, 0.945, 0.922); // #F4F1EB
    const darkText = rgb(0.1, 0.1, 0.1);
    const lightText = rgb(0.4, 0.4, 0.4);

    // Helper to clean text for PDF
    const cleanText = (t: string) => t
      .replace(/[\u00A0\u202F\u2009]/g, ' ')
      .replace(/[\u2019]/g, "'")
      .replace(/[\u2082]/g, '2')
      .replace(/[\u2080-\u2089]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0x2080 + 48));
    
    // Helper function to draw vector logo (circle + LP monogram)
    const drawVectorLogo = (x: number, y: number, size: number) => {
      const radius = size / 2;
      const centerX = x + radius;
      const centerY = y + radius;
      
      // Draw circle outline
      const circlePoints = 64;
      for (let i = 0; i < circlePoints; i++) {
        const angle1 = (i / circlePoints) * 2 * Math.PI;
        const angle2 = ((i + 1) / circlePoints) * 2 * Math.PI;
        const x1 = centerX + (radius - 1) * Math.cos(angle1);
        const y1 = centerY + (radius - 1) * Math.sin(angle1);
        const x2 = centerX + (radius - 1) * Math.cos(angle2);
        const y2 = centerY + (radius - 1) * Math.sin(angle2);
        
        page.drawLine({
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          thickness: 1.5,
          color: gold,
        });
      }
      
      // Draw "LP" text in center
      const fontSize = size * 0.35;
      page.drawText('LP', {
        x: centerX - (fontSize * 0.55),
        y: centerY - (fontSize * 0.35),
        size: fontSize,
        font: fontSerif,
        color: gold,
      });
    };
    
    // Background cream color
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 595,
      height: 842,
      color: cream,
    });

    // Header with gold accent bar
    page.drawRectangle({
      x: 0,
      y: 792,
      width: 595,
      height: 50,
      color: navy,
    });

    page.drawRectangle({
      x: 0,
      y: 787,
      width: 595,
      height: 5,
      color: gold,
    });

    // Vector logo in header - perfect quality, no pixelation
    const logoSize = 35;
    const logoY = 792 + 7.5; // Centered in 50px header
    drawVectorLogo(50, logoY, logoSize);
    
    // Brand name next to logo
    page.drawText('LEMEILLE PATRIMOINE', {
      x: 50 + logoSize + 15,
      y: logoY + (logoSize / 2) - 3,
      size: 18,
      font: fontSerif,
      color: gold,
    });

    // Property title
    page.drawText(cleanText(p.title || 'Bien'), {
      x: 50,
      y: 750,
      size: 18,
      font: fontSerif,
      color: navy,
    });

    // Location
    page.drawText(cleanText(`${p.city || ''} · ${(p.region || '').replaceAll('_', ' ')}`), {
      x: 50,
      y: 730,
      size: 12,
      font: font,
      color: lightText,
    });

    // Price highlight box
    if (p.price) {
      page.drawRectangle({
        x: 400,
        y: 735,
        width: 145,
        height: 35,
        color: gold,
        borderColor: gold,
        borderWidth: 2,
      });
      
      page.drawText(cleanText(Number(p.price).toLocaleString('fr-FR') + ' €'), {
        x: 410,
        y: 745,
        size: 16,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    let y = 700;

    // Property photos section
    if (Array.isArray(p.images) && p.images.length > 0) {
      // Fetch and embed the first 3 photos
      const maxPhotos = Math.min(3, p.images.length);
      const embeddedImages = [];
      
      for (let i = 0; i < maxPhotos; i++) {
        try {
          const imageUrl = p.images[i];
          const response = await fetch(imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          const imageBytes = new Uint8Array(arrayBuffer);
          
          let embeddedImage;
          if (imageUrl.toLowerCase().includes('.png')) {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          }
          
          embeddedImages.push(embeddedImage);
        } catch (error) {
          console.warn(`Failed to load image ${i}:`, error);
        }
      }

      // Display photos in a row (up to 3 photos)
      if (embeddedImages.length > 0) {
        const maxPhotoHeight = 150;
        const photoSpacing = 10;
        const totalWidth = 495; // Available width (595 - 100 margins)
        const maxPhotoWidth = (totalWidth - (photoSpacing * (embeddedImages.length - 1))) / embeddedImages.length;
        
        embeddedImages.forEach((img, index) => {
          // Calculate scale to maintain aspect ratio
          const scale = Math.min(maxPhotoWidth / img.width, maxPhotoHeight / img.height);
          const displayWidth = img.width * scale;
          const displayHeight = img.height * scale;
          
          // Calculate slot position (fixed size for uniform borders)
          const slotX = 50 + (index * (maxPhotoWidth + photoSpacing));
          const slotY = y - maxPhotoHeight;
          
          // Draw white background for entire slot (fixed size)
          page.drawRectangle({
            x: slotX,
            y: slotY,
            width: maxPhotoWidth,
            height: maxPhotoHeight,
            color: rgb(1, 1, 1),
          });
          
          // Center photo horizontally and vertically within the slot
          const xOffset = (maxPhotoWidth - displayWidth) / 2;
          const yOffset = (maxPhotoHeight - displayHeight) / 2;
          
          // Draw photo with preserved aspect ratio
          page.drawImage(img, {
            x: slotX + xOffset,
            y: slotY + yOffset,
            width: displayWidth,
            height: displayHeight,
          });
          
          // Gold border around entire slot (fixed size for uniform framing)
          page.drawRectangle({
            x: slotX,
            y: slotY,
            width: maxPhotoWidth,
            height: maxPhotoHeight,
            borderColor: gold,
            borderWidth: 1,
          });
        });
        
        y -= maxPhotoHeight + 20;
      }
    }

    y = Math.min(y, 490); // Ensure we have space for content below

    // Divider line
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: 545, y: y },
      thickness: 1,
      color: gold,
    });
    y -= 30;

    // Characteristics section
    page.drawText('CARACTÉRISTIQUES', {
      x: 50,
      y: y,
      size: 14,
      font: fontSerif,
      color: navy,
    });
    y -= 25;

    const characteristics = [
      { label: 'Type de bien', value: p.propertyType || '—' },
      { label: 'Surface habitable', value: `${p.surface ?? '—'} m²` },
      { label: 'Nombre de pièces', value: `${p.rooms ?? '—'}` },
      ...(p.bedrooms ? [{ label: 'Chambres', value: `${p.bedrooms}` }] : []),
      ...(p.bathrooms ? [{ label: 'Salles de bain', value: `${p.bathrooms}` }] : []),
      ...(p.landSize ? [{ label: 'Surface terrain', value: `${p.landSize} m²` }] : []),
      ...(p.annexSurface ? [{ label: 'Surface hors Carrez', value: `${p.annexSurface} m²` }] : []),
      ...(p.floor !== undefined && p.floor !== null ? [{ label: 'Étage', value: `${p.floor}` }] : []),
      ...(p.cadastralRef ? [{ label: 'Référence cadastrale', value: p.cadastralRef }] : []),
      { label: 'Référence', value: id },
    ];

    characteristics.forEach(({ label, value }) => {
      page.drawText(cleanText(label), {
        x: 50,
        y: y,
        size: 10,
        font: font,
        color: lightText,
      });
      page.drawText(cleanText(String(value)), {
        x: 250,
        y: y,
        size: 10,
        font: fontBold,
        color: darkText,
      });
      y -= 18;
    });

    y -= 15;

    // Features/Atouts section
    if (Array.isArray(p.features) && p.features.length > 0) {
      page.drawText('ATOUTS DU BIEN', {
        x: 50,
        y: y,
        size: 14,
        font: fontSerif,
        color: navy,
      });
      y -= 20;

      // Display features as bullet points, 2 columns
      const featuresPerColumn = Math.ceil(p.features.length / 2);
      p.features.forEach((feature: string, index: number) => {
        const column = index < featuresPerColumn ? 0 : 1;
        const xPos = 50 + (column * 270);
        const yPos = y - ((index % featuresPerColumn) * 15);

        page.drawText('•', {
          x: xPos,
          y: yPos,
          size: 10,
          font: font,
          color: gold,
        });

        page.drawText(cleanText(feature), {
          x: xPos + 10,
          y: yPos,
          size: 9,
          font: font,
          color: darkText,
        });
      });

      y -= (featuresPerColumn * 15) + 15;
    }

    // DPE Section
    page.drawText('DIAGNOSTIC DE PERFORMANCE ÉNERGÉTIQUE', {
      x: 50,
      y: y,
      size: 14,
      font: fontSerif,
      color: navy,
    });
    y -= 25;

    if (p.dpe) {
      const dpeData = [
        { label: 'Classe énergie', value: p.dpe.classEnergy || '—' },
        { label: 'Classe GES', value: p.dpe.classGES || '—' },
        { label: 'Consommation', value: `${p.dpe.consumptionKwh || '—'} kWh/m²/an` },
        { label: 'Émissions', value: `${p.dpe.emissionsKg || '—'} kgCO2/m²/an` },
        { label: 'Date du diagnostic', value: p.dpe.date || '—' },
        { label: 'Référence', value: p.dpe.ref || '—' },
      ];

      dpeData.forEach(({ label, value }) => {
        page.drawText(cleanText(label), {
          x: 50,
          y: y,
          size: 10,
          font: font,
          color: lightText,
        });
        page.drawText(cleanText(value), {
          x: 250,
          y: y,
          size: 10,
          font: fontBold,
          color: darkText,
        });
        y -= 18;
      });
    } else {
      page.drawText('Non communiqué', {
        x: 50,
        y: y,
        size: 10,
        font: font,
        color: lightText,
      });
      y -= 18;
    }

    y -= 15;

    // Description section
    page.drawText('DESCRIPTION', {
      x: 50,
      y: y,
      size: 14,
      font: fontSerif,
      color: navy,
    });
    y -= 20;

    // Description text with word wrap
    const description = cleanText(p.description || 'Non renseigné');
    const maxWidth = 495;
    const words = description.split(' ');
    let line = '';
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = font.widthOfTextAtSize(testLine, 10);
      
      if (testWidth > maxWidth && line !== '') {
        page.drawText(line, {
          x: 50,
          y: y,
          size: 10,
          font: font,
          color: darkText,
        });
        line = word + ' ';
        y -= 14;
        
        if (y < 120) break; // Stop if we're too close to footer (80px footer + 40px margin)
      } else {
        line = testLine;
      }
    }
    
    // Draw remaining line
    if (line && y > 120) {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 10,
        font: font,
        color: darkText,
      });
    }

    // Footer with contact info and offices
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 595,
      height: 80,
      color: navy,
    });

    // Vector logo in footer (smaller, same quality)
    const footerLogoSize = 25;
    drawVectorLogo(50, 45, footerLogoSize);

    // Contact info (right side)
    page.drawText('06 87 15 72 59', {
      x: 370,
      y: 60,
      size: 9,
      font: fontBold,
      color: gold,
    });

    page.drawText('arthur.lemeille@lemeillepatrimoine.com', {
      x: 370,
      y: 48,
      size: 8,
      font: font,
      color: gold,
    });

    page.drawText('www.lemeillepatrimoine.com', {
      x: 370,
      y: 36,
      size: 8,
      font: font,
      color: cream,
    });

    // Legal information
    page.drawText('Novus Capital (SIREN 937 847 937)', {
      x: 370,
      y: 20,
      size: 7,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}-fiche.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      }
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ 
      error: 'PDF generation failed', 
      details: error.message 
    }, { status: 500 });
  }
}
