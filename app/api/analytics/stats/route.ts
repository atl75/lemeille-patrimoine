import { NextResponse } from 'next/server';
import { readJSON } from '@/lib/utils';

export async function GET() {
  try {
    const visits = await readJSON('analytics.json');
    
    // Calculate time ranges
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Filter visits by time period
    const visitsLast24h = visits.filter((v: any) => new Date(v.timestamp) >= last24h);
    const visitsLast7days = visits.filter((v: any) => new Date(v.timestamp) >= last7days);
    const visitsLast30days = visits.filter((v: any) => new Date(v.timestamp) >= last30days);
    
    // Pages les plus visitées (toutes périodes)
    const pageViews = visits.reduce((acc: any, v: any) => {
      acc[v.page] = (acc[v.page] || 0) + 1;
      return acc;
    }, {});
    
    const topPages = Object.entries(pageViews)
      .map(([page, count]) => ({ page, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);
    
    // Sources de trafic (referrers)
    const referrers = visits.reduce((acc: any, v: any) => {
      let source = 'Direct';
      if (v.referrer) {
        try {
          const url = new URL(v.referrer);
          source = url.hostname.replace('www.', '');
        } catch {
          source = 'Other';
        }
      }
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    const topReferrers = Object.entries(referrers)
      .map(([source, count]) => ({ source, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);
    
    // Appareils (mobile vs desktop)
    const devices = visits.reduce((acc: any, v: any) => {
      const device = v.isMobile ? 'Mobile' : 'Desktop';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});
    
    // Pays
    const countries = visits.reduce((acc: any, v: any) => {
      const country = v.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});
    
    const topCountries = Object.entries(countries)
      .map(([country, count]) => ({ country, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);
    
    // Statistiques par jour (derniers 30 jours)
    const visitsByDay: any = {};
    visitsLast30days.forEach((v: any) => {
      const day = new Date(v.timestamp).toISOString().split('T')[0];
      visitsByDay[day] = (visitsByDay[day] || 0) + 1;
    });
    
    const dailyStats = Object.entries(visitsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return NextResponse.json({
      totalVisits: visits.length,
      last24h: visitsLast24h.length,
      last7days: visitsLast7days.length,
      last30days: visitsLast30days.length,
      topPages,
      topReferrers,
      devices,
      topCountries,
      dailyStats,
      // Temps moyen estimé (simulé pour l'instant)
      avgSessionTime: visits.length > 0 ? '2m 30s' : '0s'
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json({
      totalVisits: 0,
      last24h: 0,
      last7days: 0,
      last30days: 0,
      topPages: [],
      topReferrers: [],
      devices: {},
      topCountries: [],
      dailyStats: [],
      avgSessionTime: '0s'
    });
  }
}
