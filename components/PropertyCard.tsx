"use client";
import { useState } from "react";
import Link from "next/link";
import { propertyTypology } from "@/lib/propertyLabel";
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
  priceOnRequest?: boolean;
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
        className="group card p-0 overflow-hidden block"
        data-testid={`card-property-${property.id}`}
      >
        <div className="relative overflow-hidden rounded-t-[8px]">
          <Img
            src={property.images?.[0] || "/logo.png"}
            alt={property.title}
            width={1200}
            height={600}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={priority}
            className="w-full h-64 object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
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
          <h3 className="luxe text-2xl">{propertyTypology(property)}{property.surface ? ` · ${property.surface} m²` : ""}{cityLabel ? ` · ${cityLabel}` : ""}</h3>
          <div className="mt-1 text-sm opacity-70">
            {property.title}
            {property.landSize && property.type === "MAISON" && <span> · Terrain : {property.landSize} m²</span>}
          </div>
          {property.priceOnRequest ? (
            <div className="mt-3 luxe text-xl text-[#B89C6D]">Nous consulter</div>
          ) : property.price != null && (
            <div className="mt-3 luxe text-xl text-[#B89C6D]">{Number(property.price).toLocaleString("fr-FR")} €</div>
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
