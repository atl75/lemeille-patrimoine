"use client";
import { AlertTriangle } from "lucide-react";
import {
  BAREME_COURANT, criteresDe, modalitesDe, pourcentDe, alertes,
  type Critere, type Choix, type Corrections, type TypeBien, type Ajustement, type Fiabilite,
} from "@/lib/estimation";

/**
 * Les six critères qui corrigent le prix de secteur.
 *
 * Le parti pris tient en une ligne : la PROVENANCE de chaque chiffre est
 * affichée aussi grandement que le chiffre. Une pastille dit si la valeur est
 * mesurée sur des transactions, transposée d'une étude, ou seulement d'usage —
 * parce que ce document finit devant un vendeur, et qu'y présenter « -22 % car
 * à rénover » avec le même aplomb que « -25 % car maison en G » serait faux :
 * le second est mesuré sur 308 627 ventes, le premier ne l'est nulle part.
 */

const FIABILITE: Record<Fiabilite, { court: string; titre: string; cls: string }> = {
  mesuree: {
    court: "mesuré",
    titre: "Mesuré sur des transactions réelles par une étude nommée.",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  estimee: {
    court: "transposé",
    titre: "Tiré d'une étude, mais transposé : autre marché, autre époque, ou borne de fourchette.",
    cls: "bg-amber-100 text-amber-800 border-amber-300",
  },
  usage: {
    court: "usage",
    titre: "Pratique de la profession. Aucune étude française ne chiffre ce critère.",
    cls: "bg-stone-100 text-stone-700 border-stone-300",
  },
};

const signe = (n: number) => (n > 0 ? "+" : "") + n.toFixed(0).replace("-", "−") + " %";

export default function CriteresEstimation({
  type, choix, corrections, ajustements, onChoix, onCorrection,
}: {
  type: TypeBien;
  choix: Choix;
  corrections: Corrections;
  ajustements: Ajustement[];
  onChoix: (c: Critere, cle: string) => void;
  onCorrection: (c: Critere, valeur: number | null) => void;
}) {
  const liste = criteresDe(BAREME_COURANT, type);
  const avertissements = alertes(ajustements);

  return (
    <div className="space-y-4">
      {avertissements.map((a, i) => (
        <div key={i} className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{a.texte}</span>
        </div>
      ))}

      {liste.map((critere) => {
        const echelle = BAREME_COURANT.criteres[critere];
        const modalites = modalitesDe(BAREME_COURANT, critere, type);
        const retenu = choix[critere];
        const ligne = ajustements.find((a) => a.critere === critere);
        const modalite = modalites.find((m) => m.cle === retenu);

        return (
          <fieldset key={critere} className="rounded-lg border p-3">
            <legend className="px-1 text-sm font-semibold">{echelle.libelle}</legend>

            <p className="mb-2 text-xs text-stone-600">{echelle.explication}</p>
            <p className="mb-2 text-xs text-stone-500">
              <span className="font-medium">Référence à 0 % :</span> {echelle.neutre}. Les écarts se
              comptent par rapport au bien médian du secteur, pas par rapport à un bien parfait.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {modalites.map((m) => {
                const v = pourcentDe(m.pourcent, type);
                const actif = retenu === m.cle;
                return (
                  <button
                    key={m.cle}
                    type="button"
                    onClick={() => onChoix(critere, actif ? "" : m.cle)}
                    title={m.note}
                    data-testid={`critere-${critere}-${m.cle}`}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      actif
                        ? "border-[#1F3B2C] bg-[#1F3B2C] text-white"
                        : "border-stone-300 bg-white hover:bg-stone-50"
                    }`}
                  >
                    {m.libelle}
                    <span className={`ml-1.5 tabular-nums ${actif ? "opacity-90" : "opacity-60"}`}>
                      {v === 0 ? "0 %" : signe(v)}
                    </span>
                  </button>
                );
              })}
            </div>

            {modalite && (
              <div className="mt-2.5 space-y-1.5 border-t pt-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-medium ${FIABILITE[modalite.fiabilite].cls}`}
                    title={FIABILITE[modalite.fiabilite].titre}
                  >
                    {FIABILITE[modalite.fiabilite].court}
                  </span>
                  <span className="text-stone-600">{modalite.source}</span>
                </div>

                {modalite.note && <p className="text-stone-600">{modalite.note}</p>}

                <label className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-stone-700">Corriger pour ce bien :</span>
                  <input
                    type="number"
                    step="1"
                    className="input w-24 py-1 text-xs"
                    placeholder={String(pourcentDe(modalite.pourcent, type))}
                    value={corrections[critere] ?? ""}
                    data-testid={`correction-${critere}`}
                    onChange={(e) =>
                      onCorrection(critere, e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                  <span className="text-stone-500">%</span>
                  {ligne?.corrige && (
                    <span className="text-amber-700">
                      barème : {signe(ligne.pourcentBareme ?? 0)}
                    </span>
                  )}
                </label>
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
