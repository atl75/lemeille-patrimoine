"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SectorFilter({
  value,
  options,
}: {
  value?: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const qs = new URLSearchParams(params.toString());
    if (!v) qs.delete("sector");
    else qs.set("sector", v);
    const q = qs.toString();
    router.push("/immobilier" + (q ? "?" + q : ""));
  }

  return (
    <select className="input w-full md:w-auto" value={value || ""} onChange={onChange} data-testid="select-sector-filter">
      <option value="">Tous les secteurs</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
