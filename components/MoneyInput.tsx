"use client";

import { useState } from "react";

// Champ monétaire avec séparateur de milliers.
//
// Remplaçant direct de <input type="number"> : il appelle onChange avec un
// objet de même forme ({ target: { value } }) et une valeur en chiffres bruts,
// afin que les gestionnaires existants — y compris ceux qui recalculent
// commission et prix FAI — fonctionnent sans modification.
type Props = {
  value: number | string | undefined | null;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  "data-testid"?: string;
  disabled?: boolean;
};

const fmt = (v: number | string | undefined | null) => {
  if (v === "" || v === undefined || v === null) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("fr-FR") : "";
};

export default function MoneyInput({ value, onChange, ...rest }: Props) {
  // Pendant la saisie on garde le texte tel quel : reformater à chaque frappe
  // déplacerait le curseur et empêcherait d'effacer un zéro.
  const [saisie, setSaisie] = useState<string | null>(null);

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      value={saisie !== null ? saisie : fmt(value)}
      onChange={e => {
        const chiffres = e.target.value.replace(/[^\d]/g, "");
        setSaisie(chiffres === "" ? "" : Number(chiffres).toLocaleString("fr-FR"));
        onChange({ target: { value: chiffres } });
      }}
      onFocus={e => e.currentTarget.select()}
      onBlur={() => setSaisie(null)}
    />
  );
}
