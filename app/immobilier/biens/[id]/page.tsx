import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import DPECard from "@/components/DPECard";
import MapEmbed from "@/components/MapEmbed";
import PropertyGallery from "@/components/PropertyGallery";
import PropertySeoJsonLd from "@/components/PropertySeoJsonLd";
import { getVideoEmbedUrl, isImageDocument } from "@/lib/utils";
import type { Metadata } from 'next';

async function getProperty(id: string){
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT||'3000'}`;
  const r = await fetch(`${base}/api/properties/${id}`, { cache: 'no-store' });
  return r.ok ? r.json() : null;
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const p = await getProperty(id);
  if (!p) return { title: "Bien introuvable | Lemeille Patrimoine" };

  const region = p.region ? String(p.region).replaceAll('_', ' ') : '';
  const title = `${p.title} — ${p.city}${region ? `, ${region}` : ''} | Lemeille Patrimoine`;
  const description = p.description
    ? p.description.slice(0, 155)
    : `${p.type === 'MAISON' ? 'Maison' : 'Appartement'} à ${p.city}, ${p.surface ?? '—'} m², ${p.rooms ?? '—'} pièces.`;
  const coverImage = Array.isArray(p.images) && p.images.length ? p.images[0] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/immobilier/biens/${p.id}` },
    openGraph: {
      title,
      description,
      url: `/immobilier/biens/${p.id}`,
      type: 'website',
      images: coverImage ? [{ url: coverImage }] : undefined,
    }
  };
}

export default async function Page(props: { params: Promise<{ id: string }> }){
  const params = await props.params;
  const p = await getProperty(params.id);
  if (!p) return <main className="container py-12">Bien introuvable.</main>;
  const imgs: string[] = Array.isArray(p.images) && p.images.length ? p.images : ['/logo.svg'];
  const videoEmbedUrl = getVideoEmbedUrl(p.videoUrl);
  // Plans : plusieurs documents possibles (repli sur le plan unique hérité)
  const plans: string[] = Array.isArray(p.floorPlans) && p.floorPlans.length
    ? p.floorPlans
    : (p.floorPlan ? [p.floorPlan] : []);

  // Localisation : en mode EXACT, on affiche l'adresse précise (carte + lien
  // Google Maps). En mode AREA (zone), on n'expose que la ville pour préserver
  // la confidentialité — le clic vers Google Maps ne révèle pas l'adresse.
  const mapPrecision: 'EXACT' | 'AREA' = p.map?.precision === 'EXACT' ? 'EXACT' : 'AREA';
  const mapQuery = mapPrecision === 'EXACT' ? p.map?.query : (p.city || p.map?.query);

  // Bloc « Caractéristiques » rendu à deux emplacements : sur mobile dans la
  // colonne principale (position d'origine), sur desktop dans la colonne de
  // droite au-dessus du DPE (via les classes de visibilité md:).
  const caracteristiquesCard = (
    <div className="card p-6">
      <h2 className="luxe text-2xl mb-3">Caractéristiques</h2>
      <ul className="grid sm:grid-cols-2 gap-2 text-sm">
        <li><strong>Prix</strong> : {p.priceOnRequest ? 'Nous consulter' : (p.price ? Number(p.price).toLocaleString('fr-FR')+' €' : '—')}</li>
        <li><strong>Surface</strong> : {p.surface ?? '—'} m²</li>
        <li><strong>Pièces</strong> : {p.rooms ?? '—'}</li>
        {p.type === 'MAISON' && p.landSize ? <li><strong>Terrain</strong> : {p.landSize} m²</li> : null}
        {p.annexSurface && <li><strong>Surface hors Carrez</strong> : {p.annexSurface} m²</li>}
        {p.propertyTaxAmount ? <li><strong>Taxe foncière</strong> : {Number(p.propertyTaxAmount).toLocaleString('fr-FR')} €/an</li> : null}
        {p.coproChargesMonthly ? <li><strong>Charges de copropriété</strong> : {Number(p.coproChargesMonthly).toLocaleString('fr-FR')} €/mois</li> : null}
        <li><strong>Référence</strong> : {p.id}</li>
      </ul>
      {Array.isArray(p.features) && p.features.length>0 && (
        <>
          <h3 className="luxe text-xl mt-5 mb-2">Atouts du bien</h3>
          <div className="flex flex-wrap gap-2">
            {p.features.map((f:string,i:number)=>(<span key={i} className="px-3 py-1 rounded-2xl border bg-white/70 text-sm">{f}</span>))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <main>
      <PropertySeoJsonLd property={p} />
      <Hero
        title={p.title}
        subtitle={<span>{p.city}{p.region?` · ${String(p.region).replaceAll('_',' ')}`:''}</span>}
        primary={{label:"Télécharger la fiche PDF", href:`/api/properties/${p.id}/pdf`}}
        secondary={{label:"Contact", href:`/contact?ref=${encodeURIComponent(p.id)}`}}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Immobilier", href:"/immobilier"},{label:p.title}]} />
      </section>

      <section className="container pb-12 grid md:grid-cols-3 gap-6">
        {/* Colonne gauche (galerie + infos) */}
        <div className="md:col-span-2">
          <PropertyGallery images={imgs} title={p.title} />

          {videoEmbedUrl && (
            <div className="card p-6 mt-6">
              <h2 className="luxe text-2xl mb-3">Visite en vidéo</h2>
              <div className="relative w-full pt-[56.25%] rounded-xl overflow-hidden">
                <iframe
                  src={videoEmbedUrl}
                  title={`Vidéo — ${p.title}`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Caractéristiques — mobile uniquement (desktop : colonne de droite, au-dessus du DPE) */}
          <div className="md:hidden mt-6">{caracteristiquesCard}</div>

          <div className="card p-6 mt-4">
            <h2 className="luxe text-2xl mb-3">Description</h2>
            <p className="whitespace-pre-line">{p.description}</p>
          </div>

          {plans.length > 0 && (
            <div className="card p-6 mt-4">
              <h2 className="luxe text-2xl mb-3">{plans.length > 1 ? 'Plans du bien' : 'Plan du bien'}</h2>
              <div className="grid gap-4">
                {plans.map((plan, i) => (
                  isImageDocument(plan) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={plan} alt={`Plan ${i + 1} — ${p.title}`} className="w-full h-auto rounded-xl border" />
                  ) : (
                    <a key={i} href={plan} target="_blank" rel="noopener noreferrer" className="btn btn-gold inline-flex w-fit">
                      Consulter le plan {plans.length > 1 ? i + 1 : ''} (PDF)
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : flex vertical, cartes et bouton PDF pleine largeur,
            empilés naturellement (pas d'espace vide sous la dernière carte). */}
        <div className="flex flex-col gap-4">
          {/* Caractéristiques au-dessus du DPE — desktop uniquement */}
          <div className="hidden md:block">{caracteristiquesCard}</div>
          <DPECard dpe={p.dpe} />
          <div className="card p-6">
            <h3 className="luxe text-xl mb-3">Localisation</h3>
            {mapQuery
              ? <MapEmbed query={mapQuery} precision={mapPrecision}/>
              : <div className="text-sm opacity-80">Adresse non communiquée.</div>}
          </div>
          <a className="btn btn-gold text-center w-full" href={`/api/properties/${p.id}/pdf`}>Télécharger la fiche PDF</a>
        </div>
      </section>
    </main>
  );
}
