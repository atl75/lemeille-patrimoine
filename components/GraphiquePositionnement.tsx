/**
 * Où se situe le bien, face au marché réel.
 *
 * FORME. Un essaim de points sur un axe unique — le prix au mètre carré — et
 * deux rangées qui partagent cet axe : les ventes SIGNÉES d'un côté, les biens
 * EN VENTE de l'autre. Jamais deux échelles : ce sont les mêmes euros par
 * mètre carré, la comparaison doit être directe.
 *
 * POURQUOI UN ESSAIM ET NON UN SEMIS. Premier essai rendu à l'écran avec 198
 * ventes réelles : les points se superposaient en une bouillie illisible. En
 * les empilant par colonne, chaque vente reste un point — c'est l'argument,
 * ce sont de vraies transactions — et la hauteur de la colonne DIT la densité.
 *
 * LE BIEN N'EST PAS UNE TROISIÈME SÉRIE. C'est le repère : une règle verticale
 * à l'encre de la marque, avec son étiquette. Le vert #1F3B2C a été écarté
 * comme couleur de série — mesuré, il sort de la bande de clarté et lit gris —
 * mais il porte 11,9:1 de contraste comme encre, ce qui en fait un bon repère.
 *
 * COULEURS VÉRIFIÉES : écart perceptuel de 24,7 en protanopie et 33,6 en
 * vision normale, très au-dessus des seuils. La rangée distincte fournit un
 * second encodage, indépendant de la couleur. Le document étant destiné à
 * l'impression, print-color-adjust force le rendu des aplats.
 */

export type PointGraphique = { m2: number; libelle: string };

const L = 700;
const G = 118, D = 24, BA = 46;
const R = 3.6;                 // rayon d'un point
const COL = R * 2 + 1.4;       // largeur d'une colonne de l'essaim

