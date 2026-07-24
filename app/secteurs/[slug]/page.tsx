import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Img from "@/components/Img";

type Sector = {
  title: string;
  subtitle?: string;
  region?: string;
  cities?: string[];
};

const SECTORS: Record<string, Sector> = {
  "paris-rive-gauche": {
    title: "Paris — Rive gauche",
    subtitle: "7e, 6e, 5e — immeubles haussmanniens et hôtels particuliers.",
    region: "PARIS",
    cities: ["Paris 7", "Paris 7e", "75007", "Paris 6", "Paris 6e", "75006", "Paris 5", "Paris 5e", "75005"]
  },
  "paris-ouest": {
    title: "Paris Ouest",
    subtitle: "16e, Neuilly, Boulogne — appartements familiaux, terrasses.",
    region: "PARIS",
    cities: ["Paris 16", "Paris 16e", "75016", "Neuilly", "Neuilly-sur-Seine", "Boulogne", "Boulogne-Billancourt"]
  },
  "paris-centre-historique": {
    title: "Paris — Centre historique",
    subtitle: "1er–4e (Louvre, Marais) — patrimonial et pied-à-terre.",
    region: "PARIS",
    cities: ["75001","75002","75003","75004","Louvre","Marais","Paris 1","Paris 2","Paris 3","Paris 4"]
  },
  "rouen-centre": {
    title: "Rouen & cœur historique",
    subtitle: "Quartier des musées, Préfecture, Saint-Maclou.",
    region: "NORMANDIE",
    cities: ["Rouen"]
  },
  "mont-saint-aignan-bois-guillaume": {
    title: "Mont-Saint-Aignan & Bois-Guillaume",
    subtitle: "Résidentiel recherché, maisons & appartements avec vues.",
    region: "NORMANDIE",
    cities: ["Mont-Saint-Aignan","Bois-Guillaume"]
  },
  "saint-aygulf-frejus": {
    title: "Saint-Aygulf & Fréjus",
    subtitle: "Maisons de vacances, marinas, proximité des calanques.",
    region: "COTE_D_AZUR",
    cities: ["Saint-Aygulf","Fréjus","Frejus"]
  },
  "sainte-maxime-golfe-saint-tropez": {
    title: "Sainte-Maxime / Golfe de Saint-Tropez",
    subtitle: "Villas et résidences de standing.",
    region: "COTE_D_AZUR",
    cities: ["Sainte-Maxime","Saint-Tropez","Grimaud","Cogolin","Gassin","La Croix-Valmer"]
  },
  "esterel-arriere-pays": {
    title: "Estérel & arrière-pays",
    subtitle: "Agay, Théoule-sur-Mer — vues mer, environnement préservé.",
    region: "COTE_D_AZUR",
    cities: ["Agay","Théoule-sur-Mer","Theoule","Mandelieu","Les Adrets","Adrets de l'Estérel"]
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
  const title = s ? `${s.title} — Immobilier` : "Secteur — Immobilier";
  const description = s?.subtitle || "Biens dans le secteur sélectionné.";
  return { title, description };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }){
  const { slug } = await params;
  const sector = SECTORS[slug];
  if(!sector){
    return <main className="container py-12">Secteur introuvable.</main>;
  }
  const all = await getProperties();
  const items = all.filter((p:any)=>matchesSector(p, sector));

  return (
    <main>
      <Hero title={sector.title} subtitle={sector.subtitle} primary={{label:"Tous nos biens", href:"/immobilier"}} />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Immobilier", href:"/immobilier"},{label: sector.title}]} />
      </section>

      <section className="container pb-12">
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((p:any)=>(
            <Link key={p.id} href={`/immobilier/biens/${p.id}`} className="card p-0 hover:border-[#B89C6D] transition" data-testid={`card-property-${p.id}`}>
              <Img src={(p.images?.[0])||"/logo.png"} alt={p.title} width={1200} height={600} className="w-full h-64 object-cover rounded-t-2xl" />
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
            </Link>
          ))}
          {!items.length && <div className="opacity-70">Aucun bien pour ce secteur pour le moment.</div>}
        </div>
      </section>
    </main>
  );
}
