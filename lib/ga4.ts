import { getAccessToken } from '@/lib/googleMail';

// Accès aux statistiques Google Analytics 4 (Data API v1beta), via le jeton
// OAuth Google déjà connecté (scope analytics.readonly). Sans dépendance externe.

// Découvre l'ID numérique de la propriété GA4 : variable d'env prioritaire,
// sinon première propriété accessible par le compte connecté (Admin API).
export async function ga4PropertyId(): Promise<string> {
  if (process.env.GA4_PROPERTY_ID) return String(process.env.GA4_PROPERTY_ID).replace(/\D/g, '');
  const token = await getAccessToken();
  const r = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`admin ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const props = (d.accountSummaries || []).flatMap((a: any) => a.propertySummaries || []);
  if (!props.length) throw new Error("Le compte Google connecté n'a accès à aucune propriété Google Analytics.");
  // Préfère une propriété dont le nom évoque Lemeille, sinon la première.
  const match = props.find((p: any) => /lemeille|patrimoine|novus/i.test(p.displayName || '')) || props[0];
  return String(match.property || '').split('/')[1];
}

type Report = { rows: Array<{ dims: string[]; vals: string[] }>; totals: string[] };

function parseReport(rep: any): Report {
  const rows = (rep?.rows || []).map((row: any) => ({
    dims: (row.dimensionValues || []).map((v: any) => v.value ?? ''),
    vals: (row.metricValues || []).map((v: any) => v.value ?? '0'),
  }));
  const totals = (rep?.totals?.[0]?.metricValues || []).map((v: any) => v.value ?? '0');
  return { rows, totals };
}

// Récupère l'ensemble des rapports (28 derniers jours) en 2 appels batch.
export async function ga4Reports(propertyId: string) {
  const token = await getAccessToken();
  const call = async (requests: any[]) => {
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (!r.ok) throw new Error(`data ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).reports || [];
  };
  const dr = [{ startDate: '28daysAgo', endDate: 'today' }];

  const b1 = await call([
    { dateRanges: dr, metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }, { name: 'bounceRate' }] },
    { dateRanges: dr, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }] },
    { dateRanges: dr, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 12 },
    { dateRanges: dr, dimensions: [{ name: 'sessionSourceMedium' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 },
    { dateRanges: dr, dimensions: [{ name: 'country' }, { name: 'city' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 12 },
  ]);
  const b2 = await call([
    { dateRanges: dr, dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }] },
    { dateRanges: dr, dimensions: [{ name: 'newVsReturning' }], metrics: [{ name: 'activeUsers' }] },
  ]);

  return {
    summary: parseReport(b1[0]),
    trend: parseReport(b1[1]),
    pages: parseReport(b1[2]),
    sources: parseReport(b1[3]),
    geo: parseReport(b1[4]),
    devices: parseReport(b2[0]),
    newReturning: parseReport(b2[1]),
  };
}
