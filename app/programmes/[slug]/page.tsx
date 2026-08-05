import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { dispositifsOf, dispositifLabel } from "@/lib/dispositifs";
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProgram(slug);
  if (!p) return { title: "Programme — Lemeille Patrimoine" };
  const dispo = dispositifsOf(p).map(d => d.nom).join(", ");
  return {
    title: `${p.title} — ${p.city} | Défiscalisation ${dispo} | Lemeille Patrimoine`,
    description: p.summary || p.accroche || `Programme de défiscalisation à ${p.city}.`,
    alternates: { canonical: `/programmes/${p.slug || p.id}` },
    openGraph: {
      title: `${p.title} — ${p.city}`,
      description: p.summary || p.accroche || "",
      url: `/programmes/${p.slug || p.id}`,
      type: "website",
      images: p.heroImage || p.coverImage ? [{ url: p.heroImage || p.coverImage }] : undefined,
    },
  };
}

const eur = (n: any) => (n || n === 0) && !isNaN(Number(n)) ? Number(n).toLocaleString("fr-FR") + " €" : null;

const STATUT: Record<string, { label: string; cls: string }> = {
  DISPONIBLE: { label: "Disponible", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  OPTION: { label: "Sous option", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  RESERVE: { label: "Réservé", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

function lotPrice(lot: any): string {
  const plateau = Number(lot.prixPlateau) || 0;
  const travaux = Number(lot.prixTravaux) || 0;
  const total = plateau + travaux;
  return total > 0 ? total.toLocaleString("fr-FR") + " €" : "Nous consulter";
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProgram(slug);
  if (!p || p.visible === false) notFound();

  const dispositifs = dispositifsOf(p);
  const lots: any[] = Array.isArray(p.lots) ? p.lots : [];
  const dispo = lots.filter(l => (l.statut || "DISPONIBLE") === "DISPONIBLE").length;
  const proximite: any[] = Array.isArray(p.proximite) ? p.proximite : [];
  const plans: any[] = [...(Array.isArray(p.projections) ? p.projections : []), ...(Array.isArray(p.plans) ? p.plans : [])];
  const hero = p.heroImage || p.coverImage || "/hero-accueil.jpg";
  const mapQuery = p.mapQuery || p.address || `${p.title}, ${p.city}`;
  const contactHref = `/contact?topic=${encodeURIComponent("Programme " + p.title)}`;

  return (
    <main>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <Image src={hero} alt={p.title} fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12241b]/90 via-[#1F3B2C]/65 to-[#1F3B2C]/25" />
        <div className="container relative flex min-h-[60vh] md:min-h-[70vh] flex-col justify-center py-20">
          <div className="flex flex-wrap gap-2 mb-4">
            {dispositifs.map(d => (
              <span key={d.code} className="text-[11px] font-medium uppercase tracking-[0.18em] text-luxe bg-gold/90 rounded-full px-3 py-1">
                {d.nom}
              </span>
            ))}
          </div>
          <h1 className="text-4xl md:text-6xl luxe text-cream leading-[1.05]">{p.title}</h1>
          <div className="mt-3 text-cream/80">{p.address || `${p.city}`}</div>
          {p.accroche && <p className="mt-5 max-w-xl text-base md:text-lg text-cream/90 leading-relaxed">{p.accroche}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-cream/85">
            {lots.length > 0 && <span>{lots.length} lot{lots.length > 1 ? "s" : ""}{dispo > 0 ? ` · ${dispo} disponible${dispo > 1 ? "s" : ""}` : ""}</span>}
            {p.livraison && <span>Livraison {p.livraison}</span>}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link href={contactHref} className="btn btn-gold">Être recontacté</Link>
            {lots.length > 0 && (
              <a href="#lots" className="group inline-flex items-center gap-1.5 font-medium text-cream/90 hover:text-cream transition-colors">
                Voir les lots<span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="container py-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Défiscalisation", href: "/programmes" }, { label: p.title }]} />
      </section>

      {/* LE PROGRAMME */}
      {(p.intro || (p.caracteristiques || []).length || (p.finitions || []).length || (p.pointsForts || []).length) && (
        <section className="container py-10">
          <h2 className="luxe text-3xl md:text-4xl text-luxe">Le programme</h2>
          <div className="mt-3 h-px w-14 bg-gold/60" />
          {p.intro && <p className="mt-6 max-w-3xl text-luxe/70 leading-relaxed">{p.intro}</p>}

          {(p.pointsForts || []).length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {p.pointsForts.map((f: string, i: number) => (
                <span key={i} className="text-sm rounded-full border border-gold/30 bg-white/60 px-3 py-1 text-luxe/80">✦ {f}</span>
              ))}
            </div>
          )}

          <div className="mt-8 grid md:grid-cols-2 gap-8">
            {(p.caracteristiques || []).length > 0 && (
              <div className="card p-6">
                <h3 className="luxe text-xl mb-3">Caractéristiques générales</h3>
                <ul className="space-y-2 text-sm text-luxe/80">
                  {p.caracteristiques.map((c: string, i: number) => <li key={i} className="flex gap-2"><span className="text-gold">•</span>{c}</li>)}
                </ul>
              </div>
            )}
            {(p.finitions || []).length > 0 && (
              <div className="card p-6">
                <h3 className="luxe text-xl mb-3">Finitions & équipements</h3>
                <ul className="space-y-2 text-sm text-luxe/80">
                  {p.finitions.map((c: string, i: number) => <li key={i} className="flex gap-2"><span className="text-gold">•</span>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* AVANTAGES FISCAUX */}
      {dispositifs.length > 0 && (
        <section className="bg-white/50 border-y border-gold/20 py-14">
          <div className="container">
            <h2 className="luxe text-3xl md:text-4xl text-luxe">Avantages fiscaux</h2>
            <div className="mt-3 h-px w-14 bg-gold/60" />
            <p className="mt-4 max-w-2xl text-luxe/60">Ce programme est éligible aux dispositifs suivants. Le montage est vérifié et l'accompagnement assuré jusqu'à la mise en location.</p>
            <div className={`mt-8 grid gap-6 ${dispositifs.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              {dispositifs.map(d => (
                <div key={d.code} className="card p-6">
                  <h3 className="luxe text-xl mb-1">{d.nom}</h3>
                  <p className="text-sm font-medium text-[#B89C6D] mb-3">{d.accroche}</p>
                  <p className="text-sm text-luxe/70 mb-4">{d.detail}</p>
                  <ul className="space-y-1.5 text-sm text-luxe/80">
                    {d.features.map((f, i) => <li key={i} className="flex gap-2"><span className="text-gold">•</span>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-luxe/50">Informations données à titre indicatif. Un conseiller affine selon votre situation fiscale.</p>
          </div>
        </section>
      )}

      {/* LES LOTS */}
      <section id="lots" className="container py-14">
        <h2 className="luxe text-3xl md:text-4xl text-luxe">Les lots</h2>
        <div className="mt-3 h-px w-14 bg-gold/60" />
        {lots.length === 0 ? (
          <div className="card p-6 mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-luxe/70 max-w-xl">La grille des lots de ce programme est disponible sur demande. Contactez-nous pour recevoir les surfaces, prix et disponibilités à jour.</p>
            <Link href={contactHref} className="btn btn-gold">Demander la grille</Link>
          </div>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lots.map((lot, i) => {
              const st = STATUT[lot.statut || "DISPONIBLE"] || STATUT.DISPONIBLE;
              const surfAfter = Number(lot.surfaceApresTravaux) || 0;
              const surfNow = Number(lot.surfaceActuelle) || 0;
              return (
                <div key={i} className="card overflow-hidden flex flex-col">
                  {lot.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lot.image} alt={`Lot ${lot.numero || i + 1}`} className="w-full h-44 object-cover" />
                  )}
                  <div className="p-5 flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="luxe text-lg">Lot {lot.numero ?? i + 1}{lot.type ? ` · ${lot.type}` : ""}</span>
                      <span className={`text-xs rounded-full border px-2 py-0.5 ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="text-sm text-luxe/60">
                      {lot.etage ? `${lot.etage} étage` : ""}
                      {surfAfter ? ` · ${surfNow ? `${surfNow} → ` : ""}${surfAfter} m²` : (surfNow ? ` · ${surfNow} m²` : "")}
                    </div>
                    {lot.description && <p className="text-sm text-luxe/70">{lot.description}</p>}
                    {(lot.annexeDescription || lot.annexeSurface) && (
                      <div className="text-xs text-luxe/50">Annexe : {lot.annexeDescription || ""}{lot.annexeSurface ? ` (${lot.annexeSurface} m²)` : ""}</div>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <span className="font-semibold text-[#B89C6D]">{lotPrice(lot)}</span>
                      <Link href={contactHref} className="text-sm underline text-luxe/70 hover:text-luxe">Ce lot m&apos;intéresse</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PROJECTIONS / PLANS */}
      {(p.virtualTourUrl || plans.length > 0) && (
        <section className="bg-white/50 border-y border-gold/20 py-14">
          <div className="container">
            <h2 className="luxe text-3xl md:text-4xl text-luxe">Projections & plans</h2>
            <div className="mt-3 h-px w-14 bg-gold/60" />
            {p.virtualTourUrl && (
              <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl shadow">
                <iframe src={p.virtualTourUrl} title="Visite virtuelle" className="w-full h-full" allowFullScreen loading="lazy" />
              </div>
            )}
            {plans.length > 0 && (
              <div className="mt-8 grid md:grid-cols-3 gap-5">
                {plans.map((pl: any, i: number) => (
                  <figure key={i} className="card overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {pl.image && <img src={pl.image} alt={pl.title || `Plan ${i + 1}`} className="w-full h-56 object-cover" />}
                    {pl.title && <figcaption className="p-3 text-sm text-luxe/70">{pl.title}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* EMPLACEMENT */}
      <section className="container py-14">
        <h2 className="luxe text-3xl md:text-4xl text-luxe">Emplacement</h2>
        <div className="mt-3 h-px w-14 bg-gold/60" />
        <div className="mt-8 grid md:grid-cols-2 gap-8 items-start">
          <div>
            {p.address && (
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-luxe/45 mb-1">Adresse</div>
                <div className="text-luxe/80">{p.address}</div>
              </div>
            )}
            {proximite.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-luxe/45 mb-2">À proximité</div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-luxe/75">
                  {proximite.map((pt: any, i: number) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-black/5 py-1">
                      <span>{typeof pt === "string" ? pt : pt.nom}</span>
                      {pt.distance && <span className="text-luxe/45">{pt.distance}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="h-80 rounded-xl overflow-hidden shadow">
            <iframe
              title={`Localisation ${p.title}`}
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
