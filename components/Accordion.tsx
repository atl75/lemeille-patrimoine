"use client";
export default function Accordion({
  items
}: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <details key={i} className="rounded-2xl border bg-white p-4">
          <summary className="cursor-pointer list-none luxe text-lg">
            {it.q}
          </summary>
          <div className="mt-2 text-sm opacity-90">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
