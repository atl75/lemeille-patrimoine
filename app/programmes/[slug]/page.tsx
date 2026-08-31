import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeferredIframe from "@/components/DeferredIframe";
import Breadcrumb from "@/components/Breadcrumb";
import ProgramSeoJsonLd from "@/components/ProgramSeoJsonLd";
import ProjectionsGallery from "@/components/ProjectionsGallery";
import { dispositifsOf, dispositifLabel } from "@/lib/dispositifs";
import { Zap, Wrench, CalendarDays, ExternalLink, Camera } from "lucide-react";

const ENERGY_COLORS: Record<string, string> = { A: "#2e7d32", B: "#558b2f", C: "#9e9d24", D: "#f9a825", E: "#fb8c00", F: "#f4511e", G: "#c62828" };
const GES_COLORS: Record<string, string> = { A: "#8e6fc4", B: "#7e57c2", C: "#6f42b5", D: "#5e35b1", E: "#512da8", F: "#45279a", G: "#3a2185" };

function DpeLetter({ c, kind }: { c?: string; kind: "energy" | "ges" }) {
  const letter = String(c || "").toUpperCase();
  if (!letter) return <span className="text-luxe/70">—</span>;
  const color = (kind === "energy" ? ENERGY_COLORS : GES_COLORS)[letter] || "#9ca3af";
  return (
    <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-md text-white font-bold text-sm" style={{ background: color }}>
      {letter}
    </span>
  );
}
import { seoTitle } from '@/lib/seoTitle';
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
  if (!p || p.visible === false) notFound();
  const dispo = dispositifsOf(p).map(d => d.nom).join(", ");
  return {
    title: seoTitle([`${p.title}`, p.city, dispo ? `Défiscalisation ${dispo}` : null]),
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
  RESERVE: { label: "Réservé", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  VENDU: { label: "Vendu", cls: "bg-gray-100 text-gray-500 border-gray-200" },
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
  const calendrier: any[] = Array.isArray(p.calendrier) ? p.calendrier : [];
  const equipements: any[] = Array.isArray(p.equipements) ? p.equipements : [];
  const hasDpe = p.dpe && (p.dpe.classEnergy || p.dpe.classGES);
  const hero = p.heroImage || p.coverImage || "/hero-accueil.jpg";
  const mapQuery = p.mapQuery || p.address || `${p.title}, ${p.city}`;
  const contactHref = `/contact?topic=${encodeURIComponent("Programme " + p.title)}`;

  return (
    <main>
      <ProgramSeoJsonLd program={p} />
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <Image src={hero} alt={p.title} fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12241b]/90 via-[#1F3B2C]/65 to-[#1F3B2C]/25" />
        <div className="container relative flex min-h-[var(--hero-h-programme)] w-full flex-col justify-center py-8 md:min-h-[var(--hero-h)] md:py-12">
          <div className="flex flex-wrap gap-2 mb-3">
            {dispositifs.map(d => (
              <span key={d.code} className="text-[11px] font-medium uppercase tracking-[0.18em] text-luxe bg-gold/90 rounded-full px-3 py-1">
                {d.nom}
              </span>
            ))}
          </div>
          <h1 className="text-4xl md:text-5xl luxe text-cream leading-tight">{p.title}</h1>
          <div className="mt-3 text-cream/80">{p.address || `${p.city}`}</div>
          {p.accroche && <p className="mt-4 max-w-xl text-sm md:text-lg text-cream/90 leading-relaxed">{p.accroche}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-cream/85">
            {lots.length > 0 && <span>{lots.length} lot{lots.length > 1 ? "s" : ""}{dispo > 0 ? ` · ${dispo} disponible${dispo > 1 ? "s" : ""}` : ""}</span>}
            {p.livraison && <span>Livraison {p.livraison}</span>}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <Link href={contactHref} className="btn btn-gold">Être recontacté</Link>
            {p.externalUrl && /^https?:\/\//.test(p.externalUrl) && (
              <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm font-medium text-cream hover:bg-cream/10 transition-colors">
                <ExternalLink className="w-4 h-4" /> Site du programme
              </a>
            )}
            {p.suiviChantierUrl && /^https?:\/\//.test(p.suiviChantierUrl) && (
              <a href={p.suiviChantierUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 rounded-full border border-cream/40 px-4 py-2 text-sm font-medium text-cream hover:bg-cream/10 transition-colors">
                <Camera className="w-4 h-4" /> Suivi de chantier
              </a>
            )}
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

      {/* PROJECTIONS / PLANS */}
      {(p.virtualTourUrl || plans.length > 0) && (
        <section className="bg-white/50 border-y border-gold/20 py-14">
          <div className="container">
            <h2 className="luxe text-3xl md:text-4xl text-luxe">Projections & plans</h2>
            <div className="mt-3 h-px w-14 bg-gold/60" />
            {p.virtualTourUrl && (
              <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl shadow">
                <DeferredIframe
                  src={p.virtualTourUrl}
                  title={`Visite virtuelle — ${p.title}`}
                  mode="click"
                  poster={p.coverImage}
                  label="Lancer la visite virtuelle"
                  hint="Contenu externe — environ 11 Mo"
                  allowFullScreen
                />
              </div>
            )}
            {plans.length > 0 && (
              <div className="mt-8">
                <ProjectionsGallery items={plans} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* AVANTAGES FISCAUX */}
      {dispositifs.length > 0 && (
        <section className="container py-14">
          <h2 className="luxe text-3xl md:text-4xl text-luxe">Avantages fiscaux</h2>
          <div className="mt-3 h-px w-14 bg-gold/60" />
          <p className="mt-4 max-w-2xl text-luxe/70">Ce programme est éligible aux dispositifs suivants. Le montage est vérifié et l&apos;accompagnement assuré jusqu&apos;à la mise en location.</p>
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
          <p className="mt-6 text-xs text-luxe/70">Informations données à titre indicatif. Un conseiller affine selon votre situation fiscale.</p>
        </section>
      )}

      {/* LES LOTS */}
      <section id="lots" className="bg-white/50 border-y border-gold/20 py-14">
        <div className="container">
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
                const disponible = (lot.statut || "DISPONIBLE") === "DISPONIBLE";
                const sold = (lot.statut || "DISPONIBLE") === "VENDU";
                const surfAfter = Number(lot.surfaceApresTravaux) || 0;
                const surfNow = Number(lot.surfaceActuelle) || 0;
                const cls = `card overflow-hidden flex flex-col transition-all ${disponible ? "ring-2 ring-emerald-200 shadow-sm hover:shadow-lg hover:-translate-y-1 cursor-pointer" : "opacity-75"}`;
                const inner = (
                  <>
                    {lot.image && (
                      <div className={`relative w-full h-44 ${!disponible ? "grayscale" : ""}`}>
                        <Image src={lot.image} alt={`Lot ${lot.numero || i + 1}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col gap-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="luxe text-lg">Lot {lot.numero ?? i + 1}{lot.type ? ` · ${lot.type}` : ""}</span>
                        <span className={`text-xs rounded-full border px-2.5 py-0.5 whitespace-nowrap font-semibold ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="text-sm text-luxe/70">
                        {lot.etage ? `${lot.etage} étage` : ""}
                        {surfAfter ? ` · ${surfNow ? `${surfNow} → ` : ""}${surfAfter} m²` : (surfNow ? ` · ${surfNow} m²` : "")}
                      </div>
                      {lot.dispositif && (
                        <div className="text-xs font-medium text-[#B89C6D]">Éligible : {lot.dispositif}</div>
                      )}
                      {lot.description && <p className="text-sm text-luxe/70">{lot.description}</p>}
                      {(lot.annexeDescription || lot.annexeSurface) && (
                        <div className="text-xs text-luxe/70">Annexe : {lot.annexeDescription || ""}{lot.annexeSurface ? ` (${lot.annexeSurface} m²)` : ""}</div>
                      )}
                      <div className="mt-auto pt-3 border-t border-black/5 space-y-1 text-sm">
                        <div className="flex items-center justify-between"><span className="text-luxe/70">Foncier</span><span className="text-luxe/80">{eur(lot.prixPlateau) || "—"}</span></div>
                        <div className="flex items-center justify-between"><span className="text-luxe/70">Travaux</span><span className="text-luxe/80">{eur(lot.prixTravaux) || "—"}</span></div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-black/5">
                          <span className="font-semibold text-luxe">Total</span>
                          {(() => {
                            const hasPrice = ((Number(lot.prixPlateau) || 0) + (Number(lot.prixTravaux) || 0)) > 0;
                            return (
                              <span className={`font-semibold ${sold && hasPrice ? "text-luxe/70 line-through" : disponible ? "text-[#B89C6D]" : "text-luxe/70"}`}>{lotPrice(lot)}</span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </>
                );
                return disponible ? (
                  <Link key={i} href={`/programmes/${p.slug || p.id}/lots/${lot.numero ?? i + 1}`} className={cls}>{inner}</Link>
                ) : (
                  <div key={i} className={cls}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* DPE CIBLE */}
      {hasDpe && (
        <section className="container py-14">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="luxe text-3xl md:text-4xl text-luxe">DPE cible</h2>
            <div className="mt-3 h-px w-14 bg-gold/60 mx-auto" />
            <p className="mt-4 text-luxe/70">Performance énergétique optimisée après rénovation</p>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="luxe text-xl mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-gold" /> Performance énergétique</h3>
              <dl className="divide-y divide-black/5">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-luxe/70">Classe énergétique cible</dt>
                  <dd><DpeLetter c={p.dpe.classEnergy} kind="energy" /></dd>
                </div>
                {p.dpe.consumption && (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-luxe/70">Consommation estimée</dt>
                    <dd className="text-sm font-medium text-luxe">{p.dpe.consumption}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-luxe/70">Émissions de GES</dt>
                  <dd><DpeLetter c={p.dpe.classGES} kind="ges" /></dd>
                </div>
                {p.dpe.emissions && (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-luxe/70">Émissions estimées</dt>
                    <dd className="text-sm font-medium text-luxe">{p.dpe.emissions}</dd>
                  </div>
                )}
              </dl>
            </div>
            {equipements.length > 0 && (
              <div className="card p-6">
                <h3 className="luxe text-xl mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-gold" /> Équipements performants</h3>
                <ul className="space-y-4">
                  {equipements.map((e: any, i: number) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-gold mt-1.5 text-[10px]">●</span>
                      <div>
                        <div className="font-medium text-luxe">{e.title || e.titre}</div>
                        {(e.subtitle || e.description) && <div className="text-sm text-luxe/70">{e.subtitle || e.description}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="mt-6 text-xs text-luxe/70 text-center">Performance visée après travaux — valeurs indicatives, non contractuelles.</p>
        </section>
      )}

      {/* CALENDRIER DU PROJET */}
      {calendrier.length > 0 && (
        <section className="bg-white/50 border-y border-gold/20 py-14">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="luxe text-3xl md:text-4xl text-luxe">Calendrier du projet</h2>
              <div className="mt-3 h-px w-14 bg-gold/60 mx-auto" />
              <p className="mt-4 text-luxe/70">Planning détaillé de la commercialisation à la livraison</p>
            </div>
            <div className="mt-10 relative">
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gold/30" aria-hidden />
              <ol className="space-y-4">
                {calendrier.map((etape: any, i: number) => (
                  <li key={i} className="relative pl-10">
                    <span className="absolute left-0 top-4 h-6 w-6 rounded-full border-2 border-gold bg-cream flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-gold" />
                    </span>
                    <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="luxe text-lg text-luxe">{etape.etape || etape.title}</h3>
                        {etape.description && <p className="text-sm text-luxe/70 mt-0.5">{etape.description}</p>}
                      </div>
                      {etape.date && (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B89C6D] whitespace-nowrap">
                          <CalendarDays className="w-4 h-4" /> {etape.date}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {p.suiviChantierUrl && /^https?:\/\//.test(p.suiviChantierUrl) && (
              <a href={p.suiviChantierUrl} target="_blank" rel="noopener noreferrer" className="group mt-10 card p-5 flex flex-wrap items-center justify-between gap-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15 text-[#B89C6D]"><Camera className="w-5 h-5" /></span>
                  <div>
                    <div className="luxe text-lg text-luxe">Suivi de chantier en direct</div>
                    <p className="text-sm text-luxe/70">Photos d&apos;avancement et planning mis à jour régulièrement</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B89C6D] whitespace-nowrap">
                  Accéder au suivi <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
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
                <div className="text-xs font-semibold uppercase tracking-wider text-luxe/70 mb-1">Adresse</div>
                <div className="text-luxe/80">{p.address}</div>
              </div>
            )}
            {proximite.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-luxe/70 mb-2">À proximité</div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-luxe/75">
                  {proximite.map((pt: any, i: number) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-black/5 py-1">
                      <span>{typeof pt === "string" ? pt : pt.nom}</span>
                      {pt.distance && <span className="text-luxe/70">{pt.distance}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="h-80 rounded-xl overflow-hidden shadow">
            <DeferredIframe
              title={`Localisation ${p.title}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
