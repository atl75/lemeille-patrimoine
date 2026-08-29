import Link from "next/link";

export default function Breadcrumb({
  items,
  className = ""
}: { items: {label:string; href?:string}[]; className?:string; }) {
  return (
    <nav aria-label="Fil d'Ariane" className={`text-sm text-black/60 ${className}`}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {i>0 && <span className="opacity-75">/</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-[#B89C6D]">{it.label}</Link>
            ) : (
              <span className="text-black/80">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
