import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import PropertyCard from "@/components/PropertyCard";

type Sector = {
  title: string;
  subtitle?: string;
  region?: string;
  cities?: string[];
  description?: string;
  highlights?: string[];
};

const SECTORS: Record<string, Sector> = {
  "paris-rive-gauche": {
    title: "Paris — Rive gauche",
    subtitle: "7e, 6e, 5e — immeubles haussmanniens et hôtels particuliers.",
    region: "PARIS",
    cities: ["Paris 7", "Paris 7e", "75007", "Paris 6", "Paris 6e", "75006", "Paris 5", "Paris 5e", "75005"],
    description: "La Rive gauche incarne le Paris patrimonial par excellence. Des appartements haussmanniens de Saint-Germain-des-Prés aux hôtels particuliers du 7e, c'est un marché de biens rares, recherché des familles comme des investisseurs en quête de valeur refuge. La liquidité y est forte et la valorisation constante.",
    highlights: ["Immeubles haussmanniens & hôtels particuliers", "Saint-Germain, Invalides, Panthéon, Jardin du Luxembourg", "Valeur patrimoniale et liquidité élevées"],
  },
  "paris-ouest": {
    title: "Paris Ouest",
    subtitle: "16e, Neuilly, Boulogne — appartements familiaux, terrasses.",
    region: "PARIS",
    cities: ["Paris 16", "Paris 16e", "75016", "Neuilly", "Neuilly-sur-Seine", "Boulogne", "Boulogne-Billancourt"],
    description: "L'Ouest parisien conjugue prestige résidentiel et qualité de vie familiale. Grands appartements traversants, immeubles de standing, terrasses et proximité du Bois de Boulogne : un secteur prisé pour ses adresses cossues et ses écoles recherchées, du 16e à Neuilly-sur-Seine.",
    highlights: ["Grands appartements familiaux & terrasses", "16e arrondissement, Neuilly, Boulogne-Billancourt", "Cadre résidentiel recherché, écoles réputées"],
  },
  "paris-centre-historique": {
    title: "Paris — Centre historique",
    subtitle: "1er–4e (Louvre, Marais) — patrimonial et pied-à-terre.",
    region: "PARIS",
    cities: ["75001","75002","75003","75004","Louvre","Marais","Paris 1","Paris 2","Paris 3","Paris 4"],
    description: "Du Louvre au Marais, le centre historique offre un immobilier de caractère chargé d'histoire : poutres apparentes, pierres de taille, cours pavées. Un secteur idéal pour un pied-à-terre d'exception ou un investissement patrimonial, où la rareté de l'offre soutient durablement les valeurs.",
    highlights: ["Biens de caractère : Marais, Louvre, Île Saint-Louis", "Idéal pied-à-terre et investissement patrimonial", "Offre rare, forte demande locative"],
  },
  "rouen-centre": {
    title: "Rouen & cœur historique",
    subtitle: "Quartier des musées, Préfecture, Saint-Maclou.",
    region: "NORMANDIE",
    cities: ["Rouen"],
    description: "Rouen séduit par son centre médiéval, ses maisons à colombages et son riche patrimoine classé. Le quartier des Musées, la Préfecture et Saint-Maclou offrent des appartements de caractère et des immeubles éligibles à la défiscalisation (Malraux, Monument Historique), à des niveaux de prix attractifs face à Paris.",
    highlights: ["Appartements de caractère au cœur historique", "Fort potentiel de défiscalisation (Malraux, MH)", "Marché dynamique, rendement locatif intéressant"],
  },
  "mont-saint-aignan-bois-guillaume": {
    title: "Mont-Saint-Aignan & Bois-Guillaume",
    subtitle: "Résidentiel recherché, maisons & appartements avec vues.",
    region: "NORMANDIE",
    cities: ["Mont-Saint-Aignan","Bois-Guillaume"],
    description: "Sur les hauteurs de Rouen, Mont-Saint-Aignan et Bois-Guillaume forment le secteur résidentiel le plus recherché de la métropole : maisons familiales, terrains arborés, vues dégagées et proximité des meilleures écoles. Un marché stable, porté par une demande familiale constante.",
    highlights: ["Maisons familiales & terrains arborés", "Environnement résidentiel prisé, écoles réputées", "Valeurs stables et demande soutenue"],
  },
  "saint-aygulf-frejus": {
    title: "Saint-Aygulf & Fréjus",
    subtitle: "Maisons de vacances, marinas, proximité des calanques.",
    region: "COTE_D_AZUR",
    cities: ["Saint-Aygulf","Fréjus","Frejus"],
    description: "Entre plages, marinas et calanques du massif de l'Estérel, Saint-Aygulf et Fréjus offrent un art de vivre méditerranéen prisé pour la résidence secondaire comme pour l'investissement locatif saisonnier. Villas les pieds dans l'eau, appartements vue mer et maisons de vacances y côtoient un patrimoine romain remarquable.",
    highlights: ["Villas & appartements vue mer, proximité plages", "Fort potentiel locatif saisonnier", "Cadre méditerranéen, marinas et Estérel"],
  },
  "sainte-maxime-golfe-saint-tropez": {
    title: "Sainte-Maxime / Golfe de Saint-Tropez",
    subtitle: "Villas et résidences de standing.",
    region: "COTE_D_AZUR",
    cities: ["Sainte-Maxime","Saint-Tropez","Grimaud","Cogolin","Gassin","La Croix-Valmer"],
    description: "Le Golfe de Saint-Tropez est l'une des adresses les plus convoitées de la Côte d'Azur. De Sainte-Maxime aux villages perchés de Gassin et Grimaud, on y trouve des villas de standing, des domaines avec vue mer et des résidences d'exception, portés par une clientèle internationale et une valeur refuge reconnue.",
    highlights: ["Villas de standing & domaines vue mer", "Sainte-Maxime, Grimaud, Gassin, Saint-Tropez", "Clientèle internationale, valeur refuge"],
  },
  "esterel-arriere-pays": {
    title: "Estérel & arrière-pays",
    subtitle: "Agay, Théoule-sur-Mer — vues mer, environnement préservé.",
    region: "COTE_D_AZUR",
    cities: ["Agay","Théoule-sur-Mer","Theoule","Mandelieu","Les Adrets","Adrets de l'Estérel"],
    description: "Le massif de l'Estérel et son arrière-pays offrent un cadre naturel préservé, entre roches rouges et Méditerranée. D'Agay à Théoule-sur-Mer, ce secteur confidentiel séduit les amateurs de nature et d'intimité : villas panoramiques, propriétés au calme et vues mer spectaculaires, à l'écart de l'agitation.",
    highlights: ["Villas panoramiques & propriétés au calme", "Agay, Théoule-sur-Mer, Mandelieu, Les Adrets", "Nature préservée, intimité et vues mer"],
  }
};

