"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useToast } from "@/components/Toast";
import { propertyLabel } from "@/lib/propertyLabel";
import DocumentPositionnement from "@/components/DocumentPositionnement";
import DeposePdf from "@/components/DeposePdf";
import type { VenteDvf, StatsDvf } from "@/lib/dvf";
import type { ReferenceM2 } from "@/lib/annonceConcurrente";
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
  const [collage, setCollage] = useState("");
  const [analyse, setAnalyse] = useState(false);
  /** Champs remplis par l'extraction et pas encore relus par un humain. */
  const [proposes, setProposes] = useState<Record<string, string>>({});
  const [motExtraction, setMotExtraction] = useState<string | null>(null);
  /** Ventes signées autour du bien, tirées de DVF. */
  const [dvf, setDvf] = useState<{ ventes: VenteDvf[]; stats: StatsDvf | null; adresse: string; precision: string } | null>(null);
  const [rayonDvf, setRayonDvf] = useState(300);
  /** Ne garder que les ventes à partir de cette année. */
  const [dvfDepuis, setDvfDepuis] = useState(0);
  /** Typologie : nombre de pièces, 0 = toutes. */
  const [dvfPieces, setDvfPieces] = useState(0);
  /** Bornes de surface, en m². Vides = tolérance automatique autour du bien. */
  const [dvfSurfaceMin, setDvfSurfaceMin] = useState("");
  const [dvfSurfaceMax, setDvfSurfaceMax] = useState("");
  const [chargeDvf, setChargeDvf] = useState(false);
  /** Prix de référence du secteur, relevé par l'agent sur une page tierce. */
  const [reference, setReference] = useState<ReferenceM2 | null>(null);
  const [collageRef, setCollageRef] = useState("");
  const [chargeRef, setChargeRef] = useState(false);
  /** Ce que le PDF contenait, quand aucun prix n'y a été reconnu. */
  const [diagnosticRef, setDiagnosticRef] = useState<string | null>(null);
  /** URL du détail des ventes, quand le navigateur refuse un onglet. */
  const [apercuVentes, setApercuVentes] = useState<string | null>(null);
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
        setReference(a.reference || null);
        if (a.dvfRayon) setRayonDvf(a.dvfRayon);
        if (a.dvfDepuis) setDvfDepuis(a.dvfDepuis);
        if (a.dvfPieces) setDvfPieces(a.dvfPieces);
        if (a.dvfSurfaceMin) setDvfSurfaceMin(String(a.dvfSurfaceMin));
        if (a.dvfSurfaceMax) setDvfSurfaceMax(String(a.dvfSurfaceMax));
        setEtat("ok");
      })
      .catch(() => { if (!annule) setEtat("introuvable"); });
    return () => { annule = true; };
  }, [id]);

  /**
   * Relance la recherche des ventes signées dès que le bien est chargé.
   *
   * Les résultats DVF ne sont PAS enregistrés avec l'argumentaire — 568 ventes
   * pèseraient lourd dans un fichier relu à chaque page, et les données
   * bougeraient sans qu'on le sache. On refait donc la recherche, avec les
   * réglages enregistrés : le serveur garde les fichiers six heures en cache,
   * l'attente est de l'ordre de la seconde. Sans cela le document perdait sa
   * pièce maîtresse à chaque rafraîchissement.
   */
  useEffect(() => {
    if (etat !== "ok" || !bien || dvf) return;
    const adresse = (bien.map?.query || "").trim() || [bien.city, bien.region].filter(Boolean).join(" ");
    if (!adresse) return;
    chercherDvf(rayonDvf);
    // Une seule fois, au chargement : les recherches suivantes sont demandées.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat, bien?.id]);

  // Concurrents du portefeuille non encore retenus : proposés, jamais imposés.
  const suggestions = useMemo(() => {
    if (!bien) return [];
    const dejaLa = new Set(comparables.map(c => c.id));
    return comparablesDuPortefeuille(bien, tous).filter(c => !dejaLa.has(c.id));
  }, [bien, tous, comparables]);

  const pos = useMemo(() => bien ? positionner(bien, comparables) : null, [bien, comparables]);
  const fourchette = useMemo(() => bien ? fourchetteConseillee(bien, comparables) : null, [bien, comparables]);

  /**
   * La fourchette recommandée s'appuie sur la MEILLEURE preuve disponible.
   *
   * Sans cela le document se contredisait : il présentait les ventes signées
   * comme l'argument le plus fort, puis recommandait un prix calculé sur les
   * prix DEMANDÉS des concurrents — plus élevés par nature. Un vendeur attentif
   * relève la contradiction, et tout l'argumentaire tombe avec elle.
   */
  const fourchetteRetenue = useMemo(() => {
    const surface = Number(bien?.surface);
    if (dvf?.stats && surface > 0) {
      return { bas: dvf.stats.q1M2 * surface, haut: dvf.stats.medianeM2 * surface };
    }
    return fourchette;
  }, [dvf, bien, fourchette]);

  /** Le prix qui alignerait le bien sur le marché réellement constaté. */
  const prixAligneRetenu = useMemo(() => {
    const surface = Number(bien?.surface);
    if (dvf?.stats && surface > 0) return dvf.stats.medianeM2 * surface;
    return pos?.prixAligne ?? null;
  }, [dvf, bien, pos]);
  const cible = Number(prixCible) || null;
  const impact = useMemo(() => (bien && cible ? impactNetVendeur(bien, cible) : null), [bien, cible]);
  const confiance = fiabilite(pos?.stats ?? null);

  const joursEnVente = useMemo(() => {
    if (!dateMiseEnVente) return null;
    const d = new Date(dateMiseEnVente).getTime();
    if (!Number.isFinite(d)) return null;
    return Math.max(0, Math.round((Date.now() - d) / 86400000));
  }, [dateMiseEnVente]);

  /**
   * Toute frappe humaine annule la marque « proposé » du champ : relire, c'est
   * passer dessus. Et la main de l'utilisateur prime toujours sur le réseau.
   */
  /** Teinte discrète d'un champ proposé et pas encore relu. */
  const propose = (champ: string) => (champ in proposes ? " bg-amber-50 border-amber-300" : "");

  const maj = (champ: keyof typeof COMPARABLE_VIERGE, valeur: string) => {
    setSaisie(s => ({ ...s, [champ]: valeur }));
    setProposes(p => { const { [champ]: _, ...reste } = p; return reste; });
  };

  /** Un collage sur une seule ligne qui commence par http est un lien. */
  const estUnLien = (v: string) =>
    !/\s/.test(v.trim()) && /^https?:\/\//i.test(v.trim());

  /**
   * Lit l'annonce et PRÉ-REMPLIT le formulaire — sans jamais ajouter la ligne.
   * Un champ à retaper coûte huit secondes ; un prix faux dans le tableau posé
   * devant le vendeur coûte l'argumentaire entier.
   */
  const analyserCollage = async () => {
    const v = collage.trim();
    if (!v) return;
    setAnalyse(true);
    setMotExtraction(null);
    try {
      const r = await fetch("/api/annonces/extraire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estUnLien(v) ? { url: v } : { texte: v }),
      });
      const d = await r.json();
      if (!r.ok) { toast(d?.error ?? "Lecture impossible."); return; }
      appliquer(d);
    } catch {
      toast("Lecture impossible.");
    } finally {
      setAnalyse(false);
    }
  };

  /**
   * Lit l'IMPRESSION PDF d'une annonce, dans le navigateur.
   *
   * Le fichier ne part pas : pdf.js en tire le texte sur le poste, seul le
   * texte est envoyé. C'est la parade aux portails qui refusent d'être lus par
   * un serveur — imprimer la page est un geste que l'agent fait déjà.
   */
  const analyserPdf = async (fichier: File) => {
    setAnalyse(true);
    setMotExtraction(null);
    try {
      const { texteDepuisPdf } = await import("@/lib/pdfTexte");
      const lu = await texteDepuisPdf(fichier);
      const r = await fetch("/api/annonces/extraire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte: lu.texte, titre: lu.titre }),
      });
      const d = await r.json();
      if (!r.ok) { toast(d?.error ?? "Lecture impossible."); return; }
      appliquer(d, lu.pages > lu.pagesLues
        ? `Lu depuis l'impression (${lu.pagesLues} premières pages sur ${lu.pages} : au-delà, ce sont les biens similaires).`
        : undefined);
    } catch {
      toast("Ce PDF n'a pas pu être lu.");
    } finally {
      setAnalyse(false);
    }
  };

  /** Pose les valeurs trouvées dans le formulaire, sans jamais ajouter la ligne. */
  const appliquer = (d: any, motPrefixe?: string) => {
      const c = d.champs ?? {};
      const prov = d.provenance ?? {};
      const nouveaux: Record<string, string> = {};
      setSaisie(s => {
        const suite = { ...s };
        const poser = (champ: keyof typeof COMPARABLE_VIERGE, valeur: any) => {
          if (valeur == null || valeur === "") return;
          // On n'écrase JAMAIS ce que l'utilisateur a déjà tapé lui-même.
          if (suite[champ] && !(champ in proposes)) return;
          suite[champ] = String(valeur);
          nouveaux[champ] = prov[champ] ?? "trouvé dans l'annonce";
        };
        poser("titre", c.titre);
        poser("ville", c.ville);
        poser("prix", c.prix);
        poser("surface", c.surface);
        poser("source", c.source);
        poser("lien", c.lien);
        // prixVente n'est jamais proposé : il déclenche le statut VENDU et
        // c'est l'argument le plus fort du dossier. Il se saisit en conscience.
        return suite;
      });
      setProposes(nouveaux);

      const manque = [!c.prix && "le prix", !c.surface && "la surface"].filter(Boolean);
      setMotExtraction(
        d.avertissement
          ? `${d.avertissement} Collez le texte de l'annonce : Ctrl+A puis Ctrl+C sur sa page.`
          : manque.length
            ? `Rempli depuis l'annonce. Il manque ${manque.join(" et ")} — sans ${manque.length > 1 ? "elles" : "elle"}, ce bien ne pèsera pas dans la médiane.`
            : motPrefixe ?? "Rempli depuis l'annonce — vérifiez le prix et la surface avant d'ajouter.",
      );
  };

  /**
   * Va chercher les ventes RÉELLEMENT SIGNÉES autour du bien.
   *
   * Source : les fichiers DVF de la DGFiP, via data.gouv.fr. C'est l'argument
   * le plus difficile à contester face à un vendeur : ni notre estimation, ni
   * celle d'un concurrent, mais des actes.
   */
  const chercherDvf = async (rayon = rayonDvf) => {
    // L'adresse exacte du bien vit dans map.query ; la ville sert de repli.
    const adresse = (bien?.map?.query || "").trim() || [bien?.city, bien?.region].filter(Boolean).join(" ");
    if (!adresse.trim()) { toast("Renseignez l'adresse du bien pour chercher les ventes autour."); return; }
    setChargeDvf(true);
    try {
      const r = await fetch("/api/dvf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adresse, rayon, type: bien?.type === "Maison" ? "Maison" : "Appartement",
                               surface: bien?.surface, depuis: dvfDepuis || undefined, pieces: dvfPieces || undefined,
                               surfaceMin: Number(dvfSurfaceMin) || undefined, surfaceMax: Number(dvfSurfaceMax) || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { toast(d?.error ?? "Recherche impossible."); return; }
      setDvf({ ventes: d.ventes ?? [], stats: d.stats ?? null, adresse: d.adresse, precision: d.precision });
      if (!d.ventes?.length) toast("Aucune vente comparable trouvée dans ce rayon.");
    } catch {
      toast("Recherche impossible.");
    } finally {
      setChargeDvf(false);
    }
  };

  /**
   * Ouvre TOUTES les ventes retenues dans une fenêtre à part.
   *
   * Le document n'en détaille que douze ; avant de poser des chiffres devant un
   * vendeur, on veut pouvoir vérifier la totalité, et retrouver chaque ligne
   * dans la base officielle. D'où le rappel de la source et des filtres en tête.
   */
  const documentDesVentes = (): string => {
    if (!dvf?.ventes.length) return "";
    const ech = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const lignes = dvf.ventes.map(v => `<tr>
      <td>${ech(new Date(v.date).toLocaleDateString("fr-FR"))}</td>
      <td>${ech(v.adresse || "—")}</td>
      <td>${ech(v.type)}</td>
      <td class="n">${ech(v.pieces ?? "—")}</td>
      <td class="n">${v.surface} m²</td>
      <td class="n">${Math.round(v.prix).toLocaleString("fr-FR")} €</td>
      <td class="n"><b>${Math.round(v.prixM2).toLocaleString("fr-FR")} €/m²</b></td>
      <td class="n">${Math.round(v.distance)} m</td></tr>`).join("");
    return `<!doctype html><meta charset="utf-8">
      <title>Ventes signées — ${ech(dvf.adresse)}</title>
      <style>
        body{font:13px/1.5 -apple-system,system-ui,sans-serif;margin:0;padding:22px;color:#111}
        h1{font-size:17px;color:#1F3B2C;margin:0 0 4px}
        p.src{font-size:12px;color:#52514e;margin:0 0 14px}
        table{border-collapse:collapse;width:100%}
        th{text-align:left;font-size:11px;color:#52514e;border-bottom:1px solid #d9d7d0;
           padding:5px 8px 5px 0;position:sticky;top:0;background:#fff}
        td{padding:3px 8px 3px 0;border-bottom:1px solid #f2f1ec}
        .n{text-align:right;font-variant-numeric:tabular-nums}
        tbody tr:hover{background:#f6f5f0}
      </style>
      <h1>${dvf.ventes.length} ventes signées retenues</h1>
      <p class="src">
        Adresse : ${ech(dvf.adresse)}${dvf.precision !== "housenumber" ? " (rue seulement, pas le numéro)" : ""} —
        rayon ${rayonDvf} m${dvfDepuis ? ` — à partir de ${dvfDepuis}` : ""}${dvfPieces ? ` — ${dvfPieces} pièces` : ""}.<br>
        Source : demandes de valeurs foncières (DGFiP), fichiers geo-dvf publiés sur data.gouv.fr sous licence ouverte.
        Seules les mutations portant UN SEUL logement sont retenues : lorsqu'un acte en couvre plusieurs,
        le prix déclaré est celui de l'ensemble et le prix au m² n'aurait aucun sens.
      </p>
      <table><thead><tr>
        <th>Date</th><th>Adresse</th><th>Type</th><th class="n">Pièces</th>
        <th class="n">Surface</th><th class="n">Prix</th><th class="n">€/m²</th><th class="n">Distance</th>
      </tr></thead><tbody>${lignes}</tbody></table>`;
  };

  /**
   * Ouvre le détail dans un onglet — ou, si le navigateur refuse, dans un
   * panneau plein écran. Le MÊME document dans les deux cas : un bloqueur de
   * fenêtres ne doit pas priver l'agent de la vérification.
   */
  const voirLesVentes = () => {
    const html = documentDesVentes();
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const f = window.open(url, "_blank");
    if (f) {
      // L'onglet a pris la main : on libère l'URL une fois qu'il a chargé.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    setApercuVentes(url);
  };

  /** Lit un prix de référence au m² dans une page collée (MeilleursAgents…). */
  const lireReference = async () => {
    const v = collageRef.trim();
    if (!v) return;
    const { extraireReferenceM2 } = await import("@/lib/annonceConcurrente");
    const r = extraireReferenceM2(v);
    if (!r) { toast("Aucun prix au m² trouvé dans ce texte."); return; }
    setReference({ ...r, source: /meilleursagents/i.test(v) ? "MeilleursAgents" : undefined });
    setCollageRef("");
  };

  /**
   * Même chose depuis une IMPRESSION PDF de la page de prix.
   *
   * C'est le geste naturel : l'agent est devant la page MeilleursAgents, il
   * l'imprime. Le PDF est lu dans le navigateur, il ne part pas sur le serveur.
   */
  const lireReferencePdf = async (fichier: File) => {
    setChargeRef(true);
    try {
      const { texteDepuisPdf } = await import("@/lib/pdfTexte");
      const { extraireReferenceM2 } = await import("@/lib/annonceConcurrente");
      const lu = await texteDepuisPdf(fichier);
      const brut = `${lu.titre}\n${lu.texte}`;
      const r = extraireReferenceM2(brut);
      if (!r) {
        // On MONTRE ce qui a été lu. Un échec muet ne dit pas s'il s'agit
        // d'une page en image, d'une mise en forme inattendue, ou d'un
        // document qui ne contient tout simplement pas de prix.
        const utile = lu.texte.replace(/\s+/g, " ").trim();
        setDiagnosticRef(
          utile.length < 40
            ? "Ce PDF ne contient pas de texte : ses pages sont des images. Copiez plutôt le texte de la page depuis votre navigateur (Ctrl+A puis Ctrl+C) et collez-le ci-dessus."
            : `Aucun prix au m² reconnu. Voici ce que le document contient, pour que vous puissiez vérifier :\n\n${utile.slice(0, 700)}${utile.length > 700 ? "…" : ""}`,
        );
        return;
      }
      setDiagnosticRef(null);
      setReference({ ...r, source: /meilleursagents/i.test(brut) ? "MeilleursAgents" : undefined });
    } catch {
      toast("Ce PDF n'a pas pu être lu.");
    } finally {
      setChargeRef(false);
    }
  };

  /** Remonte ou descend un bien concurrent dans le tableau. */
  const deplacer = (index: number, sens: -1 | 1) => {
    setComparables(cs => {
      const cible = index + sens;
      if (cible < 0 || cible >= cs.length) return cs;
      const copie = [...cs];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
  };

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
    // La marque « proposé » ne survit pas à l'ajout : le doute se règle avant,
    // il n'a pas à voyager dans un tableau montré au vendeur.
    setProposes({});
    setCollage("");
    setMotExtraction(null);
  };

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      const r = await fetch(`/api/properties/${id}/ajustement`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comparables, prixCible: cible, dateMiseEnVente, commentaire,
          reference, dvfRayon: rayonDvf, dvfDepuis, dvfPieces,
          dvfSurfaceMin: Number(dvfSurfaceMin) || undefined,
          dvfSurfaceMax: Number(dvfSurfaceMax) || undefined }),
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

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5 sans-impression">
        <div className={presentation ? "hidden" : ""}>
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

      {/* ————— Le document remis au vendeur ————— */}
      {presentation && (
        <DocumentPositionnement
          bien={{ title: bien.title, address: bien.map?.query, city: bien.city,
                  surface: bien.surface, price: bien.price, type: bien.type }}
          position={pos}
          comparables={comparables}
          dvf={dvf?.ventes ?? []}
          statsDvf={dvf?.stats ?? null}
          reference={reference}
          rayonDvf={rayonDvf}
          fourchette={fourchetteRetenue}
          prixCible={cible}
          impact={cible != null ? impactNetVendeur(bien, cible)
                  : prixAligneRetenu != null ? impactNetVendeur(bien, prixAligneRetenu) : null}
          fiabilite={confiance}
          commentaire={commentaire}
        />
      )}

      {/* ————— Écran de travail : masqué dès qu'on présente ————— */}
      {!presentation && (
        <>
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
                  {/* ORDRE DE SAISIE, et non tri par prix au m². Le tableau est
                      celui du document remis au vendeur : l'agent doit pouvoir
                      placer en tête le bien le plus parlant. Un tri automatique
                      rendait les flèches sans effet — elles déplaçaient bien la
                      donnée, l'affichage la remettait aussitôt en ordre. */}
                  {comparables.map((c, i) => {
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
                          <td className="py-1.5 text-right sans-impression whitespace-nowrap">
                            {/* L'ordre du tableau est celui du document remis au
                                vendeur : on veut pouvoir placer en tête le bien
                                le plus parlant. */}
                            <button onClick={() => deplacer(i, -1)} disabled={i === 0}
                              className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20 px-1"
                              title="Monter" data-testid={`monter-${c.id}`}>↑</button>
                            <button onClick={() => deplacer(i, 1)} disabled={i === comparables.length - 1}
                              className="text-xs opacity-50 hover:opacity-100 disabled:opacity-20 px-1"
                              title="Descendre" data-testid={`descendre-${c.id}`}>↓</button>
                            <button onClick={() => setComparables(cs => cs.filter(x => x.id !== c.id))}
                              className="text-xs opacity-50 hover:opacity-100 pl-2" title="Retirer" data-testid={`retirer-${c.id}`}>✕</button>
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
        </>
      )}

      {/* ————— Outils de préparation ————— */}
      {!presentation && (
        <>
          {/* ————— Les ventes réellement signées autour ————— */}
          <div className="card p-5 mb-4 sans-impression">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <h2 className="font-semibold text-sm text-[#1F3B2C]">Ventes signées autour du bien</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={rayonDvf} onChange={e => setRayonDvf(Number(e.target.value))}
                  className="input text-xs py-1" data-testid="rayon-dvf" title="Rayon autour du bien">
                  {[150, 300, 500, 1000].map(r => <option key={r} value={r}>{r} m</option>)}
                </select>
                <select value={dvfDepuis} onChange={e => setDvfDepuis(Number(e.target.value))}
                  className="input text-xs py-1" data-testid="depuis-dvf" title="À partir de quelle année">
                  <option value={0}>toutes les années</option>
                  {[0, 1, 2, 3, 4].map(n => new Date().getFullYear() - n).map(a =>
                    <option key={a} value={a}>depuis {a}</option>)}
                </select>
                <select value={dvfPieces} onChange={e => setDvfPieces(Number(e.target.value))}
                  className="input text-xs py-1" data-testid="pieces-dvf" title="Typologie">
                  <option value={0}>toutes typologies</option>
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 1 ? "1 pièce" : `${n} pièces`}</option>)}
                </select>
                <span className="inline-flex items-center gap-1 text-xs">
                  <input type="number" min="0" placeholder="surf. min" value={dvfSurfaceMin}
                    onChange={e => setDvfSurfaceMin(e.target.value)}
                    className="input text-xs py-1 w-[5.5rem]" data-testid="surface-min-dvf"
                    title="Surface minimale, en m²" />
                  <span className="opacity-50">–</span>
                  <input type="number" min="0" placeholder="surf. max" value={dvfSurfaceMax}
                    onChange={e => setDvfSurfaceMax(e.target.value)}
                    className="input text-xs py-1 w-[5.5rem]" data-testid="surface-max-dvf"
                    title="Surface maximale, en m²" />
                  <span className="opacity-50">m²</span>
                </span>
                <button onClick={() => chercherDvf()} disabled={chargeDvf}
                  className="btn text-xs disabled:opacity-50" data-testid="chercher-dvf">
                  {chargeDvf ? "Recherche…" : "Chercher"}
                </button>
              </div>
            </div>
            <p className="text-xs opacity-70">
              Les actes déclarés à la DGFiP (base DVF) : des prix réellement signés, pas des prix demandés.
              C&apos;est l&apos;argument le plus difficile à contester.
              {Number(dvfSurfaceMin) || Number(dvfSurfaceMax)
                ? " Les bornes de surface que vous posez remplacent la tolérance automatique."
                : bien?.surface
                  ? ` Sans borne de surface, la recherche retient les biens de ${Math.round(bien.surface * 0.5)} à ${Math.round(bien.surface * 1.5)} m².`
                  : ""}
            </p>
            {dvf && dvf.stats && (
              <div className="mt-3 text-sm">
                <p>
                  <strong>{dvf.stats.nombre} ventes</strong> à moins de {rayonDvf} m —
                  médiane <strong>{eurM2(dvf.stats.medianeM2)}</strong>,
                  moitié centrale de {eurM2(dvf.stats.q1M2)} à {eurM2(dvf.stats.q3M2)}.
                </p>
                <p className="text-xs opacity-70 mt-1">
                  Adresse retenue : {dvf.adresse}
                  {dvf.precision !== "housenumber" && " — au niveau de la rue seulement, pas du numéro"}.
                  Dernière vente le {new Date(dvf.stats.derniereVente).toLocaleDateString("fr-FR")}.
                </p>
                <button onClick={voirLesVentes} className="btn text-xs mt-2" data-testid="voir-ventes">
                  Voir les {dvf.ventes.length} ventes en détail
                </button>
              </div>
            )}
            {dvf && !dvf.stats && (
              <p className="mt-3 text-sm opacity-75 italic">Aucune vente comparable dans ce rayon — essayez plus large.</p>
            )}
          </div>

          {/* ————— Le prix de référence du secteur ————— */}
          <div className="card p-5 mb-4 sans-impression">
            <h2 className="font-semibold text-sm mb-1 text-[#1F3B2C]">Prix de référence du secteur</h2>
            <p className="text-xs opacity-70 mb-2">
              MeilleursAgents refuse d&apos;être lu par un serveur. Ouvrez la page à l&apos;adresse du bien
              dans votre navigateur, puis collez-en le texte ici.
            </p>
            <textarea className="input text-sm w-full" rows={2} value={collageRef}
              onChange={e => setCollageRef(e.target.value)}
              placeholder="Collez le texte de la page de prix (Ctrl+A puis Ctrl+C)"
              data-testid="collage-reference" />
            <div className="mt-2">
              <DeposePdf
                testid="pdf-reference"
                occupe={chargeRef}
                onFichier={lireReferencePdf}
                libelle="Glissez ici l'impression PDF de la page de prix"
                aide="ou cliquez pour la choisir sur votre ordinateur"
              />
            </div>
            {diagnosticRef && (
              <div className="mt-2 text-xs bg-amber-50 border border-amber-300 rounded p-2" data-testid="diagnostic-reference">
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap flex-1">{diagnosticRef}</p>
                  <button onClick={() => setDiagnosticRef(null)} className="underline opacity-60 shrink-0">fermer</button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button onClick={lireReference} disabled={!collageRef.trim()}
                className="btn text-xs disabled:opacity-50" data-testid="lire-reference">Lire le prix</button>
              {reference && (
                <p className="text-sm" data-testid="reference-lue">
                  <strong>{eurM2(reference.m2)}</strong>
                  {reference.bas && reference.haut && reference.bas !== reference.haut
                    ? <span className="opacity-70"> — de {eurM2(reference.bas)} à {eurM2(reference.haut)}</span> : null}
                  <button onClick={() => setReference(null)} className="ml-2 text-xs underline opacity-60">retirer</button>
                </p>
              )}
            </div>
          </div>

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

            <div className="mb-4">
              <textarea
                className="input text-sm w-full"
                rows={collage.trim() && !estUnLien(collage) ? 5 : 2}
                placeholder="Collez ici le lien de l'annonce, ou son texte (Ctrl+A puis Ctrl+C sur la page de l'annonce)"
                value={collage}
                onChange={e => setCollage(e.target.value)}
                data-testid="collage-annonce"
              />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={analyserCollage}
                  disabled={analyse || !collage.trim()}
                  className="btn text-xs disabled:opacity-50"
                  data-testid="analyser-annonce"
                >
                  {analyse ? "Lecture…" : estUnLien(collage) ? "Lire ce lien" : "Lire ce texte"}
                </button>
                {motExtraction && (
                  <p className="text-xs opacity-80" data-testid="mot-extraction">{motExtraction}</p>
                )}
              </div>
              <p className="text-[11px] opacity-55 mt-1">
                Les grands portails refusent d&apos;être lus par un serveur. Pour eux : collez le texte, ou déposez l&apos;impression PDF de l&apos;annonce.
              </p>
              <div className="mt-2">
                <DeposePdf
                  testid="pdf-annonce"
                  occupe={analyse}
                  onFichier={analyserPdf}
                  libelle="Glissez ici l'impression PDF de l'annonce"
                  aide="ou cliquez pour la choisir — imprimez la page de l'annonce en PDF depuis votre navigateur"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <input className={`input text-sm md:col-span-2${propose("titre")}`} title={proposes.titre} placeholder="Intitulé (ex. T3 avec balcon, rue Jeanne d'Arc)" value={saisie.titre} onChange={e => maj("titre", e.target.value)} data-testid="saisie-titre" />
              <input className={`input text-sm${propose("ville")}`} title={proposes.ville} placeholder="Ville" value={saisie.ville} onChange={e => maj("ville", e.target.value)} data-testid="saisie-ville" />
              <input className={`input text-sm${propose("prix")}`} title={proposes.prix} type="number" placeholder="Prix affiché (€)" value={saisie.prix} onChange={e => maj("prix", e.target.value)} data-testid="saisie-prix" />
              <input className={`input text-sm${propose("surface")}`} title={proposes.surface} type="number" placeholder="Surface (m²)" value={saisie.surface} onChange={e => maj("surface", e.target.value)} data-testid="saisie-surface" />
              <input className="input text-sm" type="number" placeholder="Prix de vente si vendu (€)" value={saisie.prixVente} onChange={e => maj("prixVente", e.target.value)} data-testid="saisie-prix-vente" />
              <input className={`input text-sm${propose("source")}`} title={proposes.source} placeholder="Source" value={saisie.source} onChange={e => maj("source", e.target.value)} data-testid="saisie-source" />
              <input className={`input text-sm md:col-span-2${propose("lien")}`} title={proposes.lien} placeholder="Lien vers l'annonce (facultatif)" value={saisie.lien} onChange={e => maj("lien", e.target.value)} data-testid="saisie-lien" />
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

      {/* Repli quand le navigateur refuse un onglet : le même document,
          en panneau plein écran, imprimable comme l'onglet le serait. */}
      {apercuVentes && (
        <div className="fixed inset-0 z-50 bg-black/40 sans-impression" data-testid="apercu-ventes"
          onClick={() => { URL.revokeObjectURL(apercuVentes); setApercuVentes(null); }}>
          <div className="absolute inset-4 bg-white rounded shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="text-sm font-semibold text-[#1F3B2C]">Détail des ventes signées</span>
              <button onClick={() => { URL.revokeObjectURL(apercuVentes); setApercuVentes(null); }}
                className="btn text-xs" data-testid="fermer-apercu">Fermer</button>
            </div>
            <iframe src={apercuVentes} className="flex-1 w-full" title="Détail des ventes signées" />
          </div>
        </div>
      )}
    </AdminShell>
  );
}
