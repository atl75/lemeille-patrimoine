"use client";
import { useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import Img from "@/components/Img";
import PropertyQuickView from "@/components/PropertyQuickView";

type Property = {
  id: string;
  title: string;
  city?: string;
  region?: string;
  type?: string;
  price?: number;
  surface?: number;
  rooms?: number;
  landSize?: number;
  description?: string;
  images?: string[];
  features?: string[];
  dpe?: { classEnergy?: string; classGES?: string };
};

export default function PropertyCard({
  property,
  cityLabel,
  priority,
}: {
  property: Property;
  cityLabel: string;
  priority?: boolean;
}) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  return (
    <>
      <Link
        href={`/immobilier/biens/${property.id}`}
        className="group card p-0 overflow-hidden hover:border-[#B89C6D] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
        data-testid={`card-property-${property.id}`}
      >
        <div className="relative overflow-hidden rounded-t-2xl">
          <Img
            src={property.images?.[0] || "/logo.png"}
            alt={property.title}
            width={1200}
            height={600}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={priority}
            className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
            aria-label={`Aperçu rapide — ${property.title}`}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/90 text-sm font-medium opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 hover:bg-white"
          >
            <Eye className="h-4 w-4" />
            Aperçu rapide
          </button>
        </div>
        <div className="p-6">
          <h3 className="luxe text-2xl">{property.title}</h3>
          <div className="text-sm opacity-70">{cityLabel}</div>
          <div className="mt-2 text-sm">
            {(property.type || "APPARTEMENT") === "APPARTEMENT" ? "Appartement" : "Maison"} · Surface: {property.surface ?? "—"} m² · Pièces: {property.rooms ?? "—"}
            {property.landSize && property.type === "MAISON" && <span> · Terrain: {property.landSize} m²</span>}
          </div>
          {property.price != null && (
            <div className="mt-2 font-semibold">{Number(property.price).toLocaleString("fr-FR")} €</div>
          )}
          {property.dpe?.classEnergy && (
            <div className="mt-2 text-xs opacity-70">DPE : {property.dpe.classEnergy} · GES : {property.dpe.classGES}</div>
          )}
        </div>
      </Link>

      {quickViewOpen && (
        <PropertyQuickView
          property={property}
          cityLabel={cityLabel}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
