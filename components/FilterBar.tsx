"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";

type Opt = { value: string; label: string };

export default function FilterBar({
  sectorValue,
  sectors,
  selectedFeatures,
  featureOptions,
  dpeValue,
  countsText,
  propertyTypeValue,
}: {
  sectorValue?: string;
  sectors: Opt[];
  selectedFeatures: string[];
  featureOptions: string[];
  dpeValue?: string;
  countsText?: string;
  propertyTypeValue?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sortPrice = params.get("sortPrice") || "";
  const sortSurface = params.get("sortSurface") || "";

  // refs pour éviter de re-rendre à chaque frappe
  const priceMinRef = useRef<HTMLInputElement>(null);
  const priceMaxRef = useRef<HTMLInputElement>(null);
  const surfMinRef  = useRef<HTMLInputElement>(null);
  const surfMaxRef  = useRef<HTMLInputElement>(null);
  const roomsMinRef = useRef<HTMLInputElement>(null);

  function applyFilters() {
    const qs = new URLSearchParams(params.toString());

    // Secteur
    const sector = (document.getElementById("f-sector") as HTMLSelectElement)?.value || "";
    if (sector) qs.set("sector", sector); else qs.delete("sector");

    // Type de bien
    const propertyType = (document.getElementById("f-property-type") as HTMLSelectElement)?.value || "";
    if (propertyType && propertyType !== "all") qs.set("propertyType", propertyType); else qs.delete("propertyType");

    // DPE
    const dpe = (document.getElementById("f-dpe") as HTMLSelectElement)?.value || "";
    if (dpe) qs.set("dpe", dpe); else qs.delete("dpe");

    // Plages numériques
    const pm = priceMinRef.current?.value?.trim();
    const pM = priceMaxRef.current?.value?.trim();
    const sm = surfMinRef.current?.value?.trim();
    const sM = surfMaxRef.current?.value?.trim();
    const rm = roomsMinRef.current?.value?.trim();

    if (pm) qs.set("priceMin", pm); else qs.delete("priceMin");
    if (pM) qs.set("priceMax", pM); else qs.delete("priceMax");
    if (sm) qs.set("surfaceMin", sm); else qs.delete("surfaceMin");
    if (sM) qs.set("surfaceMax", sM); else qs.delete("surfaceMax");
    if (rm) qs.set("roomsMin", rm); else qs.delete("roomsMin");

    // Caractéristiques (checkbox -> liste CSV)
    const chosen = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="feat"]:checked')).map(x=>x.value);
    if (chosen.length) qs.set("features", chosen.join(",")); else qs.delete("features");

    const q = qs.toString();
    router.push("/immobilier" + (q ? "?"+q : ""), { scroll: false });
  }

  function handleSelectChange() {
    applyFilters();
  }

  function handleInputChange() {
    applyFilters();
  }

  function handleCheckboxChange() {
    applyFilters();
  }

  function resetAll(){
    router.push("/immobilier", { scroll: false });
  }

  function togglePriceSort() {
    const qs = new URLSearchParams(params.toString());
    if (sortPrice === "asc") {
      qs.set("sortPrice", "desc");
    } else if (sortPrice === "desc") {
      qs.delete("sortPrice");
    } else {
      qs.set("sortPrice", "asc");
    }
    const q = qs.toString();
    router.push("/immobilier" + (q ? "?"+q : ""), { scroll: false });
  }

  function toggleSurfaceSort() {
    const qs = new URLSearchParams(params.toString());
    if (sortSurface === "asc") {
      qs.set("sortSurface", "desc");
    } else if (sortSurface === "desc") {
      qs.delete("sortSurface");
    } else {
      qs.set("sortSurface", "asc");
    }
    const q = qs.toString();
    router.push("/immobilier" + (q ? "?"+q : ""), { scroll: false });
  }

  // Helpers UI: cocher/décocher conserve à l'écran
  const isChecked = (v:string)=> selectedFeatures.includes(v);

  return (
    <div className="card p-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="f-sector" className="sr-only">Secteur géographique</label>
        <select 
          id="f-sector" 
          className="input w-full md:w-auto" 
          defaultValue={sectorValue || ""} 
          onChange={handleSelectChange}
          data-testid="select-sector"
          aria-label="Filtrer par secteur géographique"
        >
          <option value="">Tous les secteurs</option>
          {sectors.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label htmlFor="f-property-type" className="sr-only">Type de bien</label>
        <select 
          id="f-property-type" 
          className="input w-full md:w-auto" 
          defaultValue={propertyTypeValue || "all"} 
          onChange={handleSelectChange}
          data-testid="select-property-type"
          aria-label="Filtrer par type de bien"
        >
          <option value="all">Tous les biens</option>
          <option value="APPARTEMENT">Appartements</option>
          <option value="MAISON">Maisons</option>
        </select>

        <button
          type="button"
          onClick={togglePriceSort}
          className={`pill flex items-center gap-1 ${sortPrice ? "!bg-[#B89C6D] !text-white !border-[#B89C6D]" : ""}`}
          data-testid="button-sort-price"
        >
          Prix
          {sortPrice === "asc" ? (
            <ArrowUp className="w-4 h-4" />
          ) : sortPrice === "desc" ? (
            <ArrowDown className="w-4 h-4" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={toggleSurfaceSort}
          className={`pill flex items-center gap-1 ${sortSurface ? "!bg-[#B89C6D] !text-white !border-[#B89C6D]" : ""}`}
          data-testid="button-sort-surface"
        >
          Surface
          {sortSurface === "asc" ? (
            <ArrowUp className="w-4 h-4" />
          ) : sortSurface === "desc" ? (
            <ArrowDown className="w-4 h-4" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="pill flex items-center gap-1"
          data-testid="button-toggle-filters"
        >
          Filtres avancés
          {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="pill" onClick={resetAll} data-testid="button-reset-filters">Réinitialiser</button>
        {countsText && <div className="text-sm opacity-70" data-testid="text-results-count">{countsText}</div>}
      </div>

      {filtersOpen && (
        <div className="grid gap-3 pt-3 border-t">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Prix min (€)" ref={priceMinRef} type="number" min="0" step="1000" className="input" placeholder="Prix min (€)" defaultValue={params.get("priceMin")||""} onChange={handleInputChange} data-testid="input-price-min" />
              <input aria-label="Prix max (€)" ref={priceMaxRef} type="number" min="0" step="1000" className="input" placeholder="Prix max (€)" defaultValue={params.get("priceMax")||""} onChange={handleInputChange} data-testid="input-price-max" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Surface min (m²)" ref={surfMinRef} type="number" min="0" step="1" className="input" placeholder="Surface min (m²)" defaultValue={params.get("surfaceMin")||""} onChange={handleInputChange} data-testid="input-surface-min" />
              <input aria-label="Surface max (m²)" ref={surfMaxRef} type="number" min="0" step="1" className="input" placeholder="Surface max (m²)" defaultValue={params.get("surfaceMax")||""} onChange={handleInputChange} data-testid="input-surface-max" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Pièces min" ref={roomsMinRef} type="number" min="0" step="1" className="input" placeholder="Pièces min" defaultValue={params.get("roomsMin")||""} onChange={handleInputChange} data-testid="input-rooms-min" />
            </div>
          </div>

          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">DPE maximum</label>
            <select id="f-dpe" className="input w-48" defaultValue={dpeValue || ""} title="Classe DPE minimum" onChange={handleSelectChange} data-testid="select-dpe">
              <option value="">Toutes classes</option>
              {["A","B","C","D","E","F","G"].map(c=> <option key={c} value={c}>≤ {c}</option>)}
            </select>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Caractéristiques</div>
            <div className="flex flex-wrap gap-2">
              {featureOptions.map(v=>(
                <label key={v} className="pill cursor-pointer">
                  <input type="checkbox" name="feat" value={v} defaultChecked={isChecked(v)} onChange={handleCheckboxChange} data-testid={`checkbox-feature-${v.toLowerCase().replace(/\s+/g, '-')}`} />
                  {v}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
