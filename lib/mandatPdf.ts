import { eurosEnLettres } from '@/lib/enLettres';
import { NOVUS_LOGO_BASE64 } from '@/lib/novusLogo';
import { SIGNATURE_MANDATAIRE_B64 } from '@/lib/signatureMandataire';

// Génère le PDF du mandat de vente à partir d'un bien (objet property).
// Fonction pure : réutilisée par la route admin et par la page de signature
// publique. Incruste la signature électronique du mandant si présente.
export async function buildMandatePdf(p: any): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const logoImg = await pdfDoc.embedPng(Buffer.from(NOVUS_LOGO_BASE64, 'base64'));

  const navyH = rgb(0.125, 0.149, 0.196);
  const gold = rgb(0.722, 0.612, 0.427);
  const dark = rgb(0.13, 0.13, 0.13);
  const grey = rgb(0.42, 0.42, 0.42);
  const light = rgb(0.86, 0.86, 0.89);
  const rule = rgb(0.8, 0.8, 0.8);
  const white = rgb(1, 1, 1);

  const PW = 595, PH = 842, M = 52, BAND = 58;
  const CW = PW - M * 2;

  const clean = (t: any) => String(t ?? '')
    .replace(/[    ​⁠]/g, ' ')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .replace(/€/g, 'EUR').replace(/²/g, '2')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
    .replace(/[^\x00-\xFF]/g, '');

  let page: any, y = 0, pageCount = 0;

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

  const header = () => {
    page.drawRectangle({ x: 0, y: PH - BAND, width: PW, height: BAND, color: navyH });
    page.drawRectangle({ x: 0, y: PH - BAND, width: PW, height: 2, color: gold });
    const ls = 40;
    page.drawImage(logoImg, { x: M, y: PH - BAND + (BAND - ls) / 2 - 1, width: ls, height: ls });
    const t = 'MANDAT DE VENTE';
    const tw = fontBold.widthOfTextAtSize(t, 14);
    page.drawText(t, { x: (PW - tw) / 2, y: PH - 24, size: 14, font: fontBold, color: gold });
    const subs = [
      'NOVUS CAPITAL - 50 rue de la Garenne - 76130 Mont-Saint-Aignan',
      'Représentée par Arthur LEMEILLE - CPI 7606 2024 000 000 038',
    ];
    let sy = PH - 37;
    for (const l of subs) { const w = font.widthOfTextAtSize(l, 7.5); page.drawText(l, { x: (PW - w) / 2, y: sy, size: 7.5, font, color: light }); sy -= 11; }
  };

  const footer = (num: number) => {
    const lines = [
      'NOVUS CAPITAL SAS - Capital 100 Euros - SIRET 937 847 937 00011 - TVA FR41937847937 - 50 Rue de la Garenne 76130 Mont St Aignan',
      'RCP ZURICH INSURANCE PLC N°7400023129 - Transactions sur immeubles et fonds de commerce',
      'Notre Cabinet ne détient aucun fonds pour le compte de ses clients',
    ];
    let fy = 34;
    page.drawLine({ start: { x: M, y: fy + 10 }, end: { x: PW - M, y: fy + 10 }, thickness: 0.5, color: rule });
    for (const l of lines) { const w = font.widthOfTextAtSize(l, 6); page.drawText(l, { x: (PW - w) / 2, y: fy, size: 6, font, color: grey }); fy -= 8; }
    page.drawText(String(num), { x: PW - M - 6, y: 58, size: 8.5, font, color: grey });
  };

  const newPage = () => {
    page = pdfDoc.addPage([PW, PH]);
    pageCount++;
    header();
    footer(pageCount);
    y = PH - BAND - 18;
  };
  const ensure = (need: number) => { if (y - need < 66) newPage(); };

  const docTitle = () => {
    const t = 'Inscription au Registre des Mandats  N° ' + (clean(p.mandateNumber) || '..............');
    const w = timesBold.widthOfTextAtSize(t, 15);
    page.drawText(t, { x: (PW - w) / 2, y, size: 15, font: timesBold, color: navyH });
    y -= 11;
    page.drawLine({ start: { x: (PW - w) / 2, y }, end: { x: (PW + w) / 2, y }, thickness: 1, color: gold });
    y -= 22;
  };

  const sec = (t: string) => {
    ensure(30);
    y -= 8;
    page.drawText(clean(t).toUpperCase(), { x: M, y, size: 10.5, font: fontBold, color: navyH });
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.8, color: gold });
    y -= 15;
  };

  const sub = (t: string) => { ensure(16); page.drawText(clean(t), { x: M, y, size: 9.5, font: fontBold, color: gold }); y -= 15; };

  const para = (t: string, opts: { size?: number; color?: any; justify?: boolean; bold?: boolean; lh?: number; after?: number } = {}) => {
    const size = opts.size ?? 9;
    const color = opts.color ?? dark;
    const justify = opts.justify ?? true;
    const f = opts.bold ? fontBold : font;
    const lh = opts.lh ?? size + 3.6;
    const after = opts.after ?? 5;
    const space = f.widthOfTextAtSize(' ', size);
    for (const src of clean(t).split('\n')) {
      const words = src.split(/\s+/).filter(Boolean);
      const lines: string[][] = [];
      let cur: string[] = [], curW = 0;
      for (const w of words) {
        const ww = f.widthOfTextAtSize(w, size);
        if (cur.length && curW + space + ww > CW) { lines.push(cur); cur = [w]; curW = ww; }
        else { curW = cur.length ? curW + space + ww : ww; cur.push(w); }
      }
      if (cur.length) lines.push(cur);
      lines.forEach((lw, li) => {
        ensure(lh);
        const isLast = li === lines.length - 1;
        if (justify && !isLast && lw.length > 1) {
          const wordsW = lw.reduce((s, w) => s + f.widthOfTextAtSize(w, size), 0);
          const extra = (CW - wordsW) / (lw.length - 1);
          let x = M;
          for (const w of lw) { page.drawText(w, { x, y, size, font: f, color }); x += f.widthOfTextAtSize(w, size) + extra; }
        } else {
          page.drawText(lw.join(' '), { x: M, y, size, font: f, color });
        }
        y -= lh;
      });
    }
    y -= after;
  };

  const kv = (label: string, value: string) => {
    const l = clean(label) + ' : ';
    const lw = font.widthOfTextAtSize(l, 9);
    const vlines = wrap(value || '—', 9, CW - lw, fontBold);
    ensure(14);
    page.drawText(l, { x: M, y, size: 9, font, color: dark });
    page.drawText(vlines[0], { x: M + lw, y, size: 9, font: fontBold, color: dark });
    y -= 14;
    for (let i = 1; i < vlines.length; i++) { ensure(14); page.drawText(vlines[i], { x: M + lw, y, size: 9, font: fontBold, color: dark }); y -= 14; }
  };

  const drawCheck = (x: number, baseY: number, checked: boolean) => {
    const s = 8.5;
    const yb = baseY - 0.5;
    page.drawRectangle({ x, y: yb, width: s, height: s, borderColor: checked ? navyH : grey, borderWidth: 1, color: checked ? navyH : white });
    if (checked) {
      page.drawLine({ start: { x: x + 1.8, y: yb + 4.4 }, end: { x: x + 3.5, y: yb + 2.4 }, thickness: 1.2, color: white });
      page.drawLine({ start: { x: x + 3.5, y: yb + 2.4 }, end: { x: x + 6.8, y: yb + 6.6 }, thickness: 1.2, color: white });
    }
  };

  const checkList = (items: { label: string; checked: boolean }[]) => {
    for (const it of items) {
      const lines = wrap(it.label, 9, CW - 18);
      lines.forEach((ln, i) => {
        ensure(14);
        if (i === 0) drawCheck(M, y, it.checked);
        page.drawText(ln, { x: M + 16, y, size: 9, font, color: dark });
        y -= 13.5;
      });
    }
    y -= 4;
  };

  const checkRow = (prefix: string, items: { label: string; checked: boolean }[]) => {
    ensure(16);
    let x = M;
    if (prefix) {
      const pl = wrap(prefix, 9, CW);
      if (pl.length > 1) { para(prefix, { justify: false, after: 2 }); x = M; }
      else { page.drawText(clean(prefix), { x, y, size: 9, font, color: dark }); x += font.widthOfTextAtSize(clean(prefix), 9) + 12; }
    }
    for (const it of items) {
      drawCheck(x, y, it.checked); x += 14;
      page.drawText(clean(it.label), { x, y, size: 9, font, color: dark });
      x += font.widthOfTextAtSize(clean(it.label), 9) + 20;
    }
    y -= 18;
  };

  const gap = (n: number) => { y -= n; };

  const signline = (caption: string) => {
    gap(56);
    ensure(2);
    page.drawLine({ start: { x: M, y }, end: { x: M + 240, y }, thickness: 0.7, color: rule });
    y -= 11;
    page.drawText(clean(caption), { x: M, y, size: 7.5, font, color: grey });
    y -= 16;
  };

  // ------- Données -------
  const owners = Array.isArray(p.owners) ? p.owners : [];
  const owner = owners.length ? owners[0] : null;
  const isCompany = owner?.type === 'COMPANY';
  const typeLabel = ((p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement') + (p.rooms ? ` T${p.rooms}` : '');
  const address = p.map?.query || [p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');
  const netVendeur = Number(p.netSellerAmount ?? p.price ?? 0);
  const honoraires = Number(p.commissionAmount ?? Math.max(0, (Number(p.price) || 0) - netVendeur));
  const prixFAI = Number(p.price ?? (netVendeur + honoraires));
  // Honoraires exprimés en pourcentage du prix de vente FAI (frais d'agence inclus).
  const honorairesPct = prixFAI ? `${(honoraires / prixFAI * 100).toFixed(1)} %` : '..........';
  // Descriptif sommaire : on ne reprend pas tout le texte de l'annonce, seulement
  // un court résumé (première phrase, plafonné à ~200 caractères).
  const sommaire = (txt?: string): string => {
    const t = (txt || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (t.length <= 200) return t;
    const cut = t.slice(0, 200);
    const dot = cut.lastIndexOf('. ');
    if (dot > 80) return cut.slice(0, dot + 1);
    const sp = cut.lastIndexOf(' ');
    return (sp > 80 ? cut.slice(0, sp) : cut).trimEnd() + '…';
  };
  const mtype = p.mandateType || '';
  const charge = p.mandateHonorairesCharge || '';
  const occupe = p.occupancy === 'OCCUPE';
  // toLocaleString('fr-FR') sépare les milliers par une espace fine insécable
  // (U+202F), supprimée ensuite par le nettoyage hors Latin-1 → on la remplace
  // par une espace normale (0x20) pour garder « 1 000 000 EUR ».
  const eur = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' EUR';
  const mandantNom = isCompany
    ? clean(owner?.name || '')
    : owners.filter((o: any) => o?.type !== 'COMPANY').map((o: any) => [o.firstName, o.lastName].filter(Boolean).join(' ')).filter(Boolean).join(', ');
  const d = new Date();
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

  // ------- Clauses -------
  const mandataireSentence = "La société NOVUS CAPITAL SAS, conseil en transaction immobilière, dont le siège social est à Mont-Saint-Aignan, 50 rue de la Garenne, immatriculée 937 847 937 00011, représentée par son Président, Monsieur Arthur LEMEILLE, titulaire de la carte professionnelle CPI 7606 2024 000 000 038 délivrée par la Préfecture de Rouen.";
  const preamble = "Aux termes du présent mandat, établi conformément à la loi n° 70-9 du 2 janvier 1970 et au décret n° 72-678 du 20 juillet 1972, le Mandant dénommé ci-avant confère au Mandataire dénommé ci-avant, qui l'accepte, mandat de vendre le bien désigné ci-après.";
  const duree1 = "Le présent mandat est consenti et accepté pour une période de 3 mois renouvelable ensuite tacitement par période de 3 mois. La durée de reconduction est limitée à 1 an, période au terme de laquelle le présent mandat prendra automatiquement fin. Conformément aux dispositions de l'article 78 du décret n° 72-678 du 20 juillet 1972, chacune des parties pourra à tout moment dénoncer le mandat moyennant un préavis de quinze jours par lettre recommandée avec accusé de réception.";
  const duree2 = "Article L136-1 du Code de la consommation (modifié par la loi n° 2014-344 du 17/03/14 - art. 35) : le professionnel prestataire de services informe le consommateur par écrit, par lettre nominative ou courrier électronique dédiés, au plus tôt trois mois et au plus tard un mois avant le terme de la période autorisant le rejet de la reconduction, de la possibilité de ne pas reconduire le contrat conclu avec une clause de reconduction tacite. Cette information, délivrée dans des termes clairs et compréhensibles, mentionne dans un encadré apparent la date limite de résiliation. À défaut, le consommateur peut mettre gratuitement un terme au contrat, à tout moment à compter de la date de reconduction.";
  const obl1 = "Par les présentes, le Mandant s'engage à fournir au Mandataire tous les documents utiles à l'exercice de sa mission, notamment les justificatifs de propriété. Le Mandant doit informer immédiatement le Mandataire de tout changement juridique ou matériel concernant le bien mis en vente et effectuer tous les diagnostics obligatoires.";
  const obl2 = "Le Mandant donne tous pouvoirs au Mandataire pour accomplir, pour son compte et en son nom, toutes les démarches utiles à la vente : réclamer toutes pièces utiles auprès de toute personne privée ou publique (notamment le certificat d'urbanisme), faire visiter le bien à tout client potentiel, prendre des photographies, publier sur tous supports publicitaires imprimés ou électroniques et apposer un panneau de mise en vente. Le Cabinet Conseil Immobilier sera propriétaire du droit à l'image des photographies du bien qu'il a prises ou fait prendre. Le Mandant s'oblige à assurer le moyen de visiter pendant le cours du mandat et autorise sa délégation à tout confrère titulaire de la carte professionnelle.";
  const obl3 = "Le Mandant pourra exercer son droit d'accès et de rectification conformément à l'article 27 de la loi du 6 janvier 1978. Pendant la durée du mandat, il s'engage à ratifier la vente à tout acquéreur présenté par le Mandataire aux prix et conditions des présentes, et à libérer les lieux pour le jour de l'acte authentique. Clause pénale : en cas de violation de l'exclusivité ou d'une des obligations du présent paragraphe, le Mandant réglera une indemnité compensatrice forfaitaire égale à la rémunération convenue. Il s'interdit de traiter directement avec tout acquéreur présenté par le Mandataire sans le concours de ce dernier, pendant la durée du mandat et durant un an après son expiration (articles 1142 et 1152 du code civil).";
  const obl4 = "Séquestre : les fonds ou valeurs qu'il est d'usage de faire verser par l'acquéreur seront détenus par tout séquestre habilité, soit le notaire. Loi Carrez (article 46 de la loi n° 65-557 du 10 juillet 1965) : si le Mandant ne fournit pas l'attestation de surface sous huitaine, il autorise le Mandataire à la faire établir à ses frais. Copropriété : le Mandant autorise le Mandataire à demander au syndic, en son nom et à ses frais, communication et copie des documents devant être fournis à l'acquéreur (règlement de copropriété, carnet d'entretien, diagnostics des parties communes, etc.), pour les seuls documents non déjà fournis.";
  const obl5 = "Si l'acquéreur a un lien (conjoint, parent, société d'un même groupe, intermédiaire quelconque, etc.) avec une personne à qui le bien aurait été présenté et signalé au Mandant, l'opération sera considérée comme effectivement réalisée, sans que le Mandataire ait à apporter la preuve de ce lien. Le Mandataire indiquera par email au Mandant les personnes auxquelles il aura présenté le bien ; sauf contestation écrite du Mandant admise par le Mandataire, elles seront considérées comme entrant définitivement dans le cadre du présent contrat.";
  const obl6 = "Dans le cadre d'un mandat simple, le Mandant est libre de poursuivre ses recherches et de vendre le bien par lui-même ou par un autre mandataire, au prix des présentes ; il en avisera alors immédiatement le Mandataire par lettre recommandée avec accusé de réception. Dans le cas d'un mandat exclusif, le Mandant déclare n'avoir consenti aucun autre mandat exclusif en cours et s'interdit de vendre son bien sans le concours du Mandataire ni de négocier avec un autre agent immobilier ; il s'engage à informer le Mandataire de toute proposition qui lui serait adressée personnellement.";
  const mandat4 = "En considération du mandat accordé, tous pouvoirs sont donnés au Mandataire pour mener à bien sa mission. Le Mandataire s'engage à effectuer toutes les démarches nécessaires et à rendre compte de ses actions. Conformément à l'article 77 du décret du 20 juillet 1972, il informera le Mandant de l'accomplissement du mandat au plus tard dans les huit jours de l'opération, ainsi que de toute modification législative ou commerciale susceptible de modifier les conditions de vente.";
  const retract = "Le Mandant a la faculté de renoncer au mandat dans le délai de quatorze (14) jours à compter de la date de signature des présentes. S'il entend utiliser cette faculté, il utilisera le formulaire ci-joint ou procédera à toute autre déclaration dénuée d'ambiguïté exprimant sa volonté de se rétracter, et l'adressera en recommandé avec demande d'avis de réception au Mandataire désigné. Le délai commence à courir le lendemain de la signature à 0 heure et expire le 14e jour à minuit. L'exercice de cette faculté ne donnera lieu à aucune indemnité ni frais.";
  const retractRappel = "Conformément au Code de la consommation (articles L.121-21 à L.121-21-8), le Mandant a la faculté de renoncer au mandat dans le délai de quatorze (14) jours à compter de la signature des présentes. La demande d'exécution immédiate du mandat ne le prive pas de sa faculté de rétractation pendant ce délai de 14 jours, tant que l'Agence n'a pas pleinement exécuté sa mission.";
  const mediation = "Conformément à l'article L.211-3 du Code de la consommation, le Mandant, en tant que consommateur, a le droit de recourir à un médiateur de la consommation en vue de la résolution amiable du litige qui pourrait l'opposer au Mandataire. Les modalités sont organisées par les articles L.611-1 et suivants et R.612-1 et suivants du Code de la consommation. La médiation est gratuite pour le consommateur (hors frais des 3° et 4° de l'article R.612-1). Le Mandant doit justifier avoir tenté au préalable de résoudre son litige directement auprès du Mandataire par une réclamation écrite, et saisir le médiateur dans un délai d'un an à compter de cette réclamation.";

  // ======================= DOCUMENT =======================
  newPage();
  docTitle();

  checkList([
    { label: 'Mandat Simple (sans exclusivité)', checked: mtype === 'SIMPLE' },
    { label: 'Mandat en Exclusivité', checked: mtype === 'EXCLUSIF' },
    { label: 'Mandat Succès', checked: mtype === 'SUCCES' },
  ]);
  gap(6);

  para('Les soussignés :', { bold: true, justify: false, after: 3 });
  // Autant de mandants que d'ayants droit : chacun avec adresse et téléphone.
  // Une société est représentée par son représentant légal (avec SIREN, courriel et téléphone).
  const mandants: any[] = (Array.isArray(owners) && owners.length) ? owners : [owner].filter(Boolean);
  if (mandants.length) {
    mandants.forEach((o: any) => {
      let line: string;
      if (o?.type === 'COMPANY') {
        const rep = [o.managerFirstName, o.managerLastName].filter(Boolean).map(clean).join(' ');
        line = `La société ${clean(o.name || '—')}${o.legalForm ? ' (' + clean(o.legalForm) + ')' : ''}, dont le siège social est ${clean(o.address || '—')}, immatriculée sous le numéro SIREN ${clean(o.siren || '—')}, représentée par ${rep || '—'}${o.managerRole ? ' (' + clean(o.managerRole) + ')' : ''}`;
        const c = [o.email ? 'email ' + clean(o.email) : '', o.phone ? 'téléphone ' + clean(o.phone) : ''].filter(Boolean).join(', ');
        line += (c ? `, ${c}` : '') + '.';
      } else {
        const nom = [o?.firstName, o?.lastName].filter(Boolean).map(clean).join(' ') || '—';
        line = `${nom}, demeurant ${clean(o?.address || '—')}`;
        const c = [o?.phone ? 'téléphone ' + clean(o.phone) : '', o?.email ? 'email ' + clean(o.email) : ''].filter(Boolean).join(', ');
        line += (c ? `, ${c}` : '') + '.';
      }
      para(line, { justify: false, after: 2 });
    });
  } else {
    para('—', { justify: false, after: 2 });
  }
  para(mandants.length > 1 ? 'Ci-après dénommés « le Mandant »' : 'Ci-après dénommé(e) « le Mandant »', { justify: false });
  para('Et :', { justify: false, after: 3 });
  para(mandataireSentence);
  para('Ci-après dénommé(e) « le Mandataire »,', { justify: false });
  para('Ont convenu ce qui suit :', { bold: true, justify: false, after: 3 });
  para(preamble);

  sec('Désignation du bien');
  kv('Type de bien', typeLabel);
  kv('Adresse', address);
  kv('Référence cadastrale', p.cadastralReference || '');
  kv('Superficie du bien', p.surface ? `${p.surface} m2` : '');
  if ((p.type || '') === 'MAISON') kv('Superficie de la parcelle', p.landSize ? `${p.landSize} m2` : '');
  // Descriptif sommaire = la « Désignation du bien » saisie dans le registre,
  // sinon un résumé du texte de l'annonce.
  kv('Descriptif sommaire', p.designation || sommaire(p.description));

  sec('I - Prix de vente et honoraires');
  para('Prix net vendeur (Euros)', { justify: false, after: 2 });
  para(`${eur(netVendeur)} - ${eurosEnLettres(netVendeur)}`, { bold: true, justify: false });
  para("Il est précisé que les droits afférents au bien (notamment les droits d'enregistrement) sont à la charge de l'acquéreur.");
  para("Il est précisé que le bien sus-désigné sera, le jour de la signature de l'acte de vente authentique :", { justify: false, after: 3 });
  checkList([
    { label: 'Libre de toute location, occupation ou réquisition', checked: !occupe },
    { label: "Loué suivant l'état locatif annexé aux présentes", checked: occupe },
  ]);
  para(`En rémunération de sa mission, le Mandataire percevra des honoraires (TVA incluse de 20%) d'un montant de ${honorairesPct} du prix de vente FAI (frais d'agence inclus), soit ${eur(honoraires)} - ${eurosEnLettres(honoraires)}. La rémunération sera exigible lors de la signature de l'acte authentique par devant notaire, étant précisé que les honoraires sont en sus du Prix Net Vendeur, à la charge :`);
  checkRow('', [
    { label: 'du Vendeur', checked: charge === 'VENDEUR' },
    { label: "de l'Acquéreur", checked: charge === 'ACQUEREUR' },
  ]);
  para('Le prix du bien, honoraires inclus, sera ainsi présenté à (Euros) :', { justify: false, after: 2 });
  para(`${eur(prixFAI)} - ${eurosEnLettres(prixFAI)}`, { bold: true, justify: false });

  sec('II - Durée du mandat');
  para(duree1);
  para(duree2, { size: 8.5, color: grey });

  sec('III - Obligations du mandant');
  para(obl1); para(obl2); para(obl3); para(obl4); para(obl5); para(obl6);

  sec('IV - Pouvoirs et obligations du mandataire');
  para(mandat4);
  para('Conditions particulières : ' + (clean(p.mandateSpecialConditions || '') || '.....................................................................................................'), { justify: false });

  sec('V - Moyens de diffusion des annonces commerciales');
  checkList([
    { label: 'Sites internet du Cabinet Conseil', checked: true },
    { label: "Portails internet d'annonces immobilières", checked: true },
    { label: 'Diffusion sur les réseaux sociaux', checked: true },
    { label: 'Panneau à vendre', checked: true },
  ]);

  sec('VI - Faculté de rétractation du mandant');
  para(retract);
  checkRow("Le Mandant demande que les prestations débutent avant l'expiration du délai de rétractation :", [
    { label: 'Oui', checked: true },
    { label: 'Non', checked: false },
  ]);
  para("Pour l'exécution du présent contrat, les parties font élection de domicile aux adresses indiquées en tête des présentes et s'engagent à informer l'autre partie de tout changement d'adresse.");

  sec('Signatures');
  kv('Fait à', p.mandatePlace || p.city || '');
  kv('Le', `${dateStr}, en 2 exemplaires dont un remis à chacune des parties`);
  para('Mots nuls : ..................        Lignes nulles : ..................', { justify: false });
  gap(6);
  para('Le Mandataire', { bold: true, justify: false, after: 2 });
  para('Signature précédée de la mention manuscrite « Bon pour acceptation de mandat »', { size: 8, color: grey, justify: false, after: 0 });
  // Signature du mandataire (Arthur Lemeille) apposée automatiquement, au-dessus de la ligne.
  {
    const png = await pdfDoc.embedPng(Buffer.from(SIGNATURE_MANDATAIRE_B64, 'base64'));
    const sw = 120;
    const sh = sw * (png.height / png.width);
    ensure(sh + 30);
    gap(6);
    page.drawImage(png, { x: M, y: y - sh, width: sw, height: sh });
    y -= sh + 2;
    page.drawLine({ start: { x: M, y }, end: { x: M + 240, y }, thickness: 0.7, color: rule });
    y -= 11;
    page.drawText(clean('Signature du Mandataire'), { x: M, y, size: 7.5, font, color: grey });
    y -= 16;
  }
  gap(8);
  para('Le(s) Mandant(s)', { bold: true, justify: false, after: 2 });
  para('Signature précédée de la mention manuscrite « Bon pour mandat »', { size: 8, color: grey, justify: false, after: 0 });

  // Un emplacement de signature par mandant : autant de signatures que de mandants.
  // Pour une société, c'est le représentant légal qui signe.
  const nameForOwner = (o: any): string => {
    if (o?.type === 'COMPANY') {
      const rep = [o.managerFirstName, o.managerLastName].filter(Boolean).map(clean).join(' ');
      return rep ? `${rep} (représentant de ${clean(o.name || '')})` : clean(o.name || 'Mandant');
    }
    return [o?.firstName, o?.lastName].filter(Boolean).map(clean).join(' ') || 'Mandant';
  };

  // Dessine un bloc de signature (image + attestation si signé, sinon ligne vierge).
  const drawMandantSignature = async (label: string, sg: any) => {
    gap(6);
    para(label, { size: 8, bold: true, justify: false, after: 0 });
    if (sg?.dataUrl && /^data:image\/png;base64,/.test(sg.dataUrl)) {
      try {
        const sigImg = await pdfDoc.embedPng(Buffer.from(sg.dataUrl.split(',')[1], 'base64'));
        const dim = sigImg.scale(1);
        const sc = Math.min(200 / dim.width, 56 / dim.height, 1);
        const w = dim.width * sc, h = dim.height * sc;
        ensure(h + 26);
        page.drawImage(sigImg, { x: M, y: y - h, width: w, height: h });
        y -= h + 3;
        page.drawLine({ start: { x: M, y }, end: { x: M + 240, y }, thickness: 0.7, color: rule });
        y -= 10;
        let when = sg.signedAt;
        try { when = new Date(sg.signedAt).toLocaleString('fr-FR'); } catch { /* garde brut */ }
        page.drawText(clean(`Signé électroniquement le ${when} par ${label}${sg.ip ? ` - IP ${sg.ip}` : ''}`), { x: M, y, size: 7, font, color: grey });
        y -= 9;
        page.drawText(clean(`Mention : « ${sg.mention || 'Bon pour mandat'} » - Signature électronique simple (eIDAS).`), { x: M, y, size: 7, font, color: grey });
        y -= 14;
        return;
      } catch { /* repli sur ligne vierge */ }
    }
    signline('Signature');
  };

  const signers: any[] = Array.isArray(p.signers) ? p.signers : [];
  if (mandants.length) {
    for (let mi = 0; mi < mandants.length; mi++) {
      const sg = signers.find((s: any) => s.ownerIndex === mi) || null;
      await drawMandantSignature(nameForOwner(mandants[mi]), sg?.dataUrl ? sg : null);
    }
  } else if (p.mandateSignature?.dataUrl) {
    // Héritage : signature unique.
    await drawMandantSignature(mandantNom, p.mandateSignature);
  } else {
    signline('Signature du (des) Mandant(s)');
  }
  gap(6);
  para(retractRappel, { size: 7.5, color: grey });

  // ------- Annexe : formulaire de rétractation (sur une nouvelle page) -------
  newPage();
  sec('Modèle de formulaire de rétractation');
  para('(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)', { size: 8, color: grey, justify: false });
  para('À l\'attention de : NOVUS CAPITAL - 50 rue de la Garenne, 76130 Mont-Saint-Aignan', { justify: false });
  para('Je / nous (*) vous notifie / notifions (*) par la présente ma / notre (*) rétractation du contrat de mandat portant sur le bien suivant :');
  kv('Adresse du bien', address);
  kv('Nom du (des) mandant(s)', mandantNom);
  para('Commandé le : ...........................            Date : ...........................', { justify: false });
  para('Signature du (des) mandant(s) (uniquement en cas de notification du présent formulaire sur papier) :', { justify: false });
  signline('Signature');
  para('(*) Rayez la mention inutile.', { size: 7.5, color: grey, justify: false });
  gap(8);
  sub('Médiation de la consommation');
  para(mediation, { size: 7.5, color: grey });

  return await pdfDoc.save();
}
