"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function SoldToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSoldView = searchParams.get("showSold") === "true";

  const toggleView = (showSold: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (showSold) {
      params.set("showSold", "true");
    } else {
      params.delete("showSold");
    }
    
    // Naviguer sans scroller en haut
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  return (
    <div className="flex gap-3 mb-4">
      <button
        onClick={() => toggleView(false)}
        className={`btn ${
          !isSoldView
            ? "btn-gold"
            : "bg-white border-2 border-gray-300 text-gray-700 hover:border-gold"
        }`}
        data-testid="button-available-properties"
      >
        Biens en vente
      </button>
      <button
        onClick={() => toggleView(true)}
        className={`btn ${
          isSoldView
            ? "btn-gold"
            : "bg-white border-2 border-gray-300 text-gray-700 hover:border-gold"
        }`}
        data-testid="button-sold-properties"
      >
        Biens vendus
      </button>
    </div>
  );
}
