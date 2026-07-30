import { NextResponse } from 'next/server';
import { readJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import type { NextRequest } from 'next/server';
import { eurosEnLettres } from '@/lib/enLettres';
import { NOVUS_LOGO_BASE64 } from '@/lib/novusLogo';

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
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const logoImg = await pdfDoc.embedPng(Buffer.from(NOVUS_LOGO_BASE64, 'base64'));

    const navyH = rgb(0.125, 0.149, 0.196); // navy du logo (bandeau d'en-tête)
    const gold = rgb(0.541, 0.427, 0.247);
    const dark = rgb(0.13, 0.13, 0.13);
    const grey = rgb(0.42, 0.42, 0.42);
    const light = rgb(0.86, 0.86, 0.89);
    const rule = rgb(0.8, 0.8, 0.8);
    const white = rgb(1, 1, 1);

    const PW = 595, PH = 842, M = 52, BAND = 58;
    const CW = PW - M * 2;

    // Nettoyage : garde les accents (Latin-1 / WinAnsi) mais retire les
    // caractères non encodables (emojis, espaces spéciales, symboles hors jeu).
    const clean = (t: any) => String(t ?? '')
      .replace(/[    ​⁠]/g, ' ')
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
        'Representee par Arthur LEMEILLE - CPI 7606 2024 000 000 038',
      ];
      let sy = PH - 37;
      for (const l of subs) { const w = font.widthOfTextAtSize(l, 7.5); page.drawText(l, { x: (PW - w) / 2, y: sy, size: 7.5, font, color: light }); sy -= 11; }
    };

    const footer = (num: number) => {
      const lines = [
        'NOVUS CAPITAL SAS - Capital 100 Euros - SIRET 937 847 937 00011 - TVA FR41937847937 - 50 Rue de la Garenne 76130 Mont St Aignan',
        'RCP ZURICH INSURANCE PLC N°7400023129 - Transactions sur immeubles et fonds de commerce',
        'Notre Cabinet ne detient aucun fonds pour le compte de ses clients',
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
      y = PH - BAND - 16;
    };
    const ensure = (need: number) => { if (y - need < 66) newPage(); };

    // Titre principal du document (page 1)
    const docTitle = () => {
      const t = 'Inscription au Registre des Mandats  N° ' + (clean(p.mandateNumber) || '..............');
      const w = timesBold.widthOfTextAtSize(t, 15);
      page.drawText(t, { x: (PW - w) / 2, y, size: 15, font: timesBold, color: navyH });
      y -= 11;
      page.drawLine({ start: { x: (PW - w) / 2, y }, end: { x: (PW + w) / 2, y }, thickness: 1, color: gold });
      y -= 20;
    };

    // Titre de section (I – …) : texte navy + filet doré, dense
    const sec = (t: string) => {
      ensure(26);
      y -= 5;
      page.drawText(clean(t).toUpperCase(), { x: M, y, size: 10.5, font: fontBold, color: navyH });
      y -= 5;
      page.drawLine({ start: { x: M, y }, end: { x: PW - M, y }, thickness: 0.8, color: gold });
      y -= 13;
    };

    const sub = (t: string) => { ensure(16); page.drawText(clean(t), { x: M, y, size: 9.5, font: fontBold, color: gold }); y -= 14; };

    // Paragraphe justifié (sauf dernière ligne)
    const para = (t: string, opts: { size?: number; color?: any; justify?: boolean; bold?: boolean; lh?: number } = {}) => {
      const size = opts.size ?? 9;
      const color = opts.color ?? dark;
      const justify = opts.justify ?? true;
      const f = opts.bold ? fontBold : font;
      const lh = opts.lh ?? size + 3.2;
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
    };

    // Ligne « Libellé : valeur » compacte (valeur en gras)
    const kv = (label: string, value: string) => {
      const l = clean(label) + ' : ';
      const lw = font.widthOfTextAtSize(l, 9);
      const vlines = wrap(value || '—', 9, CW - lw, fontBold);
      ensure(13);
      page.drawText(l, { x: M, y, size: 9, font, color: dark });
      page.drawText(vlines[0], { x: M + lw, y, size: 9, font: fontBold, color: dark });
      y -= 13;
      for (let i = 1; i < vlines.length; i++) { ensure(13); page.drawText(vlines[i], { x: M + lw, y, size: 9, font: fontBold, color: dark }); y -= 13; }
    };

    const drawCheck = (x: number, yb: number, checked: boolean) => {
      const s = 8;
      page.drawRectangle({ x, y: yb, width: s, height: s, borderColor: checked ? navyH : grey, borderWidth: 1, color: checked ? navyH : white });
      if (checked) {
        page.drawLine({ start: { x: x + 1.6, y: yb + 4 }, end: { x: x + 3.2, y: yb + 2 }, thickness: 1.1, color: white });
        page.drawLine({ start: { x: x + 3.2, y: yb + 2 }, end: { x: x + 6.4, y: yb + 6.2 }, thickness: 1.1, color: white });
      }
    };

    // Cases à cocher en liste (une par ligne)
    const checkList = (items: { label: string; checked: boolean }[]) => {
      for (const it of items) {
        const lines = wrap(it.label, 9, CW - 16);
        lines.forEach((ln, i) => {
          ensure(13);
          if (i === 0) drawCheck(M, y - 7, it.checked);
          page.drawText(ln, { x: M + 15, y, size: 9, font, color: dark });
          y -= 12.5;
        });
      }
      y -= 1;
    };

    // Cases à cocher en ligne (prefixe optionnel)
    const checkRow = (prefix: string, items: { label: string; checked: boolean }[]) => {
      ensure(15);
      let x = M;
      if (prefix) { page.drawText(clean(prefix), { x, y, size: 9, font, color: dark }); x += font.widthOfTextAtSize(clean(prefix), 9) + 10; }
      for (const it of items) {
        drawCheck(x, y - 7, it.checked); x += 13;
        page.drawText(clean(it.label), { x, y, size: 9, font, color: dark });
        x += font.widthOfTextAtSize(clean(it.label), 9) + 18;
      }
      y -= 15;
    };

    const gap = (n: number) => { y -= n; };

    // ------- Données -------
    const owners = Array.isArray(p.owners) ? p.owners : [];
    const owner = owners.length ? owners[0] : null;
    const isCompany = owner?.type === 'COMPANY';
    const typeLabel = ((p.type || 'APPARTEMENT') === 'MAISON' ? 'Maison' : 'Appartement') + (p.rooms ? ` T${p.rooms}` : '');
    const address = p.map?.query || [p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(', ');
    const netVendeur = Number(p.netSellerAmount ?? p.price ?? 0);
    const honoraires = Number(p.commissionAmount ?? Math.max(0, (Number(p.price) || 0) - netVendeur));
    const honorairesPct = p.commissionPercentage ? `${p.commissionPercentage} %` : (netVendeur ? `${(honoraires / netVendeur * 100).toFixed(1)} %` : '..........');
    const prixFAI = Number(p.price ?? (netVendeur + honoraires));
    const mtype = p.mandateType || '';
    const charge = p.mandateHonorairesCharge || '';
    const occupe = p.occupancy === 'OCCUPE';
    const eur = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' EUR';
    const mandantNom = isCompany
      ? clean(owner?.name || '')
      : owners.filter((o: any) => o?.type !== 'COMPANY').map((o: any) => [o.firstName, o.lastName].filter(Boolean).join(' ')).filter(Boolean).join(', ');
    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    // ------- Clauses -------
    const mandataireSentence = "La societe NOVUS CAPITAL SAS, conseil en transaction immobiliere, dont le siege social est a Mont-Saint-Aignan, 50 rue de la Garenne, immatriculee 937 847 937 00011, representee par son President, Monsieur Arthur LEMEILLE, titulaire de la carte professionnelle CPI 7606 2024 000 000 038 delivree par la Prefecture de Rouen.";
    const preamble = "Aux termes du present mandat, etabli conformement a la loi n° 70-9 du 2 janvier 1970 et au decret n° 72-678 du 20 juillet 1972, le Mandant denomme ci-avant confere au Mandataire denomme ci-avant, qui l'accepte, mandat de vendre le bien designe ci-apres.";
    const duree1 = "Le present mandat est consenti et accepte pour une periode de 3 mois renouvelable ensuite tacitement par periode de 3 mois. La duree de reconduction est limitee a 1 an, periode au terme de laquelle le present mandat prendra automatiquement fin. Conformement aux dispositions de l'article 78 du decret n° 72-678 du 20 juillet 1972, chacune des parties pourra a tout moment denoncer le mandat moyennant un preavis de quinze jours par lettre recommandee avec accuse de reception.";
    const duree2 = "Article L136-1 du Code de la consommation (modifie par la loi n° 2014-344 du 17/03/14 - art. 35) : le professionnel prestataire de services informe le consommateur par ecrit, par lettre nominative ou courrier electronique dedies, au plus tot trois mois et au plus tard un mois avant le terme de la periode autorisant le rejet de la reconduction, de la possibilite de ne pas reconduire le contrat conclu avec une clause de reconduction tacite. Cette information, delivree dans des termes clairs et comprehensibles, mentionne dans un encadre apparent la date limite de resiliation. A defaut, le consommateur peut mettre gratuitement un terme au contrat, a tout moment a compter de la date de reconduction.";
    const obl1 = "Par les presentes, le Mandant s'engage a fournir au Mandataire tous les documents utiles a l'exercice de sa mission, notamment les justificatifs de propriete. Le Mandant doit informer immediatement le Mandataire de tout changement juridique ou materiel concernant le bien mis en vente et effectuer tous les diagnostics obligatoires.";
    const obl2 = "Le Mandant donne tous pouvoirs au Mandataire pour accomplir, pour son compte et en son nom, toutes les demarches utiles a la vente : reclamer toutes pieces utiles aupres de toute personne privee ou publique (notamment le certificat d'urbanisme), faire visiter le bien a tout client potentiel, prendre des photographies, publier sur tous supports publicitaires imprimes ou electroniques et apposer un panneau de mise en vente. Le Cabinet Conseil Immobilier sera proprietaire du droit a l'image des photographies du bien qu'il a prises ou fait prendre. Le Mandant s'oblige a assurer le moyen de visiter pendant le cours du mandat et autorise sa delegation a tout confrere titulaire de la carte professionnelle.";
    const obl3 = "Le Mandant pourra exercer son droit d'acces et de rectification conformement a l'article 27 de la loi du 6 janvier 1978. Pendant la duree du mandat, il s'engage a ratifier la vente a tout acquereur presente par le Mandataire aux prix et conditions des presentes, et a liberer les lieux pour le jour de l'acte authentique. Clause penale : en cas de violation de l'exclusivite ou d'une des obligations du present paragraphe, le Mandant reglera une indemnite compensatrice forfaitaire egale a la remuneration convenue. Il s'interdit de traiter directement avec tout acquereur presente par le Mandataire sans le concours de ce dernier, pendant la duree du mandat et durant un an apres son expiration (articles 1142 et 1152 du code civil).";
    const obl4 = "Sequestre : les fonds ou valeurs qu'il est d'usage de faire verser par l'acquereur seront detenus par tout sequestre habilite, soit le notaire. Loi Carrez (article 46 de la loi n° 65-557 du 10 juillet 1965) : si le Mandant ne fournit pas l'attestation de surface sous huitaine, il autorise le Mandataire a la faire etablir a ses frais. Copropriete : le Mandant autorise le Mandataire a demander au syndic, en son nom et a ses frais, communication et copie des documents devant etre fournis a l'acquereur (reglement de copropriete, carnet d'entretien, diagnostics des parties communes, etc.), pour les seuls documents non deja fournis.";
    const obl5 = "Si l'acquereur a un lien (conjoint, parent, societe d'un meme groupe, intermediaire quelconque, etc.) avec une personne a qui le bien aurait ete presente et signale au Mandant, l'operation sera consideree comme effectivement realisee, sans que le Mandataire ait a apporter la preuve de ce lien. Le Mandataire indiquera par courriel au Mandant les personnes auxquelles il aura presente le bien ; sauf contestation ecrite du Mandant admise par le Mandataire, elles seront considerees comme entrant definitivement dans le cadre du present contrat.";
    const obl6 = "Dans le cadre d'un mandat simple, le Mandant est libre de poursuivre ses recherches et de vendre le bien par lui-meme ou par un autre mandataire, au prix des presentes ; il en avisera alors immediatement le Mandataire par lettre recommandee avec accuse de reception. Dans le cas d'un mandat exclusif, le Mandant declare n'avoir consenti aucun autre mandat exclusif en cours et s'interdit de vendre son bien sans le concours du Mandataire ni de negocier avec un autre agent immobilier ; il s'engage a informer le Mandataire de toute proposition qui lui serait adressee personnellement.";
    const mandat4 = "En consideration du mandat accorde, tous pouvoirs sont donnes au Mandataire pour mener a bien sa mission. Le Mandataire s'engage a effectuer toutes les demarches necessaires et a rendre compte de ses actions. Conformement a l'article 77 du decret du 20 juillet 1972, il informera le Mandant de l'accomplissement du mandat au plus tard dans les huit jours de l'operation, ainsi que de toute modification legislative ou commerciale susceptible de modifier les conditions de vente.";
    const retract = "Le Mandant a la faculte de renoncer au mandat dans le delai de quatorze (14) jours a compter de la date de signature des presentes. S'il entend utiliser cette faculte, il utilisera le formulaire ci-joint ou procedera a toute autre declaration denuee d'ambiguite exprimant sa volonte de se retracter, et l'adressera en recommande avec demande d'avis de reception au Mandataire designe. Le delai commence a courir le lendemain de la signature a 0 heure et expire le 14e jour a minuit. L'exercice de cette faculte ne donnera lieu a aucune indemnite ni frais.";
    const retractRappel = "Conformement au Code de la consommation (articles L.121-21 a L.121-21-8), le Mandant a la faculte de renoncer au mandat dans le delai de quatorze (14) jours a compter de la signature des presentes. La demande d'execution immediate du mandat ne le prive pas de sa faculte de retractation pendant ce delai de 14 jours, tant que l'Agence n'a pas pleinement execute sa mission.";
    const mediation = "Conformement a l'article L.211-3 du Code de la consommation, le Mandant, en tant que consommateur, a le droit de recourir a un mediateur de la consommation en vue de la resolution amiable du litige qui pourrait l'opposer au Mandataire. Les modalites sont organisees par les articles L.611-1 et suivants et R.612-1 et suivants du Code de la consommation. La mediation est gratuite pour le consommateur (hors frais des 3° et 4° de l'article R.612-1). Le Mandant doit justifier avoir tente au prealable de resoudre son litige directement aupres du Mandataire par une reclamation ecrite, et saisir le mediateur dans un delai d'un an a compter de cette reclamation.";

    // ======================= DOCUMENT =======================
    newPage();
    docTitle();

    checkList([
      { label: 'Mandat Simple (sans exclusivite)', checked: mtype === 'SIMPLE' },
      { label: 'Mandat en Exclusivite', checked: mtype === 'EXCLUSIF' },
      { label: 'Mandat Succes', checked: mtype === 'SUCCES' },
    ]);
    gap(6);

    para('Les soussignes :', { bold: true, justify: false });
    if (isCompany) {
      const cs = `La societe ${clean(owner.name || '')}${owner.legalForm ? ' (' + clean(owner.legalForm) + ')' : ''}, dont le siege social est ${clean(owner.address || '')}, immatriculee ${clean(owner.siren || '')}, representee par ${[owner.managerFirstName, owner.managerLastName].filter(Boolean).map(clean).join(' ')}${owner.managerRole ? ' (' + clean(owner.managerRole) + ')' : ''}.`;
      para(cs);
    } else {
      const inds = owners.filter((o: any) => o?.type !== 'COMPANY');
      if (inds.length) inds.forEach((o: any) => para([o.firstName, o.lastName].filter(Boolean).join(' ') || '—', { justify: false }));
      else para('—', { justify: false });
    }
    para('Ci-apres denomme(e) « le Mandant »', { justify: false });
    gap(4);
    para('Et :', { justify: false });
    para(mandataireSentence);
    para('Ci-apres denomme(e) « le Mandataire »,', { justify: false });
    gap(4);
    para('Ont convenu ce qui suit :', { bold: true, justify: false });
    para(preamble);
    gap(4);

    sec('Designation du bien');
    kv('Type de bien', typeLabel);
    kv('Adresse', address);
    kv('Reference cadastrale', p.cadastralReference || '');
    kv('Superficie du bien', p.surface ? `${p.surface} m2` : '');
    if ((p.type || '') === 'MAISON') kv('Superficie de la parcelle', p.landSize ? `${p.landSize} m2` : '');
    kv('Descriptif', p.description || '');

    sec('I - Prix de vente et honoraires');
    para('Prix net vendeur (Euros)', { justify: false });
    para(`${eur(netVendeur)} - ${eurosEnLettres(netVendeur)}`, { bold: true, justify: false });
    para("Il est precise que les droits afferents au bien (notamment les droits d'enregistrement) sont a la charge de l'acquereur.");
    para("Il est precise que le bien sus-designe sera, le jour de la signature de l'acte de vente authentique :", { justify: false });
    checkList([
      { label: 'Libre de toute location, occupation ou requisition', checked: !occupe },
      { label: "Loue suivant l'etat locatif annexe aux presentes", checked: occupe },
    ]);
    para(`En remuneration de sa mission, le Mandataire percevra des honoraires (TVA incluse de 20%) d'un montant de ${honorairesPct} du prix net vendeur, soit ${eur(honoraires)} - ${eurosEnLettres(honoraires)}. La remuneration sera exigible lors de la signature de l'acte authentique par devant notaire, etant precise que les honoraires sont en sus du Prix Net Vendeur, a la charge :`);
    checkRow('', [
      { label: 'du Vendeur', checked: charge === 'VENDEUR' },
      { label: "de l'Acquereur", checked: charge === 'ACQUEREUR' },
    ]);
    para('Le prix du bien, honoraires inclus, sera ainsi presente a (Euros) :', { justify: false });
    para(`${eur(prixFAI)} - ${eurosEnLettres(prixFAI)}`, { bold: true, justify: false });

    sec('II - Duree du mandat');
    para(duree1);
    para(duree2, { size: 8.5, color: grey });

    sec('III - Obligations du mandant');
    para(obl1); para(obl2); para(obl3); para(obl4); para(obl5); para(obl6);

    sec('IV - Pouvoirs et obligations du mandataire');
    para(mandat4);
    para('Conditions particulieres : ' + (clean(p.mandateSpecialConditions || '') || '.....................................................................................................'), { justify: false });

    sec('V - Moyens de diffusion des annonces commerciales');
    checkList([
      { label: 'Affiches vitrines', checked: true },
      { label: 'Publicites dans la presse specialisee et generaliste', checked: true },
      { label: 'Flyers distribues en boite aux lettres ou en mains propres', checked: true },
      { label: 'Panneau a vendre', checked: true },
      { label: 'Diffusion sur les reseaux sociaux', checked: true },
      { label: 'Sites internet du Cabinet Conseil', checked: true },
      { label: "Portails internet d'annonces immobilieres", checked: true },
    ]);

    sec('VI - Faculte de retractation du mandant');
    para(retract);
    checkRow("Le Mandant demande que les prestations debutent avant l'expiration du delai de retractation :", [
      { label: 'Oui', checked: false },
      { label: 'Non', checked: false },
    ]);
    para("Pour l'execution du present contrat, les parties font election de domicile aux adresses indiquees en tete des presentes et s'engagent a informer l'autre partie de tout changement d'adresse.");

    sec('Signatures');
    kv('Fait a', p.mandatePlace || p.city || '');
    kv('Le', `${dateStr}, en 2 exemplaires dont un remis a chacune des parties`);
    para('Mots nuls : ..................        Lignes nulles : ..................', { justify: false });
    gap(8);
    para('Le Mandataire', { bold: true, justify: false });
    para('Signature precedee de la mention manuscrite « Bon pour acceptation de mandat »', { size: 8, color: grey, justify: false });
    gap(34);
    para('Le(s) Mandant(s)', { bold: true, justify: false });
    kv('Nom en toutes lettres', mandantNom);
    para('Signature precedee de la mention manuscrite « Bon pour mandat »', { size: 8, color: grey, justify: false });
    gap(30);
    para(retractRappel, { size: 7.5, color: grey });
    gap(10);

    // ------- Annexe : formulaire de retractation (enchaine, sans page vide) -------
    sec('Modele de formulaire de retractation');
    para('(Veuillez completer et renvoyer le present formulaire uniquement si vous souhaitez vous retracter du contrat.)', { size: 8, color: grey, justify: false });
    gap(2);
    para('A l\'attention de : NOVUS CAPITAL - 50 rue de la Garenne, 76130 Mont-Saint-Aignan', { justify: false });
    para('Je / nous (*) vous notifie / notifions (*) par la presente ma / notre (*) retractation du contrat de mandat portant sur le bien suivant :');
    gap(2);
    kv('Adresse du bien', address);
    kv('Nom du (des) mandant(s)', mandantNom);
    para('Commande le : ...........................            Date : ...........................', { justify: false });
    gap(2);
    para('Signature du (des) mandant(s) (uniquement en cas de notification du present formulaire sur papier) :', { justify: false });
    para('(*) Rayez la mention inutile.', { size: 7.5, color: grey, justify: false });
    gap(10);
    sub('Mediation de la consommation');
    para(mediation, { size: 7.5, color: grey });

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
