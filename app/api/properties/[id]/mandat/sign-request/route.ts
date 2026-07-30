import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, writeJSON } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import crypto from 'crypto';

// Crée (ou régénère) un lien de signature électronique pour le mandat d'un bien.
// Réservé à l'admin. Renvoie l'URL publique à transmettre au mandant.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const data = await readJSON('properties.json');
  const idx = data.findIndex((x: any) => x.id === id);
  if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const p = data[idx];
  const owner = Array.isArray(p.owners) && p.owners[0] ? p.owners[0] : null;
  const signerName = owner
    ? (owner.type === 'COMPANY' ? (owner.name || '') : [owner.firstName, owner.lastName].filter(Boolean).join(' '))
    : '';
  const signerEmail = owner?.email || '';
  const token = crypto.randomBytes(24).toString('hex');

  data[idx] = {
    ...p,
    mandateSignToken: token,
    mandateSignStatus: 'PENDING',
    mandateSignerName: signerName,
    mandateSignerEmail: signerEmail,
    mandateSignature: undefined, // réinitialise toute signature précédente
  };
  await writeJSON('properties.json', data);

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  return NextResponse.json({ token, url: `${base}/mandat/signer/${token}`, signerName, signerEmail });
}
