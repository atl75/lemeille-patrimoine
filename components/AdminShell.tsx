"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-xl border transition ${
        isActive
          ? "bg-[#B89C6D] text-white border-[#B89C6D]"
          : "bg-white hover:border-[#B89C6D]"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div>
      <section className="bg-luxe text-white">
        <div className="container py-10">
          <h1 className="text-3xl md:text-4xl luxe text-cream">{title}</h1>
          <p className="text-cream/85 mt-2">Gestion du contenu, CRM et indicateurs.</p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <NavLink href="/admin" label="Tableau de bord" isActive={pathname === "/admin"} />
            <NavLink href="/admin/contenu" label="Contenu" isActive={pathname === "/admin/contenu"} />
            <NavLink href="/admin/crm" label="CRM" isActive={pathname === "/admin/crm"} />
            <NavLink href="/admin/mandats" label="Registre des mandats" isActive={pathname === "/admin/mandats"} />
            <NavLink href="/admin/kpi" label="Indicateurs" isActive={pathname === "/admin/kpi"} />
          </div>
        </div>
      </section>
      <section className="container py-8">{children}</section>
    </div>
  );
}
