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

'use client';

import { useRef, useState } from 'react';

export type PointGraphique = { m2: number; libelle: string };

const L = 700;
const G = 118, D = 24;
const R = 3.6;                 // rayon d'un point
const COL = R * 2 + 1.4;       // largeur d'une colonne de l'essaim

export default function GraphiquePositionnement({
  bienM2, cibleM2, ventes, enVente, medianeM2, q1M2, q3M2, reference,
  moyenneVentes, moyenneEnVente,
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
  /** Moyennes, affichées à la demande — la médiane reste le repère par défaut. */
  moyenneVentes?: number | null;
  moyenneEnVente?: number | null;
}) {
  // La référence prend sa place EN HAUT, en dehors du nuage : c'est un avis de
  // marché, pas une transaction. La mêler aux points laisserait croire qu'elle
  // a le même statut de preuve que les actes.
  // (mise en page des repères calculée plus bas : elle dépend de X)
  // Les hooks se déclarent AVANT tout retour anticipé — sans quoi leur ordre
  // change d'un rendu à l'autre et React refuse de compiler.
  const svgRef = useRef<SVGSVGElement>(null);
  const [survol, setSurvol] = useState<number | null>(null);
  /* CHAQUE REPÈRE S'ALLUME ET S'ÉTEINT. Les trois qui portent la démonstration
     sont allumés d'emblée ; les deux moyennes attendent qu'on les demande — le
     graphique en porterait cinq d'office, et aucun ne se lirait. */
  const [visibles, setVisibles] = useState<Record<string, boolean>>({
    bien: true, cible: true, mediane: true, moyVentes: false, moyEnVente: false,
  });
  const bascule = (cle: string) => setVisibles(v => ({ ...v, [cle]: !v[cle] }));

  /* ————— Le bas du cadre : une ligne par libellé —————
   * La médiane et la moyenne des ventes se dessinaient à la MÊME hauteur, et la
   * seconde moyenne à trois pixels des graduations : les textes se
   * chevauchaient dès qu'on allumait un repère. Chacun reçoit désormais sa
   * ligne, et la marge basse s'ajuste à ce qui est réellement affiché.
   */
  const montreMediane = medianeM2 != null && visibles.mediane;
  const montreMoyV = moyenneVentes != null && visibles.moyVentes;
  const montreMoyE = moyenneEnVente != null && visibles.moyEnVente;
  let rang = 14;
  const Y_GRAD = rang; rang += 13;
  const Y_MEDIANE = montreMediane ? rang : 0; if (montreMediane) rang += 13;
  const Y_MOY_V = montreMoyV ? rang : 0; if (montreMoyV) rang += 13;
  const Y_MOY_E = montreMoyE ? rang : 0; if (montreMoyE) rang += 13;
  const Y_UNITE = rang + 3;
  const BA = Y_UNITE + 9;

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
  /* L'AVIS DE MARCHÉ ENTRE AUSSI DANS L'ÉCHELLE. Sans lui, une référence
   * au-delà du 98e centile des ventes était tracée hors du cadre : le crochet
   * se réduisait à un trait collé au bord et son point sortait de la zone
   * visible. On croyait l'indicateur absent alors qu'il était hors champ. */
  if (reference) {
    dedans.push(reference.m2);
    if (reference.bas) dedans.push(reference.bas);
    if (reference.haut) dedans.push(reference.haut);
  }
  const b0 = Math.min(...dedans), b1 = Math.max(...dedans);
  const marge = Math.max((b1 - b0) * 0.06, 100);
  const x0 = Math.max(0, b0 - marge), x1 = b1 + marge;
  const horsEchelle = tous.filter(v => v < x0 || v > x1).length;
  const largeur = L - G - D;
  const X = (v: number) => G + ((v - x0) / (x1 - x0)) * largeur;
  const eur = (n: number) => (Math.round(n) === 0 ? 0 : Math.round(n)).toLocaleString('fr-FR');

  /* ————— Le survol : lire une valeur n'importe où sur l'axe —————
   * Un essaim dit la forme, pas la valeur exacte sous le doigt. Le survol
   * comble ce manque : il donne le prix au mètre carré à l'endroit pointé, et
   * la part des ventes signées qui lui sont inférieures — c'est cette part,
   * plus que le prix lui-même, qui se dit devant un vendeur.
   */
  const surviser = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    // Le SVG est mis à l'échelle par sa largeur : on repasse en coordonnées
    // du viewBox avant de convertir en euros.
    const xVue = ((e.clientX - r.left) / r.width) * L;
    if (xVue < G || xVue > L - D) { setSurvol(null); return; }
    setSurvol(x0 + ((xVue - G) / largeur) * (x1 - x0));
  };

  /* ————— Mise en page des repères —————
   * Trois bandes, de haut en bas : les deux PRIX (le bien, puis celui qu'on
   * conseille), ensuite l'avis de marché. Cet ordre n'est pas cosmétique : le
   * document sert à conduire un vendeur d'un prix à un autre, et c'est ce
   * couple qui doit se lire en premier. L'avis extérieur vient l'appuyer.
   */
  const CHIP_W = 172, CHIP_H = 19, Y0 = 12;
  const aBien = bienM2 != null && visibles.bien;
  const aCible = cibleM2 != null && cibleM2 !== bienM2 && visibles.cible;
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
  // Le crochet seul ne demande plus la ligne qu'occupait son libellé : la
  // hauteur totale la rend, au lieu de la laisser en marge morte.
  const H = HA + (reference ? 284 : 274);

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
  // Le crochet SEUL : ses valeurs sont passées en légende. Écrites ici, elles
  // occupaient une ligne entière entre les deux rangées et repoussaient les
  // biens en vente vers le bas pour un chiffre qu'on lit une fois.
  const Y_REF_TRAIT = reference ? BASE_V + 18 : 0;
  const BASE_E = reference ? BASE_V + 32 : HA + 174;  // en vente : empilées vers le bas

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
      // Le libellé se pose SUR la première rangée de points, comme celui des
      // ventes signées. À +14 il flottait quatorze pixels sous ses propres
      // points, et la ligne ne se lisait plus comme un tout.
      pts: essaim(enVente, BASE_E, true, Math.max(H - BA - BASE_E - 14, 10)), yT: BASE_E + 4, yS: BASE_E + 18 },
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
        /* ENFANT DIRECT seulement : sans le « > », la règle s'appliquait aussi
           au crochet miniature de la légende, qui s'affichait en géant. */
        .graphique-positionnement > svg { width: 100%; height: auto; }
        .gp-point { stroke: var(--surface); stroke-width: 1.2; }
        .gp-boutons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
        .gp-boutons button {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid rgba(0,0,0,0.12); border-radius: 999px;
          padding: 3px 10px; font-size: 11px; background: #fff; cursor: pointer;
          color: var(--encre-2); transition: background-color .15s, border-color .15s;
        }
        .gp-boutons button:hover { background: rgba(0,0,0,0.03); }
        .gp-boutons button.actif { border-color: var(--encre); color: var(--encre); font-weight: 600; }
        .gp-boutons .pastille { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      `}</style>

      {/* Chaque repère a son bouton. La pastille reprend sa couleur sur le
          tracé, pour qu'on lie l'un à l'autre sans légende. */}
      <div className="gp-boutons sans-impression">
        {([
          { cle: 'bien', dispo: bienM2 != null, libelle: 'Votre bien', couleur: 'var(--encre)' },
          { cle: 'cible', dispo: cibleM2 != null && cibleM2 !== bienM2, libelle: 'Prix conseillé', couleur: 'var(--encre)', creuse: true },
          { cle: 'mediane', dispo: medianeM2 != null, libelle: 'Médiane des ventes', couleur: 'var(--serie-1)' },
          { cle: 'moyVentes', dispo: moyenneVentes != null, libelle: 'Moyenne des ventes signées', couleur: 'var(--serie-1)' },
          { cle: 'moyEnVente', dispo: moyenneEnVente != null, libelle: 'Moyenne des biens en vente', couleur: 'var(--serie-2)' },
        ] as const).filter(b => b.dispo).map(b => (
          <button key={b.cle} type="button" onClick={() => bascule(b.cle)}
            aria-pressed={!!visibles[b.cle]} data-testid={`repere-${b.cle}`}
            className={visibles[b.cle] ? 'actif' : ''}>
            <span className="pastille" style={{
              background: (b as any).creuse ? 'transparent' : b.couleur,
              border: (b as any).creuse ? `2px solid ${b.couleur}` : undefined,
            }} />
            {b.libelle}
          </button>
        ))}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${L} ${H}`} role="img"
        onMouseMove={surviser} onMouseLeave={() => setSurvol(null)}
        aria-label={`Positionnement du bien à ${bienM2 ? eur(bienM2) : '—'} euros par mètre carré, face à ${ventes.length} ventes signées et ${enVente.length} biens en vente.`}>

        {/* La moitié centrale des ventes signées : le cœur du marché. */}
        {q1M2 != null && q3M2 != null && (
          <rect x={X(q1M2)} y={HA - 6} width={Math.max(X(q3M2) - X(q1M2), 1)}
            height={H - HA - BA + 6} fill="var(--serie-1)" opacity="0.09" />
        )}

        {graduations.map(v => (
          <g key={v}>
            <line x1={X(v)} y1={HA - 6} x2={X(v)} y2={H - BA} stroke="var(--trait)" strokeWidth="1" />
            <text x={X(v)} y={H - BA + Y_GRAD} textAnchor="middle" fontSize="10" fill="var(--encre-2)">{eur(v)}</text>
          </g>
        ))}
        <line x1={G} y1={BASE_V + 3} x2={L - D} y2={BASE_V + 3} stroke="var(--trait)" strokeWidth="1" />
        <text x={(G + L - D) / 2} y={H - BA + Y_UNITE} textAnchor="middle" fontSize="9" fill="var(--encre-2)">
          prix au mètre carré (€)
        </text>

        {medianeM2 != null && visibles.mediane && (
          <>
            <line x1={X(medianeM2)} y1={HA - 6} x2={X(medianeM2)} y2={H - BA}
              stroke="var(--serie-1)" strokeWidth="1.5" strokeDasharray="4 3" />
            {/* Bien SÉPARÉE des graduations : « médiane 10 005 » posée sur
                « 10 000 » rendait les deux illisibles. */}
            <text x={X(medianeM2)} y={H - BA + Y_MEDIANE} textAnchor="middle" fontSize="10"
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
            </g>
          );
        })()}

        {/* LES MOYENNES, à la demande. Couleur de leur série : ce ne sont pas
            de nouvelles catégories, mais le résumé de rangées déjà présentes.
            Étiquettes décalées en hauteur pour ne pas se croiser. */}
        {[
          { on: montreMoyV, v: moyenneVentes, couleur: 'var(--serie-1)', texte: 'moyenne ventes', y: Y_MOY_V },
          { on: montreMoyE, v: moyenneEnVente, couleur: 'var(--serie-2)', texte: 'moyenne en vente', y: Y_MOY_E },
        ].filter(m => m.on && m.v != null && (m.v as number) >= x0 && (m.v as number) <= x1)
         .map(m => (
          <g key={m.texte}>
            <line x1={X(m.v as number)} y1={HA - 6} x2={X(m.v as number)} y2={H - BA}
              stroke={m.couleur} strokeWidth="1.5" strokeDasharray="1 3" />
            <text x={Math.min(Math.max(X(m.v as number), G + 46), L - D - 46)}
              y={H - BA + m.y} textAnchor="middle" fontSize="9" fontWeight="600" fill={m.couleur}>
              {m.texte} {eur(m.v as number)}
            </text>
          </g>
        ))}

        {/* LE SURVOL — dessiné en dernier, il passe au-dessus de tout.
            Ni impression ni trace : c'est un outil de lecture, pas une donnée
            du document. */}
        {survol != null && (() => {
          const x = X(survol);
          const moinsChers = ventes.length
            ? Math.round((ventes.filter(v => v.m2 < survol).length / ventes.length) * 100)
            : null;
          const largeurChip = moinsChers != null ? 176 : 96;
          const cx = Math.min(Math.max(x, largeurChip / 2 + 2), L - largeurChip / 2 - 2);
          const yChip = HA + 2;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <line x1={x} y1={HA - 6} x2={x} y2={H - BA} stroke="var(--encre-2)"
                strokeWidth="1" strokeDasharray="2 2" />
              <rect x={cx - largeurChip / 2} y={yChip} width={largeurChip}
                height={moinsChers != null ? 30 : 18} rx="3"
                fill="var(--surface)" stroke="var(--trait)" strokeWidth="1" />
              <text x={cx} y={yChip + 13} textAnchor="middle" fontSize="11"
                fontWeight="700" fill="var(--encre)">{eur(survol)} €/m²</text>
              {moinsChers != null && (
                <text x={cx} y={yChip + 25} textAnchor="middle" fontSize="9" fill="var(--encre-2)">
                  {moinsChers} % des ventes signées sont en dessous
                </text>
              )}
            </g>
          );
        })()}

      </svg>

      <figcaption className="text-[11px] mt-1" style={{ color: 'var(--encre-2)' }}>
        <span style={{ color: 'var(--serie-1)' }}>●</span> Ventes signées, source DVF (DGFiP).{' '}
        <span style={{ color: 'var(--serie-2)' }}>●</span> Biens en vente relevés sur les portails.
        {' '}La bande claire encadre la moitié des ventes signées :
        un quart se sont vendues moins cher, un quart plus cher.
        {reference && (
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 3 }}>
            {/* Le crochet est redessiné en miniature, DEVANT sa phrase : posé
                dans le fil du texte, il se retrouvait seul en bout de ligne et
                sa légende basculait à la ligne suivante, orpheline. */}
            <svg width="22" height="9" viewBox="0 0 22 9" aria-hidden="true"
              style={{ flex: 'none', marginTop: 4 }}>
              <line x1="1" y1="4.5" x2="21" y2="4.5" stroke="currentColor" strokeWidth="1.4" />
              <line x1="1" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.4" />
              <line x1="21" y1="1" x2="21" y2="8" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="11" cy="4.5" r="3" fill="currentColor" />
            </svg>
            <span>
              {reference.source ?? 'Avis de marché'} · {eur(reference.m2)} €/m²
              {(reference.bas ?? reference.m2) !== (reference.haut ?? reference.m2)
                ? ` (de ${eur(reference.bas as number)} à ${eur(reference.haut as number)})` : ''}
              , entre les deux rangées.
            </span>
          </span>
        )}
        {cibleM2 != null && " Le trait discontinu marque le prix conseillé."}
        {horsEchelle > 0 && ` ${horsEchelle} vente${horsEchelle > 1 ? 's' : ''} hors échelle, `
          + `conservée${horsEchelle > 1 ? 's' : ''} dans la médiane.`}
      </figcaption>
    </figure>
  );
}