export default function GraphiquePositionnement({
  bienM2, cibleM2, ventes, enVente, medianeM2, q1M2, q3M2, reference,
}: {
  bienM2: number | null;
  /** Prix conseillé, au mètre carré. C'est la destination, pas le constat. */
  cibleM2?: number | null;
  ventes: PointGraphique[];
  enVente: PointGraphique[];
  medianeM2?: number | null;
  q1M2?: number | null;
  q3M2?: number | null;
  /** Prix de référence du secteur, relevé sur une page tierce. */
  reference?: { m2: number; bas?: number; haut?: number; source?: string } | null;
}) {
  // La référence prend sa place EN HAUT, en dehors du nuage : c'est un avis de
  // marché, pas une transaction. La mêler aux points laisserait croire qu'elle
  // a le même statut de preuve que les actes.
  // (mise en page des repères calculée plus bas : elle dépend de X)
  const tous = [...ventes, ...enVente].map(p => p.m2).filter(Number.isFinite);
  if (!tous.length) return null;

  // ÉCHELLE ROBUSTE. Une seule vente à 20 000 €/m² étirait l'axe et écrasait
  // la zone où se joue la comparaison. On borne aux 2e et 98e centiles, puis on
  // étend pour que le bien et les biens en vente tiennent toujours dedans.
  const tries = [...tous].sort((a, b) => a - b);
  const centile = (p: number) => tries[Math.min(tries.length - 1, Math.max(0, Math.round((tries.length - 1) * p)))];
  const dedans = [centile(0.02), centile(0.98), ...enVente.map(p => p.m2)];
  if (bienM2 != null) dedans.push(bienM2);
  if (cibleM2 != null) dedans.push(cibleM2);
  const b0 = Math.min(...dedans), b1 = Math.max(...dedans);
  const marge = Math.max((b1 - b0) * 0.06, 100);
  const x0 = Math.max(0, b0 - marge), x1 = b1 + marge;
  const horsEchelle = tous.filter(v => v < x0 || v > x1).length;
  const largeur = L - G - D;
  const X = (v: number) => G + ((v - x0) / (x1 - x0)) * largeur;
  const eur = (n: number) => (Math.round(n) === 0 ? 0 : Math.round(n)).toLocaleString('fr-FR');

  /* ————— Mise en page des repères —————
   * Trois bandes, de haut en bas : les deux PRIX (le bien, puis celui qu'on
   * conseille), ensuite l'avis de marché. Cet ordre n'est pas cosmétique : le
   * document sert à conduire un vendeur d'un prix à un autre, et c'est ce
   * couple qui doit se lire en premier. L'avis extérieur vient l'appuyer.
   */
  const CHIP_W = 172, CHIP_H = 19, Y0 = 12;
  const aBien = bienM2 != null, aCible = cibleM2 != null && cibleM2 !== bienM2;
  // Deux étiquettes voisines se recouvrent : on les empile alors.
  const chevauche = aBien && aCible && Math.abs(X(bienM2!) - X(cibleM2!)) < CHIP_W + 10;
  const yBien = Y0;
  const yCible = chevauche ? Y0 + CHIP_H + 5 : Y0;
  const basBandeau = (aBien || aCible)
    ? Math.max(aBien ? yBien : 0, aCible ? yCible : 0) + CHIP_H
    : Y0;
  // Assez d'air : l'étiquette de l'avis venait toucher le bas du bandeau.
  const HA = basBandeau + 14;
  // Assez de hauteur pour que les points RESPIRENT. Comprimés, les colonnes
  // fusionnent en barres pleines et l'on perd ce qui fait l'intérêt de la
  // forme : voir chaque vente, une par une.
  const H = HA + (reference ? 300 : 274);

  /** Une étiquette de prix : pleine pour ce qui EST, cernée pour ce qu'on propose. */
  const etiquette = (v: number, y: number, texte: string, pleine: boolean) => {
    const cx = Math.min(Math.max(X(v), CHIP_W / 2 + 2), L - CHIP_W / 2 - 2);
    return (
      <g>
        <line x1={X(v)} y1={y + CHIP_H} x2={X(v)} y2={H - BA}
          stroke="var(--encre)" strokeWidth={pleine ? 2.5 : 2}
          strokeDasharray={pleine ? undefined : '5 3'} />
        <rect x={cx - CHIP_W / 2} y={y} width={CHIP_W} height={CHIP_H} rx="3"
          fill={pleine ? 'var(--encre)' : '#fff'}
          stroke="var(--encre)" strokeWidth={pleine ? 0 : 1.2} />
        <text x={cx} y={y + 14} textAnchor="middle" fontSize="11" fontWeight="700"
          fill={pleine ? '#fff' : 'var(--encre)'}>{texte}</text>
      </g>
    );
  };

  // Graduations rondes : un axe se lit, il ne se déchiffre pas.
  const pas = Math.pow(10, Math.floor(Math.log10((x1 - x0) / 4)));
  const marche = [1, 2, 5, 10].map(m => m * pas).find(m => (x1 - x0) / m <= 5) ?? pas;
  const graduations: number[] = [];
  for (let v = Math.ceil(x0 / marche) * marche; v <= x1; v += marche) graduations.push(v);

  const BASE_V = HA + 158;  // ventes signées : empilées vers le haut
  /* L'AVIS DE MARCHÉ SE GLISSE ENTRE LES DEUX RANGÉES. Sa place dit son rôle :
     il s'intercale entre ce qui s'est signé et ce qui se demande, et le lecteur
     voit d'un coup de quel côté il penche. En tête, il concurrençait les deux
     prix qui portent la discussion. */
  const Y_REF_TEXTE = reference ? BASE_V + 16 : 0;
  const Y_REF_TRAIT = reference ? BASE_V + 27 : 0;
  const BASE_E = reference ? BASE_V + 46 : HA + 174;  // en vente : empilées vers le bas

  /**
   * Empile les points par colonne : la hauteur dit la densité.
   *
   * Le PAS SE RESSERRE si la colonne la plus haute ne tient pas dans la place
   * disponible. Sans cela, 568 ventes formaient une colonne plus haute que le
   * cadre : l'essaim débordait par le haut et venait recouvrir le crochet de
   * référence. On préfère des points plus serrés à des points hors cadre.
   */
  const essaim = (points: PointGraphique[], base: number, versLeBas: boolean, place: number) => {
    const colonnes = new Map<number, PointGraphique[]>();
    for (const p of [...points].filter(p => p.m2 >= x0 && p.m2 <= x1).sort((a, b) => a.m2 - b.m2)) {
      const c = Math.round(X(p.m2) / COL);
      const g = colonnes.get(c);
      if (g) g.push(p); else colonnes.set(c, [p]);
    }
    let plusHaute = 0;
    for (const ps of colonnes.values()) plusHaute = Math.max(plusHaute, ps.length);
    const pas = plusHaute > 1 ? Math.min(R * 2 + 1, place / (plusHaute - 1)) : R * 2 + 1;
    const sortie: { cx: number; cy: number; p: PointGraphique }[] = [];
    for (const [c, ps] of colonnes) {
      ps.forEach((p, n) => {
        sortie.push({ cx: c * COL, cy: base + n * pas * (versLeBas ? 1 : -1), p });
      });
    }
    return sortie;
  };

  const rangees = [
    { titre: 'Ventes signées', sous: `actes DGFiP · ${ventes.length}`, serie: 'var(--serie-1)',
      pts: essaim(ventes, BASE_V, false, BASE_V - HA + 2), yT: BASE_V - 4, yS: BASE_V + 10 },
    { titre: 'En vente', sous: `aujourd'hui · ${enVente.length}`, serie: 'var(--serie-2)',
      pts: essaim(enVente, BASE_E, true, Math.max(H - BA - BASE_E - 14, 10)), yT: BASE_E + 14, yS: BASE_E + 28 },
  ];

  return (
    <figure className="graphique-positionnement">
      <style>{`
        .graphique-positionnement {
          --serie-1: #2a78d6;
          --serie-2: #eb6834;
          --encre: #1F3B2C;
          --encre-2: #52514e;
          --trait: #d9d7d0;
          --surface: #fcfcfb;
          margin: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          break-inside: avoid;
        }
        .graphique-positionnement svg { width: 100%; height: auto; }
        .gp-point { stroke: var(--surface); stroke-width: 1.2; }
      `}</style>

      <svg viewBox={`0 0 ${L} ${H}`} role="img"
        aria-label={`Positionnement du bien à ${bienM2 ? eur(bienM2) : '—'} euros par mètre carré, face à ${ventes.length} ventes signées et ${enVente.length} biens en vente.`}>

        {/* La moitié centrale des ventes signées : le cœur du marché. */}
        {q1M2 != null && q3M2 != null && (
          <rect x={X(q1M2)} y={HA - 6} width={Math.max(X(q3M2) - X(q1M2), 1)}
            height={H - HA - BA + 6} fill="var(--serie-1)" opacity="0.09" />
        )}

        {graduations.map(v => (
          <g key={v}>
            <line x1={X(v)} y1={HA - 6} x2={X(v)} y2={H - BA} stroke="var(--trait)" strokeWidth="1" />
            <text x={X(v)} y={H - BA + 26} textAnchor="middle" fontSize="10" fill="var(--encre-2)">{eur(v)}</text>
          </g>
        ))}
        <line x1={G} y1={BASE_V + 3} x2={L - D} y2={BASE_V + 3} stroke="var(--trait)" strokeWidth="1" />
        <text x={(G + L - D) / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--encre-2)">
          prix au mètre carré (€)
        </text>

        {medianeM2 != null && (
          <>
            <line x1={X(medianeM2)} y1={HA - 6} x2={X(medianeM2)} y2={H - BA}
              stroke="var(--serie-1)" strokeWidth="1.5" strokeDasharray="4 3" />
            {/* Bien SÉPARÉE des graduations : « médiane 10 005 » posée sur
                « 10 000 » rendait les deux illisibles. */}
            <text x={X(medianeM2)} y={H - BA + 11} textAnchor="middle" fontSize="10"
              fontWeight="600" fill="var(--serie-1)">médiane {eur(medianeM2)}</text>
          </>
        )}

        {rangees.map(r => (
          <g key={r.titre}>
            <text x={G - 12} y={r.yT} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--encre)">{r.titre}</text>
            <text x={G - 12} y={r.yS} textAnchor="end" fontSize="9" fill="var(--encre-2)">{r.sous}</text>
            {r.pts.map((d, i) => (
              <circle key={i} className="gp-point" cx={d.cx} cy={d.cy} r={R} fill={r.serie}>
                <title>{d.p.libelle}</title>
              </circle>
            ))}
          </g>
        ))}

        {/* LES DEUX PRIX, en tête : celui qui EST, celui qu'on PROPOSE. */}
        {aBien && etiquette(bienM2!, yBien, `Votre bien · ${eur(bienM2!)} €/m²`, true)}
        {aCible && etiquette(cibleM2!, yCible, `Prix conseillé · ${eur(cibleM2!)} €/m²`, false)}

        {/* LES DEUX PRIX, en tête : celui qui EST, celui qu'on PROPOSE. */}
        {aBien && etiquette(bienM2!, yBien, `Votre bien · ${eur(bienM2!)} €/m²`, true)}
        {aCible && etiquette(cibleM2!, yCible, `Prix conseillé · ${eur(cibleM2!)} €/m²`, false)}

        {/* L'AVIS DE MARCHÉ, en dessous — un crochet, pas une règle verticale.
            Trois traits verticaux se disputeraient la lecture ; et cette valeur
            est un avis, non un acte : elle mérite une forme à part, et une
            place après les deux prix qui portent la discussion. */}
        {reference && (() => {
          const bas = reference.bas ?? reference.m2;
          const haut = reference.haut ?? reference.m2;
          const yC = Y_REF_TRAIT;
          const xB = Math.max(X(bas), G), xH = Math.min(X(haut), L - D);
          return (
            <g>
              <line x1={xB} y1={yC} x2={xH} y2={yC} stroke="var(--encre-2)" strokeWidth="1.5" />
              <line x1={xB} y1={yC - 4} x2={xB} y2={yC + 4} stroke="var(--encre-2)" strokeWidth="1.5" />
              <line x1={xH} y1={yC - 4} x2={xH} y2={yC + 4} stroke="var(--encre-2)" strokeWidth="1.5" />
              <circle cx={X(reference.m2)} cy={yC} r="4" fill="var(--encre-2)" />
              <rect x={Math.min(Math.max(X(reference.m2), G + 70), L - D - 70) - 96} y={Y_REF_TEXTE - 9}
                width="192" height="13" fill="var(--surface)" opacity="0.92" />
              <text x={Math.min(Math.max(X(reference.m2), G + 70), L - D - 70)} y={Y_REF_TEXTE}
                textAnchor="middle" fontSize="10" fill="var(--encre-2)">
                {reference.source ?? 'Référence'} · {eur(reference.m2)} €/m²
                {bas !== haut ? ` (${eur(bas)} – ${eur(haut)})` : ''}
              </text>
            </g>
          );
        })()}

      </svg>

      <figcaption className="text-[11px] mt-1" style={{ color: 'var(--encre-2)' }}>
        <span style={{ color: 'var(--serie-1)' }}>●</span> Ventes signées, source DVF (DGFiP).{' '}
        <span style={{ color: 'var(--serie-2)' }}>●</span> Biens en vente relevés sur les portails.
        {' '}La bande claire couvre la moitié centrale des ventes signées.
        {reference && ` Le crochet, entre les deux rangées, situe l'avis de marché${reference.source ? ` (${reference.source})` : ''}.`}
        {cibleM2 != null && " Le trait discontinu marque le prix conseillé."}
        {horsEchelle > 0 && ` ${horsEchelle} vente${horsEchelle > 1 ? 's' : ''} hors échelle, `
          + `conservée${horsEchelle > 1 ? 's' : ''} dans la médiane.`}
      </figcaption>
    </figure>
  );
}
