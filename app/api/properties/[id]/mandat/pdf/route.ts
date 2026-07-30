import { NextResponse } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import type { NextRequest } from 'next/server';
import { eurosEnLettres } from '@/lib/enLettres';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const data = await readJSON('properties.json');
    const p = data.find((x: any) => x.id === id);
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const navy = rgb(0.122, 0.231, 0.173);
    const gold = rgb(0.541, 0.427, 0.247);
    const dark = rgb(0.13, 0.13, 0.13);
    const grey = rgb(0.42, 0.42, 0.42);
    const rule = rgb(0.82, 0.82, 0.82);
    const lightbg = rgb(0.966, 0.958, 0.945);
    const white = rgb(1, 1, 1);

    const PW = 595, PH = 842, M = 48;
    const CW = PW - M * 2;

    const clean = (t: any) => String(t ?? '')
      .replace(/[    ⁠​]/g, ' ')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
      .replace(/[€]/g, 'EUR').replace(/²/g, '2');

    let page: any, y = 0;

    // Word-wrap helper -> array of lines fitting maxW
    const wrap = (text: string, size: number, maxW: number, f: any = font): string[] => {
      const out: string[] = [];
      for (const src of clean(text).split('\n')) {
        const words = src.split(/\s+/).filter(Boolean);
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (f.widthOfTextAtSize(test, size) > maxW && line) { out.push(line); line = w; }
          else line = test;
        }
        out.push(line);
      }
      return out.length ? out : [''];
    };

    const header = (particulieres = false) => {
      page.drawRectangle({ x: 0, y: PH - 4, width: PW, height: 4, color: gold });
      page.drawText('NOVUS CAPITAL', { x: M, y: PH - 28, size: 13, font: fontBold, color: navy });
      page.drawText('Transactions immobilieres  -  CPI 7606 2024 000 000 038  -  Mont-Saint-Aignan',
        { x: M, y: PH - 40, size: 7.5, font, color: grey });
      const label = particulieres ? 'CONDITIONS PARTICULIERES' : 'MANDAT DE VENTE';
      const lw = fontBold.widthOfTextAtSize(label, 8);
      page.drawText(label, { x: PW - M - lw, y: PH - 28, size: 8, font: fontBold, color: gold });
      page.drawLine({ start: { x: M, y: PH - 50 }, end: { x: PW - M, y: PH - 50 }, thickness: 0.9, color: navy });
    };

    const footer = () => {
      const f = [
        'NOVUS CAPITAL SAS - Capital 100 Euros - SIRET 937 847 937 00011 - TVA FR4193784793750 - 50 Rue de la Garenne 76130 Mont St Aignan',
        'RCP ZURICH INSURANCE PLC N°7400023129 - Transactions sur immeubles et fonds de commerce',
        'Notre Cabinet ne detient aucun fonds pour le compte de ses clients',
      ];
      let fy = 40;
      page.drawLine({ start: { x: M, y: fy + 10 }, end: { x: PW - M, y: fy + 10 }, thickness: 0.6, color: rule });
      for (const l of f) { const w = font.widthOfTextAtSize(l, 6); page.drawText(l, { x: (PW - w) / 2, y: fy, size: 6, font, color: grey }); fy -= 8; }
    };

    let rowI = 0;
    const newPage = (particulieres = false) => {
      page = pdfDoc.addPage([PW, PH]);
      header(particulieres);
      footer();
      y = PH - 72;
      rowI = 0;
    };
    const ensure = (need: number, particulieres = false) => { if (y - need < 62) newPage(particulieres); };

    // Cover title band (page 1)
    const titleBand = () => {
      const h = 52;
      const top = y;
      page.drawRectangle({ x: M, y: top - h, width: CW, height: h, color: navy });
      page.drawRectangle({ x: M, y: top - h, width: CW, height: 2.5, color: gold });
      const t1 = 'MANDAT DE VENTE' + (p.mandateNumber ? '   N° ' + clean(p.mandateNumber) : '');
      const w1 = fontBold.widthOfTextAtSize(t1, 15);
      page.drawText(t1, { x: (PW - w1) / 2, y: top - 27, size: 15, font: fontBold, color: white });
      const typeTxt = mtype === 'SIMPLE' ? 'Mandat simple' : mtype === 'EXCLUSIF' ? 'Mandat exclusif' : mtype === 'SUCCES' ? 'Mandat succes' : 'Mandat de vente';
      const t2 = [typeTxt, typeLabel, clean(p.city || '')].filter(Boolean).join('   -   ');
      const w2 = font.widthOfTextAtSize(t2, 9);
      page.drawText(t2, { x: (PW - w2) / 2, y: top - 42, size: 9, font, color: gold });
      y = top - h - 20;
    };

    const sectionTitle = (t: string) => {
      ensure(30);
      y -= 4;
      page.drawRectangle({ x: M, y: y - 1, width: 3.5, height: 11, color: gold });
      page.drawText(clean(t).toUpperCase(), { x: M + 11, y, size: 10, font: fontBold, color: navy });
      y -= 7;
      page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.6, color: rule });
      y -= 15;
      rowI = 0;
    };

    const para = (t: string, size = 9, color = dark) => {
      for (const line of wrap(t, size, CW)) {
        ensure(size + 3);
        page.drawText(line, { x: M, y, size, font, color });
        y -= size + 3.5;
      }
    };

    // Zebra table-style label/value row
    const field = (label: string, value: string) => {
      const labelColW = 182;
      const valW = CW - labelColW - 8;
      const valLines = wrap(value || '—', 9, valW);
      const nl = valLines.length;
      const rowH = 8 + nl * 13;
      ensure(rowH);
      page.drawRectangle({ x: M, y: y - rowH, width: CW, height: rowH, color: rowI % 2 === 0 ? lightbg : white });
      const base = y - 15;
      page.drawText(clean(label).toUpperCase(), { x: M + 8, y: base, size: 8, font: fontBold, color: grey });
      let vy = base;
      for (const l of valLines) { page.drawText(l, { x: M + labelColW, y: vy, size: 9, font, color: dark }); vy -= 13; }
      y -= rowH;
      rowI++;
    };

    const checkboxes = (opts: { label: string; checked: boolean }[]) => {
      ensure(22);
      let x = M + 4;
      const b = 9.5;
      for (const o of opts) {
        const by = y - b + 1;
        page.drawRectangle({ x, y: by, width: b, height: b, borderColor: o.checked ? gold : grey, borderWidth: 1, color: o.checked ? gold : white });
        if (o.checked) {
          page.drawLine({ start: { x: x + 2, y: by + 4.2 }, end: { x: x + 4, y: by + 2.2 }, thickness: 1.2, color: white });
          page.drawLine({ start: { x: x + 4, y: by + 2.2 }, end: { x: x + 7.5, y: by + 7.2 }, thickness: 1.2, color: white });
        }
        page.drawText(clean(o.label), { x: x + b + 6, y: y - 6, size: 9, font, color: dark });
        x += b + 10 + font.widthOfTextAtSize(clean(o.label), 9) + 22;
      }
      y -= 22;
      rowI = 0;
    };

    const bullets = (items: string[], size = 9) => {
      for (const it of items) {
        const lines = wrap(it, size, CW - 14);
        lines.forEach((line, i) => {
          ensure(size + 3);
          if (i === 0) page.drawText('-', { x: M + 2, y, size, font: fontBold, color: gold });
          page.drawText(line, { x: M + 14, y, size, font, color: dark });
          y -= size + 3.5;
        });
        y -= 2;
      }
    };

    // ------- Données -------
    const owner = Array.isArray(p.owners) && p.owners.length ? p.owners[0] : null;
    const typeLabel = ((p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement') + (p.rooms ? ` T${p.rooms}` : '');
    const address = p.map?.query || [p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');
    const netVendeur = Number(p.netSellerAmount ?? p.price ?? 0);
    const honoraires = Number(p.commissionAmount ?? Math.max(0, (Number(p.price) || 0) - netVendeur));
    const honorairesPct = p.commissionPercentage ? `${p.commissionPercentage} %` : (netVendeur ? `${(honoraires / netVendeur * 100).toFixed(1)} %` : '');
    const prixFAI = Number(p.price ?? (netVendeur + honoraires));
    const mtype = p.mandateType || '';
    const eur = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' EUR';

    // ======================= PAGE 1 =======================
    newPage();
    titleBand();
    sectionTitle('Type de mandat');
    checkboxes([
      { label: 'Mandat Simple', checked: mtype === 'SIMPLE' },
      { label: 'Mandat Exclusif', checked: mtype === 'EXCLUSIF' },
      { label: 'Mandat Succes', checked: mtype === 'SUCCES' },
    ]);
    sectionTitle('Le Mandant');
    if (owner && owner.type === 'COMPANY') {
      checkboxes([{ label: "Representant d'une Societe", checked: true }]);
      field('Denomination', [owner.name, owner.legalForm].filter(Boolean).join(' - '));
      field('Representant legal', [owner.managerFirstName, owner.managerLastName].filter(Boolean).join(' ') + (owner.managerRole ? ` (${owner.managerRole})` : ''));
      field('Siege social', owner.address || '');
      field('N° RCS', owner.siren || '');
      field('Coordonnees', [owner.phone, owner.email].filter(Boolean).join(' - '));
    } else {
      checkboxes([{ label: 'Proprietaire(s) en nom propre', checked: true }]);
      const own = owner || {};
      field('Nom & prenom', [own.firstName, own.lastName].filter(Boolean).join(' '));
      field('Adresse', own.address || '');
      field('Telephone', own.phone || '');
      field('Email', own.email || '');
    }

    // ======================= PAGE 2 =======================
    newPage();
    sectionTitle('Le Mandataire');
    field('Denomination', 'NOVUS CAPITAL SAS');
    field('Siege social', '50 rue de la Garenne, 76130 Mont-Saint-Aignan');
    field('SIRET / CPI', '937 847 937 00011 - CPI 7606 2024 000 000 038');
    field('Represente par', 'Arthur LEMEILLE');
    y -= 4;
    para('Le Mandant donne mandat au Mandataire de vendre le bien designe ci-apres, selon les conditions stipulees ci-dessous.', 9, grey);
    sectionTitle('Designation du bien');
    field('Type de bien', typeLabel);
    field('Adresse', address);
    field('Reference cadastrale', p.cadastralReference || '');
    field('Superficie du bien', p.surface ? `${p.surface} m2` : '');
    if ((p.type || '') === 'MAISON') field('Superficie de la parcelle', p.landSize ? `${p.landSize} m2` : '');
    if (p.description) {
      y -= 6;
      ensure(20);
      page.drawText('DESCRIPTIF', { x: M + 8, y, size: 8, font: fontBold, color: grey }); y -= 13;
      para(p.description, 9);
    }
    sectionTitle('Prix et conditions de vente');
    field('Prix net vendeur', eur(netVendeur));
    field('Prix net vendeur (en lettres)', eurosEnLettres(netVendeur));
    field('Honoraires du mandataire TTC', `${eur(honoraires)}${honorairesPct ? ` (${honorairesPct} du prix net)` : ''}`);
    checkboxes([
      { label: 'Honoraires a la charge du Vendeur', checked: p.mandateHonorairesCharge === 'VENDEUR' },
      { label: 'Acquereur', checked: p.mandateHonorairesCharge === 'ACQUEREUR' },
    ]);
    field('Prix honoraires inclus', eur(prixFAI));
    field('Prix honoraires inclus (en lettres)', eurosEnLettres(prixFAI));
    checkboxes([
      { label: 'Bien Libre', checked: p.occupancy === 'LIBRE' },
      { label: 'Occupe / loue', checked: p.occupancy === 'OCCUPE' },
    ]);

    // ======================= PAGE 3 =======================
    newPage();
    sectionTitle('Duree du mandat');
    para('Mandat valable pour 3 mois a compter de la signature, renouvelable par tacite reconduction par periode de 3 mois, dans la limite d\'un an. Revocable a tout moment par l\'une des parties, avec 15 jours de preavis par lettre recommandee avec accuse de reception.');
    sectionTitle('Obligations du mandant');
    bullets([
      'Fournir tous documents utiles (titre de propriete, diagnostics...).',
      'Signaler tout changement affectant le bien.',
      'Autoriser visites, photos, affichage, publications.',
      'Ratifier toute vente aux conditions du mandat.',
    ]);
    para('Clause penale : indemnite due en cas de non-respect du mandat exclusif ou vente directe a un acquereur presente par le Mandataire.', 8.5, grey);
    sectionTitle('Faculte de retractation');
    para('Le Mandant dispose d\'un delai de 14 jours pour exercer son droit de retractation par LRAR.');

    // ======================= PAGE 4 : Signatures =======================
    newPage();
    sectionTitle('Signatures');
    const place = p.mandatePlace || p.city || '';
    field('Fait a', place);
    const d = new Date();
    field('Le', `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}, en 2 exemplaires`);
    y -= 14;
    const boxH = 82, gap = 22, boxW = (CW - gap) / 2;
    ensure(boxH + 6);
    const topB = y;
    page.drawRectangle({ x: M, y: topB - boxH, width: boxW, height: boxH, borderColor: rule, borderWidth: 0.8, color: white });
    page.drawText('Le Mandataire', { x: M + 10, y: topB - 16, size: 9.5, font: fontBold, color: navy });
    page.drawText('Precede de "Bon pour acceptation de mandat"', { x: M + 10, y: topB - 28, size: 7, font, color: grey });
    const x2 = M + boxW + gap;
    page.drawRectangle({ x: x2, y: topB - boxH, width: boxW, height: boxH, borderColor: rule, borderWidth: 0.8, color: white });
    page.drawText('Le(s) Mandant(s)', { x: x2 + 10, y: topB - 16, size: 9.5, font: fontBold, color: navy });
    page.drawText('Precede(s) de "Bon pour mandat"', { x: x2 + 10, y: topB - 28, size: 7, font, color: grey });
    y = topB - boxH - 12;
    para('Signatures precedees de la mention manuscrite correspondante, ecrite de la main de chaque partie.', 8, grey);

    // ======================= PAGE 5 : Formulaire de retractation =======================
    newPage();
    sectionTitle('Formulaire de retractation');
    para('(Veuillez completer et renvoyer le present formulaire uniquement si vous souhaitez vous retracter du mandat.)', 8, grey);
    y -= 2;
    para('A l\'attention de : NOVUS CAPITAL - 50 rue de la Garenne, 76130 Mont-Saint-Aignan');
    para('Je/nous vous notifie/notifions par la presente ma/notre retractation du mandat de vente portant sur le bien suivant :');
    y -= 2;
    field('Adresse du bien', address);
    field('Nom du (des) mandant(s)', owner ? (owner.type === 'COMPANY' ? owner.name : [owner.firstName, owner.lastName].filter(Boolean).join(' ')) : '');
    y -= 6;
    para('Date : ....../....../20......', 9, dark);
    y -= 4;
    para('Signature du (des) mandant(s) :', 9, dark);

    // ======================= PAGES 6-7 : Conditions particulieres =======================
    newPage(true);
    sectionTitle('Definitions des types de mandats');
    bullets([
      'Mandat simple : le Mandant peut confier la vente a plusieurs agences et vendre lui-meme. Commission due uniquement si la vente est conclue par l\'agence mandatee.',
      'Mandat exclusif : seule l\'agence detentrice du mandat peut vendre le bien pendant la duree dudit mandat. Commission due meme si la vente est finalisee directement par le Mandant.',
      'Mandat succes : seule l\'agence detentrice du mandat peut vendre le bien pendant la duree dudit mandat. La commission n\'est pas due si la vente est finalisee directement par le Mandant.',
    ], 8.5);
    sectionTitle('Autorisations accordees au mandataire');
    bullets([
      'faire visiter le bien a tout client potentiel ;',
      'prendre des photographies et videos du bien ;',
      'publier l\'annonce du bien sur tous supports (imprimes ou electroniques) ;',
      'apposer un panneau de mise en vente sur le bien ;',
      'demander toute piece utile aupres de tiers (certificats d\'urbanisme, reglement de copropriete, etc.) ;',
      'deleguer le mandat a tout confrere titulaire de la carte professionnelle ;',
      'engager des depenses pour etablir les diagnostics si non fournis sous huitaine ;',
      'recuperer aupres du syndic les documents requis pour la vente en copropriete ;',
      'demander une attestation de surface si necessaire, aux frais du Mandant.',
    ], 8.5);

    newPage(true);
    sectionTitle('Engagements du mandant');
    bullets([
      'liberer le bien pour l\'acte authentique ;',
      'ne pas vendre par un tiers pendant la duree du mandat exclusif ;',
      'ne pas traiter avec un acquereur presente par le Mandataire sans son concours ;',
      'informer immediatement le Mandataire en cas de mandat parallele (en simple) ;',
      'signaler toute proposition recue personnellement ;',
      'respecter les dispositions legales en vigueur.',
    ], 8.5);
    sectionTitle('Clause penale');
    para('En cas de violation du mandat exclusif ou de vente sans l\'intervention du Mandataire a un acquereur qu\'il a presente, une indemnite egale aux honoraires convenus sera exigible.', 8.5);
    sectionTitle('Preuve de presentation');
    para('Le Mandataire informera le Mandant, par ecrit, de toute personne a qui le bien aura ete presente. Sans contestation ecrite du Mandant, ces personnes seront reputees entrees dans le cadre du present mandat.', 8.5);

    const bytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="mandat-${p.mandateNumber || id}.pdf"`,
        'Content-Length': bytes.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Mandat PDF error:', error);
    return NextResponse.json({ error: 'PDF generation failed', details: error.message }, { status: 500 });
  }
}
