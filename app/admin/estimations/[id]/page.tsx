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
  const [chargeRef, setChargeRef] = useState(false);

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

  /** Lit un relevé de prix de secteur — texte collé ou impression PDF. */
  const lireReference = async (source: { texte?: string; url?: string; titre?: string }) => {
    setChargeRef(true);
    try {
      const r = await fetch("/api/annonces/extraire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...source, type }),
      });
      const d = await r.json();
      if (!r.ok || !d?.reference?.m2) { toast(d?.error ?? "❌ Aucun prix au m² reconnu."); return; }
      set("reference", d.reference);
      toast("✅ Prix de secteur relevé.");
    } catch {
      toast("❌ Lecture impossible.");
    } finally {
      setChargeRef(false);
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
                  await lireReference({ texte: lu.texte, titre: lu.titre });
                }}
              />
              <div className="mt-1.5 flex gap-1.5">
                <input className="input flex-1 text-sm" placeholder="…ou collez le texte du relevé"
                  value={collageRef} onChange={(ev) => setCollageRef(ev.target.value)} />
                <button onClick={() => lireReference({ texte: collageRef })} disabled={chargeRef || !collageRef.trim()}
                  className="btn rounded-lg px-3 text-sm">{chargeRef ? "…" : "Lire"}</button>
              </div>
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
