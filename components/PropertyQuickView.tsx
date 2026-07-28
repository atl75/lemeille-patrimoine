"use client";
import Link from "next/link";
import { X } from "lucide-react";
import Img from "@/components/Img";
import { useModalA11y } from "@/lib/useModalA11y";

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

export default function PropertyQuickView({
  property,
  cityLabel,
  onClose,
}: {
  property: Property;
  cityLabel: string;
  onClose: () => void;
}) {
  const cover = property.images?.[0] || "/logo.png";
  const dialogRef = useModalA11y<HTMLDivElement>(onClose, true);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu rapide — ${property.title}`}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="card p-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <Img
          src={cover}
          alt={property.title}
          width={900}
          height={480}
          sizes="(max-width: 768px) 90vw, 600px"
          className="w-full h-64 object-cover rounded-t-2xl"
        />

        <div className="p-6">
          <h3 className="luxe text-2xl">{property.title}</h3>
          <div className="text-sm opacity-70">{cityLabel}</div>
          <div className="mt-2 text-sm">
            {(property.type || "APPARTEMENT") === "APPARTEMENT" ? "Appartement" : "Maison"} · Surface: {property.surface ?? "—"} m² · Pièces: {property.rooms ?? "—"}
            {property.landSize && property.type === "MAISON" && <span> · Terrain: {property.landSize} m²</span>}
          </div>
          {property.price != null && (
            <div className="mt-2 text-xl font-semibold text-[#B89C6D]">
              {Number(property.price).toLocaleString("fr-FR")} €
            </div>
          )}
          {property.dpe?.classEnergy && (
            <div className="mt-2 text-xs opacity-70">
              DPE : {property.dpe.classEnergy} · GES : {property.dpe.classGES}
            </div>
          )}
          {property.description && (
            <p className="mt-4 text-sm opacity-90 line-clamp-4">{property.description}</p>
          )}
          {Array.isArray(property.features) && property.features.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {property.features.slice(0, 6).map((f, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-2xl border bg-white/70">{f}</span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/immobilier/biens/${property.id}`} className="btn btn-gold">
              Voir la fiche complète
            </Link>
            <Link href={`/contact?ref=${encodeURIComponent(property.id)}`} className="btn">
              Contacter un conseiller
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
