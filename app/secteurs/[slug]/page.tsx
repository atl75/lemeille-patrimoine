import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import PropertyCard from "@/components/PropertyCard";
import { getPropertyCards } from "@/lib/propertiesData";
import { notFound } from "next/navigation";
import { seoTitle } from '@/lib/seoTitle';
import { SECTORS, matchesSector, formatCityWithDistrict, type Sector } from "@/lib/sectors";
import BandeauReassurance from "@/components/BandeauReassurance";

// ISR : régénérée au plus toutes les 5 min (+ revalidation immédiate à l'édition d'un bien).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SECTORS[slug];
  // Au-delà de 65 caractères Google tronque : on raccourcit le suffixe.
  const title = s ? seoTitle([s.title]) : seoTitle(["Secteur"]);
  const description = (s?.description || s?.subtitle || "Biens dans le secteur sélectionné.").slice(0, 155);
  return { title, description, alternates: { canonical: `/secteurs/${slug}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }){
  const { slug } = await params;
  const sector = SECTORS[slug];
  if(!sector){
    notFound();
  }
  const all = await getPropertyCards();
  const items = all.filter((p:any)=>matchesSector(p, sector));
  // Secteur sans bien disponible : on propose les biens de la même région plutôt
  // qu'une page vide (mauvaise expérience et « contenu creux » pour le référencement).
  const enVente = (p:any) => p.visible !== false && !p.sold && p.status !== 'SOLD' && p.status !== 'UNDER_OFFER';
  const nearby = items.length ? [] : all
    .filter((p:any) => enVente(p) && String(p.region || '') === String(sector.region || ''))
    .slice(0, 4);

  // Visuel commun à tous les bandeaux institutionnels du site.
  const heroImage = "/hero-normandie.jpg";

  return (
    <main>
      <Hero title={sector.title} subtitle={sector.subtitle} primary={{label:"Tous nos biens", href:"/immobilier"}} image={heroImage} />
      <BandeauReassurance />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Immobilier", href:"/immobilier"},{label: sector.title}]} />
      </section>

      {(sector.description || sector.highlights?.length) && (
        <section className="container pb-8">
          <div className="grid md:grid-cols-3 gap-8">
            {sector.description && (
              <div className="md:col-span-2">
                <h2 className="luxe text-2xl mb-3">Le secteur</h2>
                <p className="opacity-85 leading-relaxed">{sector.description}</p>
              </div>
            )}
            {sector.highlights?.length ? (
              <div className="card p-6 h-fit">
                <h3 className="luxe text-lg mb-3">Points forts</h3>
                <ul className="space-y-2 text-sm">
                  {sector.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#B89C6D] mt-0.5">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <section className="container pb-12">
        <h2 className="luxe text-2xl mb-4">{items.length ? "Nos biens dans ce secteur" : `Vous cherchez à ${sector.title} ?`}</h2>

        {items.length ? (
          <div className="grid md:grid-cols-2 gap-6">
            {items.map((p:any, index:number)=>(
              <PropertyCard
                key={p.id}
                property={p}
                cityLabel={formatCityWithDistrict(p.city)}
                priority={index === 0}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="card p-6 mb-8">
              <p className="opacity-85 leading-relaxed">
                Nous n&apos;avons pas de bien disponible à {sector.title} en ce moment — le marché y est tendu et
                les belles opportunités partent vite, souvent avant même d&apos;être publiées.
                Dites-nous ce que vous cherchez : nous vous prévenons en priorité dès qu&apos;un bien correspond.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/contact?ref=${encodeURIComponent(sector.title)}`} className="btn btn-gold">
                  Être alerté en priorité
                </Link>
                <Link href="/immobilier/estimation" className="btn">
                  Estimer mon bien gratuitement
                </Link>
              </div>
            </div>

            {nearby.length > 0 && (
              <>
                <h3 className="luxe text-xl mb-4">Nos biens à proximité</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {nearby.map((p:any, index:number)=>(
                    <PropertyCard
                      key={p.id}
                      property={p}
                      cityLabel={formatCityWithDistrict(p.city)}
                      priority={index === 0}
                    />
                  ))}
                </div>
                <div className="mt-6">
                  <Link href="/immobilier" className="btn btn-gold">Voir tous nos biens</Link>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* Vendeurs : capture de mandat sur chaque page secteur */}
      <section className="container pb-14">
        <div className="card p-6 md:p-8 text-center">
          <h2 className="luxe text-2xl mb-2">Vous vendez à {sector.title} ?</h2>
          <p className="opacity-80 max-w-2xl mx-auto">
            Obtenez une estimation indicative immédiate, puis un avis de valeur personnalisé sous 3 jours.
            Sans engagement.
          </p>
          <div className="mt-5">
            <Link href="/immobilier/estimation" className="btn btn-gold">Estimer mon bien</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
