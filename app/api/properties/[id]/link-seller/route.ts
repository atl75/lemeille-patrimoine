import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';

// Relie (POST) ou délie (DELETE) un lead « vendeur » à un bien. Un bien peut
// avoir plusieurs vendeurs (indivision, mariage) ; un vendeur peut avoir
// plusieurs biens. Le vendeur relié est aussi ajouté aux propriétaires du bien.
async function loadLead(leadId: string) {
  const leads = await readJSON('leads.json');
  return Array.isArray(leads) ? leads.find((l: any) => l.id === leadId) : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { leadId } = await req.json().catch(() => ({}));
  if (!leadId) return NextResponse.json({ error: 'leadId requis' }, { status: 400 });

  const data = await readJSON('properties.json');
  const idx = data.findIndex((x: any) => x.id === id);
  if (idx < 0) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 });
  const lead = await loadLead(leadId);
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });

  const p = data[idx];
  const sellerLeadIds: string[] = Array.isArray(p.sellerLeadIds) ? [...p.sellerLeadIds] : [];
  if (!sellerLeadIds.includes(leadId)) sellerLeadIds.push(leadId);

  // Ajoute le vendeur aux propriétaires s'il n'y figure pas déjà (par nom/email).
  const owners: any[] = Array.isArray(p.owners) ? [...p.owners] : [];
  const full = [lead.firstName, lead.lastName].filter(Boolean).join(' ').toLowerCase();
  const exists = owners.some((o) =>
    (o.email && lead.email && o.email.toLowerCase() === lead.email.toLowerCase()) ||
    ([o.firstName, o.lastName].filter(Boolean).join(' ').toLowerCase() === full && !!full));
  if (!exists) {
    owners.push({
      type: 'INDIVIDUAL',
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      address: lead.address || '',
    });
  }

  data[idx] = { ...p, sellerLeadIds, owners };
  await writeJSON('properties.json', data);
  return NextResponse.json({ ok: true, sellerLeadIds });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { leadId } = await req.json().catch(() => ({}));
  if (!leadId) return NextResponse.json({ error: 'leadId requis' }, { status: 400 });

  const data = await readJSON('properties.json');
  const idx = data.findIndex((x: any) => x.id === id);
  if (idx < 0) return NextResponse.json({ error: 'Bien introuvable' }, { status: 404 });

  const p = data[idx];
  const sellerLeadIds: string[] = (Array.isArray(p.sellerLeadIds) ? p.sellerLeadIds : []).filter((x: string) => x !== leadId);
  data[idx] = { ...p, sellerLeadIds };
  await writeJSON('properties.json', data);
  return NextResponse.json({ ok: true, sellerLeadIds });
}
