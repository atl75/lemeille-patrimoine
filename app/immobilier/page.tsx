import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Img from "@/components/Img";
import FilterBar from "@/components/FilterBar";
import SoldToggle from "@/components/SoldToggle";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Immobilier haut de gamme Paris, Normandie, Côte d\'Azur | Lemeille Patrimoine',
  description: 'Propriétés d\'exception à Paris, en Normandie et sur la Côte d\'Azur. Appartements et maisons haut de gamme. Expertise locale, conseil personnalisé, discrétion garantie.',
  alternates: {
    canonical: '/immobilier'
  },
  openGraph: {
    title: 'Immobilier haut de gamme Paris, Normandie, Côte d\'Azur',
    description: 'Propriétés d\'exception à Paris, en Normandie et sur la Côte d\'Azur.',
    url: '/immobilier',
    type: 'website',
  }
};

// Désactiver complètement le cache Next.js pour cette page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

async function getProperties(){
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT||'3000'}`;
  const r = await fetch(`${base}/api/properties`, { cache: 'no-store' });
  return r.ok ? r.json() : [];
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

  const all:any[] = await getProperties();

  // Construire la liste de caractéristiques disponibles (fallback si vide)
  const featureOptions = Array.from(new Set(
    all.flatMap(p => Array.isArray(p.features) ? p.features : [])
  ));
  if (!featureOptions.length) {
    featureOptions.push(
      "Cheminée","Garage","Jardin","Lingerie","Moulures","Parquet",
      "Portail électrique","Sous-sol","Terrasse","Balcon","Ascenseur",
      "Vue dégagée","Calme","Traversant","Parking","Cave","Dressing",
      "Climatisation","Double vitrage","Alarme","Fibre","Piscine"
    );
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
    // Pour les biens vendus : tri par date de vente (du plus récent au plus ancien)
    items.sort((a, b) => {
      const dateA = a.soldDate || '0000-00-00';
      const dateB = b.soldDate || '0000-00-00';
      return dateB.localeCompare(dateA); // Plus récent en premier
    });
  } else {
    // Pour les biens en vente : tri par prix ET/OU surface
    items.sort((a, b) => {
      // Tri par prix si demandé
      if (sortPrice) {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        const priceDiff = sortPrice === "asc" ? priceA - priceB : priceB - priceA;
        if (priceDiff !== 0) return priceDiff;
      }
      
      // Tri par surface si demandé (secondaire si prix égaux, principal si pas de tri prix)
      if (sortSurface) {
        const surfA = a.surface || 0;
        const surfB = b.surface || 0;
        return sortSurface === "asc" ? surfA - surfB : surfB - surfA;
      }
      
      return 0;
    });
  }

  return (
    <main>
      <Hero
        title={isSoldView ? "Biens vendus" : "Nos biens"}
        subtitle={isSoldView 
          ? "Nos dernières ventes — référence de marché et savoir-faire." 
          : sector ? "Filtré par secteur" : "Sélection d'appartements et maisons dans l'ancien — Paris, Normandie, Côte d'Azur."}
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
          <a className="btn btn-gold" href="/immobilier/estimation" data-testid="link-estimation">Estimer mon bien</a>
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

      <section className="container pb-12">
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((p:any, index:number)=> {
            // Affichage selon la vue active (pas selon p.sold)
            // Si on est dans la vue "vendus", tous les biens affichés sont vendus
            // Si on est dans la vue "en vente", tous les biens affichés sont disponibles
            
            if (isSoldView) {
              // Vue "Biens vendus/sous promesse" : affichage non cliquable, grisé
              const isUnderOffer = p.status === 'UNDER_OFFER';
              const badgeColor = isUnderOffer ? 'bg-orange-500' : 'bg-red-600';
              const badgeText = isUnderOffer ? 'SOUS PROMESSE' : 'VENDU';
              
              return (
                <div key={p.id} className="card p-0 relative" data-testid={`card-property-${p.id}`}>
                  {/* Badge "Vendu" ou "Sous Promesse" */}
                  <div className={`absolute top-4 right-4 ${badgeColor} text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg z-10`}>
                    {badgeText}
                  </div>
                  <Img 
                    src={(p.images?.[0])||"/logo.png"} 
                    alt={p.title} 
                    width={1200} 
                    height={600}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={index === 0}
                    className="w-full h-64 object-cover rounded-t-2xl grayscale opacity-60" 
                  />
                  <div className="p-6 opacity-70">
                    <h3 className="luxe text-2xl">{p.title}</h3>
                    <div className="text-sm opacity-70">{formatCityWithDistrict(p.city)}</div>
                    <div className="mt-2 text-sm">
                      {(p.type || 'APPARTEMENT') === 'APPARTEMENT' ? 'Appartement' : 'Maison'} · Surface: {p.surface ?? "—"} m² · Pièces: {p.rooms ?? "—"}
                      {p.landSize && (p.type || 'APPARTEMENT') === 'MAISON' && <span> · Terrain: {p.landSize} m²</span>}
                    </div>
                    <div className="mt-2 font-semibold text-[#B89C6D]">Nous consulter</div>
                    {p.dpe && <div className="mt-2 text-xs opacity-70">DPE : {p.dpe.classEnergy} · GES : {p.dpe.classGES}</div>}
                  </div>
                </div>
              );
            }
            
            // Vue "Biens en vente" : affichage normal (cliquable)
            return (
              <a key={p.id} href={`/immobilier/biens/${p.id}`} className="card p-0 hover:border-[#B89C6D] transition" data-testid={`card-property-${p.id}`}>
                <Img 
                  src={(p.images?.[0])||"/logo.png"} 
                  alt={p.title} 
                  width={1200} 
                  height={600}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={index === 0}
                  className="w-full h-64 object-cover rounded-t-2xl" 
                />
                <div className="p-6">
                  <h3 className="luxe text-2xl">{p.title}</h3>
                  <div className="text-sm opacity-70">{formatCityWithDistrict(p.city)}</div>
                  <div className="mt-2 text-sm">
                    {(p.type || 'APPARTEMENT') === 'APPARTEMENT' ? 'Appartement' : 'Maison'} · Surface: {p.surface ?? "—"} m² · Pièces: {p.rooms ?? "—"}
                    {p.landSize && (p.type || 'APPARTEMENT') === 'MAISON' && <span> · Terrain: {p.landSize} m²</span>}
                  </div>
                  {p.price && <div className="mt-2 font-semibold">{Number(p.price).toLocaleString('fr-FR')} €</div>}
                  {p.dpe && <div className="mt-2 text-xs opacity-70">DPE : {p.dpe.classEnergy} · GES : {p.dpe.classGES}</div>}
                </div>
              </a>
            );
          })}
          {!items.length && (
            <div className="opacity-70">
              {isSoldView ? "Aucun bien vendu ne correspond à ces filtres." : "Aucun bien ne correspond à ces filtres."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
