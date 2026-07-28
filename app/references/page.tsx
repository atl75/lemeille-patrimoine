import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos références & ventes | Lemeille Patrimoine",
  description:
    "Découvrez nos dernières ventes et références — le reflet de notre savoir-faire dans l'immobilier de caractère à Paris, en Normandie et sur la Côte d'Azur.",
  alternates: { canonical: "/references" },
};

async function getProperties() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || `http://127.0.0.1:${process.env.PORT || "3000"}`;
  try {
    const r = await fetch(`${base}/api/properties`, { cache: "no-store" });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const all = await getProperties();
  const refs = all
    .filter((p: any) => p && p.visible !== false && (p.sold || p.status === "SOLD" || p.status === "UNDER_OFFER"))
    .sort((a: any, b: any) => {
      // sous compromis d'abord, puis par date de vente décroissante
      const rank = (p: any) => (p.status === "UNDER_OFFER" ? 0 : 1);
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return String(b.soldDate || "").localeCompare(String(a.soldDate || ""));
    });

  const regions = new Set(refs.map((p: any) => String(p.region || "").replaceAll("_", " ")).filter(Boolean));

  return (
    <main>
      <Hero
        title="Nos références"
        subtitle="Nos dernières ventes — le reflet de notre savoir-faire et de la confiance de nos clients."
        primary={{ label: "Confier mon projet", href: "/contact" }}
        secondary={{ label: "Nos biens en vente", href: "/immobilier" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Références" }]} />
      </section>

      {refs.length > 0 && (
        <section className="container pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card p-6 text-center">
              <div className="luxe text-4xl text-[#1F3B2C]">{refs.length}</div>
              <div className="text-sm opacity-70 mt-1">biens vendus ou sous compromis</div>
            </div>
            <div className="card p-6 text-center">
              <div className="luxe text-4xl text-[#1F3B2C]">{regions.size || 3}</div>
              <div className="text-sm opacity-70 mt-1">régions couvertes</div>
            </div>
            <div className="card p-6 text-center col-span-2 md:col-span-1">
              <div className="luxe text-4xl text-[#1F3B2C]">48h</div>
              <div className="text-sm opacity-70 mt-1">délai de réponse</div>
            </div>
          </div>
        </section>
      )}

      <section className="container pb-14">
        {refs.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="luxe text-2xl mb-2">Notre savoir-faire à votre service</h2>
            <p className="opacity-80 max-w-2xl mx-auto">
              Nous accompagnons nos clients dans l&apos;achat, la vente et la défiscalisation de biens de caractère à Paris,
              en Normandie et sur la Côte d&apos;Azur. Confiez-nous votre projet — nous mettons notre réseau et notre exigence
              au service de sa réussite.
            </p>
            <div className="mt-6">
              <Link href="/contact" className="btn btn-gold">Parler de mon projet</Link>
            </div>
          </div>
        ) : (
          <>
            <h2 className="luxe text-2xl mb-4">Nos dernières ventes</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {refs.map((p: any) => {
                const img = Array.isArray(p.images) && p.images.length ? p.images[0] : "/logo.svg";
                const region = String(p.region || "").replaceAll("_", " ");
                const badge =
                  p.status === "UNDER_OFFER"
                    ? "Sous compromis"
                    : p.soldDate
                    ? `Vendu le ${new Date(p.soldDate).toLocaleDateString("fr-FR")}`
                    : "Vendu";
                return (
                  <div key={p.id} className="card overflow-hidden">
                    <div className="relative h-48 bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={p.title || "Bien vendu"} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1F3B2C] text-white">
                        {badge}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="luxe text-lg">{p.title}</h3>
                      <div className="text-sm opacity-70">
                        {p.city}{region ? ` · ${region}` : ""}
                      </div>
                      <div className="text-sm opacity-70 mt-1">
                        {p.type === "MAISON" ? "Maison" : "Appartement"}
                        {p.surface ? ` · ${p.surface} m²` : ""}
                        {p.rooms ? ` · ${p.rooms} pièces` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 card p-6 text-center">
              <p className="opacity-85">
                Vous souhaitez vendre ou acquérir un bien d&apos;exception ?{" "}
                <Link href="/contact" className="text-[#B89C6D] underline">Confiez-nous votre projet.</Link>
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
