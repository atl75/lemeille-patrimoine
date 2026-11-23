"use client";
// Rendu des archives version 3. Toute évolution doit créer une V4,
// et conserver cette version pour les avis déjà figés.
import { CHAMPS_RAPPORT } from "@/lib/rapportComplet";
import { sourceRapport, libelleNatureComparable } from "@/lib/estimationRapport";
import { GROUPES_CARACTERISTIQUES, LIBELLES_CARACTERISTIQUES, descriptionCaracteristique } from "@/lib/caracteristiquesEstimation";
import { useMemo } from "react";
import { surfaceFr } from "@/lib/formatFr";
import { ancienneteAnnonce, m2Retenu, type Comparable } from "@/lib/ajustementPrix";
import type { Ajustement, Resultat, TypeBien } from "@/lib/estimation";
import { parAnnee, type VenteDvf, type StatsDvf } from "@/lib/dvf";

/**
 * L'avis de valeur remis au vendeur.
 *
 * Calqué sur la trame d'un avis de valeur professionnel : présentation du bien,
 * marché du secteur, ventes comparables, concurrence, puis synthèse et net
 * vendeur. La différence tient au chapitre « comment on arrive à ce prix » —
 * chaque correction y est chiffrée, sourcée, et son niveau de preuve annoncé.
 *
 * CE DOCUMENT NE DIT QUE CE QU'IL PEUT PROUVER. Une section sans donnée ne
 * s'affiche pas plutôt que d'afficher un tiret : une trame complète remplie de
 * vides suggère un travail qui n'a pas eu lieu. Et la mention légale de bas de
 * page n'est pas décorative — un avis de valeur n'est pas une expertise, et le
 * document doit le porter écrit.
 */

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
const eurM2 = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €/m²";
const pct = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(1).replace(".", ",") + " %";
const pctCourt = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(0) + " %";

const AGENT = { nom: "Arthur Lemeille", tel: "06 87 15 72 59", mail: "arthur@lemeillepatrimoine.com" };

/**
 * Mensualité d'un prêt, puis revenu net qu'elle suppose au taux d'endettement
 * de 35 %. C'est la traduction la plus parlante d'un prix : elle dit QUI peut
 * acheter, et un vendeur qui vise trop haut découvre ainsi qu'il s'adresse à
 * une population qui n'existe pas dans son quartier.
 */
function revenuRequis(capital: number, tauxAnnuel: number, annees: number): { mensualite: number; revenu: number } | null {
  if (!(capital > 0) || !(tauxAnnuel > 0) || !(annees > 0)) return null;
  const i = tauxAnnuel / 100 / 12;
  const n = annees * 12;
  const mensualite = (capital * i) / (1 - Math.pow(1 + i, -n));
  if (!Number.isFinite(mensualite)) return null;
  return { mensualite, revenu: mensualite / 0.35 };
}

/** Niveau de preuve, dit en clair sous le tableau plutôt qu'en jargon. */
const PREUVE: Record<string, string> = {
  mesuree: "mesuré sur des transactions",
  estimee: "transposé d'une étude",
  usage: "appréciation de l’agent",
};

