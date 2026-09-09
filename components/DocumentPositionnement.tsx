/**
 * Le document remis au vendeur.
 *
 * C'est une PIÈCE D'ENTRETIEN, pas un écran d'administration : elle est
 * imprimée et posée sur une table, souvent au moment où l'on demande une
 * baisse de prix. D'où trois partis pris.
 *
 * 1. TROIS SOURCES, DANS L'ORDRE DE LEUR FORCE. Les ventes signées (DVF,
 *    actes déclarés à la DGFiP) d'abord — ce ne sont ni nos estimations ni
 *    celles d'un concurrent. Puis le prix de référence du secteur. Puis les
 *    biens en vente, qui ne disent que des espoirs de vendeurs.
 * 2. AUCUN HABILLAGE DU SITE. Ni bannière, ni navigation, ni pied de page :
 *    le document commence par son propre en-tête et finit par ses sources.
 * 3. CHAQUE CHIFFRE DIT D'OÙ IL VIENT. Un vendeur conteste ce qu'il ne peut
 *    pas retracer ; l'effectif, le rayon et la période figurent partout.
 */

import GraphiquePositionnement, { type PointGraphique } from './GraphiquePositionnement';
import { m2Retenu, ancienneteAnnonce, surfaceFr, type Comparable, type Positionnement } from '@/lib/ajustementPrix';
import type { VenteDvf, StatsDvf } from '@/lib/dvf';
import type { ReferenceM2 } from '@/lib/annonceConcurrente';

const eur = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €';
const eurM2 = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' €/m²';
const pct = (n: number) => (n > 0 ? '+' : '') + n.toFixed(1).replace('.', ',') + ' %';
const jour = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR');
};

