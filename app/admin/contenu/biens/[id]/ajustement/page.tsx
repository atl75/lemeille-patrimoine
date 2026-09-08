"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/Toast";
import { propertyLabel } from "@/lib/propertyLabel";
import type { Bien } from "@/lib/typesBien";
import {
  positionner, fourchetteConseillee, impactNetVendeur, fiabilite,
  comparablesDuPortefeuille, prixM2, m2Retenu, type Comparable,
} from "@/lib/ajustementPrix";

/**
 * Argumentaire de baisse de prix, à montrer au vendeur.
 *
 * Deux modes sur la même page. « Préparer » sert à choisir les concurrents et
 * à essayer un prix ; « Présenter » enlève tous les réglages pour ne laisser
 * que la démonstration — c'est l'écran que le vendeur regarde, et c'est aussi
 * ce qui s'imprime.
 *
 * Le parti pris est de ne rien affirmer que les chiffres ne portent : l'effectif
 * des comparables est toujours visible, et une base trop mince est annoncée
 * comme telle plutôt que présentée comme « le marché ».
 */

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
const eurM2 = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €/m²";
const pct = (n: number) => (n > 0 ? "+" : "") + n.toFixed(1).replace(".", ",") + " %";

const COMPARABLE_VIERGE = { titre: "", ville: "", prix: "", surface: "", prixVente: "", source: "SeLoger", lien: "" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [bien, setBien] = useState<Bien | null>(null);
  const [tous, setTous] = useState<any[]>([]);
  const [etat, setEtat] = useState<"chargement" | "ok" | "introuvable">("chargement");
  const [mode, setMode] = useState<"preparer" | "presenter">("preparer");

  const [comparables, setComparables] = useState<Comparable[]>([]);
  const [prixCible, setPrixCible] = useState<string>("");
  const [dateMiseEnVente, setDateMiseEnVente] = useState<string>("");
  const [commentaire, setCommentaire] = useState<string>("");
  const [saisie, setSaisie] = useState({ ...COMPARABLE_VIERGE });
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    let annule = false;
    fetch("/api/properties")
      .then(r => r.json())
      .then((d: any[]) => {
        if (annule) return;
        const liste = Array.isArray(d) ? d : [];
        setTous(liste);
        const b = liste.find((p: any) => String(p.id) === String(id));
        if (!b) { setEtat("introuvable"); return; }
        setBien(b);
        const a = b.ajustementPrix || {};
        setComparables(Array.isArray(a.comparables) ? a.comparables : []);
        setPrixCible(a.prixCible ? String(a.prixCible) : "");
        setDateMiseEnVente(a.dateMiseEnVente || "");
        setCommentaire(a.commentaire || "");
        setEtat("ok");
      })
      .catch(() => { if (!annule) setEtat("introuvable"); });
    return () => { annule = true; };
  }, [id]);

  // Concurrents du portefeuille non encore retenus : proposés, jamais imposés.
  const suggestions = useMemo(() => {
    if (!bien) return [];
    const dejaLa = new Set(comparables.map(c => c.id));
    return comparablesDuPortefeuille(bien, tous).filter(c => !dejaLa.has(c.id));
  }, [bien, tous, comparables]);

  const pos = useMemo(() => bien ? positionner(bien, comparables) : null, [bien, comparables]);
  const fourchette = useMemo(() => bien ? fourchetteConseillee(bien, comparables) : null, [bien, comparables]);
  const cible = Number(prixCible) || null;
  const impact = useMemo(() => (bien && cible ? impactNetVendeur(bien, cible) : null), [bien, cible]);
  const confiance = fiabilite(pos?.stats ?? null);

  const joursEnVente = useMemo(() => {
    if (!dateMiseEnVente) return null;
    const d = new Date(dateMiseEnVente).getTime();
    if (!Number.isFinite(d)) return null;
    return Math.max(0, Math.round((Date.now() - d) / 86400000));
  }, [dateMiseEnVente]);

  const ajouterSaisie = () => {
    const prix = Number(saisie.prix), surface = Number(saisie.surface);
    if (!saisie.titre.trim() || !(prix > 0) || !(surface > 0)) {
      toast("Il faut au moins un intitulé, un prix et une surface.");
      return;
    }
    setComparables(cs => [...cs, {
      id: `CMP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      titre: saisie.titre.trim(),
      ville: saisie.ville.trim() || undefined,
      prix, surface,
      prixVente: Number(saisie.prixVente) || undefined,
      statut: Number(saisie.prixVente) > 0 ? "VENDU" : "EN_VENTE",
      source: saisie.source.trim() || undefined,
      lien: saisie.lien.trim() || undefined,
    }]);
    setSaisie({ ...COMPARABLE_VIERGE });
  };

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      const r = await fetch(`/api/properties/${id}/ajustement`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comparables, prixCible: cible, dateMiseEnVente, commentaire }),
      });
      toast(r.ok ? "Argumentaire enregistré." : "Erreur lors de l'enregistrement.");
    } catch {
      toast("Erreur lors de l'enregistrement.");
    } finally {
      setEnregistrement(false);
    }
  };

  if (etat === "chargement") return <AdminShell title="Ajustement de prix"><div className="card p-6 opacity-70">Chargement…</div></AdminShell>;
  if (etat === "introuvable" || !bien) return <AdminShell title="Ajustement de prix"><div className="card p-6">Bien introuvable. <Link className="underline" href="/admin/contenu/biens">Retour à la liste</Link></div></AdminShell>;

  const m2Bien = prixM2(bien.price, bien.surface);
  const presentation = mode === "presenter";

  return (
    <AdminShell title="Argumentaire de prix">
      <style>{`@media print { .sans-impression { display: none !important; } .card { break-inside: avoid; } }`}</style>

      <div className="sans-impression">
        <Breadcrumb items={[{ label: "Administration", href: "/admin" }, { label: "Biens", href: "/admin/contenu/biens" }, { label: propertyLabel(bien), href: `/admin/contenu/biens/${id}` }, { label: "Ajustement de prix" }]} />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="luxe text-2xl mb-1">Positionnement du prix</h1>
          {/* propertyLabel porte déjà typologie, surface, ville et prix : le
              répéter ici donnait « 100 m² · 400 000 € » deux fois de suite. */}
          <p className="text-sm opacity-75">
            {bien.title}
            <span className="opacity-80"> — {propertyLabel(bien)}</span>
            {m2Bien ? <strong> · {eurM2(m2Bien)}</strong> : null}
          </p>
        </div>
        <div className="flex gap-2 sans-impression">
          <div className="inline-flex rounded-lg border overflow-hidden">
            {(["preparer", "presenter"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`px-3 py-1.5 text-sm ${mode === m ? "bg-[#1F3B2C] text-white" : "hover:bg-black/[0.04]"}`}
                data-testid={`mode-${m}`}>
                {m === "preparer" ? "Préparer" : "Présenter"}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} className="btn text-sm" data-testid="imprimer">Imprimer</button>
          <button onClick={enregistrer} disabled={enregistrement} className="btn-luxe text-sm disabled:opacity-50" data-testid="enregistrer">
            {enregistrement ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* ————— Le constat ————— */}
      {pos ? (
        <div className="card p-5 mb-4">
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-[#1F3B2C]">{eurM2(pos.prixM2Bien)}</div>
              <div className="text-xs opacity-70 mt-1">Votre bien</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{eurM2(pos.stats.medianeM2)}</div>
              <div className="text-xs opacity-70 mt-1">Médiane des {pos.stats.nombre} biens comparables</div>
            </div>
            <div>
              <div className={`text-2xl font-semibold ${pos.ecartPourcent > 0 ? "text-red-700" : "text-green-700"}`}>{pct(pos.ecartPourcent)}</div>
              <div className="text-xs opacity-70 mt-1">Écart au marché comparable</div>
            </div>
            <div>
              <div className={`text-2xl font-semibold ${pos.ecartEuros > 0 ? "text-red-700" : "text-green-700"}`}>{eur(Math.abs(pos.ecartEuros))}</div>
              <div className="text-xs opacity-70 mt-1">{pos.ecartEuros > 0 ? "Au-dessus" : "En dessous"} du prix aligné</div>
            </div>
          </div>

          <p className="text-sm mt-4 leading-relaxed">
            {pos.moinsChers > 0 ? (
              <>Sur les {pos.stats.nombre} biens retenus, <strong>{pos.moinsChers}</strong> {pos.moinsChers > 1 ? "sont" : "est"} moins {pos.moinsChers > 1 ? "chers" : "cher"} au mètre carré.
              Un acquéreur qui compare les voit avant celui-ci.</>
            ) : (
              <>Aucun des {pos.stats.nombre} biens retenus n&apos;est moins cher au mètre carré : le prix est déjà bien placé.</>
            )}
            {" "}Aligné sur la médiane, le bien serait affiché à <strong>{eur(pos.prixAligne)}</strong>.
          </p>

          {confiance === "faible" && (
            <p className="text-xs mt-3 p-2 rounded bg-amber-50 border border-amber-200">
              ⚠️ Base étroite : {pos.stats.nombre} comparable{pos.stats.nombre > 1 ? "s" : ""}. À présenter comme un éclairage, pas comme une mesure du marché.
            </p>
          )}
          {pos.stats.nombreVendus > 0 && (
            <p className="text-xs mt-2 opacity-75">
              Dont {pos.stats.nombreVendus} bien{pos.stats.nombreVendus > 1 ? "s" : ""} déjà vendu{pos.stats.nombreVendus > 1 ? "s" : ""} : ce sont des prix réellement acceptés, pas des prix espérés.
            </p>
          )}
        </div>
      ) : (
        <div className="card p-5 mb-4 text-sm opacity-75">
          Ajoutez au moins un bien concurrent, avec son prix et sa surface, pour obtenir le positionnement.
        </div>
      )}

      {/* ————— Fourchette et prix visé ————— */}
      {(fourchette || cible) && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-sm mb-3 text-[#1F3B2C]">Prix de mise en marché conseillé</h2>
          {fourchette && (
            <p className="text-sm mb-3">
              Entre <strong>{eur(fourchette.bas)}</strong> et <strong>{eur(fourchette.haut)}</strong>.
              <span className="opacity-75"> La borne haute aligne le bien sur la médiane ; la borne basse le place devant la moitié de ses concurrents.</span>
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm sans-impression">
              <span className="block text-xs font-medium mb-1">Prix visé</span>
              <input type="number" value={prixCible} onChange={e => setPrixCible(e.target.value)}
                className="input text-sm w-40" placeholder="Ex. 265000" data-testid="prix-cible" />
            </label>
            {impact && cible && (
              <div className="text-sm">
                <div>Affiché : <strong>{eur(cible)}</strong>{m2Bien && bien.surface ? <span className="opacity-75"> · {eurM2(cible / Number(bien.surface))}</span> : null}</div>
                <div className="mt-1">
                  Net vendeur : <strong>{eur(impact.netNouveau)}</strong>
                  <span className="opacity-75"> au lieu de {eur(impact.netActuel)}, soit {eur(impact.perte)} de moins</span>
                  {impact.honoraires > 0 && <span className="opacity-75"> — honoraires inchangés à {eur(impact.honoraires)}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ————— Les concurrents ————— */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-sm mb-3 text-[#1F3B2C]">
          Biens concurrents retenus {comparables.length > 0 && <span className="font-normal opacity-75">({comparables.length})</span>}
        </h2>
        {comparables.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1.5 pr-2">Bien</th>
                  <th className="py-1.5 pr-2 text-right">Surface</th>
                  <th className="py-1.5 pr-2 text-right">Prix</th>
                  <th className="py-1.5 pr-2 text-right">€/m²</th>
                  <th className="py-1.5 pr-2">État</th>
                  {!presentation && <th className="py-1.5 sans-impression"></th>}
                </tr>
              </thead>
              <tbody>
                {[...comparables].sort((a, b) => (m2Retenu(a) ?? 0) - (m2Retenu(b) ?? 0)).map((c, i) => {
                  const m = m2Retenu(c);
                  const plusCher = m !== null && pos !== null && m > pos.prixM2Bien;
                  return (
                    <tr key={c.id} className={i % 2 ? "bg-black/[0.02]" : ""} data-testid={`comparable-${c.id}`}>
                      <td className="py-1.5 pr-2">
                        {c.lien ? <a href={c.lien} target="_blank" rel="noopener noreferrer" className="underline">{c.titre}</a> : c.titre}
                        {c.ville && <span className="opacity-70"> · {c.ville}</span>}
                        {c.source && <span className="text-xs opacity-60"> ({c.source})</span>}
                      </td>
                      <td className="py-1.5 pr-2 text-right whitespace-nowrap">{c.surface} m²</td>
                      <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                        {c.prixVente ? <><span className="line-through opacity-50">{eur(c.prix)}</span> {eur(c.prixVente)}</> : eur(c.prix)}
                      </td>
                      <td className={`py-1.5 pr-2 text-right whitespace-nowrap font-medium ${plusCher ? "" : "text-red-700"}`}>{m !== null ? eurM2(m) : "—"}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap text-xs">{c.statut === "VENDU" ? "✅ Vendu" : "En vente"}</td>
                      {!presentation && (
                        <td className="py-1.5 text-right sans-impression">
                          <button onClick={() => setComparables(cs => cs.filter(x => x.id !== c.id))}
                            className="text-xs opacity-50 hover:opacity-100" title="Retirer" data-testid={`retirer-${c.id}`}>✕</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm opacity-75 italic">Aucun bien concurrent pour l&apos;instant.</p>}
      </div>

      {/* ————— Outils de préparation ————— */}
      {!presentation && (
        <>
          {suggestions.length > 0 && (
            <div className="card p-5 mb-4 sans-impression">
              <h2 className="font-semibold text-sm mb-1 text-[#1F3B2C]">Depuis votre portefeuille</h2>
              <p className="text-xs opacity-70 mb-3">Même type, même ville, surface à ±30 %. À vous de retenir ce qui est réellement comparable.</p>
              <div className="space-y-1">
                {suggestions.map(s => {
                  const m = m2Retenu(s);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 text-sm py-1">
                      <span className="truncate">{s.titre} <span className="opacity-70">· {s.surface} m² · {eur(s.prix)}{m ? ` · ${eurM2(m)}` : ""}</span>
                        {s.statut === "VENDU" && <span className="text-xs"> ✅ vendu</span>}</span>
                      <button onClick={() => setComparables(cs => [...cs, s])} className="btn text-xs shrink-0" data-testid={`ajouter-${s.id}`}>Ajouter</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card p-5 mb-4 sans-impression">
            <h2 className="font-semibold text-sm mb-1 text-[#1F3B2C]">Ajouter un bien vu ailleurs</h2>
            <p className="text-xs opacity-70 mb-3">Une annonce SeLoger, LeBonCoin, une vitrine concurrente. Renseignez le prix de vente si le bien est déjà parti : c&apos;est l&apos;argument le plus solide.</p>
            <div className="grid md:grid-cols-3 gap-3">
              <input className="input text-sm md:col-span-2" placeholder="Intitulé (ex. T3 avec balcon, rue Jeanne d'Arc)" value={saisie.titre} onChange={e => setSaisie({ ...saisie, titre: e.target.value })} data-testid="saisie-titre" />
              <input className="input text-sm" placeholder="Ville" value={saisie.ville} onChange={e => setSaisie({ ...saisie, ville: e.target.value })} data-testid="saisie-ville" />
              <input className="input text-sm" type="number" placeholder="Prix affiché (€)" value={saisie.prix} onChange={e => setSaisie({ ...saisie, prix: e.target.value })} data-testid="saisie-prix" />
              <input className="input text-sm" type="number" placeholder="Surface (m²)" value={saisie.surface} onChange={e => setSaisie({ ...saisie, surface: e.target.value })} data-testid="saisie-surface" />
              <input className="input text-sm" type="number" placeholder="Prix de vente si vendu (€)" value={saisie.prixVente} onChange={e => setSaisie({ ...saisie, prixVente: e.target.value })} data-testid="saisie-prix-vente" />
              <input className="input text-sm" placeholder="Source" value={saisie.source} onChange={e => setSaisie({ ...saisie, source: e.target.value })} data-testid="saisie-source" />
              <input className="input text-sm md:col-span-2" placeholder="Lien vers l'annonce (facultatif)" value={saisie.lien} onChange={e => setSaisie({ ...saisie, lien: e.target.value })} data-testid="saisie-lien" />
            </div>
            <button onClick={ajouterSaisie} className="btn-luxe text-sm px-3 py-1 mt-3" data-testid="saisie-ajouter">Ajouter ce bien</button>
          </div>

          <div className="card p-5 mb-4 sans-impression">
            <h2 className="font-semibold text-sm mb-3 text-[#1F3B2C]">Contexte de l&apos;entretien</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="block text-xs font-medium mb-1">En vente depuis le</span>
                <input type="date" className="input text-sm" value={dateMiseEnVente} onChange={e => setDateMiseEnVente(e.target.value)} data-testid="date-mise-en-vente" />
                <span className="block text-xs opacity-60 mt-1">La date n&apos;est pas enregistrée avec le bien : elle se saisit ici.</span>
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium mb-1">Note pour l&apos;entretien</span>
                <textarea rows={3} className="input text-sm w-full" value={commentaire} onChange={e => setCommentaire(e.target.value)}
                  placeholder="Ex. deux visites en six semaines, aucune offre." data-testid="commentaire" />
              </label>
            </div>
          </div>
        </>
      )}

      {/* ————— Ce que le vendeur lit ————— */}
      {(joursEnVente !== null || commentaire) && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-2 text-[#1F3B2C]">Où en est la commercialisation</h2>
          {joursEnVente !== null && (
            <p className="text-sm">En vente depuis <strong>{joursEnVente} jours</strong>{joursEnVente >= 90 ? " — au-delà de trois mois, un bien cesse d'être regardé comme une nouveauté." : "."}</p>
          )}
          {commentaire && <p className="text-sm mt-2 whitespace-pre-wrap">{commentaire}</p>}
        </div>
      )}
    </AdminShell>
  );
}
