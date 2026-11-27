import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import PropertyCard from "@/components/PropertyCard";
import { getPropertyCards } from "@/lib/propertiesData";
import { notFound } from "next/navigation";
import { seoTitle } from '@/lib/seoTitle';
import { pageMetadata, seoText } from '@/lib/pageMetadata';
import { SECTORS, matchesSector, formatCityWithDistrict, locatifDe } from "@/lib/sectors";

// ISR : régénérée au plus toutes les 5 min (+ revalidation immédiate à l'édition d'un bien).
export const revalidate = 300;

const plateauNord = "mont-saint-aignan-bois-guillaume";
const demandeVisite = "/immobilier/estimation#estimation";
const boutonMaison = "Faire estimer ma maison à Mont-Saint-Aignan";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SECTORS[slug];
  if (!s) notFound();
  const title = seoTitle([slug === plateauNord ? "Estimation de maison à Mont-Saint-Aignan et Bois-Guillaume" : s.title]);
  const description = seoText(s.description, s.subtitle, 'Biens dans le secteur sélectionné.');
  return pageMetadata({ title, description, alternates: { canonical: `/secteurs/${slug}` } });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }){
  const { slug } = await params;
  const sector = SECTORS[slug];
  if(!sector){
    notFound();
  }
  const all = await getPropertyCards();
  const items = all.filter((p:any)=>matchesSector(p, sector));
  const estimationLocale = slug === plateauNord;
  const exemple = estimationLocale && items.find(p =>
    p.type === "MAISON" && p.city === "Mont-Saint-Aignan" &&
    (p.status === "SOLD" || p.sold === true) && p.surface > 0
  );
  // Secteur sans bien disponible : on propose les biens de la même région plutôt
  // qu'une page vide (mauvaise expérience et « contenu creux » pour le référencement).
  const enVente = (p:any) => p.visible !== false && !p.sold && p.status !== 'SOLD' && p.status !== 'UNDER_OFFER';
  const nearby = items.length ? [] : all
    .filter((p:any) => enVente(p) && String(p.region || '') === String(sector.region || ''))
    .slice(0, 4);

  // Visuel commun à tous les bandeaux institutionnels du site.
  const heroImage = "/hero-normandie.jpg";
  // « à Bihorel », mais « sur la Côte d'Azur » et « au Mesnil-Esnard ».
  const ou = locatifDe(sector);

  return (
    <main>
      <Hero
        title={estimationLocale ? "Combien vaut ma maison à Mont-Saint-Aignan ?" : sector.title}
        subtitle={sector.subtitle}
        primary={estimationLocale ? { label: boutonMaison, href: demandeVisite } : { label: "Tous nos biens", href: "/immobilier" }}
        secondary={estimationLocale ? { label: "Voir les biens du secteur", href: "#biens-du-secteur" } : undefined}
        image={heroImage}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Immobilier", href:"/immobilier"},{label: sector.title}]} />
      </section>

      {estimationLocale ? (
        <section className="container grid gap-8 pb-12 lg:grid-cols-2">
          <div className="max-w-prose">
            <h2 className="luxe text-3xl mb-4">Comment je détermine le prix de votre maison</h2>
            <p className="leading-relaxed">Je pars des ventes conclues à proximité. Je compare en priorité des maisons de surface, de terrain et de configuration proches de la vôtre. Un prix affiché dans une annonce me renseigne sur la concurrence. Une vente signée me renseigne sur le prix qu’un acheteur a accepté.</p>
            <p className="mt-4 leading-relaxed">Sur place, je regarde ce que les chiffres décrivent mal. Deux jardins de même taille peuvent offrir, l’un, une terrasse lumineuse et calme, l’autre, un vis-à-vis direct. Pour une maison à rénover, j’examine le DPE et les travaux déjà réalisés afin de distinguer ce qui reste à prévoir.</p>
          </div>
          <div className="card h-fit p-6 md:p-8">
            <h2 className="luxe text-2xl mb-3">{exemple ? "Une maison vendue à Mont-Saint-Aignan" : "Votre avis de valeur après la visite"}</h2>
            {exemple && (
              <>
                <p className="mb-4 text-sm">Voici comment les caractéristiques de cette vente du secteur se présentent dans la rubrique « Dossier du bien » d’un avis de valeur.</p>
                <dl className="divide-y border-y mb-4">
                  <div className="flex items-baseline justify-between gap-4 py-2"><dt>Maison</dt><dd>{exemple.surface} m²{exemple.rooms > 0 && ` · ${exemple.rooms} pièces`}</dd></div>
                  {exemple.landSize > 0 && <div className="flex justify-between gap-4 py-2"><dt>Terrain</dt><dd>{exemple.landSize} m²</dd></div>}
                  {/^[A-G]$/.test(exemple.dpe?.classEnergy ?? "") && <div className="flex justify-between gap-4 py-2"><dt>Classe énergétique</dt><dd>DPE {exemple.dpe.classEnergy}</dd></div>}
                </dl>
              </>
            )}
            <p className="leading-relaxed">Dans votre avis de valeur, vous retrouvez les ventes retenues pour la comparaison, les atouts et les contraintes de votre maison, puis la fourchette de prix et la valeur que je vous conseille.</p>
          </div>
        </section>
      ) : (sector.description || sector.highlights?.length) && (
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

      <section id="biens-du-secteur" className="container pb-12 scroll-mt-24">
        <h2 className="luxe text-2xl mb-4">{items.length ? "Nos biens dans ce secteur" : `Vous cherchez ${ou} ?`}</h2>

        {items.length ? (
          <div className="grid md:grid-cols-2 gap-6">
            {items.map((p:any, index:number)=>(
              <PropertyCard
                key={p.id}
                property={p}
                cityLabel={formatCityWithDistrict(p.city)}
                priority={index === 0}
                // Sur une page de secteur, un bien vendu vaut comme référence :
                // photo en gris, prix masqué, carte non cliquable.
                vitrine
              />
            ))}
          </div>
        ) : (
          <>
            <div className="card p-6 mb-8">
              <p className="opacity-85 leading-relaxed">
                Nous n&apos;avons pas de bien disponible {ou} en ce moment — le marché y est tendu et
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
          <h2 className="luxe text-2xl mb-2">Vous vendez {ou} ?</h2>
          <p className="opacity-80 max-w-2xl mx-auto">
            {estimationLocale ? "Je vous rappelle sous 48 heures pour convenir d’une visite chez vous. Vous recevez mon avis de valeur écrit sous 24 heures maximum après la visite. L’estimation est gratuite et sans engagement." : <>
            Décrivez votre bien pour préparer notre échange. Je vous remets un avis de valeur
            personnalisé sous 24 heures maximum après la visite, gratuitement et sans engagement.</>}
          </p>
          <div className="mt-5">
            <Link href={demandeVisite} className="btn btn-gold">{estimationLocale ? boutonMaison : "Estimer mon bien"}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