export default function DocumentPositionnement({
  bien, position, comparables, dvf, statsDvf, reference, rayonDvf,
  fourchette, impact, fiabilite, commentaire, prixCible, agence = 'Lemeille Patrimoine',
}: {
  bien: { title?: string; address?: string; city?: string; surface?: number | null; price?: number | null; type?: string };
  position: Positionnement | null;
  comparables: Comparable[];
  dvf: VenteDvf[];
  statsDvf: StatsDvf | null;
  reference: ReferenceM2 | null;
  rayonDvf: number;
  fourchette: { bas: number; haut: number } | null;
  impact: { netActuel: number; netNouveau: number; perte: number; honoraires: number } | null;
  fiabilite: 'faible' | 'moyenne' | 'bonne' | null;
  commentaire?: string;
  /** Le prix que l'agent a décidé de conseiller. Il prime sur tout calcul. */
  prixCible?: number | null;
  agence?: string;
}) {
  const bienM2 = position?.prixM2Bien ?? null;

  const pointsVentes: PointGraphique[] = dvf.map(v => ({
    m2: v.prixM2,
    libelle: `${jour(v.date)} · ${v.type} ${surfaceFr(v.surface)} · ${eur(v.prix)} · ${Math.round(v.distance)} m`,
  }));
  const pointsEnVente: PointGraphique[] = comparables
    .map(c => ({ c, m: m2Retenu(c) }))
    .filter((x): x is { c: Comparable; m: number } => x.m !== null)
    .map(({ c, m }) => ({ m2: m, libelle: `${c.titre} · ${surfaceFr(c.surface)} · ${eur(c.prix)}` }));

  return (
    <div className="doc-positionnement">
      <style>{`
        /* L'impression : format A4, marges à ZÉRO.
           Chrome dessine ses en-têtes — URL, date, numéro de page — DANS la
           marge de page. Une marge nulle les supprime donc, et le document
           reprend la main avec sa propre réserve. Safari est moins docile :
           il peut rester une case « en-têtes et pieds de page » à décocher. */
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          /* Aucun habillage du site sur un document remis à un client. */
          header, nav, footer, .bg-luxe, .sans-impression { display: none !important; }
          .doc-positionnement { padding: 14mm 14mm 10mm !important; }
          .doc-bloc { break-inside: avoid; }
          .doc-tableau { font-size: 9.5pt; }
        }
        .doc-positionnement { --encre: #1F3B2C; --encre-2: #52514e; --trait: #d9d7d0; color: #111; }
        .doc-positionnement h2 { font-size: 12pt; color: var(--encre); margin: 0 0 2px; font-weight: 700; }
        .doc-positionnement .doc-source { font-size: 8.5pt; color: var(--encre-2); }
        .doc-positionnement table { width: 100%; border-collapse: collapse; }
        .doc-positionnement th { text-align: left; font-weight: 600; font-size: 9pt;
          color: var(--encre-2); border-bottom: 1px solid var(--trait); padding: 4px 6px 4px 0; }
        .doc-positionnement td { padding: 3px 6px 3px 0; border-bottom: 1px solid #f0efe9; font-size: 9.5pt; }
        .doc-positionnement .num { text-align: right; font-variant-numeric: tabular-nums; }
      `}</style>

      {/* ————— En-tête du document ————— */}
      <div className="doc-bloc" style={{ borderBottom: '2px solid var(--encre)', paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
          <div style={{ fontSize: '13pt', fontWeight: 700, color: 'var(--encre)', letterSpacing: '0.02em' }}>{agence}</div>
          <div className="doc-source">Document établi le {new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        <h1 style={{ fontSize: '19pt', margin: '10px 0 4px', color: 'var(--encre)', fontWeight: 700 }}>
          Positionnement du prix
        </h1>
        <div style={{ fontSize: '10.5pt', color: 'var(--encre-2)' }}>
          {bien.title}
          {bien.address ? ` — ${bien.address}` : ''}{bien.city ? `, ${bien.city}` : ''}
          {bien.surface ? ` · ${surfaceFr(bien.surface)}` : ''}
          {bien.price ? ` · affiché ${eur(bien.price)}` : ''}
        </div>
      </div>

      {/* ————— Le constat ————— */}
      {position && (
        <div className="doc-bloc" style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center' }}>
            <Chiffre valeur={eurM2(position.prixM2Bien)} legende="Votre bien" fort />
            <Chiffre valeur={statsDvf ? eurM2(statsDvf.medianeM2) : eurM2(position.stats.medianeM2)}
              legende={statsDvf ? `Médiane des ${statsDvf.nombre} ventes signées` : `Médiane des ${position.stats.nombre} biens comparables`} />
            <Chiffre valeur={pct(ecartAuMarche(position, statsDvf))} legende="Écart au marché"
              couleur={ecartAuMarche(position, statsDvf) > 0 ? '#a11' : '#161'} />
            {dvf.length > 0
              ? <Chiffre
                  valeur={Math.round((dvf.filter(v => v.prixM2 < position.prixM2Bien).length / dvf.length) * 100) + ' %'}
                  legende="des ventes signées sont moins chères" />
              : <Chiffre valeur={String(position.moinsChers)} legende="Biens moins chers au m²" />}
          </div>
        </div>
      )}

      {/* ————— Le graphique ————— */}
      {(pointsVentes.length > 0 || pointsEnVente.length > 0) && (
        <div className="doc-bloc" style={{ marginBottom: 18 }}>
          <h2>Où se situe votre bien</h2>
          <GraphiquePositionnement
            bienM2={bienM2}
            ventes={pointsVentes}
            enVente={pointsEnVente}
            medianeM2={statsDvf?.medianeM2 ?? null}
            q1M2={statsDvf?.q1M2 ?? null}
            q3M2={statsDvf?.q3M2 ?? null}
            reference={reference}
          />
        </div>
      )}

      {/* ————— 1. Les ventes signées ————— */}
      {statsDvf && dvf.length > 0 && (
        <div className="doc-bloc" style={{ marginBottom: 18 }}>
          <h2>Ce qui s&apos;est réellement vendu autour</h2>
          <p className="doc-source" style={{ margin: '0 0 6px' }}>
            {statsDvf.nombre} ventes dans un rayon de {rayonDvf} m, dernière le {jour(statsDvf.derniereVente)}.
            {' '}Médiane {eurM2(statsDvf.medianeM2)}, moitié centrale de {eurM2(statsDvf.q1M2)} à {eurM2(statsDvf.q3M2)}.
            {' '}Source : demandes de valeurs foncières (DGFiP) — prix réellement signés chez le notaire.
          </p>
          <table className="doc-tableau">
            <thead>
              <tr>
                <th>Date</th><th>Adresse</th><th>Type</th>
                <th className="num">Surface</th><th className="num">Prix</th><th className="num">€/m²</th><th className="num">Distance</th>
              </tr>
            </thead>
            <tbody>
              {dvf.slice(0, 12).map(v => (
                <tr key={v.id + v.adresse + v.date}>
                  <td>{jour(v.date)}</td>
                  <td>{v.adresse || '—'}</td>
                  <td>{v.type}{v.pieces ? ` ${v.pieces}p` : ''}</td>
                  <td className="num">{surfaceFr(v.surface)}</td>
                  <td className="num">{eur(v.prix)}</td>
                  <td className="num"><strong>{eurM2(v.prixM2)}</strong></td>
                  <td className="num">{Math.round(v.distance)} m</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dvf.length > 12 && (
            <p className="doc-source" style={{ marginTop: 4 }}>
              Les 12 ventes les plus récentes sont détaillées ; les {statsDvf.nombre} sont prises en compte dans la médiane et le graphique.
            </p>
          )}
        </div>
      )}

      {/* ————— 2. Le prix de référence du secteur ————— */}
      {reference && (
        <div className="doc-bloc" style={{ marginBottom: 18 }}>
          <h2>Prix de référence du secteur</h2>
          <p style={{ margin: '2px 0', fontSize: '10.5pt' }}>
            <strong style={{ fontSize: '13pt', color: 'var(--encre)' }}>{eurM2(reference.m2)}</strong>
            {reference.bas && reference.haut && reference.bas !== reference.haut
              ? <span style={{ color: 'var(--encre-2)' }}> — fourchette de {eurM2(reference.bas)} à {eurM2(reference.haut)}</span>
              : null}
          </p>
          <p className="doc-source" style={{ margin: 0 }}>
            {reference.source ? `Source : ${reference.source}. ` : ''}
            Relevé à l&apos;adresse du bien{bien.address ? ` (${bien.address})` : ''}.
          </p>
        </div>
      )}

      {/* ————— 3. Les biens en vente ————— */}
      {comparables.length > 0 && (
        <div className="doc-bloc" style={{ marginBottom: 18 }}>
          <h2>Ce qui est en vente aujourd&apos;hui</h2>
          <p className="doc-source" style={{ margin: '0 0 6px' }}>
            {comparables.length} biens relevés sur les portails. Ce sont des prix DEMANDÉS : ils
            disent ce que les vendeurs espèrent, pas ce que les acquéreurs signent.
            {/* L'ancienneté N'EST PAS UN DÉTAIL D'ARCHIVAGE. Un bien affiché depuis
                des mois au même prix démontre à lui seul que ce prix ne trouve
                pas preneur — souvent l'argument qui porte le plus. */}
            {(() => {
              const anciens = comparables.filter(c => {
                if (!c.dateParution || c.statut === 'VENDU') return false;
                const j = (Date.now() - new Date(c.dateParution).getTime()) / 86400000;
                return j >= 90;
              }).length;
              return anciens > 0
                ? ` ${anciens} d'entre eux ${anciens > 1 ? 'sont affichés' : 'est affiché'} depuis plus de trois mois sans trouver preneur.`
                : '';
            })()}
          </p>
          <table className="doc-tableau">
            <thead>
              <tr>
                <th>Bien</th><th>Ville</th><th className="num">Surface</th>
                <th className="num">Étage</th><th className="num">DPE</th>
                <th className="num">Prix</th><th className="num">€/m²</th>
                <th className="num">En ligne</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {comparables.map(c => {
                const m = m2Retenu(c);
                return (
                  <tr key={c.id}>
                    <td>{c.titre}</td>
                    <td>{c.ville || '—'}</td>
                    <td className="num">{surfaceFr(c.surface)}</td>
                    <td className="num">{c.etage ?? '—'}</td>
                    <td className="num">{c.dpe ?? '—'}</td>
                    <td className="num">{eur(c.prixVente ?? c.prix)}</td>
                    <td className="num"><strong>{m ? eurM2(m) : '—'}</strong></td>
                    <td className="num">{ancienneteAnnonce(c.dateParution) ?? '—'}</td>
                    <td>{c.statut === 'VENDU' ? 'vendu' : 'en vente'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ————— La recommandation ————— */}
      {(fourchette || impact || prixCible) && (
        <div className="doc-bloc" style={{
          marginBottom: 14, border: '1px solid var(--encre)', borderRadius: 4, padding: '10px 12px',
        }}>
          <h2>Ce que nous recommandons</h2>
          {/* LE PRIX DÉCIDÉ PAR L'AGENT PASSE DEVANT. Le calcul ne fait que le
              justifier : c'est lui qui connaît le bien, le vendeur et le
              moment. Auparavant ce prix était saisi et n'apparaissait nulle
              part dans le document — la page l'ignorait purement. */}
          {prixCible ? (
            <>
              <p style={{ margin: '4px 0', fontSize: '13pt' }}>
                Prix de mise en marché conseillé : <strong style={{ color: 'var(--encre)' }}>{eur(prixCible)}</strong>
                {bien.surface ? <span style={{ color: 'var(--encre-2)', fontSize: '10.5pt' }}>
                  {' '}— soit {eurM2(prixCible / Number(bien.surface))}</span> : null}
              </p>
              {fourchette && (
                <p style={{ margin: '2px 0', fontSize: '10pt', color: 'var(--encre-2)' }}>
                  Le marché constaté situe ce bien entre {eur(fourchette.bas)} et {eur(fourchette.haut)}.
                </p>
              )}
            </>
          ) : fourchette ? (
            <p style={{ margin: '4px 0', fontSize: '11pt' }}>
              Un prix compris entre <strong>{eur(fourchette.bas)}</strong> et <strong>{eur(fourchette.haut)}</strong> place
              le bien dans le marché constaté.
            </p>
          ) : null}
          {impact && impact.perte > 0 && (
            <p style={{ margin: '4px 0', fontSize: '10.5pt', color: 'var(--encre-2)' }}>
              Sur votre net vendeur, l&apos;ajustement représente {eur(impact.perte)} :
              de {eur(impact.netActuel)} à {eur(impact.netNouveau)}.
            </p>
          )}
          {commentaire && (
            <p style={{ margin: '6px 0 0', fontSize: '10.5pt', whiteSpace: 'pre-wrap' }}>{commentaire}</p>
          )}
        </div>
      )}

      {/* ————— Pied du document : les sources, et leurs limites ————— */}
      <div className="doc-source doc-bloc" style={{ borderTop: '1px solid var(--trait)', paddingTop: 8, lineHeight: 1.5 }}>
        Sources : demandes de valeurs foncières publiées par la direction générale des finances
        publiques (licence ouverte), relevés d&apos;annonces sur les portails immobiliers
        {reference?.source ? `, ${reference.source}` : ''}.
        {fiabilite === 'faible' && ' Le nombre de biens comparables reste faible : ces repères sont indicatifs.'}
        {' '}Les ventes signées sont publiées avec plusieurs mois de décalage. Ce document
        constitue un avis de valeur et non une expertise au sens réglementaire.
        {' '}{agence}.
      </div>
    </div>
  );
}

/** L'écart se mesure d'abord contre les VENTES SIGNÉES, quand on en a. */
function ecartAuMarche(p: Positionnement, s: StatsDvf | null): number {
  const ref = s?.medianeM2 ?? p.stats.medianeM2;
  return ((p.prixM2Bien - ref) / ref) * 100;
}

function Chiffre({ valeur, legende, fort, couleur }: {
  valeur: string; legende: string; fort?: boolean; couleur?: string;
}) {
  return (
    <div>
      <div style={{
        fontSize: fort ? '16pt' : '15pt', fontWeight: 700,
        color: couleur ?? (fort ? '#1F3B2C' : '#111'),
      }}>{valeur}</div>
      <div style={{ fontSize: '8.5pt', color: '#52514e', marginTop: 2 }}>{legende}</div>
    </div>
  );
}
