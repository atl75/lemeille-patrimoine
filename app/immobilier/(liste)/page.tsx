import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Img from "@/components/Img";
import FilterBar from "@/components/FilterBar";
import SoldToggle from "@/components/SoldToggle";
import PropertyCard from "@/components/PropertyCard";
import AlerteBiens from "@/components/AlerteBiens";
import { allFeatures } from "@/lib/features";
import { getPropertyCards } from "@/lib/propertiesData";
import { propertyTypology } from "@/lib/propertyLabel";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Biens à vendre à Rouen | Lemeille Patrimoine',
  description: 'Maisons et appartements à vendre à Rouen, Mont-Saint-Aignan, Bois-Guillaume et Plateau Nord. Biens de caractère sélectionnés, accompagnement personnalisé.',
  alternates: {
    canonical: '/immobilier'
  },
  openGraph: {
    title: 'Biens à vendre à Rouen & Plateau Nord',
    description: 'Maisons et appartements de caractère à Rouen et sur le Plateau Nord.',
    url: '/immobilier',
    type: 'website',
  }
};

// ISR : page mise en cache et régénérée au plus toutes les 5 min. Les
// modifications de biens dans l'admin déclenchent une régénération immédiate
// (revalidatePath dans les routes de mutation).
export const revalidate = 300;

const SECTORS = [
  { value: "paris", label: "Paris" },
  { value: "normandie", label: "Normandie" },
  { value: "cote-azur", label: "Côte d'Azur" },
];

const SECTOR_CITY: Record<string, string[]> = {
  "paris": [
    "Paris 7","Paris 7e","75007","Paris 6","Paris 6e","75006","Paris 5","Paris 5e","75005",
    "Paris 16","Paris 16e","75016","Neuilly","Neuilly-sur-Seine","Boulogne","Boulogne-Billancourt",
    "75001","75002","75003","75004","Louvre","Marais","Paris 1","Paris 2","Paris 3","Paris 4",
    "Paris 1e","Paris 2e","Paris 3e","Paris 4e","Paris 5e","Paris 6e","Paris 7e","Paris 16e"
  ],
  "normandie": [
    "Rouen","Mont-Saint-Aignan","Bois-Guillaume"
  ],
  "cote-azur": [
    "Antibes","Cannes","Juan-les-Pins","Vallauris","Le Cannet","Mougins",
    "Saint-Aygulf","Fréjus","Frejus",
    "Sainte-Maxime","Saint-Tropez","Grimaud","Cogolin","Gassin","La Croix-Valmer",
    "Agay","Théoule-sur-Mer","Theoule","Mandelieu","Les Adrets","Adrets de l'Estérel"
  ],
};

function norm(s:string=""){ return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(); }
function matchSector(city:string, slug?:string){
  if(!slug) return true;
  const list = SECTOR_CITY[slug];
  if(!list) return true;
  const c = norm(city);
  return list.some(x => c.includes(norm(x)));
}
const toNum = (v:any)=> (v===0 || v) ? Number(v) : null;

// Fonction pour extraire et formater l'arrondissement de Paris
function formatCityWithDistrict(city: string): string {
  if (!city) return "";
  
  // Si c'est déjà au format "Paris Xe" ou "Paris X", on le garde
  const parisMatch = city.match(/Paris\s*(\d{1,2})(e|er)?/i);
  if (parisMatch) {
    const arr = parisMatch[1];
    return `Paris ${arr}e`;
  }
  
  // Si c'est un code postal parisien (75001 à 75020)
  const postalMatch = city.match(/75(\d{3})/);
  if (postalMatch) {
    const arr = parseInt(postalMatch[1]);
    if (arr >= 1 && arr <= 20) {
      return `Paris ${arr}e`;
    }
  }
  
  // Sinon, retourner la ville telle quelle
  return city;
}

