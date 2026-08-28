"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import GaAnalytics from "@/components/GaAnalytics";
import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

type Lead = {
  id: string;
  createdAt: string;
  category?: 'immobilier' | 'patrimoine';
  status?: string;
  source?: string;
  topic?: string;
  meta?: any;
};

type Property = {
  id: string;
  title: string;
  price: number;
  status?: 'AVAILABLE' | 'UNDER_OFFER' | 'SOLD';
  soldDate?: string;
  finalSalePrice?: number;
  negotiatedCommission?: number;
  commissionAmount?: number;
  commissionPercentage?: number;
};

// Libellés lisibles des sources de leads (canaux de conversion du site).
const SOURCE_LABELS: Record<string, string> = {
  'contact-form': 'Formulaire de contact',
  'estimation-immobilier': 'Estimation immobilière',
  'simulateur-defiscalisation': 'Simulateur défiscalisation',
  'guide-defiscalisation': 'Guide (téléchargement)',
  'alerte-biens': 'Alerte nouveaux biens',
  'newsletter': 'Newsletter',
};
const sourceLabel = (s: string) => SOURCE_LABELS[s] || s || 'Autre';

export default function Page(){
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Période fiscale par défaut : du 01/01 de l'année en cours à aujourd'hui
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/properties').then(r => r.json()),
      fetch('/api/programs').then(r => r.json()).catch(() => [])
    ])
      .then(([leadsData, propertiesData, programsData]) => {
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
        setPrograms(Array.isArray(programsData) ? programsData : []);
        setLoading(false);
      })
      .catch(() => {
        setLeads([]);
        setProperties([]);
        setPrograms([]);
        setLoading(false);
      });
  }, []);

  const kpi = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthLeads = leads.filter(l => new Date(l.createdAt) >= thisMonth);
    const lastMonthLeads = leads.filter(l => {
      const d = new Date(l.createdAt);
      return d >= lastMonth && d < thisMonth;
    });

    const bySource = leads.reduce((acc, l) => {
      const src = l.source || 'contact-form';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTopic = leads.reduce((acc, l) => {
      const topic = l.topic || 'Non spécifié';
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = leads.reduce((acc, l) => {
      const status = l.status || 'new';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = leads.reduce((acc, l) => {
      const category = l.category || 'immobilier';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const growth = lastMonthLeads.length > 0
      ? Math.round(((thisMonthLeads.length - lastMonthLeads.length) / lastMonthLeads.length) * 100)
      : 0;

    // Évolution mensuelle (12 derniers mois)
    const monthlyMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, 0);
    }
    leads.forEach(l => {
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    });
    const monthlyEvolution = Array.from(monthlyMap.entries()).map(([key, count]) => {
      const [y, m] = key.split('-');
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
      return { month: label, leads: count };
    });

    // Entonnoir de conversion (statuts ordonnés)
    const STATUS_ORDER = ['new', 'contacted', 'qualified', 'closed'];
    const STATUS_LABEL: Record<string, string> = { new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié', closed: 'Fermé' };
    const funnel = STATUS_ORDER.map(status => ({
      status: STATUS_LABEL[status],
      count: byStatus[status] || 0,
      rate: leads.length > 0 ? Math.round(((byStatus[status] || 0) / leads.length) * 100) : 0
    }));

    return {
      total: leads.length,
      thisMonth: thisMonthLeads.length,
      lastMonth: lastMonthLeads.length,
      growth,
      bySource,
      byTopic,
      byStatus,
      byCategory,
      monthlyEvolution,
      funnel
    };
  }, [leads]);

  const propertyKpi = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filtrer les biens selon la période (utilise soldDate pour les vendus)
    const filteredProperties = properties.filter(p => {
      // Gérer les deux formats : nouveau (status: "SOLD") et ancien (sold: true)
      const isSold = p.status === 'SOLD' || (p as any).sold === true;
      if (isSold && p.soldDate) {
        const soldDate = new Date(p.soldDate);
        return soldDate >= start && soldDate <= end;
      }
      return true; // Les biens en vente et sous promesse sont toujours comptés
    });

    // Statistiques par statut (gérer les deux formats)
    const available = filteredProperties.filter(p => {
      const isSold = p.status === 'SOLD' || (p as any).sold === true;
      const isUnderOffer = p.status === 'UNDER_OFFER';
      return !isSold && !isUnderOffer;
    });
    const underOffer = filteredProperties.filter(p => p.status === 'UNDER_OFFER');
    const sold = filteredProperties.filter(p => p.status === 'SOLD' || (p as any).sold === true);

    // Calcul du chiffre d'affaires et commissions
    const caAvailable = available.reduce((sum, p) => sum + (p.price || 0), 0);
    const commissionsAvailable = available.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
    
    const caUnderOffer = underOffer.reduce((sum, p) => sum + (p.price || 0), 0);
    const commissionsUnderOffer = underOffer.reduce((sum, p) => {
      const commission = p.negotiatedCommission || p.commissionAmount || 0;
      return sum + commission;
    }, 0);
    
    // Pour les vendus, utiliser finalSalePrice si disponible, sinon price
    const caSold = sold.reduce((sum, p) => {
      const salePrice = p.finalSalePrice || p.price || 0;
      return sum + salePrice;
    }, 0);

    // Commissions sur les biens vendus
    const commissionsSold = sold.reduce((sum, p) => {
      // Utiliser negotiatedCommission si disponible, sinon commissionAmount
      const commission = p.negotiatedCommission || p.commissionAmount || 0;
      return sum + commission;
    }, 0);

    const totalCA = caAvailable + caUnderOffer + caSold;
    const totalCommissions = commissionsAvailable + commissionsUnderOffer + commissionsSold;

    return {
      available: {
        count: available.length,
        ca: caAvailable,
        commissions: commissionsAvailable
      },
      underOffer: {
        count: underOffer.length,
        ca: caUnderOffer,
        commissions: commissionsUnderOffer
      },
      sold: {
        count: sold.length,
        ca: caSold,
        commissions: commissionsSold
      },
      total: {
        count: filteredProperties.length,
        ca: totalCA,
        commissions: totalCommissions
      }
    };
  }, [properties, startDate, endDate]);

  // Indicateurs « intelligents » et connectés (web ↔ leads ↔ biens ↔ programmes)
  const smart = useMemo(() => {
    const start = new Date(startDate); const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    const inPeriod = (s?: string) => { if (!s) return false; const d = new Date(s); return d >= start && d <= end; };
    const isSold = (p: any) => p.status === 'SOLD' || p.sold === true;

    // Biens
    const sold = properties.filter(p => isSold(p) && (!p.soldDate || inPeriod(p.soldDate)));
    const underOffer = properties.filter(p => p.status === 'UNDER_OFFER');
    const available = properties.filter(p => !isSold(p) && p.status !== 'UNDER_OFFER' && (p as any).visible !== false);

    const soldPriced = sold.filter(p => (p.finalSalePrice || p.price || 0) > 0);
    const caSold = soldPriced.reduce((s, p) => s + (p.finalSalePrice || p.price || 0), 0);
    const commSold = sold.reduce((s, p) => s + (p.negotiatedCommission || p.commissionAmount || 0), 0);
    const commUnderOffer = underOffer.reduce((s, p) => s + (p.negotiatedCommission || p.commissionAmount || 0), 0);
    const stockValue = available.reduce((s, p) => s + (p.price || 0), 0);
    // Prix de vente moyen : uniquement sur les ventes dont le prix est renseigné.
    const avgSalePrice = soldPriced.length ? caSold / soldPriced.length : 0;
    const commPaid = sold.filter(p => (p.negotiatedCommission || p.commissionAmount || 0) > 0);
    const avgComm = commPaid.length ? commSold / commPaid.length : 0;
    const commRate = caSold > 0 ? (commSold / caSold) * 100 : 0;
    const totalBiens = available.length + underOffer.length + sold.length;
    const commercialisation = totalBiens ? ((sold.length + underOffer.length) / totalBiens) * 100 : 0;

    // Leads (CRM)
    const since = (days: number) => new Date(Date.now() - days * 86400000);
    const leads30 = leads.filter(l => new Date(l.createdAt) >= since(30));
    const isContacted = (l: Lead) => (l.status || 'new') !== 'new';
    const isQualified = (l: Lead) => ['qualified', 'estimation', 'mandate', 'closed'].includes(l.status || '');
    const isClosed = (l: Lead) => ['closed', 'mandate'].includes(l.status || '');
    const qualified = leads.filter(isQualified);
    const closedLeads = leads.filter(isClosed);
    const acheteurs = leads.filter(l => (l.category || 'immobilier') === 'immobilier' && ((l as any).role || 'ACHETEUR') === 'ACHETEUR').length;
    const vendeurs = leads.filter(l => (l as any).role === 'VENDEUR').length;

    // Connexions (taux de conversion, honnêtes et bornés)
    const leadToQualified = leads.length > 0 ? (qualified.length / leads.length) * 100 : 0;
    const closingRate = leads.length > 0 ? (closedLeads.length / leads.length) * 100 : 0;
    const leadsParBien = available.length > 0 ? leads30.length / available.length : 0;

    // Tunnel CRM, fenêtre cohérente 30 jours. (Le trafic web est suivi dans Google Analytics.)
    const funnel = [
      { label: 'Leads (30j)', value: leads30.length },
      { label: 'Contactés (30j)', value: leads30.filter(isContacted).length },
      { label: 'Qualifiés (30j)', value: leads30.filter(isQualified).length },
      { label: 'Fermés (30j)', value: leads30.filter(isClosed).length },
    ];

    const availablePriced = available.filter(p => (p.price || 0) > 0 || (p as any).priceOnRequest).length;
    const leadsTracked = leads.filter(isContacted).length; // leads sortis du statut « nouveau »

    return {
      soldCount: sold.length, soldPricedCount: soldPriced.length, soldCommCount: commPaid.length,
      underOfferCount: underOffer.length, availableCount: available.length, availablePriced,
      leadsTotal: leads.length, leadsTracked,
      caSold, commSold, commUnderOffer, stockValue, avgSalePrice, avgComm, commRate, commercialisation,
      leads30: leads30.length, qualified: qualified.length, acheteurs, vendeurs,
      leadToQualified, closingRate, leadsParBien, funnel,
    };
  }, [leads, properties, startDate, endDate]);

  // KPI programmes de défiscalisation (lots)
  const progKpi = useMemo(() => {
    const lots = programs.flatMap((p: any) => Array.isArray(p.lots) ? p.lots : []);
    const st = (l: any) => l.statut || 'DISPONIBLE';
    const dispo = lots.filter((l: any) => st(l) === 'DISPONIBLE').length;
    const vendu = lots.filter((l: any) => st(l) === 'VENDU').length;
    const reserve = lots.filter((l: any) => st(l) === 'RESERVE' || st(l) === 'OPTION').length;
    const caVendu = lots.filter((l: any) => st(l) === 'VENDU').reduce((s: number, l: any) => s + ((Number(l.prixPlateau) || 0) + (Number(l.prixTravaux) || 0)), 0);
    const tauxCommercialisation = lots.length ? ((vendu + reserve) / lots.length) * 100 : 0;
    return { nbProgrammes: programs.length, totalLots: lots.length, dispo, vendu, reserve, caVendu, tauxCommercialisation };
  }, [programs]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  const pct = (n: number) => `${n.toFixed(n >= 10 ? 0 : 1)} %`;

  return (
    <AdminShell title="Indicateurs">
      <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Administration", href:"/admin"},{label:"Indicateurs"}]} />

      <GaAnalytics />

      {loading && <div className="card p-6">Chargement des données...</div>}

      {!loading && (
        <>
          {/* Filtre de période */}
          <div className="card p-6 mb-6">
            <h3 className="luxe text-xl mb-4">Période d&apos;analyse</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Date de début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 border rounded"
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 border rounded"
                  data-testid="input-end-date"
                />
              </div>
              <button
                onClick={() => {
                  const year = new Date().getFullYear();
                  setStartDate(`${year}-01-01`);
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
                className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D] transition"
                data-testid="button-reset-fiscal-year"
              >
                Année fiscale en cours
              </button>
            </div>
          </div>

          {/* ===== VUE D'ENSEMBLE ===== */}
          <h2 className="luxe text-2xl mb-4">Vue d&apos;ensemble</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="card p-5 !bg-[#1F3B2C] text-white">
              <div className="text-[11px] uppercase tracking-wide text-white/70">CA réalisé</div>
              <div className="text-2xl font-semibold mt-1">{formatCurrency(smart.caSold)}</div>
              <div className="text-xs text-white/60 mt-1">{smart.soldCount} vente{smart.soldCount > 1 ? 's' : ''}</div>
            </div>
            <div className="card p-5 !bg-[#B89C6D] text-white">
              <div className="text-[11px] uppercase tracking-wide text-white/80">Commissions réalisées</div>
              <div className="text-2xl font-semibold mt-1">{formatCurrency(smart.commSold)}</div>
              <div className="text-xs text-white/70 mt-1">taux {pct(smart.commRate)}</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Pipeline (sous promesse)</div>
              <div className="text-2xl font-semibold mt-1 text-orange-600">{formatCurrency(smart.commUnderOffer)}</div>
              <div className="text-xs text-gray-500 mt-1">{smart.underOfferCount} bien{smart.underOfferCount > 1 ? 's' : ''} à venir</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Prix de vente moyen</div>
              <div className="text-2xl font-semibold mt-1 text-gray-900">{formatCurrency(smart.avgSalePrice)}</div>
              <div className="text-xs text-gray-500 mt-1">commission moy. {formatCurrency(smart.avgComm)}</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Nouveaux leads (30j)</div>
              <div className="text-2xl font-semibold mt-1 text-blue-700">{smart.leads30}</div>
              <div className="text-xs text-gray-500 mt-1">{smart.leadsParBien.toFixed(1)} lead / bien dispo</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Taux de closing (leads)</div>
              <div className="text-2xl font-semibold mt-1 text-green-700">{pct(smart.closingRate)}</div>
              <div className="text-xs text-gray-500 mt-1">{pct(smart.leadToQualified)} qualifiés</div>
            </div>
          </div>

          {/* ===== TUNNEL CONNECTÉ ===== */}
          <div className="card p-6 mb-6">
            <h3 className="luxe text-xl mb-1">Tunnel de conversion connecté</h3>
            <p className="text-sm text-gray-500 mb-4">Du trafic web à la vente — chaque étape et son taux de passage.</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {smart.funnel.map((s, i) => {
                const prev = i > 0 ? smart.funnel[i - 1].value : 0;
                return (
                  <div key={i} className="relative rounded-xl border p-4 text-center" style={{ background: `rgba(31,59,44,${0.05 + i * 0.05})` }}>
                    <div className="text-2xl font-semibold text-[#1F3B2C]">{s.value.toLocaleString('fr-FR')}</div>
                    <div className="text-xs text-gray-600 mt-1">{s.label}</div>
                    {i > 0 && (
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden md:block text-[10px] font-semibold text-[#B89C6D] bg-white border rounded-full px-1.5 py-0.5">
                        {prev > 0 ? pct((s.value / prev) * 100) : '—'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== INDICATEURS CLÉS + CRM ===== */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Valeur du portefeuille</div>
              <div className="text-xl font-semibold mt-1 text-gray-900">{formatCurrency(smart.stockValue)}</div>
              <div className="text-xs text-gray-500 mt-1">{smart.availableCount} bien{smart.availableCount > 1 ? 's' : ''} en vente</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Taux de commercialisation</div>
              <div className="text-xl font-semibold mt-1 text-gray-900">{pct(smart.commercialisation)}</div>
              <div className="text-xs text-gray-500 mt-1">vendus + sous promesse / total</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Demande / offre</div>
              <div className="text-xl font-semibold mt-1 text-gray-900">{smart.leadsParBien.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-1">leads (30j) par bien en vente</div>
            </div>
            <div className="card p-5">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Leads CRM</div>
              <div className="mt-1 flex items-baseline gap-3">
                <div><span className="text-xl font-semibold text-teal-700">{smart.acheteurs}</span><span className="text-xs text-gray-500 ml-1">acheteurs</span></div>
                <div><span className="text-xl font-semibold text-amber-700">{smart.vendeurs}</span><span className="text-xs text-gray-500 ml-1">vendeurs</span></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{smart.vendeurs} mandat{smart.vendeurs > 1 ? 's' : ''} potentiel{smart.vendeurs > 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* ===== COMPLÉTUDE DES DONNÉES ===== */}
          <div className="card p-6 mb-8">
            <h3 className="luxe text-xl mb-1">Complétude des données</h3>
            <p className="text-sm text-gray-500 mb-4">Plus la donnée est renseignée, plus les indicateurs ci-dessus sont fiables. Complétez les lignes en rouge/orange.</p>
            <div className="space-y-3">
              {[
                { label: "Ventes avec prix renseigné", done: smart.soldPricedCount, total: smart.soldCount },
                { label: "Ventes avec commission renseignée", done: smart.soldCommCount, total: smart.soldCount },
                { label: "Biens en vente avec prix", done: smart.availablePriced, total: smart.availableCount },
                { label: "Leads suivis (statut au-delà de « nouveau »)", done: smart.leadsTracked, total: smart.leadsTotal },
              ].map((r, i) => {
                const rate = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                const color = rate >= 80 ? "#2e7d32" : rate >= 40 ? "#f9a825" : "#c62828";
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{r.label}</span>
                      <span className="font-medium text-gray-900">{r.done}/{r.total} · {rate} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KPI Immobiliers */}
          <div className="mb-6">
            <h2 className="luxe text-2xl mb-4">Chiffre d&apos;affaires immobilier</h2>
            
            {/* CA Total */}
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div className="card p-6 !bg-[#1F3B2C] text-white">
                <div className="text-sm text-white/80 mb-2">Total</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-white/70">CA Total</div>
                    <div className="text-2xl font-semibold text-white">{formatCurrency(propertyKpi.total.ca)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/70">Commission Total</div>
                    <div className="text-2xl font-semibold text-white">{formatCurrency(propertyKpi.total.commissions)}</div>
                  </div>
                </div>
                <div className="text-xs text-white/70 mt-2">{propertyKpi.total.count} bien{propertyKpi.total.count > 1 ? 's' : ''}</div>
              </div>

              <div className="card p-6 border-2 border-green-600">
                <div className="text-sm text-gray-600 mb-2">En vente</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">CA</div>
                    <div className="text-xl font-semibold text-green-700">{formatCurrency(propertyKpi.available.ca)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Commission</div>
                    <div className="text-xl font-semibold text-green-700">{formatCurrency(propertyKpi.available.commissions)}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">{propertyKpi.available.count} bien{propertyKpi.available.count > 1 ? 's' : ''}</div>
              </div>

              <div className="card p-6 border-2 border-orange-500">
                <div className="text-sm text-gray-600 mb-2">Sous promesse</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">CA</div>
                    <div className="text-xl font-semibold text-orange-600">{formatCurrency(propertyKpi.underOffer.ca)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Commission</div>
                    <div className="text-xl font-semibold text-orange-600">{formatCurrency(propertyKpi.underOffer.commissions)}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">{propertyKpi.underOffer.count} bien{propertyKpi.underOffer.count > 1 ? 's' : ''}</div>
              </div>

              <div className="card p-6 border-2 border-blue-600">
                <div className="text-sm text-gray-600 mb-2">Vendus</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500">CA</div>
                    <div className="text-xl font-semibold text-blue-700">{formatCurrency(propertyKpi.sold.ca)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Commission</div>
                    <div className="text-xl font-semibold text-blue-700">{formatCurrency(propertyKpi.sold.commissions)}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">{propertyKpi.sold.count} bien{propertyKpi.sold.count > 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Commissions */}
            <div className="card p-6 mb-6 !bg-[#B89C6D] text-white">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-white/90">Commissions perçues (biens vendus)</div>
                  <div className="text-3xl font-semibold mt-1 text-white">{formatCurrency(propertyKpi.sold.commissions)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/90">Taux moyen de commission</div>
                  <div className="text-3xl font-semibold mt-1 text-white">
                    {propertyKpi.sold.ca > 0 
                      ? `${((propertyKpi.sold.commissions / propertyKpi.sold.ca) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== PROGRAMMES DE DÉFISCALISATION ===== */}
          {progKpi.totalLots > 0 && (
            <div className="mb-8">
              <h2 className="luxe text-2xl mb-4">Programmes de défiscalisation</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="card p-5"><div className="text-[11px] uppercase tracking-wide text-gray-500">Programmes</div><div className="text-2xl font-semibold mt-1">{progKpi.nbProgrammes}</div></div>
                <div className="card p-5"><div className="text-[11px] uppercase tracking-wide text-gray-500">Lots</div><div className="text-2xl font-semibold mt-1">{progKpi.totalLots}</div></div>
                <div className="card p-5"><div className="text-[11px] uppercase tracking-wide text-gray-500">Disponibles</div><div className="text-2xl font-semibold mt-1 text-emerald-700">{progKpi.dispo}</div></div>
                <div className="card p-5"><div className="text-[11px] uppercase tracking-wide text-gray-500">Réservés / option</div><div className="text-2xl font-semibold mt-1 text-amber-700">{progKpi.reserve}</div></div>
                <div className="card p-5"><div className="text-[11px] uppercase tracking-wide text-gray-500">Vendus</div><div className="text-2xl font-semibold mt-1 text-blue-700">{progKpi.vendu}</div></div>
                <div className="card p-5"><div className="text-[11px] uppercase tracking-wide text-gray-500">Commercialisation</div><div className="text-2xl font-semibold mt-1">{pct(progKpi.tauxCommercialisation)}</div></div>
              </div>
              <div className="card p-5 mt-4 !bg-[#1F3B2C] text-white flex items-center justify-between">
                <div className="text-sm text-white/80">Montant des lots vendus (prix FAI)</div>
                <div className="text-2xl font-semibold">{formatCurrency(progKpi.caVendu)}</div>
              </div>
            </div>
          )}


          {/* KPI Leads */}
          <div className="mb-6">
            <h2 className="luxe text-2xl mb-4">Statistiques des leads</h2>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="card p-6">
              <div className="text-sm text-gray-600">Total leads</div>
              <div className="text-3xl font-semibold mt-1 text-gray-900">{kpi.total}</div>
            </div>
            
            <div className="card p-6">
              <div className="text-sm text-gray-600">Ce mois-ci</div>
              <div className="text-3xl font-semibold mt-1 text-gray-900">{kpi.thisMonth}</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-600">Mois dernier</div>
              <div className="text-3xl font-semibold mt-1 text-gray-900">{kpi.lastMonth}</div>
            </div>

            <div className="card p-6">
              <div className="text-sm text-gray-600">Évolution</div>
              <div className={`text-3xl font-semibold mt-1 ${kpi.growth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {kpi.growth >= 0 ? '+' : ''}{kpi.growth}%
              </div>
            </div>
          </div>

          {/* Évolution mensuelle des leads */}
          <div className="card p-6 mb-4">
            <h3 className="luxe text-xl mb-4">Évolution des leads (12 derniers mois)</h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={kpi.monthlyEvolution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => [value, 'Leads']} />
                  <Bar dataKey="leads" fill="#B89C6D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Entonnoir de conversion */}
          <div className="card p-6 mb-4">
            <h3 className="luxe text-xl mb-4">Taux de conversion des leads</h3>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={kpi.funnel} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value: any, _name: any, item: any) => [`${value} (${item.payload.rate}%)`, 'Leads']} />
                  <Bar dataKey="count" fill="#1F3B2C" radius={[0, 4, 4, 0]}>
                    {kpi.funnel.map((_, i) => (
                      <Cell key={i} fillOpacity={1 - i * 0.18} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Par source — quel canal du site convertit le mieux */}
          <div className="card p-6 mb-4">
            <h3 className="luxe text-xl mb-1">Leads par source</h3>
            <p className="text-xs opacity-60 mb-4">Quel formulaire / canal du site génère le plus de contacts.</p>
            <div className="space-y-2">
              {Object.entries(kpi.bySource)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => {
                  const pct = kpi.total > 0 ? Math.round((count / kpi.total) * 100) : 0;
                  return (
                    <div key={source} data-testid={`source-${source}`}>
                      <div className="flex justify-between items-center text-sm mb-0.5">
                        <span className="text-gray-700">{sourceLabel(source)}</span>
                        <span className="font-semibold text-gray-900">{count} <span className="opacity-50 font-normal">· {pct}%</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded overflow-hidden">
                        <div className="h-full bg-[#1F3B2C]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(kpi.bySource).length === 0 && <div className="text-sm opacity-50">Aucun lead sur la période.</div>}
            </div>
          </div>

          {/* Par catégorie */}
          <div className="card p-6 mb-4">
            <h3 className="luxe text-xl mb-4">🏢 Répartition par catégorie</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <div className="text-sm text-blue-700 font-medium">🏠 Immobilier</div>
                <div className="text-3xl font-bold text-blue-700">{kpi.byCategory.immobilier || 0}</div>
                <div className="text-xs text-blue-600 mt-1">
                  {kpi.total > 0 ? Math.round(((kpi.byCategory.immobilier || 0) / kpi.total) * 100) : 0}% du total
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded border border-purple-200">
                <div className="text-sm text-purple-700 font-medium">💼 Gestion de Patrimoine</div>
                <div className="text-3xl font-bold text-purple-700">{kpi.byCategory.patrimoine || 0}</div>
                <div className="text-xs text-purple-600 mt-1">
                  {kpi.total > 0 ? Math.round(((kpi.byCategory.patrimoine || 0) / kpi.total) * 100) : 0}% du total
                </div>
              </div>
            </div>
          </div>

          {/* Par sujet */}
          <div className="card p-6 mb-4">
            <h3 className="luxe text-xl mb-4">Répartition par sujet</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(kpi.byTopic)
                .sort(([,a], [,b]) => b - a)
                .map(([topic, count]) => (
                  <div key={topic} className="flex justify-between items-center p-3 bg-gray-100 rounded">
                    <span className="text-sm text-gray-700">{topic}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Par statut */}
          <div className="card p-6">
            <h3 className="luxe text-xl mb-4">Répartition par statut</h3>
            <div className="grid md:grid-cols-4 gap-4">
              {Object.entries(kpi.byStatus)
                .sort(([,a], [,b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center p-3 bg-gray-100 rounded">
                    <span className="text-sm text-gray-700 capitalize">
                      {status === 'new' ? 'Nouveau' : status === 'contacted' ? 'Contacté' : status === 'qualified' ? 'Qualifié' : status === 'closed' ? 'Fermé' : status}
                    </span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