function norm(s:string=""){ return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(); }

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
  const r = await fetch(`${base}/api/properties`, { cache: "no-store" });
  return r.ok ? r.json() : [];
}

function matchesSector(p:any, s: Sector){
  const city = norm(p.city||"");
  const region = norm(p.region||"");
  const okRegion = s.region ? region.includes(norm(s.region)) : true;
  const okCity = s.cities && s.cities.length
    ? s.cities.some(c => city.includes(norm(c)))
    : true;
  return okRegion && okCity;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SECTORS[slug];
  const title = s ? `${s.title} — Immobilier | Lemeille Patrimoine` : "Secteur — Immobilier";
  const description = (s?.description || s?.subtitle || "Biens dans le secteur sélectionné.").slice(0, 155);
  return { title, description, alternates: { canonical: `/secteurs/${slug}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }){
  const { slug } = await params;
  const sector = SECTORS[slug];
  if(!sector){
    return <main className="container py-12">Secteur introuvable.</main>;
  }
  const all = await getProperties();
  const items = all.filter((p:any)=>matchesSector(p, sector));

  const REGION_IMAGE: Record<string, string> = {
    PARIS: "/hero-accueil.jpg",
    NORMANDIE: "/hero-normandie.jpg",
    COTE_D_AZUR: "/hero-cote-azur.jpg",
  };
  const heroImage = REGION_IMAGE[String(sector.region || "")] || "/hero-accueil.jpg";

  return (
    <main>
      <Hero title={sector.title} subtitle={sector.subtitle} primary={{label:"Tous nos biens", href:"/immobilier"}} image={heroImage} />
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
        <h2 className="luxe text-2xl mb-4">{items.length ? "Nos biens dans ce secteur" : "Biens dans ce secteur"}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((p:any, index:number)=>(
            <PropertyCard
              key={p.id}
              property={p}
              cityLabel={formatCityWithDistrict(p.city)}
              priority={index === 0}
            />
          ))}
          {!items.length && <div className="opacity-70">Aucun bien pour ce secteur pour le moment.</div>}
        </div>
      </section>
    </main>
  );
}