export default function DocumentEstimationV3({
  estimation: e, resultat, ajustements, dvf, comparables, type,
}: {
  estimation: any;
  resultat: Resultat | null;
  ajustements: Ajustement[];
  dvf: { ventes: VenteDvf[]; stats: StatsDvf | null; adresse: string; precision: string } | null;
  comparables: Comparable[];
  type: TypeBien;
}) {
  const prix = Number(e?.prixRetenu) || (resultat ? Math.round(resultat.valeur / 1000) * 1000 : 0);
  const surface = Number(e?.surface) || 0;

  const honoraires = useMemo(() => {
    const pctH = Number(e?.honorairesPct);
    if (!(prix > 0) || !(pctH > 0)) return null;
    const montant = prix * (pctH / 100);
    const aCharge = e?.honorairesCharge === "VENDEUR" ? "VENDEUR" : "ACQUEREUR";
    return { pct: pctH, montant, aCharge, net: aCharge === "VENDEUR" ? prix - montant : prix };
  }, [prix, e?.honorairesPct, e?.honorairesCharge]);

  const credit = useMemo(
    () => revenuRequis(prix, Number(e?.taux), Number(e?.dureePret) || 25),
    [prix, e?.taux, e?.dureePret],
  );

  const listeForts = String(e?.pointsForts ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const listeFaibles = String(e?.pointsFaibles ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

  const ventes = (dvf?.ventes ?? []).slice(0, 12);
  /** L'historique année par année : c'est la TENDANCE qu'un vendeur relit. */
  const historique = useMemo(() => parAnnee(dvf?.ventes ?? []), [dvf?.ventes]);
  const enVente = comparables.filter((c) => c.statut !== "VENDU" && !c.prixVente);

  return (
    <div className="doc-estimation">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; @bottom-right { content: "Page " counter(page) " / " counter(pages); font-size: 8pt; color: #52514e; } }
          html, body { background: #fff !important; }
          header, nav, footer, .bg-luxe, .no-print, .skip-link { display: none !important; }
          /* Marge de page nulle : c'est le seul moyen de supprimer les en-têtes
             et pieds du navigateur. La réserve est donc portée par les BLOCS,
             sinon elle ne vaudrait que pour la première page. */
          .doc-estimation { padding: 0 !important; max-width: none !important;
                            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .doc-bloc { padding-top: 8mm; break-inside: avoid; }
          .doc-bloc-long { break-inside: auto; padding-top: 8mm; }
          .doc-page { break-before: page; }
          .doc-tableau thead { display: table-header-group; }
          .doc-tableau tr { break-inside: avoid; }
          .doc-estimation h2 { break-after: avoid; }
          .doc-estimation h3 { break-after: avoid; }
          .doc-tableau { font-size: 9.5pt; }
        }
        .doc-estimation { --encre: #1F3B2C; --or: #B89C6D; --encre-2: #52514e; --trait: #d9d7d0;
                          color: #111; background: #fff; max-width: 190mm; margin: 0 auto; }
        .doc-estimation { overflow-wrap: anywhere; }
        .doc-estimation h1 { font-size: 22pt; color: var(--encre); margin: 0 0 4px; letter-spacing: .04em; }
        .doc-estimation h2 { font-size: 12pt; color: var(--encre); margin: 0 0 3px; font-weight: 700; }
        .doc-estimation h3 { font-size: 10pt; color: var(--encre-2); margin: 10px 0 3px; font-weight: 600; }
        .doc-estimation .surtitre { font-size: 8.5pt; letter-spacing: .12em; text-transform: uppercase;
                                    color: var(--or); margin: 0 0 1px; }
        .doc-estimation p, .doc-estimation li, .doc-estimation td, .doc-estimation th { font-size: 9.5pt; line-height: 1.5; }
        .doc-estimation .fin { font-size: 8.5pt; color: var(--encre-2); }
        .doc-tableau { width: 100%; border-collapse: collapse; }
        .doc-tableau th { text-align: left; font-weight: 600; color: var(--encre-2);
                          border-bottom: 1px solid var(--trait); padding: 4px 6px 4px 0; }
        .doc-tableau td { padding: 3px 6px 3px 0; border-bottom: 1px solid #f2f1ec; }
        .doc-tableau .n { text-align: right; font-variant-numeric: tabular-nums; }
        .doc-cartouche { border: 1.5px solid var(--encre); border-radius: 6px; padding: 12px 14px; }
        .doc-filet { border-top: 2px solid var(--or); width: 54px; margin: 8px 0 12px; }
      `}</style>

      {/* ── Couverture ─────────────────────────────────────────────── */}
      <section className="doc-bloc" style={{ paddingTop: 0 }}>
        <p className="surtitre">Avis de valeur</p>
        <h1>{e?.adresse || "Adresse à renseigner"}</h1>
        <div className="doc-filet" />
        <p style={{ margin: 0 }}>
          {type} {e?.pieces ? `${e.pieces} pièces ` : ""}{surface > 0 ? `de ${surfaceFr(surface)}` : ""}
          {e?.terrain ? ` — terrain ${surfaceFr(e.terrain)}` : ""}
        </p>
        <p className="fin" style={{ marginTop: 2 }}>
          {e?.demandeur ? `À la demande de ${e.demandeur}. ` : ""}
          {e.rapportFige ? "Avis figé — établi le " : "APERÇU DU BROUILLON — établi le "}{new Date(e?.majAt ?? e?.createdAt ?? Date.now()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
        <p className="fin" style={{ marginTop: 6 }}>
          {AGENT.nom} · {AGENT.tel} · {AGENT.mail}
        </p>
      </section>

      <section className="doc-bloc" data-testid="rapport-synthese">
        <p className="surtitre">Synthèse de l’avis</p>
        <h2>{e?.titre || 'Estimation de la valeur du bien'}</h2>
        <div className="doc-cartouche">
          <p><b>{prix > 0 ? eur(prix) : 'Valeur non arrêtée'}</b> - {Number(e?.prixRetenu)>0 ? 'valeur retenue par l’agent' : 'valeur centrale arrondie du calcul'}</p>
          {resultat && <p className="fin">Fourchette indicative : {eur(resultat.bas)} à {eur(resultat.haut)}. Ce n’est pas un intervalle de confiance statistique.</p>}
          <p className="fin">Base utilisée : {e.sourceLibelle || sourceRapport(e,dvf,comparables)}.</p>
          <p className="fin">Cette valeur n’est ni une offre d’achat ni un prix de vente garanti. Le prix de commercialisation reste à convenir séparément.</p>
        </div>
      </section>
      <section className="doc-bloc-long">
        <p className="surtitre">Dossier du bien</p><h2>Caractéristiques, documents et vérifications</h2>
        <table className="doc-tableau"><tbody>
          <tr><td>Commune</td><td>{e.ville || 'Non renseignée'}</td></tr>
          <tr><td>Type / surface / pièces</td><td>{type} · {surface > 0 ? surfaceFr(surface) : 'Surface non renseignée'} · {e.pieces || 'Nombre de pièces non renseigné'}</td></tr>
          <tr><td>DPE retenu</td><td>{ajustements.find(a=>a.critere==='dpe')?.modalite || 'Non renseigné'} - diagnostic à vérifier dans les pièces consultées</td></tr>
          <tr><td>État retenu</td><td>{ajustements.find(a=>a.critere==='etat')?.modalite || 'Non renseigné'}</td></tr>
          <tr><td>Visite / observation</td><td>{e.caracteristiques?.visiteLe || 'Date non renseignée'}</td></tr>
        </tbody></table>
        {(['surfaceNature','occupation','documents','travaux'] as const).map(k=><div key={k}><h3>{CHAMPS_RAPPORT[k]}</h3><p style={{whiteSpace:'pre-wrap'}}>{e.rapport?.[k] || 'Non renseigné - à compléter ou vérifier.'}</p></div>)}
      </section>
      <section className="doc-bloc">
        <h2>Périmètre et méthode</h2>
        <p className="fin">La base sélectionnée est ajustée selon les caractéristiques saisies. Les annonces, les ventes déclarées et les données DVF sont distinguées ; elles n’offrent pas le même niveau de preuve. DPE, état intérieur et droits privatifs ne sont pas déduits des seules données DVF.</p>
        <p className="fin">Recherche DVF : rayon demandé {e.dvfRayon || 300} m ; année de départ {e.dvfDepuis || 'non restreinte'} ; surface minimale {e.dvfSurfaceMin || 'non précisée'}, maximale {e.dvfSurfaceMax || 'non précisée'}. Les tolérances du moteur peuvent s’appliquer en l’absence de bornes explicites.</p>
        <p className="fin">Observation DVF enregistrée : {e.dvfObservation?.observedAt || 'non disponible'}. {dvf?.stats ? 'Les références retenues sont détaillées ci-dessous.' : 'Aucune analyse DVF exploitable jointe à cet avis.'}</p>
      </section>

      {/* ── Le bien ────────────────────────────────────────────────── */}
      {(e?.description || listeForts.length > 0 || listeFaibles.length > 0) && (
        <section className="doc-bloc">
          <p className="surtitre">Présentation</p>
          <h2>Le bien</h2>
          {e?.description && <p style={{ whiteSpace: "pre-wrap" }}>{e.description}</p>}
          <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
            {listeForts.length > 0 && (
              <div style={{ flex: 1 }}>
                <h3>Points forts</h3>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {listeForts.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {listeFaibles.length > 0 && (
              <div style={{ flex: 1 }}>
                <h3>Points à défendre</h3>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {listeFaibles.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Le marché du secteur ───────────────────────────────────── */}
      {dvf?.stats && (
        <section className="doc-bloc-long">
          <p className="surtitre">Analyse du secteur</p>
          <h2>Les ventes réellement signées autour du bien</h2>
          <p className="fin">
            Source : demandes de valeurs foncières (DGFiP), publiées sur data.gouv.fr. Ce ne sont ni
            des estimations ni des prix demandés : ce sont des actes.
            {" "}{dvf.ventes.length} ventes retenues autour de {dvf.adresse}
            {dvf.precision !== "housenumber" && " (rue seulement, pas le numéro)"}.
          </p>

          <div style={{ display: "flex", gap: 18, margin: "10px 0" }}>
            {([
              ["Médiane", eurM2(dvf.stats.medianeM2)],
              ["Moitié centrale", `${eurM2(dvf.stats.q1M2)} à ${eurM2(dvf.stats.q3M2)}`],
              ["Ventes retenues", String(dvf.ventes.length)],
            ] as const).map(([k, v]) => (
              <div key={k}>
                <p className="fin" style={{ margin: 0 }}>{k}</p>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "11pt" }}>{v}</p>
              </div>
            ))}
          </div>

          {historique.length > 1 && (
            <>
              <h3>Évolution année par année</h3>
              <p className="fin">Les périodes peuvent être incomplètes et les biens différents d’une année à l’autre. Ces médianes descriptives ne démontrent pas, seules, une évolution à qualité constante.</p>
              <table className="doc-tableau" style={{ marginBottom: 10 }}>
                <thead>
                  <tr><th>Année</th><th className="n">Ventes</th><th className="n">Prix médian</th><th className="n">Pour {surfaceFr(surface)}</th></tr>
                </thead>
                <tbody>
                  {historique.map((a) => (
                    <tr key={a.annee}>
                      <td>{a.annee}</td>
                      <td className="n">{a.nombre}</td>
                      <td className="n">{eurM2(a.medianeM2)}</td>
                      <td className="n">{surface > 0 ? eur(a.medianeM2 * surface) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {ventes.length > 0 && (
            <table className="doc-tableau">
              <thead>
                <tr>
                  <th>Date</th><th>Adresse</th><th className="n">Surface</th>
                  <th className="n">Prix</th><th className="n">€/m²</th><th className="n">Distance</th>
                </tr>
              </thead>
              <tbody>
                {ventes.map((v, i) => (
                  <tr key={i}>
                    <td>{new Date(v.date).toLocaleDateString("fr-FR", { month: "2-digit", year: "2-digit" })}</td>
                    <td>{v.adresse || "—"}</td>
                    <td className="n">{surfaceFr(v.surface)}</td>
                    <td className="n">{eur(v.prix)}</td>
                    <td className="n"><b>{eurM2(v.prixM2)}</b></td>
                    <td className="n">{Math.round(v.distance)} m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {dvf.ventes.length > ventes.length && (
            <p className="fin" style={{ marginTop: 4 }}>
              Les {ventes.length} ventes les plus récentes sont détaillées ; les statistiques
              ci-dessus portent sur les {dvf.ventes.length} retenues.
            </p>
          )}
        </section>
      )}

      {/* ── La concurrence ─────────────────────────────────────────── */}
      {enVente.length > 0 && (
        <section className="doc-bloc-long">
          <p className="surtitre">Analyse du secteur</p>
          <h2>Ce que l’acquéreur voit en même temps que votre bien</h2>
          <table className="doc-tableau">
            <thead>
              <tr>
                <th>Bien</th><th className="n">Surface</th><th className="n">Prix</th>
                <th className="n">€/m²</th><th>En ligne depuis</th>
              </tr>
            </thead>
            <tbody>
              {enVente.map((c) => {
                const m2 = m2Retenu(c);
                return (
                  <tr key={c.id}>
                    <td>{c.titre}{c.ville ? ` · ${c.ville}` : ""}</td>
                    <td className="n">{surfaceFr(c.surface)}</td>
                    <td className="n">{eur(c.prix)}</td>
                    <td className="n">{m2 ? eurM2(m2) : "—"}</td>
                    <td>{ancienneteAnnonce(c.dateParution, new Date(e?.majAt ?? e?.createdAt ?? Date.now())) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {comparables.length > 0 && <section className="doc-bloc-long">
        <p className="surtitre">Références complémentaires</p><h2>Détail et provenance des comparables</h2>
        {comparables.map((c,i)=><div key={c.id}>
          <h3>{i+1}. {c.titre}{c.ville ? ' · '+c.ville : ''}</h3>
          <p>{libelleNatureComparable(c)} · {surfaceFr(c.surface)} · prix affiché {eur(c.prix)}{c.prixVente ? ' · prix de vente déclaré '+eur(c.prixVente) : ''}.</p>
          <p className="fin">DPE : {c.dpe || 'inconnu'} · étage : {c.etage || 'inconnu'} · parution : {c.dateParution || 'date inconnue'}.</p>
          <p className="fin">Source : {c.source || 'non renseignée'}{c.lien ? ' · '+c.lien : ''}</p>
          <p className="fin" style={{whiteSpace:'pre-wrap'}}>Observation : {c.note || 'non renseignée'}</p>
        </div>)}
        <p className="fin">Une vente déclarée reste à documenter. Une annonce n’établit pas le prix signé ; sa durée de publication ne suffit pas à démontrer une surévaluation.</p>
      </section>}

      {/* ── Le calcul ──────────────────────────────────────────────── */}
      {resultat && (
        <section className="doc-bloc-long doc-page">
          <p className="surtitre">Calcul du prix</p>
          <h2>Du prix du secteur au prix de votre bien</h2>
          <p className="fin">
            Le point de départ est la référence au m² sélectionnée par l’agent. Les caractéristiques du bien médian ne sont pas connues dans DVF. Les corrections ci-dessous sont des hypothèses à confirmer par des comparables décrits et la visite.
          </p>

          <table className="doc-tableau" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Critère</th><th>Votre bien</th><th className="n">Effet</th><th>Ce sur quoi ce chiffre repose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2}><b>Prix du secteur</b></td>
                <td className="n"><b>{eurM2(resultat.baseM2)}</b></td>
                <td className="fin">{e.sourceLibelle || sourceRapport(e, dvf, comparables)}</td>
              </tr>
              {ajustements.map((a) => (
                <tr key={a.critere}>
                  <td>{a.libelle}</td>
                  <td>{a.modalite}</td>
                  <td className="n" style={{ color: a.pourcent < 0 ? "#b91c1c" : a.pourcent > 0 ? "#166534" : undefined }}>
                    <b>{a.pourcent === 0 ? "sans effet" : pctCourt(a.pourcent)}</b>
                  </td>
                  <td className="fin">
                    {a.corrige
                      ? `ajusté par l'agent (barème : ${pctCourt(a.pourcentBareme ?? 0)})`
                      : `${PREUVE[a.fiabilite] ?? a.fiabilite} — ${a.source}`}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}><b>Prix au m² retenu</b></td>
                <td className="n"><b>{eurM2(resultat.m2Ajuste)}</b></td>
                <td className="fin">
                  soit {pct(resultat.composition.pourcent)} par rapport au secteur
                  {resultat.composition.plafonne && (
                    <> — plafonné : le cumul brut atteignait {pct(resultat.composition.pourcentBrut)}, un
                    écart nécessitant une revue manuelle (plafond technique, pas une preuve de marché)</>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="fin" style={{ marginTop: 6 }}>
            Les corrections se composent, elles ne s’additionnent pas : deux effets de −10 % font
            −19 %, pas −20 %. Les coefficients restent indicatifs : leur transposition au bien et au secteur doit être vérifiée. La fourchette affichée n’est pas un intervalle de confiance statistique.
          </p>
        </section>
      )}

      {/* ── Synthèse ───────────────────────────────────────────────── */}
      {prix > 0 && (
        <section className="doc-bloc">
          <p className="surtitre">Synthèse</p>
          <h2>Avis de valeur</h2>

          <div className="doc-cartouche" style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: "20pt", fontWeight: 700, color: "var(--encre)" }}>{eur(prix)}</span>
              {resultat && (
                <span className="fin">
                  fourchette indicative du calcul : {eur(resultat.bas)} à {eur(resultat.haut)}
                  {surface > 0 && ` — ${eurM2(prix / surface)}`}
                </span>
              )}
            </div>

            {resultat && Number(e?.prixRetenu) > 0 && (prix < resultat.bas || prix > resultat.haut) && (
              <p className="fin">Le prix retenu manuellement est hors de la fourchette calculée. Il s’agit d’un choix de l’agent, pas d’un résultat du moteur.</p>
            )}
            {honoraires && (
              <table className="doc-tableau" style={{ marginTop: 10 }}>
                <tbody>
                  <tr>
                    <td>
                      Honoraires à la charge {honoraires.aCharge === "VENDEUR" ? "du vendeur" : "de l'acquéreur"}
                      {/* Charge acquéreur : les honoraires s'AJOUTENT au prix affiché, ils
                          ne s'en retranchent pas. Sans cette précision, le vendeur lit une
                          ligne de 7 280 € sous son prix et croit la payer. */}
                      {honoraires.aCharge === "ACQUEREUR" && (
                        <span className="fin"> — en sus du prix ci-dessus</span>
                      )}
                    </td>
                    <td className="n">{honoraires.pct.toFixed(1).replace(".", ",")} %</td>
                    <td className="n">{eur(honoraires.montant)} TTC</td>
                  </tr>
                  <tr>
                    <td><b>Net vendeur</b></td>
                    <td />
                    <td className="n"><b>{eur(honoraires.net)}</b></td>
                  </tr>
                  {honoraires.aCharge === "ACQUEREUR" && (
                    <tr>
                      <td className="fin">Coût total pour l’acquéreur, hors frais de notaire</td>
                      <td />
                      <td className="n fin">{eur(prix + honoraires.montant)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {credit && (
            <>
              <h3>Simulation de financement indicative</h3>
              <p>
                À {Number(e.taux).toFixed(2).replace(".", ",")} % sur {Number(e?.dureePret) || 25} ans,
                ce prix représente une mensualité de <b>{eur(credit.mensualite)}</b>, soit un revenu
                net d’environ <b>{eur(credit.revenu)} par mois</b> pour un taux d’endettement de 35 %,
                hors apport et hors frais de notaire.
              </p>
              <p className="fin">
                Simulation technique hors assurance, frais et examen du dossier bancaire. Elle ne démontre ni la solvabilité d’un acquéreur, ni la valeur du bien, ni son délai de vente.
              </p>
            </>
          )}
        </section>
      )}

      {e.caracteristiques && <section className="doc-bloc">
        <h2>Constats de visite et caractéristiques</h2>
        <p className="fin">Observation : {e.caracteristiques.visiteLe || "date non renseignée"}. Les effets sont appréciés par rapport aux références retenues, pas appliqués automatiquement.</p>
        <table className="doc-tableau"><thead><tr><th>Critère</th><th>Constat</th><th>Justification / références</th></tr></thead>
          <tbody>{GROUPES_CARACTERISTIQUES.filter(g=>g!=='etage' || type==='Appartement').map(g=><tr key={g}>
            <td>{LIBELLES_CARACTERISTIQUES[g]}</td><td>{descriptionCaracteristique(e.caracteristiques,g)}</td>
            <td>{e.caracteristiques.notes?.[g] || 'Non renseignée'}</td>
          </tr>)}</tbody>
        </table>
        {e.caracteristiques.revueCumuls && <p className="fin"><b>Relecture des recouvrements :</b> {e.caracteristiques.revueCumuls}</p>}
      </section>}

      <section className="doc-bloc">
        <p className="surtitre">Conclusion et suites</p><h2>Conclusion de l’agent</h2>
        <p style={{whiteSpace:'pre-wrap'}}>{e.conclusion || 'Conclusion personnalisée non renseignée.'}</p>
        {e.commentaire && <><h3>Commentaire complémentaire</h3><p style={{whiteSpace:'pre-wrap'}}>{e.commentaire}</p></>}
        {(['reserves','strategie'] as const).map(k=><div key={k}><h3>{CHAMPS_RAPPORT[k]}</h3><p style={{whiteSpace:'pre-wrap'}}>{e.rapport?.[k] || 'Non renseigné - à préciser avec le propriétaire.'}</p></div>)}
        <p className="fin">Avant commercialisation : confirmer les pièces et caractéristiques du bien, distinguer travaux énergétiques et état général, convenir du prix et des honoraires, puis des modalités du mandat. Aucune action commerciale n’est déclenchée par ce document.</p>
      </section>

      {/* ── Mentions ───────────────────────────────────────────────── */}
      <section className="doc-bloc">
        <p className="fin" style={{ borderTop: "1px solid var(--trait)", paddingTop: 8 }}>
          Les références effectivement utilisées sont indiquées dans le tableau de calcul.
          Une base manuelle ou un prix affiché ne constitue pas une vente signée.
          Les indicateurs et estimations de cette étude sont communiqués sous l’entière
          responsabilité du professionnel.
        </p>
        <p className="fin" style={{ fontWeight: 600, marginTop: 4 }}>
          « Cet avis de valeur ne constitue pas une expertise immobilière. »
        </p>
        <p className="fin" style={{ marginTop: 6 }}>
          {AGENT.nom} · {AGENT.tel} · {AGENT.mail}
        </p>
      </section>
    </div>
  );
}
