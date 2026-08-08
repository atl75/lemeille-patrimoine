import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import DocumentLink from "@/components/DocumentLink";
import { dispositifsOf } from "@/lib/dispositifs";
import { MapPin, Home, Calculator } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function base() {
  return process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT || "3000"}`;
}

async function getProgram(slug: string): Promise<any | null> {
  try {
    const r = await fetch(`${base()}/api/programs`, { cache: "no-store" });
    if (!r.ok) return null;
    const all = await r.json();
    if (!Array.isArray(all)) return null;
    return all.find((p: any) => p.slug === slug || p.id === slug) || null;
  } catch {
    return null;
  }
}

function findLot(p: any, numero: string) {
  const lots = Array.isArray(p?.lots) ? p.lots : [];
  return lots.find((l: any, i: number) => String(l.numero ?? i + 1) === String(numero));
}

const STATUT: Record<string, { label: string; cls: string }> = {
  DISPONIBLE: { label: "Disponible", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  OPTION: { label: "Sous option", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  RESERVE: { label: "Réservé", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  VENDU: { label: "Vendu", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

function lotTotal(lot: any): string {
  const t = (Number(lot.prixPlateau) || 0) + (Number(lot.prixTravaux) || 0);
  return t > 0 ? t.toLocaleString("fr-FR") + " €" : "Nous consulter";
}
const eur = (n: any) => (Number(n) || 0) > 0 ? Number(n).toLocaleString("fr-FR") + " €" : "Nous consulter";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; numero: string }> }): Promise<Metadata> {
  const { slug, numero } = await params;
  const p = await getProgram(slug);
  const lot = p && findLot(p, numero);
  if (!p || !lot) return { title: "Lot — Lemeille Patrimoine" };
  const title = `Lot ${lot.numero ?? numero}${lot.type ? " – " + lot.type : ""} — ${p.title} | Lemeille Patrimoine`;
  return { title, description: `Lot ${lot.numero ?? numero} du programme ${p.title} à ${p.city}.`, alternates: { canonical: `/programmes/${p.slug || p.id}/lots/${numero}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string; numero: string }> }) {
  const { slug, numero } = await params;
  const p = await getProgram(slug);
  if (!p || p.visible === false) notFound();
  const lot = findLot(p, numero);
  if (!lot) notFound();

  const st = STATUT[lot.statut || "DISPONIBLE"] || STATUT.DISPONIBLE;
  const sold = (lot.statut || "DISPONIBLE") === "VENDU";
  const dispositifs = dispositifsOf(p);
  const calendrier: any[] = Array.isArray(p.calendrier) ? p.calendrier : [];
  const livraison = p.livraison || calendrier.find((e: any) => /livraison/i.test(e.etape || ""))?.date || "Nous consulter";
  const dpeCible = lot.dpeCible || p.dpe?.classEnergy;
  const fiscalite = lot.dispositif || dispositifs.map(d => d.nom).join(" / ");
  const contactHref = `/contact?topic=${encodeURIComponent(`${p.title} — Lot ${lot.numero ?? numero}`)}`;

  const progDocs: any[] = (Array.isArray(p.documents) ? p.documents : []).filter((d: any) => d && d.url);
  const lotDocs: any[] = (Array.isArray(lot.documents) ? lot.documents : []).filter((d: any) => d && d.url);
  const allDocs = [...lotDocs, ...progDocs];

  return (
    <main className="container py-8">
      <Breadcrumb items={[
        { label: "Accueil", href: "/" },
        { label: "Défiscalisation", href: "/programmes" },
        { label: p.title, href: `/programmes/${p.slug || p.id}` },
        { label: `Lot ${lot.numero ?? numero}` },
      ]} />

      <div className="mt-6 grid lg:grid-cols-2 gap-8">
        {/* Visuels */}
        <div className="space-y-6">
          {lot.image ? (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lot.image} alt={`Projection intérieure — Lot ${lot.numero ?? numero}`} className="w-full rounded-2xl object-cover" />
              <figcaption className="mt-2 text-center text-sm text-luxe/50">Projection intérieure — <span className="opacity-70">photo non contractuelle</span></figcaption>
            </figure>
          ) : (
            <div className="w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#1F3B2C] to-[#2e5140] flex items-center justify-center text-cream/70 text-sm">Projection à venir</div>
          )}
          {lot.plan && (
            /\.pdf($|\?)/i.test(lot.plan) ? (
              <DocumentLink name={`Plan — Lot ${lot.numero ?? numero}`} subtitle="PDF" url={lot.plan} />
            ) : (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lot.plan} alt={`Plan — Lot ${lot.numero ?? numero}`} className="w-full rounded-2xl object-contain bg-white border" />
                <figcaption className="mt-2 text-center text-sm text-luxe/50">Plan du lot</figcaption>
              </figure>
            )
          )}
        </div>

        {/* Informations */}
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="luxe text-3xl md:text-4xl text-luxe">
                Lot {lot.numero ?? numero}{lot.type ? ` – ${lot.type}` : ""}{lot.surfaceApresTravaux ? ` – ${Number(lot.surfaceApresTravaux).toLocaleString("fr-FR")} m²` : ""}
              </h1>
              <span className={`text-xs rounded-full border px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
            </div>
            <p className="mt-1 text-luxe/60">{lot.type || "Lot"}{lot.etage ? ` · ${lot.etage} étage` : ""}</p>
          </div>

          {/* Détails du lot */}
          <div className="card p-6">
            <h2 className="luxe text-xl mb-4">Détails du lot</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-luxe/60">Surface vendue actuelle</span><span className="font-medium">{lot.surfaceActuelle ? `${Number(lot.surfaceActuelle).toLocaleString("fr-FR")} m²` : "—"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-luxe/60">Prix plateau</span><span className="font-medium">{eur(lot.prixPlateau)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-luxe/60">Surface après travaux</span><span className="font-medium">{lot.surfaceApresTravaux ? `${Number(lot.surfaceApresTravaux).toLocaleString("fr-FR")} m²` : "—"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-luxe/60">Prix travaux</span><span className="font-medium">{eur(lot.prixTravaux)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-luxe/60">DPE cible</span><span className="font-medium">{dpeCible ? `Classe ${String(dpeCible).toUpperCase()}` : "—"}</span></div>
              <div className="flex justify-between gap-3 sm:border-l sm:pl-6 border-black/5"><span className="text-luxe/60">Prix total</span><span className="font-semibold text-[#B89C6D]">{lotTotal(lot)}</span></div>
            </div>
          </div>

          {/* Tuiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <MapPin className="w-5 h-5" />, label: "Emplacement", value: p.city || "—" },
              { icon: <Home className="w-5 h-5" />, label: "Livraison", value: livraison },
              { icon: <Calculator className="w-5 h-5" />, label: "Fiscalité", value: fiscalite ? `${fiscalite} éligible` : "—" },
            ].map((t, i) => (
              <div key={i} className="card p-4 text-center">
                <div className="text-gold flex justify-center mb-1.5">{t.icon}</div>
                <div className="text-sm font-medium text-luxe">{t.label}</div>
                <div className="text-xs text-luxe/55 mt-0.5">{t.value}</div>
              </div>
            ))}
          </div>

          {!sold && (
            <Link href={contactHref} className="btn btn-gold w-full text-center">Ce lot m&apos;intéresse</Link>
          )}
        </div>
      </div>

      {/* Documents */}
      {allDocs.length > 0 && (
        <section className="mt-12">
          <h2 className="luxe text-2xl text-luxe mb-4">Documents à télécharger</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {allDocs.map((d: any, i: number) => (
              <DocumentLink key={i} name={d.name} subtitle={d.subtitle} url={d.url} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <Link href={`/programmes/${p.slug || p.id}`} className="text-sm text-luxe/60 hover:text-luxe">← Retour au programme {p.title}</Link>
      </div>
    </main>
  );
}
