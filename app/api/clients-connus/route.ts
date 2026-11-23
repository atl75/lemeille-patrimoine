import { NextResponse, type NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { readJSON } from '@/lib/utils';
import { rechercherClients } from '@/lib/clientsConnus';

export async function GET(req: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  const query = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 120);
  if (query.length < 2) return NextResponse.json({ contacts: [] }, { headers });
  try {
    const [properties, mandats, leads] = await Promise.all(['properties.json', 'mandats.json', 'leads.json'].map(file => readJSON(file)));
    const sources: { source: string; value: unknown }[] = [];
    for (const [records, label] of [[properties, 'Bien'], [mandats, 'Mandat']] as const) {
      for (const record of Array.isArray(records) ? records : []) {
        for (const owner of Array.isArray(record.owners) ? record.owners : []) {
          sources.push({ source: `${label} · ${record.mandateNumber || record.title || record.id}`, value: owner });
        }
        if (label === 'Bien') sources.push({ source: `Acquéreur · ${record.title || record.id}`, value: {
          firstName: record.buyerFirstName, lastName: record.buyerLastName,
          email: record.buyerEmail, phone: record.buyerPhone, address: record.buyerAddress,
        } });
      }
    }
    for (const lead of Array.isArray(leads) ? leads : []) {
      sources.push({ source: 'Prospect CRM', value: { ...lead, type: lead.company ? 'COMPANY' : 'INDIVIDUAL', name: lead.companyName } });
    }
    return NextResponse.json({ contacts: rechercherClients(sources, query) }, { headers });
  } catch {
    return NextResponse.json({ error: 'Recherche indisponible. Réessayez.' }, { status: 503, headers });
  }
}
