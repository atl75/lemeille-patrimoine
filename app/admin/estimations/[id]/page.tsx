"use client";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import CollapsibleSection from "@/components/CollapsibleSection";
import ChampNombre from "@/components/ChampNombre";
import DeposePdf from "@/components/DeposePdf";
import DocumentEstimation from "@/components/DocumentEstimation";
import CriteresEstimation from "@/components/CriteresEstimation";
import { useToast } from "@/components/Toast";
import { surfaceFr } from "@/lib/formatFr";
import { estimer, ajustementsDe, BAREME_COURANT, LIBELLE_SOURCE,
         type Choix, type Corrections, type Critere, type SourceBase, type TypeBien } from "@/lib/estimation";
import { mediane, prixM2, type Comparable } from "@/lib/ajustementPrix";
import type { VenteDvf, StatsDvf } from "@/lib/dvf";

/**
 * Estimation d'un bien, à remettre au vendeur.
 *
 * Reprend l'argumentaire de prix — ventes signées DVF, annonces concurrentes,
 * indice de secteur — et lui ajoute ce qui manquait pour estimer plutôt que
 * comparer : les corrections propres au bien.
 *
 * L'ORDRE DU RAISONNEMENT EST LE MÊME QUE CELUI DU DOCUMENT. On part d'un prix
 * au m² de secteur assis sur des ventes réelles, puis on le corrige critère par
 * critère, chaque correction portant sa source. Le vendeur peut suivre le
 * calcul de bout en bout : c'est la seule façon qu'il accepte un chiffre qui ne
 * lui plaît pas.
 */

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";
const eurM2 = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €/m²";
/** Un pourcentage signé, à la française : « −17,0 % ». */
const pct = (n: number) =>
  (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(1).replace(".", ",") + " %";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [e, setE] = useState<any>(null);
  const [etat, setEtat] = useState<"chargement" | "ok" | "introuvable">("chargement");
  const [mode, setMode] = useState<"preparer" | "presenter">("preparer");
  const [dvf, setDvf] = useState<{ ventes: VenteDvf[]; stats: StatsDvf | null; adresse: string; precision: string; lat?: number; lon?: number } | null>(null);
  const [chargeDvf, setChargeDvf] = useState(false);
  const [enregistrement, setEnregistrement] = useState<"repos" | "encours" | "fait">("repos");
  const [collageRef, setCollageRef] = useState("");
  /** Saisie d'un bien concurrent, avant ajout au tableau. */
  const CONCURRENT_VIERGE = { titre: "", ville: "", prix: "", surface: "", dateParution: "", source: "SeLoger", lien: "" };
  const [concurrent, setConcurrent] = useState({ ...CONCURRENT_VIERGE });
  const [analyseConcurrent, setAnalyseConcurrent] = useState(false);
  const [collageConcurrent, setCollageConcurrent] = useState("");
  const [chargeRef, setChargeRef] = useState(false);
  /** Ce que le document contenait, quand aucun prix n'y a été reconnu. */
  const [diagnosticRef, setDiagnosticRef] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    fetch(`/api/estimations/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!annule) { setE(d); setEtat("ok"); } })
      .catch(() => { if (!annule) setEtat("introuvable"); });
    return () => { annule = true; };
  }, [id]);

  /** Modifie un champ de l'estimation. L'enregistrement suit tout seul. */
  const set = useCallback((champ: string, valeur: any) => {
    setE((p: any) => (p ? { ...p, [champ]: valeur } : p));
  }, []);

  /**
   * Enregistrement automatique, 1,5 s après la dernière frappe.
   *
   * Une estimation se remplit en une trentaine de champs pendant un rendez-vous.
   * Rien ne justifie de faire porter à l'agent le risque de tout perdre parce
   * qu'il n'a pas pensé à cliquer.
   */
  const premierRendu = useRef(true);
  useEffect(() => {
    if (etat !== "ok" || !e) return;
    if (premierRendu.current) { premierRendu.current = false; return; }
    const t = setTimeout(async () => {
      setEnregistrement("encours");
      try {
        const { id: _i, createdAt: _c, majAt: _m, ...corps } = e;
        const r = await fetch(`/api/estimations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corps),
        });
        setEnregistrement(r.ok ? "fait" : "repos");
        if (!r.ok) toast("❌ L'enregistrement a échoué.");
      } catch {
        setEnregistrement("repos");
        toast("❌ L'enregistrement a échoué.");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [e, etat, id, toast]);

  const type: TypeBien = e?.type === "Maison" ? "Maison" : "Appartement";
  const surface = Number(e?.surface) || 0;
  // Mémoïsés : `?? {}` fabriquait un objet neuf à chaque rendu, si bien que les
  // useMemo qui en dépendent recalculaient toujours — le contraire du but.
  const choix: Choix = useMemo(() => e?.criteres ?? {}, [e?.criteres]);
  const corrections: Corrections = useMemo(() => e?.corrections ?? {}, [e?.corrections]);
  const comparables: Comparable[] = useMemo(
    () => (Array.isArray(e?.comparables) ? e.comparables : []),
    [e?.comparables],
  );

  /**
   * Le prix au m² de départ, selon la source choisie.
   *
   * Les trois ne se valent pas et l'écran le dit : une vente signée est un
   * fait, une annonce est une demande, un indice de site est une moyenne de
   * quartier. On propose donc DVF par défaut dès qu'il y a de la matière.
   */
  const basesDisponibles = useMemo(() => {
    const m2Comparables = mediane(
      comparables.map((c) => prixM2(c.prixVente ?? c.prix, c.surface)).filter((x): x is number => x !== null),
    );
    return {
      DVF: dvf?.stats?.medianeM2 ?? null,
      COMPARABLES: m2Comparables,
      REFERENCE: Number(e?.reference?.m2) || null,
      MANUELLE: Number(e?.baseManuelle) || null,
    } as Record<SourceBase, number | null>;
  }, [dvf, comparables, e?.reference?.m2, e?.baseManuelle]);

  const sourceBase: SourceBase = e?.sourceBase ?? "DVF";
  const baseM2 = basesDisponibles[sourceBase] ?? 0;

  const ajustements = useMemo(
    () => ajustementsDe(BAREME_COURANT, choix, type, corrections),
    [choix, type, corrections],
  );

  const resultat = useMemo(
    () => estimer({ baseM2, surface, type, choix, corrections }),
    [baseM2, surface, type, choix, corrections],
  );

  /** Recherche des ventes signées autour de l'adresse saisie. */
  const chercherDvf = async () => {
    const adresse = String(e?.adresse ?? "").trim();
    if (!adresse) { toast("❌ Renseignez l'adresse pour chercher les ventes autour."); return; }
    setChargeDvf(true);
    try {
      const r = await fetch("/api/dvf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adresse, rayon: e?.dvfRayon || 300, type, surface: surface || undefined,
          depuis: e?.dvfDepuis || undefined, pieces: e?.dvfPieces || undefined,
          surfaceMin: Number(e?.dvfSurfaceMin) || undefined, surfaceMax: Number(e?.dvfSurfaceMax) || undefined,
          terrainMin: Number(e?.dvfTerrainMin) || undefined, terrainMax: Number(e?.dvfTerrainMax) || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) { toast(d?.error ?? "❌ Recherche impossible."); return; }
      setDvf({ ventes: d.ventes ?? [], stats: d.stats ?? null, adresse: d.adresse, precision: d.precision, lat: d.lat, lon: d.lon });
      if (!d.ventes?.length) toast("Aucune vente comparable dans ce rayon.");
    } catch {
      toast("❌ Recherche impossible.");
    } finally {
      setChargeDvf(false);
    }
  };

  /** Relance la recherche au chargement, comme sur l'argumentaire. */
  useEffect(() => {
    if (etat !== "ok" || !e?.adresse || dvf) return;
    chercherDvf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);

  /**
   * Lit un relevé de prix de secteur — texte collé ou impression PDF.
   *
   * L'extraction se fait DANS LE NAVIGATEUR, comme sur l'argumentaire de prix :
   * /api/annonces/extraire lit des annonces et ne renvoie que `champs`, jamais
   * de prix de secteur. Une première version l'appelait quand même et testait
   * `d.reference.m2` — un champ que cette route n'a jamais produit : le dépôt
   * échouait donc à tous les coups, en accusant le document.
   */
  const lireReference = async (source: { texte: string; brut?: string }) => {
    setChargeRef(true);
    setDiagnosticRef(null);
    try {
      const { extraireReferenceM2 } = await import("@/lib/annonceConcurrente");
      const brut = source.brut ?? source.texte;
      // Une page de prix porte APPARTEMENT et MAISON : le type choisit la section.
      const r = extraireReferenceM2(brut, type);
      if (!r) {
        // Montrer CE QUI A ÉTÉ LU. Un échec muet ne dit pas si le PDF est en
        // image, si la mise en forme a changé, ou s'il n'y a simplement pas de prix.
        const utile = brut.replace(/\s+/g, " ").trim();
        setDiagnosticRef(
          utile.length < 40
            ? "Ce PDF ne contient pas de texte : ses pages sont des images. Copiez plutôt le texte de la page depuis votre navigateur (Ctrl+A puis Ctrl+C) et collez-le ci-dessous."
            : `Aucun prix au m² reconnu. Voici ce que le document contient, pour que vous puissiez vérifier :\n\n${utile.slice(0, 700)}${utile.length > 700 ? "…" : ""}`,
        );
        return;
      }
      set("reference", { ...r, source: /meilleursagents/i.test(brut) ? "MeilleursAgents" : undefined });
      setCollageRef("");
      toast("✅ Prix de secteur relevé.");
    } catch {
      toast("❌ Ce document n'a pas pu être lu.");
    } finally {
      setChargeRef(false);
    }
  };

  /**
   * Ajoute le concurrent saisi au tableau.
   *
   * Sans prix ni surface, un bien ne pèse RIEN dans une médiane : on refuse
   * plutôt que d'ajouter une ligne qui gonflera l'effectif affiché sans rien
   * apporter au calcul.
   */
  const ajouterConcurrent = () => {
    const prix = Number(concurrent.prix), surf = Number(concurrent.surface);
    if (!(prix > 0) || !(surf > 0)) { toast("❌ Il faut au moins un prix et une surface."); return; }
    const nouveau: Comparable = {
      id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      titre: concurrent.titre.trim() || "Bien concurrent",
      ville: concurrent.ville.trim() || undefined,
      prix, surface: surf,
      statut: "EN_VENTE",
      dateParution: concurrent.dateParution || undefined,
      source: concurrent.source || undefined,
      lien: concurrent.lien.trim() || undefined,
    };
    set("comparables", [...comparables, nouveau]);
    setConcurrent({ ...CONCURRENT_VIERGE });
  };

  const retirerConcurrent = (id: string) =>
    set("comparables", comparables.filter((c) => c.id !== id));

  /** Lit une annonce — lien ou texte collé — et PRÉ-REMPLIT sans jamais ajouter. */
  const lireConcurrent = async (source: { url?: string; texte?: string; titre?: string }) => {
    setAnalyseConcurrent(true);
    try {
      const r = await fetch("/api/annonces/extraire", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(source),
      });
      const d = await r.json();
      if (!r.ok) { toast(d?.error ?? "❌ Lecture impossible."); return; }
      const c = d.champs ?? {};
      // On n'écrase jamais ce que l'agent a déjà tapé lui-même.
      setConcurrent((p) => ({
        titre: p.titre || String(c.titre ?? ""),
        ville: p.ville || String(c.ville ?? ""),
        prix: p.prix || String(c.prix ?? ""),
        surface: p.surface || String(c.surface ?? ""),
        dateParution: p.dateParution || String(c.dateParution ?? ""),
        source: p.source !== "SeLoger" ? p.source : String(c.source ?? "SeLoger"),
        lien: p.lien || String(c.lien ?? ""),
      }));
      setCollageConcurrent("");
      if (d.avertissement) toast(d.avertissement);
      else if (!c.prix || !c.surface) toast("Rempli en partie — vérifiez le prix et la surface.");
    } catch {
      toast("❌ Lecture impossible.");
    } finally {
      setAnalyseConcurrent(false);
    }
  };

  if (etat === "chargement") return <AdminShell title="Estimation"><p className="p-6 text-sm">Chargement…</p></AdminShell>;
  if (etat === "introuvable") return (
    <AdminShell title="Estimation">
      <p className="p-6 text-sm">Cette estimation n’existe pas. <Link className="underline" href="/admin/estimations">Retour à la liste</Link></p>
    </AdminShell>
  );

  return (
    <AdminShell title="Estimation">
      <div className="no-print">
        <Breadcrumb items={[{ label: "Estimations", href: "/admin/estimations" }, { label: e.titre || "Estimation" }]} />

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-3">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold">{e.titre || "Estimation"}</h1>
            <p className="text-xs text-stone-500">
              {e.adresse || "adresse à renseigner"}
              {e.leadId && (
                <> · <Link href="/admin/crm/vendeurs" className="underline">lead vendeur relié</Link></>
              )}
              {" · "}
              {enregistrement === "encours" ? "enregistrement…" : enregistrement === "fait" ? "enregistré" : "enregistrement automatique"}
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border p-0.5">
            <button onClick={() => setMode("preparer")} data-testid="onglet-preparer"
              className={`rounded-md px-3 py-1.5 text-sm ${mode === "preparer" ? "bg-[#1F3B2C] text-white" : "hover:bg-stone-50"}`}>Préparer</button>
            <button onClick={() => setMode("presenter")} data-testid="onglet-presenter"
              className={`rounded-md px-3 py-1.5 text-sm ${mode === "presenter" ? "bg-[#1F3B2C] text-white" : "hover:bg-stone-50"}`}>Présenter</button>
          </div>
          <button onClick={() => window.print()} className="btn rounded-lg px-3 py-1.5 text-sm">Imprimer</button>
        </div>
      </div>

      {mode === "preparer" ? (
        <div className="no-print space-y-1">
          <CollapsibleSection title="Le bien" subtitle="Ce que l'on estime" defaultOpen>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-sm">Titre du document
                <input className="input mt-0.5 w-full" value={e.titre ?? ""} onChange={(ev) => set("titre", ev.target.value)} />
              </label>
              <label className="text-sm">À la demande de
                <input className="input mt-0.5 w-full" placeholder="Mme Constant" value={e.demandeur ?? ""} onChange={(ev) => set("demandeur", ev.target.value)} />
              </label>
              <label className="text-sm md:col-span-2">Adresse
                <input className="input mt-0.5 w-full" data-testid="champ-adresse" value={e.adresse ?? ""} onChange={(ev) => set("adresse", ev.target.value)} />
              </label>
              <label className="text-sm">Type
                <select className="input mt-0.5 w-full" value={type} onChange={(ev) => set("type", ev.target.value)}>
                  <option>Appartement</option><option>Maison</option>
                </select>
              </label>
              <label className="text-sm">Surface (m²)
                <ChampNombre decimales className="input mt-0.5 w-full" testid="champ-surface"
                  value={e.surface ? String(e.surface) : ""} onChange={(v) => set("surface", Number(v) || 0)} />
              </label>
              <label className="text-sm">Pièces
                <ChampNombre className="input mt-0.5 w-full" value={e.pieces ? String(e.pieces) : ""} onChange={(v) => set("pieces", Number(v) || 0)} />
              </label>
              {type === "Maison" && (
                <label className="text-sm">Terrain (m²)
                  <ChampNombre className="input mt-0.5 w-full" value={e.terrain ? String(e.terrain) : ""} onChange={(v) => set("terrain", Number(v) || 0)} />
                </label>
              )}
              <label className="text-sm md:col-span-2">Description
                <textarea className="input mt-0.5 w-full" rows={3} value={e.description ?? ""} onChange={(ev) => set("description", ev.target.value)} />
              </label>
              <label className="text-sm">Points forts <span className="text-stone-500">(un par ligne)</span>
                <textarea className="input mt-0.5 w-full" rows={3} value={e.pointsForts ?? ""} onChange={(ev) => set("pointsForts", ev.target.value)} />
              </label>
              <label className="text-sm">Points à défendre <span className="text-stone-500">(un par ligne)</span>
                <textarea className="input mt-0.5 w-full" rows={3} value={e.pointsFaibles ?? ""} onChange={(ev) => set("pointsFaibles", ev.target.value)} />
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Prix de secteur"
            subtitle={baseM2 ? `${eurM2(baseM2)} — ${LIBELLE_SOURCE[sourceBase]}` : "à établir"}
            defaultOpen
          >
            <p className="mb-3 text-xs text-stone-600">
              Le point de départ du calcul. Les trois sources ne se valent pas : une vente signée est
              un fait, une annonce est une demande, un indice de site est une moyenne de quartier.
            </p>

            <div className="mb-3 space-y-1.5">
              {(Object.keys(LIBELLE_SOURCE) as SourceBase[]).map((s) => {
                const v = basesDisponibles[s];
                return (
                  <label key={s} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${v ? "" : "opacity-50"}`}>
                    <input type="radio" name="base" checked={sourceBase === s} disabled={!v}
                      data-testid={`base-${s}`} onChange={() => set("sourceBase", s)} />
                    <span className="mr-auto">{LIBELLE_SOURCE[s]}</span>
                    <span className="tabular-nums font-medium">{v ? eurM2(v) : "—"}</span>
                  </label>
                );
              })}
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              <label className="text-sm">Rayon (m)
                <ChampNombre className="input mt-0.5 w-full" value={String(e.dvfRayon ?? 300)} onChange={(v) => set("dvfRayon", Number(v) || 300)} />
              </label>
              <label className="text-sm">Depuis
                <ChampNombre className="input mt-0.5 w-full" value={e.dvfDepuis ? String(e.dvfDepuis) : ""} onChange={(v) => set("dvfDepuis", Number(v) || 0)} />
              </label>
              <label className="text-sm">Surface min
                <ChampNombre className="input mt-0.5 w-full" value={e.dvfSurfaceMin ? String(e.dvfSurfaceMin) : ""} onChange={(v) => set("dvfSurfaceMin", Number(v) || 0)} />
              </label>
              <label className="text-sm">Surface max
                <ChampNombre className="input mt-0.5 w-full" value={e.dvfSurfaceMax ? String(e.dvfSurfaceMax) : ""} onChange={(v) => set("dvfSurfaceMax", Number(v) || 0)} />
              </label>
            </div>
            <button onClick={chercherDvf} disabled={chargeDvf} className="btn mt-2 rounded-lg px-3 py-1.5 text-sm" data-testid="chercher-dvf">
              {chargeDvf ? "Recherche…" : "Chercher les ventes signées"}
            </button>
            {dvf?.stats && (
              <p className="mt-2 text-xs text-stone-600">
                {dvf.ventes.length} ventes retenues autour de {dvf.adresse}
                {dvf.precision !== "housenumber" && " (rue seulement, pas le numéro)"} —
                médiane {eurM2(dvf.stats.medianeM2)}.
              </p>
            )}

            <div className="mt-3 border-t pt-3">
              <p className="mb-1.5 text-sm font-medium">Indice de secteur</p>
              <DeposePdf
                libelle="Glissez ici l'impression PDF d'un relevé de prix au m²"
                aide="Le fichier ne quitte pas votre poste : seul le texte qui en est tiré est envoyé."
                occupe={chargeRef}
                testid="depose-reference"
                onFichier={async (f) => {
                  const { texteDepuisPdf } = await import("@/lib/pdfTexte");
                  const lu = await texteDepuisPdf(f);
                  await lireReference({ texte: lu.texte, brut: `${lu.titre}\n${lu.texte}` });
                }}
              />
              <div className="mt-1.5 flex gap-1.5">
                <input className="input flex-1 text-sm" placeholder="…ou collez le texte du relevé"
                  value={collageRef} onChange={(ev) => setCollageRef(ev.target.value)} />
                <button onClick={() => lireReference({ texte: collageRef })} disabled={chargeRef || !collageRef.trim()}
                  className="btn rounded-lg px-3 text-sm">{chargeRef ? "…" : "Lire"}</button>
              </div>
              {diagnosticRef && (
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                  {diagnosticRef}
                </p>
              )}
              {e.reference?.m2 && (
                <p className="mt-1.5 text-xs text-stone-600">
                  {e.reference.source ?? "Avis de marché"} · {eurM2(e.reference.m2)}
                  {e.reference.bas && e.reference.haut ? ` (de ${eur(e.reference.bas)} à ${eur(e.reference.haut)})` : ""}
                </p>
              )}
              <label className="mt-2 block text-sm">Ou saisir directement un prix au m²
                <ChampNombre className="input mt-0.5 w-40" testid="base-manuelle"
                  value={e.baseManuelle ? String(e.baseManuelle) : ""} onChange={(v) => set("baseManuelle", Number(v) || 0)} />
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Biens concurrents"
            subtitle={comparables.length ? `${comparables.length} bien${comparables.length > 1 ? "s" : ""} en vente relevé${comparables.length > 1 ? "s" : ""}` : "ce que l’acquéreur voit en même temps"}
          >
            <p className="mb-2 text-xs text-stone-600">
              Les biens actuellement en vente autour du vôtre. Ils ne disent pas ce que le marché
              paie — les ventes signées le disent mieux — mais ils disent à quoi votre bien sera
              comparé, et c’est cette page que le vendeur regarde le plus longtemps.
            </p>

            <div className="mb-2 flex gap-1.5">
              <input
                className="input flex-1 text-sm"
                placeholder="Collez le lien d’une annonce, ou son texte"
                value={collageConcurrent}
                data-testid="collage-concurrent"
                onChange={(ev) => setCollageConcurrent(ev.target.value)}
              />
              <button
                className="btn rounded-lg px-3 text-sm"
                disabled={analyseConcurrent || !collageConcurrent.trim()}
                onClick={() => {
                  const v = collageConcurrent.trim();
                  const estLien = !/\s/.test(v) && /^https?:\/\//i.test(v);
                  lireConcurrent(estLien ? { url: v } : { texte: v });
                }}
              >
                {analyseConcurrent ? "…" : "Lire"}
              </button>
            </div>
            <DeposePdf
              libelle="…ou glissez l’impression PDF d’une annonce"
              occupe={analyseConcurrent}
              testid="depose-concurrent"
              onFichier={async (f) => {
                const { texteDepuisPdf } = await import("@/lib/pdfTexte");
                const lu = await texteDepuisPdf(f);
                await lireConcurrent({ texte: lu.texte, titre: lu.titre });
              }}
            />

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <label className="text-sm md:col-span-2">Titre
                <input className="input mt-0.5 w-full" value={concurrent.titre}
                  onChange={(ev) => setConcurrent({ ...concurrent, titre: ev.target.value })} />
              </label>
              <label className="text-sm">Ville
                <input className="input mt-0.5 w-full" value={concurrent.ville}
                  onChange={(ev) => setConcurrent({ ...concurrent, ville: ev.target.value })} />
              </label>
              <label className="text-sm">Prix affiché
                <ChampNombre className="input mt-0.5 w-full" testid="concurrent-prix"
                  value={concurrent.prix} onChange={(v) => setConcurrent({ ...concurrent, prix: v })} />
              </label>
              <label className="text-sm">Surface (m²)
                <ChampNombre decimales className="input mt-0.5 w-full" testid="concurrent-surface"
                  value={concurrent.surface} onChange={(v) => setConcurrent({ ...concurrent, surface: v })} />
              </label>
              <label className="text-sm">En ligne depuis le
                <input type="date" className="input mt-0.5 w-full" value={concurrent.dateParution}
                  onChange={(ev) => setConcurrent({ ...concurrent, dateParution: ev.target.value })} />
              </label>
            </div>
            <button onClick={ajouterConcurrent} className="btn mt-2 rounded-lg px-3 py-1.5 text-sm" data-testid="ajouter-concurrent">
              Ajouter ce bien
            </button>

            {comparables.length > 0 && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-stone-600">
                    <th className="py-1 text-left">Bien</th>
                    <th className="py-1 text-right">Surface</th>
                    <th className="py-1 text-right">Prix</th>
                    <th className="py-1 text-right">€/m²</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {comparables.map((c) => {
                    const m2 = prixM2(c.prixVente ?? c.prix, c.surface);
                    return (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-1">{c.titre}{c.ville ? ` · ${c.ville}` : ""}</td>
                        <td className="py-1 text-right tabular-nums">{surfaceFr(c.surface)}</td>
                        <td className="py-1 text-right tabular-nums">{eur(c.prix)}</td>
                        <td className="py-1 text-right tabular-nums">{m2 ? eurM2(m2) : "—"}</td>
                        <td className="py-1 text-right">
                          <button onClick={() => retirerConcurrent(c.id)}
                            className="btn px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50">Retirer</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Corrections propres au bien"
            subtitle={resultat ? `${pct(resultat.composition.pourcent)} au total` : "DPE, état, étage, ascenseur, bruit, luminosité"}
            defaultOpen
          >
            <CriteresEstimation
              type={type} choix={choix} corrections={corrections} ajustements={ajustements}
              onChoix={(c: Critere, cle: string) => set("criteres", { ...choix, [c]: cle || undefined })}
              onCorrection={(c: Critere, v: number | null) => {
                const suite = { ...corrections };
                if (v === null) delete suite[c]; else suite[c] = v;
                set("corrections", suite);
              }}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Honoraires et net vendeur" subtitle="Ce que le vendeur touche">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-sm">Honoraires (%)
                <input type="number" step="0.1" className="input mt-0.5 w-full"
                  value={e.honorairesPct ?? ""} placeholder="3.5"
                  onChange={(ev) => set("honorairesPct", ev.target.value === "" ? null : Number(ev.target.value))} />
              </label>
              <label className="text-sm">À la charge de
                <select className="input mt-0.5 w-full" value={e.honorairesCharge ?? "ACQUEREUR"} onChange={(ev) => set("honorairesCharge", ev.target.value)}>
                  <option value="ACQUEREUR">l’acquéreur</option>
                  <option value="VENDEUR">le vendeur</option>
                </select>
              </label>
              <label className="text-sm">Taux de crédit du moment (%)
                <input type="number" step="0.01" className="input mt-0.5 w-full" placeholder="3.31"
                  value={e.taux ?? ""} onChange={(ev) => set("taux", ev.target.value === "" ? null : Number(ev.target.value))} />
              </label>
              <label className="text-sm">Durée du prêt (ans)
                <ChampNombre className="input mt-0.5 w-full" value={String(e.dureePret ?? 25)} onChange={(v) => set("dureePret", Number(v) || 25)} />
              </label>
            </div>
            <p className="mt-2 text-xs text-stone-600">
              Le taux sert à traduire le prix en revenu mensuel nécessaire pour l’acquéreur. Aucune
              source ne le fournit automatiquement : reportez celui que vous constatez.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="Prix retenu" subtitle={e.prixRetenu ? eur(Number(e.prixRetenu)) : "à arrêter"} defaultOpen>
            {resultat ? (
              <div className="space-y-2 text-sm">
                <p>
                  Prix de secteur {eurM2(resultat.baseM2)} · corrections{" "}
                  {pct(resultat.composition.pourcent)}
                  {resultat.composition.plafonne && (
                    <span className="ml-1 text-amber-700">
                      (plafonné : le cumul brut atteignait {pct(resultat.composition.pourcentBrut)})
                    </span>
                  )}
                </p>
                <p className="text-lg font-semibold">
                  {eur(resultat.bas)} — {eur(resultat.haut)}
                  <span className="ml-2 text-sm font-normal text-stone-600">soit {eurM2(resultat.m2Ajuste)}</span>
                </p>
                <label className="block">Prix retenu pour le document
                  <ChampNombre className="input mt-0.5 w-48" testid="prix-retenu"
                    value={e.prixRetenu ? String(e.prixRetenu) : ""} onChange={(v) => set("prixRetenu", Number(v) || 0)} />
                </label>
                <button className="btn rounded-lg px-3 py-1.5 text-xs" onClick={() => set("prixRetenu", Math.round(resultat.valeur / 1000) * 1000)}>
                  Reprendre la valeur centrale
                </button>
              </div>
            ) : (
              <p className="text-sm text-stone-600">
                Il manque la surface ou un prix de secteur pour estimer.
              </p>
            )}
          </CollapsibleSection>
        </div>
      ) : (
        <DocumentEstimation
          estimation={e} resultat={resultat} ajustements={ajustements}
          dvf={dvf} comparables={comparables} type={type}
        />
      )}
    </AdminShell>
  );
}
