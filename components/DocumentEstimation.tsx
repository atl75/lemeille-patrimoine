"use client";
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
  usage: "usage de la profession",
};

export default function DocumentEstimation({
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
  const enVente = comparables.filter((c) => c.statut !== "VENDU");

  return (
    <div className="doc-estimation">
      <style>{`
        @media print {
          html, body { background: #fff !important; }
          header, nav, footer, .bg-luxe, .no-print { display: none !important; }
          /* Marge de page nulle : c'est le seul moyen de supprimer les en-têtes
             et pieds du navigateur. La réserve est donc portée par les BLOCS,
             sinon elle ne vaudrait que pour la première page. */
          .doc-estimation { padding: 6mm 14mm 12mm !important;
                            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .doc-bloc { padding-top: 8mm; break-inside: avoid; }
          .doc-bloc-long { break-inside: auto; padding-top: 8mm; }
          .doc-page { break-before: page; }
          .doc-tableau thead { display: table-header-group; }
          .doc-tableau tr { break-inside: avoid; }
          .doc-estimation h2 { break-after: avoid; }
          .doc-tableau { font-size: 9.5pt; }
        }
        .doc-estimation { --encre: #1F3B2C; --or: #B89C6D; --encre-2: #52514e; --trait: #d9d7d0;
                          color: #111; background: #fff; max-width: 190mm; margin: 0 auto; }
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
          Établi le {new Date(e?.majAt ?? e?.createdAt ?? Date.now()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
        <p className="fin" style={{ marginTop: 6 }}>
          {AGENT.nom} · {AGENT.tel} · {AGENT.mail}
        </p>
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
                    <td>{ancienneteAnnonce(c.dateParution) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Le calcul ──────────────────────────────────────────────── */}
      {resultat && (
        <section className="doc-bloc-long">
          <p className="surtitre">Calcul du prix</p>
          <h2>Du prix du secteur au prix de votre bien</h2>
          <p className="fin">
            Le point de départ est le prix au m² constaté dans le secteur. Il correspond au bien
            <em> médian</em> : ni le plus beau, ni le plus dégradé. Chaque correction ci-dessous
            situe votre bien par rapport à ce bien médian, et non par rapport à un bien parfait.
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
                <td className="fin">{dvf?.stats ? `médiane de ${dvf.ventes.length} ventes signées` : "relevé de secteur"}</td>
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
                    écart qu’aucune vente observée ne valide</>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="fin" style={{ marginTop: 6 }}>
            Les corrections se composent, elles ne s’additionnent pas : deux effets de −10 % font
            −19 %, pas −20 %. Les écarts d’étiquette énergie sont mesurés par les Notaires de France
            sur plus de 550 000 ventes ; les corrections d’état, de bruit et de luminosité relèvent
            de l’usage de la profession — aucune étude française ne les chiffre, et le tableau le dit
            ligne par ligne.
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
                  fourchette de présentation : {eur(resultat.bas)} à {eur(resultat.haut)}
                  {surface > 0 && ` — ${eurM2(prix / surface)}`}
                </span>
              )}
            </div>

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
              <h3>Qui peut acheter à ce prix</h3>
              <p>
                À {Number(e.taux).toFixed(2).replace(".", ",")} % sur {Number(e?.dureePret) || 25} ans,
                ce prix représente une mensualité de <b>{eur(credit.mensualite)}</b>, soit un revenu
                net d’environ <b>{eur(credit.revenu)} par mois</b> pour un taux d’endettement de 35 %,
                hors apport et hors frais de notaire.
              </p>
              <p className="fin">
                Ce calcul situe le bien par rapport à la population qui peut réellement l’acheter.
                Un prix qui suppose un revenu rare dans le secteur allonge le délai de vente sans
                changer le prix final.
              </p>
            </>
          )}
        </section>
      )}

      {/* ── Mentions ───────────────────────────────────────────────── */}
      <section className="doc-bloc">
        <p className="fin" style={{ borderTop: "1px solid var(--trait)", paddingTop: 8 }}>
          Ce document a été établi à partir des transactions immobilières publiées par la DGFiP
          (demandes de valeurs foncières), des annonces relevées sur le marché du secteur, et des
          coefficients de marché dont la source est indiquée ligne par ligne dans le tableau de
          calcul. Les indicateurs et estimations de cette étude sont communiqués sous l’entière
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
