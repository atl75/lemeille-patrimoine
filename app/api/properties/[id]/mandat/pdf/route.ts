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
    const dark = rgb(0.12, 0.12, 0.12);
    const grey = rgb(0.45, 0.45, 0.45);
    const rule = rgb(0.8, 0.8, 0.8);

    const PW = 595, PH = 842, M = 45;
    const CW = PW - M * 2;

    const clean = (t: any) => String(t ?? '')
      .replace(/[    ⁠​]/g, ' ')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
      .replace(/[€]/g, 'EUR').replace(/²/g, '2');

    let page: any, y = 0;

    const header = (particulieres = false) => {
      page.drawText(particulieres ? 'CONDITIONS PARTICULIERES' : 'CONDITIONS GENERALES', { x: M, y: PH - 34, size: 11, font: fontBold, color: navy });
      const lines = [
        'NOVUS CAPITAL - 50 rue de la Garenne - 76130 Mont-Saint-Aignan',
        'Representee par Arthur LEMEILLE - CPI 7606 2024 000 000 038',
      ];
      let hy = PH - 48;
      for (const l of lines) { page.drawText(l, { x: M, y: hy, size: 7.5, font, color: grey }); hy -= 10; }
      page.drawLine({ start: { x: M, y: hy - 2 }, end: { x: PW - M, y: hy - 2 }, thickness: 0.6, color: rule });
    };

    const footer = () => {
      const f = [
        'NOVUS CAPITAL SAS - Capital 100 Euros - SIRET 937 847 937 00011 - TVA FR4193784793750 - 50 Rue de la Garenne 76130 Mont St Aignan',
        'RCP ZURICH INSURANCE PLC N°7400023129 - Transactions sur immeubles et fonds de commerce',
        'Notre Cabinet ne detient aucun fonds pour le compte de ses clients',
      ];
      let fy = 40;
      page.drawLine({ start: { x: M, y: fy + 8 }, end: { x: PW - M, y: fy + 8 }, thickness: 0.6, color: rule });
      for (const l of f) { const w = font.widthOfTextAtSize(l, 6); page.drawText(l, { x: (PW - w) / 2, y: fy, size: 6, font, color: grey }); fy -= 8; }
    };

    const newPage = (particulieres = false) => {
      page = pdfDoc.addPage([PW, PH]);
      header(particulieres);
      footer();
      y = PH - 80;
    };
    const ensure = (need: number, particulieres = false) => { if (y - need < 60) newPage(particulieres); };

    const sectionTitle = (t: string) => {
      ensure(26);
      page.drawText(clean(t).toUpperCase(), { x: M, y, size: 10, font: fontBold, color: gold });
      y -= 5;
      page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.6, color: rule });
      y -= 14;
    };

    const para = (t: string, size = 9, color = dark) => {
      for (const src of clean(t).split('\n')) {
        const words = src.split(/\s+/).filter(Boolean);
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (font.widthOfTextAtSize(test, size) > CW && line) { ensure(size + 3); page.drawText(line, { x: M, y, size, font, color }); y -= size + 3; line = w; }
          else line = test;
        }
        if (line) { ensure(size + 3); page.drawText(line, { x: M, y, size, font, color }); y -= size + 3; }
        else { y -= size; }
      }
    };

    const field = (label: string, value: string) => {
      ensure(15);
      page.drawText(clean(label), { x: M, y, size: 9, font: fontBold, color: dark });
      const lw = fontBold.widthOfTextAtSize(clean(label), 9);
      page.drawText(clean(value || '—'), { x: M + lw + 6, y, size: 9, font, color: dark });
      y -= 15;
    };

    const checkboxes = (opts: { label: string; checked: boolean }[]) => {
      ensure(15);
      let x = M;
      for (const o of opts) {
        page.drawText(o.checked ? '[X]' : '[ ]', { x, y, size: 9, font: fontBold, color: o.checked ? gold : grey });
        page.drawText(clean(o.label), { x: x + 20, y, size: 9, font, color: dark });
        x += 22 + font.widthOfTextAtSize(clean(o.label), 9) + 22;
      }
      y -= 16;
    };

    const bullets = (items: string[], size = 9) => {
      for (const it of items) {
        ensure(size + 3);
        page.drawText('-', { x: M, y, size, font, color: gold });
        const words = clean(it).split(/\s+/); let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (font.widthOfTextAtSize(test, size) > CW - 12 && line) { page.drawText(line, { x: M + 12, y, size, font, color: dark }); y -= size + 3; ensure(size + 3); line = w; }
          else line = test;
        }
        if (line) { page.drawText(line, { x: M + 12, y, size, font, color: dark }); y -= size + 3; }
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
    field('Numero de mandat :', p.mandateNumber || '');
    y -= 4;
    sectionTitle('Type de mandat');
    checkboxes([
      { label: 'Mandat Simple', checked: mtype === 'SIMPLE' },
      { label: 'Mandat Exclusif', checked: mtype === 'EXCLUSIF' },
      { label: 'Mandat Succes', checked: mtype === 'SUCCES' },
    ]);
    y -= 4;
    sectionTitle('Le Mandant');
    if (owner && owner.type === 'COMPANY') {
      checkboxes([{ label: "Representant d'une Societe", checked: true }]);
      field('Denomination :', [owner.name, owner.legalForm].filter(Boolean).join(' — '));
      field('Representant legal :', [owner.managerFirstName, owner.managerLastName].filter(Boolean).join(' ') + (owner.managerRole ? ` (${owner.managerRole})` : ''));
      field('Siege social :', owner.address || '');
      field('N° RCS :', owner.siren || '');
      field('Coordonnees :', [owner.phone, owner.email].filter(Boolean).join(' — '));
    } else {
      checkboxes([{ label: 'Proprietaire(s) en nom propre', checked: true }]);
      const own = owner || {};
      field('Nom & prenom :', [own.firstName, own.lastName].filter(Boolean).join(' '));
      field('Adresse :', own.address || '');
      field('Tel :', own.phone || '');
      field('Email :', own.email || '');
    }

    // ======================= PAGE 2 =======================
    newPage();
    sectionTitle('Le Mandataire');
    para('NOVUS CAPITAL SAS, 50 rue de la Garenne, 76130 Mont-Saint-Aignan');
    para('SIRET : 937 847 937 00011 - CPI 7606 2024 000 000 038 - Representee par : Arthur LEMEILLE');
    y -= 6;
    para('Le Mandant donne mandat au Mandataire de vendre le bien designe ci-apres, selon les conditions stipulees ci-dessous.', 9, grey);
    y -= 6;
    sectionTitle('Designation du bien');
    field('Type de bien :', typeLabel);
    field('Adresse :', address);
    field('Reference cadastrale :', p.cadastralReference || '');
    field('Superficie du bien :', p.surface ? `${p.surface} m2` : '');
    if ((p.type || '') === 'MAISON') field('Superficie de la parcelle :', p.landSize ? `${p.landSize} m2` : '');
    ensure(20);
    page.drawText('Descriptif :', { x: M, y, size: 9, font: fontBold, color: dark }); y -= 13;
    para(p.description || '', 9);
    y -= 8;
    sectionTitle('Prix et conditions de vente');
    field('Prix net vendeur :', eur(netVendeur));
    field('(en lettres) :', eurosEnLettres(netVendeur));
    field('Honoraires du mandataire (TTC) :', `${eur(honoraires)}${honorairesPct ? ` ou ${honorairesPct} du prix net` : ''}`);
    checkboxes([
      { label: 'Honoraires a la charge du Vendeur', checked: p.mandateHonorairesCharge === 'VENDEUR' },
      { label: 'Acquereur', checked: p.mandateHonorairesCharge === 'ACQUEREUR' },
    ]);
    field('Prix de vente honoraires inclus :', eur(prixFAI));
    field('(en lettres) :', eurosEnLettres(prixFAI));
    checkboxes([
      { label: 'Bien Libre', checked: p.occupancy === 'LIBRE' },
      { label: 'Occupe / loue', checked: p.occupancy === 'OCCUPE' },
    ]);

    // ======================= PAGE 3 =======================
    newPage();
    sectionTitle('Duree du mandat');
    para('Mandat valable pour 3 mois a compter de la signature, renouvelable par tacite reconduction par periode de 3 mois, dans la limite d\'un an. Revocable a tout moment par l\'une des parties, avec 15 jours de preavis par lettre recommandee avec accuse de reception.');
    y -= 6;
    sectionTitle('Obligations du mandant');
    bullets([
      'Fournir tous documents utiles (titre de propriete, diagnostics...).',
      'Signaler tout changement affectant le bien.',
      'Autoriser visites, photos, affichage, publications.',
      'Ratifier toute vente aux conditions du mandat.',
    ]);
    y -= 4;
    para('Clause penale : indemnite due en cas de non-respect du mandat exclusif ou vente directe a un acquereur presente par le Mandataire.', 8.5, grey);
    y -= 6;
    sectionTitle('Faculte de retractation');
    para('Le Mandant dispose d\'un delai de 14 jours pour exercer son droit de retractation par LRAR.');

    // ======================= PAGE 4 : Signatures =======================
    newPage();
    sectionTitle('Signatures');
    const place = p.mandatePlace || p.city || '';
    field('Fait a :', place);
    const d = new Date();
    field('Le :', `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}, en 2 exemplaires`);
    y -= 20;
    para('Le Mandataire :', 9, dark);
    para('(Signature precedee de la mention manuscrite "Bon pour acceptation de mandat")', 8, grey);
    y -= 50;
    para('Le(s) Mandant(s) :', 9, dark);
    para('(Signature(s) precedee(s) de la mention manuscrite "Bon pour mandat")', 8, grey);

    // ======================= PAGE 5 : Formulaire de retractation =======================
    newPage();
    sectionTitle('Formulaire de retractation');
    para('(Veuillez completer et renvoyer le present formulaire uniquement si vous souhaitez vous retracter du mandat.)', 8, grey);
    y -= 6;
    para('A l\'attention de : NOVUS CAPITAL - 50 rue de la Garenne, 76130 Mont-Saint-Aignan');
    y -= 4;
    para('Je/nous vous notifie/notifions par la presente ma/notre retractation du mandat de vente portant sur le bien suivant :');
    y -= 4;
    field('Adresse du bien :', address);
    field('Nom du (des) mandant(s) :', owner ? (owner.type === 'COMPANY' ? owner.name : [owner.firstName, owner.lastName].filter(Boolean).join(' ')) : '');
    para('Date : ....../....../20......', 9, dark);
    y -= 6;
    para('Signature du (des) mandant(s) :', 9, dark);

    // ======================= PAGES 6-7 : Conditions particulieres =======================
    newPage(true);
    sectionTitle('Definitions des types de mandats');
    bullets([
      'Mandat simple : le Mandant peut confier la vente a plusieurs agences et vendre lui-meme. Commission due uniquement si la vente est conclue par l\'agence mandatee.',
      'Mandat exclusif : seule l\'agence detentrice du mandat peut vendre le bien pendant la duree dudit mandat. Commission due meme si la vente est finalisee directement par le Mandant.',
      'Mandat succes : seule l\'agence detentrice du mandat peut vendre le bien pendant la duree dudit mandat. La commission n\'est pas due si la vente est finalisee directement par le Mandant.',
    ], 8.5);
    y -= 6;
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
    y -= 6;
    sectionTitle('Clause penale');
    para('En cas de violation du mandat exclusif ou de vente sans l\'intervention du Mandataire a un acquereur qu\'il a presente, une indemnite egale aux honoraires convenus sera exigible.', 8.5);
    y -= 6;
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