export default async function Page({ searchParams }: {
  searchParams: Promise<{
    sector?: string; priceMin?: string; priceMax?: string;
    surfaceMin?: string; surfaceMax?: string; roomsMin?: string;
    dpe?: string; features?: string; sortPrice?: string; sortSurface?: string;
    showSold?: string; propertyType?: string;
  }>
}){
  const {
    sector, priceMin, priceMax, surfaceMin, surfaceMax, roomsMin, dpe, features, sortPrice, sortSurface, showSold, propertyType
  } = await searchParams;

  // Projection « carte » légère : PropertyCard est un composant client, on évite
  // de sérialiser descriptions/galeries/plans/map de chaque bien dans le payload.
  const all:any[] = await getPropertyCards();

  // Construire la liste de caractéristiques disponibles (fallback si vide)
  const featureOptions = Array.from(new Set(
    all.flatMap(p => Array.isArray(p.features) ? p.features : [])
  ));
  if (!featureOptions.length) {
    featureOptions.push(...allFeatures());
  }

  // Filtrage
  const minP = toNum(priceMin), maxP = toNum(priceMax);
  const minS = toNum(surfaceMin), maxS = toNum(surfaceMax);
  const minR = toNum(roomsMin);
  const maxDpe = (dpe||"").toUpperCase(); // DPE maximum (ex: "C" = A, B ou C)
  const wantedFeatures = (features||"").split(",").map(s=>s.trim()).filter(Boolean);

  // Séparer les biens vendus/sous promesse des biens en vente
  const isSoldView = showSold === "true";
  
  let items = all.filter(p => {
    // Filtrer selon vue : vendus/sous promesse ou en vente
    if (isSoldView) {
      // Afficher les biens vendus ET les biens sous promesse
      const isUnavailable = p.sold || p.status === 'UNDER_OFFER' || p.status === 'SOLD';
      if (!isUnavailable) return false;
      // Pour les biens vendus/sous promesse : appliquer uniquement le filtre de type
      if (propertyType && propertyType !== "all") {
        const pType = (p.type || "APPARTEMENT").toUpperCase();
        if (pType !== propertyType.toUpperCase()) return false;
      }
      return true;
    } else {
      // Masquer les biens vendus ET sous promesse de la vue principale
      const isUnavailable = p.sold || p.status === 'UNDER_OFFER' || p.status === 'SOLD';
      if (isUnavailable) return false;
    }
    
    // Filtres uniquement pour les biens en vente
    // Filtre par type de bien
    if (propertyType && propertyType !== "all") {
      const pType = (p.type || "APPARTEMENT").toUpperCase();
      if (pType !== propertyType.toUpperCase()) return false;
    }
    
    if (!matchSector(p.city||"", sector)) return false;
    const price = toNum(p.price) || 0;
    const surf  = toNum(p.surface) || 0;
    const rooms = toNum(p.rooms) || 0;
    const dpeClass = String(p?.dpe?.classEnergy||"").toUpperCase();
    const feats = Array.isArray(p.features) ? p.features : [];

    if (minP && price < minP) return false;
    if (maxP && price > maxP) return false;
    if (minS && surf < minS) return false;
    if (maxS && surf > maxS) return false;
    if (minR && rooms < minR) return false;
    // DPE: filtrer par DPE maximum (meilleur ou égal). Ex: maxDpe="C" accepte A, B, C
    if (maxDpe && dpeClass && dpeClass > maxDpe) return false;
    if (wantedFeatures.length && !wantedFeatures.some(f => feats.includes(f))) return false;

    return true;
  });

  // Tri
  if (isSoldView) {
    // Biens vendus : toujours les biens sous promesse d'abord, puis par date
    // de vente (du plus récent au plus ancien).
    items.sort((a, b) => {
      const rank = (p: any) => (p.status === 'UNDER_OFFER' ? 0 : 1);
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      const dateA = a.soldDate || '0000-00-00';
      const dateB = b.soldDate || '0000-00-00';
      return dateB.localeCompare(dateA);
    });
  } else {
    items.sort((a, b) => {
      // 1) Ordre manuel prioritaire (biens réordonnés dans l'admin)
      const ao = typeof a.sortOrder === 'number' ? a.sortOrder : null;
      const bo = typeof b.sortOrder === 'number' ? b.sortOrder : null;
      if (ao !== null && bo !== null && ao !== bo) return ao - bo;
      if (ao !== null && bo === null) return -1;
      if (bo !== null && ao === null) return 1;

      // 2) Tri explicite choisi par le visiteur
      if (sortPrice) {
        const d = sortPrice === "asc" ? (a.price || 0) - (b.price || 0) : (b.price || 0) - (a.price || 0);
        if (d !== 0) return d;
      }
      if (sortSurface) {
        return sortSurface === "asc" ? (a.surface || 0) - (b.surface || 0) : (b.surface || 0) - (a.surface || 0);
      }

      // 3) Par défaut : du plus cher au moins cher
      return (b.price || 0) - (a.price || 0);
    });
  }

  // Séparer les biens principaux des biens « entrée de gamme » (vue en vente).
  const principaux = items.filter((p: any) => !p.entreeDeGamme);
  const entree = items.filter((p: any) => p.entreeDeGamme);

  // Rendu d'une carte (vue vendus = grisée non cliquable ; vue en vente = PropertyCard).
  const renderItem = (p: any, index: number) => {
    if (isSoldView) {
      const isUnderOffer = p.status === 'UNDER_OFFER';
      const badgeColor = isUnderOffer ? 'bg-orange-500' : 'bg-red-600';
      const badgeText = isUnderOffer ? 'SOUS PROMESSE' : 'VENDU';
      return (
        <div key={p.id} className="card p-0 relative" data-testid={`card-property-${p.id}`}>
          <div className={`absolute top-4 right-4 ${badgeColor} text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg z-10`}>
            {badgeText}
          </div>
          <Img
            src={(p.images?.[0]) || "/logo.png"}
            alt={p.title}
            width={1200}
            height={600}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={index === 0}
            className="w-full h-64 object-cover rounded-t-2xl grayscale opacity-60"
          />
          <div className="p-6 opacity-70">
            <h3 className="luxe text-2xl">{propertyTypology(p)}{p.surface ? ` · ${p.surface} m²` : ''} · {formatCityWithDistrict(p.city)}</h3>
            <div className="mt-1 text-sm opacity-70">
              {p.title}
              {p.landSize && (p.type || 'APPARTEMENT') === 'MAISON' && <span> · Terrain : {p.landSize} m²</span>}
            </div>
            <div className="mt-2 font-semibold text-[#B89C6D]">Nous consulter</div>
            {p.dpe && <div className="mt-2 text-xs opacity-70">DPE : {p.dpe.classEnergy} · GES : {p.dpe.classGES}</div>}
          </div>
        </div>
      );
    }
    return (
      <PropertyCard
        key={p.id}
        property={p}
        cityLabel={formatCityWithDistrict(p.city)}
        priority={index === 0}
      />
    );
  };

  return (
    <main>
      <Hero
        title={isSoldView ? "Biens vendus" : "Nos biens"}
        subtitle={isSoldView 
          ? "Nos dernières ventes — référence de marché et savoir-faire." 
          : sector ? "Filtré par secteur" : "Maisons et appartements de caractère à Rouen, sur le Plateau Nord et dans la métropole."}
        primary={{ label: sector ? "Réinitialiser le filtre" : "Nous contacter", href: sector ? "/immobilier" : "/contact" }}
      />

      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Immobilier"}]} />

        {/* Bandeau estimation */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="luxe text-lg">Vous vendez ? Estimation gratuite en 2 minutes</div>
            <div className="text-sm opacity-80">Obtenez une fourchette indicative puis un avis de valeur précis.</div>
          </div>
          <Link className="btn btn-gold" href="/immobilier/estimation" data-testid="link-estimation">Estimer mon bien</Link>
        </div>

        {/* Bouton basculer entre biens en vente et vendus */}
        <SoldToggle />

        {/* Filtres uniquement pour les biens en vente */}
        {!isSoldView && (
          <FilterBar
            sectorValue={sector}
            sectors={SECTORS}
            selectedFeatures={wantedFeatures}
            featureOptions={featureOptions}
            dpeValue={maxDpe}
            propertyTypeValue={propertyType}
            countsText={`${items.length} bien${items.length>1?"s":""} trouvé${items.length>1?"s":""}`}
          />
        )}

        {/* Compteur pour les biens vendus */}
        {isSoldView && (
          <div className="mb-6 text-lg font-medium text-gray-700">
            {items.length} bien{items.length>1?"s":""} vendu{items.length>1?"s":""}
          </div>
        )}
      </section>

      {isSoldView ? (
        <section className="container pb-12">
          <div className="grid md:grid-cols-2 gap-6">
            {items.map(renderItem)}
            {!items.length && (
              <div className="opacity-70">Aucun bien vendu ne correspond à ces filtres.</div>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="container pb-12">
            {entree.length > 0 && principaux.length > 0 && (
              <h2 className="luxe text-2xl md:text-3xl text-luxe mb-6">Nos biens de caractère</h2>
            )}
            <div className="grid md:grid-cols-2 gap-6">
              {principaux.map(renderItem)}
              {!items.length && (
                <div className="opacity-70">Aucun bien ne correspond à ces filtres.</div>
              )}
            </div>
          </section>

          {entree.length > 0 && (
            <section className="container pb-12">
              <div className="border-t border-gold/20 pt-8">
                <h2 className="luxe text-2xl md:text-3xl text-luxe">Entrée de gamme</h2>
                <p className="mt-1 text-sm text-luxe/60 max-w-2xl">
                  Des biens plus accessibles — idéals pour un premier achat, un pied-à-terre ou un investissement à budget maîtrisé.
                </p>
                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  {entree.map((p: any, i: number) => renderItem(p, i + 1))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className="container pb-14">
        <AlerteBiens />
      </section>
    </main>
  );
}
