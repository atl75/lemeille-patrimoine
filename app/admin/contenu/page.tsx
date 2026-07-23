import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata = { title: "Admin — Contenu" };

export default function Page(){
  return (
    <main>
      <AdminShell title="Gestion du contenu">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Administration", href:"/admin"},{label:"Contenu"}]} />
        <div className="grid md:grid-cols-2 gap-6">
          <a className="card p-6 hover:border-[#B89C6D]" href="/admin/contenu/biens">Biens immobiliers</a>
          <a className="card p-6 hover:border-[#B89C6D]" href="/admin/contenu/programmes">Programmes</a>
          <a className="card p-6 hover:border-[#B89C6D]" href="/admin/contenu/avis">Avis</a>
        </div>
      </AdminShell>
    </main>
  );
}
