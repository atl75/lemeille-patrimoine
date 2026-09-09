"use client";
import { useEffect, useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  ouvrirQuand,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  /**
   * Passe à true pour DÉPLIER de force. Sert quand une action extérieure amène
   * l'utilisateur dans ce tiroir — modifier un bien renvoie au formulaire, qui
   * resterait invisible s'il était replié.
   */
  ouvrirQuand?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { if (ouvrirQuand) setOpen(true); }, [ouvrirQuand]);
  return (
    <div className="border rounded-lg mb-3 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        aria-expanded={open}
      >
        <span>
          <span className="font-semibold text-sm">{title}</span>
          {subtitle && <span className="block text-xs opacity-75 mt-0.5">{subtitle}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}
