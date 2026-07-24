"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
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

type AnalyticsStats = {
  totalVisits: number;
  last24h: number;
  last7days: number;
  last30days: number;
  topPages: Array<{ page: string; count: number }>;
  topReferrers: Array<{ source: string; count: number }>;
  devices: { Mobile?: number; Desktop?: number };
  topCountries: Array<{ country: string; count: number }>;
  dailyStats: Array<{ date: string; count: number }>;
  avgSessionTime: string;
};

export default function Page(){
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Période fiscale par défaut : du 01/01 de l'année en cours à aujourd'hui
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/properties').then(r => r.json()),
      fetch('/api/analytics/stats').then(r => r.json())
    ])
      .then(([leadsData, propertiesData, analyticsData]) => {
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
        setAnalyticsStats(analyticsData);
        setLoading(false);
      })
      .catch(() => {
        setLeads([]);
        setProperties([]);
        setAnalyticsStats(null);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <AdminShell title="Indicateurs">
      <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Administration", href:"/admin"},{label:"Indicateurs"}]} />

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

          {/* Statistiques Web */}
          {analyticsStats && (
            <div className="mb-8">
              <h2 className="luxe text-2xl mb-4">📊 Statistiques du site web</h2>
              
              {/* Cartes de visite */}
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="card p-6 !bg-gradient-to-br !from-blue-500 !to-blue-600 text-white">
                  <div className="text-sm text-white/90">Total de visites</div>
                  <div className="text-3xl font-semibold mt-1">{analyticsStats.totalVisits.toLocaleString('fr-FR')}</div>
                </div>
                
                <div className="card p-6">
                  <div className="text-sm text-gray-600">Dernières 24h</div>
                  <div className="text-3xl font-semibold mt-1 text-green-700">{analyticsStats.last24h}</div>
                </div>
                
                <div className="card p-6">
                  <div className="text-sm text-gray-600">7 derniers jours</div>
                  <div className="text-3xl font-semibold mt-1 text-blue-700">{analyticsStats.last7days}</div>
                </div>
                
                <div className="card p-6">
                  <div className="text-sm text-gray-600">30 derniers jours</div>
                  <div className="text-3xl font-semibold mt-1 text-purple-700">{analyticsStats.last30days}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Pages les plus visitées */}
                <div className="card p-6">
                  <h3 className="luxe text-xl mb-4">📄 Pages les plus visitées</h3>
                  <div className="space-y-2">
                    {analyticsStats.topPages.length > 0 ? (
                      analyticsStats.topPages.map((page, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate flex-1">{page.page}</span>
                          <span className="font-semibold text-gray-900 ml-2">{page.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Aucune donnée disponible</p>
                    )}
                  </div>
                </div>

                {/* Sources de trafic */}
                <div className="card p-6">
                  <h3 className="luxe text-xl mb-4">🌐 Sources de trafic</h3>
                  <div className="space-y-2">
                    {analyticsStats.topReferrers.length > 0 ? (
                      analyticsStats.topReferrers.map((ref, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate flex-1">{ref.source}</span>
                          <span className="font-semibold text-gray-900 ml-2">{ref.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Aucune donnée disponible</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* Appareils */}
                <div className="card p-6">
                  <h3 className="luxe text-xl mb-4">📱 Appareils</h3>
                  <div className="space-y-3">
                    {analyticsStats.devices.Desktop !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">🖥️ Desktop</span>
                        <span className="font-semibold text-gray-900">{analyticsStats.devices.Desktop}</span>
                      </div>
                    )}
                    {analyticsStats.devices.Mobile !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">📱 Mobile</span>
                        <span className="font-semibold text-gray-900">{analyticsStats.devices.Mobile}</span>
                      </div>
                    )}
                    {!analyticsStats.devices.Desktop && !analyticsStats.devices.Mobile && (
                      <p className="text-sm text-gray-500">Aucune donnée disponible</p>
                    )}
                  </div>
                </div>

                {/* Pays */}
                <div className="card p-6 md:col-span-2">
                  <h3 className="luxe text-xl mb-4">🌍 Pays des visiteurs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {analyticsStats.topCountries.length > 0 ? (
                      analyticsStats.topCountries.slice(0, 6).map((country, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{country.country}</span>
                          <span className="font-semibold text-gray-900">{country.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 col-span-2">Aucune donnée disponible</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Graphique des visites journalières (derniers 30 jours) */}
              {analyticsStats.dailyStats.length > 0 && (
                <div className="card p-6 mb-6">
                  <h3 className="luxe text-xl mb-4">📈 Évolution des visites (30 derniers jours)</h3>
                  <div className="flex items-end gap-1 h-40">
                    {analyticsStats.dailyStats.map((day, idx) => {
                      const maxCount = Math.max(...analyticsStats.dailyStats.map(d => d.count));
                      const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div 
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                            style={{ height: `${height}%` }}
                            title={`${day.date}: ${day.count} visites`}
                          />
                          <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left hidden group-hover:block absolute -bottom-6">
                            {new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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

          {/* Par source */}
          <div className="card p-6 mb-4">
            <h3 className="luxe text-xl mb-4">Répartition par source</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(kpi.bySource)
                .sort(([,a], [,b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center p-3 bg-gray-100 rounded">
                    <span className="text-sm text-gray-700">{source}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
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
