import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { readJSON } from "@/lib/utils";
import { Plus, TrendingUp, Euro } from "lucide-react";

export const metadata = { title: "Administration — Lemeille Patrimoine" };

// Lit les données du bucket à chaque requête (sinon la page est prérendue
// au build avec des données vides et affiche toujours 0).
export const dynamic = 'force-dynamic';

export default async function Page(){
  const properties = await readJSON('properties.json');
  
  // Biens réellement en vente : ni vendus, ni sous promesse (cohérent avec
  // la vue « Biens en vente »)
  const activeProperties = properties.filter(
    (p: any) => !p.sold && p.status !== 'UNDER_OFFER' && p.status !== 'SOLD'
  );
  const totalProperties = activeProperties.length;
  
  // Calculate total portfolio value (CA potentiel)
  const totalValue = activeProperties.reduce((sum: number, p: any) => {
    return sum + (p.price || 0);
  }, 0);
  
  // Calculate commission (assuming 5% average if no commission field)
  const totalCommission = activeProperties.reduce((sum: number, p: any) => {
    const commission = p.commission || (p.price * 0.05);
    return sum + commission;
  }, 0);
  
  return (
    <main>
      <AdminShell title="Administration">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Administration"}]} />
        
        {/* Quick Action Button */}
        <div className="mb-6">
          <Link
            href="/admin/contenu/biens?action=new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#B89C6D] text-white rounded-md hover:bg-[#A68B5E] transition-colors"
            data-testid="button-add-property"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Ajouter une annonce</span>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/contenu/biens" className="card p-6 border-2 border-[#B89C6D]/20 hover:border-[#B89C6D] transition-colors block" data-testid="link-active-properties">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#B89C6D]/10">
                <TrendingUp className="h-6 w-6 text-[#B89C6D]" />
              </div>
              <h3 className="luxe text-lg text-[#1F3B2C]">Biens actifs</h3>
            </div>
            <p className="text-3xl font-bold text-[#1F3B2C]" data-testid="stat-active-properties">
              {totalProperties}
            </p>
            <p className="text-sm opacity-75 mt-1">Annonces en ligne</p>
          </Link>

          <div className="card p-6 border-2 border-[#B89C6D]/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#B89C6D]/10">
                <Euro className="h-6 w-6 text-[#B89C6D]" />
              </div>
              <h3 className="luxe text-lg text-[#1F3B2C]">CA potentiel</h3>
            </div>
            <p className="text-3xl font-bold text-[#1F3B2C]" data-testid="stat-potential-revenue">
              {(totalValue / 1000000).toFixed(1)}M€
            </p>
            <p className="text-sm opacity-75 mt-1">Valeur du portefeuille</p>
          </div>

          <div className="card p-6 border-2 border-[#B89C6D]/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#B89C6D]/10">
                <Euro className="h-6 w-6 text-[#B89C6D]" />
              </div>
              <h3 className="luxe text-lg text-[#1F3B2C]">Commission sous promesse</h3>
            </div>
            <p className="text-3xl font-bold text-[#1F3B2C]" data-testid="stat-commission">
              {(totalCommission / 1000).toFixed(0)}K€
            </p>
            <p className="text-sm opacity-75 mt-1">Estimation 5% moyenne</p>
          </div>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link className="card p-6 hover:border-[#B89C6D]" href="/admin/contenu" data-testid="link-content">
            <h3 className="luxe text-xl">Gestion du contenu</h3>
            <p className="opacity-80 mt-2">Biens, programmes, avis — ajouter/modifier/supprimer.</p>
          </Link>
          <Link className="card p-6 hover:border-[#B89C6D]" href="/admin/crm" data-testid="link-crm">
            <h3 className="luxe text-xl">CRM</h3>
            <p className="opacity-80 mt-2">Leads entrants, suivi, statut et export CSV.</p>
          </Link>
          <Link className="card p-6 hover:border-[#B89C6D]" href="/admin/repertoire" data-testid="link-repertoire">
            <h3 className="luxe text-xl">Répertoire</h3>
            <p className="opacity-80 mt-2">Vendeurs, acquéreurs et notaires — contacts et biens liés.</p>
          </Link>
          <Link className="card p-6 hover:border-[#B89C6D]" href="/terrain" data-testid="link-terrain">
            <h3 className="luxe text-xl">Documents terrain 📱</h3>
            <p className="opacity-80 mt-2">Bon de visite / offre d’achat signés — webapp mobile (à ajouter à l’écran d’accueil).</p>
          </Link>
          <Link className="card p-6 hover:border-[#B89C6D]" href="/admin/kpi" data-testid="link-kpi">
            <h3 className="luxe text-xl">Indicateurs</h3>
            <p className="opacity-80 mt-2">Trafic, conversions, programmes, portefeuille.</p>
          </Link>
          <Link className="card p-6 hover:border-[#B89C6D]" href="/admin/mandats" data-testid="link-mandats">
            <h3 className="luxe text-xl">Registre des mandats</h3>
            <p className="opacity-80 mt-2">Le livre des mandats — tous les mandats, statut de signature, impression PDF.</p>
          </Link>
          <Link className="card p-6 hover:border-[#B89C6D]" href="/admin/documents" data-testid="link-documents">
            <h3 className="luxe text-xl">Documents</h3>
            <p className="opacity-80 mt-2">Bons de visite et offres d&apos;achat signés sur le terrain, avec le suivi de l&apos;acceptation vendeur.</p>
          </Link>
        </div>
      </AdminShell>
    </main>
  );
}
