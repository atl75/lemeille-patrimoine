import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { isConnected } from '@/lib/googleMail';
import { ga4PropertyId, ga4Reports } from '@/lib/ga4';

// Statistiques de visite (Google Analytics 4) pour le tableau de bord admin.
// Renvoie toujours 200 : { ok:false, reason } permet à l'UI d'afficher un
// message clair (Google non connecté / scope Analytics manquant / pas d'accès).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isConnected())) {
    return NextResponse.json({ ok: false, reason: 'not_connected', message: 'Google non connecté.' });
  }
  try {
    const propertyId = await ga4PropertyId();
    const r = await ga4Reports(propertyId);

    const s = r.summary.totals; // [users, newUsers, sessions, views, avgDuration, bounceRate]
    const summary = {
      users: Number(s[0] || 0),
      newUsers: Number(s[1] || 0),
      sessions: Number(s[2] || 0),
      pageViews: Number(s[3] || 0),
      avgDuration: Number(s[4] || 0), // secondes
      bounceRate: Number(s[5] || 0), // 0..1
    };
    const trend = r.trend.rows.map((row) => ({ date: row.dims[0], users: Number(row.vals[0] || 0), sessions: Number(row.vals[1] || 0) }));
    const pages = r.pages.rows.map((row) => ({ path: row.dims[0], views: Number(row.vals[0] || 0), avgDuration: Number(row.vals[1] || 0) }));
    const sources = r.sources.rows.map((row) => ({ source: row.dims[0], sessions: Number(row.vals[0] || 0) }));
    const geo = r.geo.rows.map((row) => ({ country: row.dims[0], city: row.dims[1], users: Number(row.vals[0] || 0) }));
    const devices = r.devices.rows.map((row) => ({ device: row.dims[0], users: Number(row.vals[0] || 0) }));
    const newReturning = r.newReturning.rows.map((row) => ({ type: row.dims[0], users: Number(row.vals[0] || 0) }));

    return NextResponse.json({ ok: true, propertyId, summary, trend, pages, sources, geo, devices, newReturning });
  } catch (e: any) {
    const msg = String(e?.message || e);
    // 401/403 → scope manquant ou pas d'accès à la propriété : demander une reconnexion.
    const scope = /401|403|insufficient|permission|scope|n'a accès à aucune/i.test(msg);
    return NextResponse.json({ ok: false, reason: scope ? 'scope' : 'error', message: msg });
  }
}
