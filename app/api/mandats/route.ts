import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON, uid } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { insertPropertySchema } from '@/shared/schema';
import { erreurMandatImmeuble } from '@/lib/validationMandatImmeuble';
import { referenceCadastraleMandat } from '@/lib/referenceCadastraleMandat';

// Les mandats sont des enregistrements AUTONOMES (collection mandats.json),
// créés en « snapshot » depuis un bien puis modifiables indépendamment dans le
// registre, sans revenir sur la fiche du bien.
const FILE = 'mandats.json';

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await readJSON(FILE);
  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requête invalide' }, { status: 400 }); }
  const erreur=erreurMandatImmeuble(b);
  if(erreur)return NextResponse.json({error:erreur},{status:400});
  if(b?.type==='IMMEUBLE')b.buildingLots=insertPropertySchema.shape.buildingLots.parse(b.buildingLots);

  // N° de mandat chronologique AAAAMM-NN.
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const owner = Array.isArray(b.owners) && b.owners[0] ? b.owners[0] : null;
  const signerName = owner
    ? (owner.type === 'COMPANY' ? (owner.name || '') : [owner.firstName, owner.lastName].filter(Boolean).join(' '))
    : '';

  const mandat = {
    id: uid('mandat'),
    createdAt: now.toISOString(),
    propertyId: b.propertyId || b.id || undefined,
    // Snapshot des données du bien (le mandat vit ensuite sa vie).
    title: b.title || '',
    type: b.type || 'APPARTEMENT',
    ...(b.type==='IMMEUBLE' ? {buildingLots:b.buildingLots} : {}),
    rooms: b.rooms,
    city: b.city || '',
    region: b.region || '',
    map: b.map || (b.address ? { query: b.address } : undefined),
    surface: b.surface,
    annexSurface: b.annexSurface,
    landSize: b.landSize,
    cadastre: b.cadastre,
    cadastralReference: referenceCadastraleMandat(b),
    description: b.description || '',
    price: b.price,
    netSellerAmount: b.netSellerAmount ?? b.price,
    commissionAmount: b.commissionAmount,
    commissionPercentage: b.commissionPercentage,
    occupancy: b.occupancy || 'LIBRE',
    mandateType: b.mandateType || 'SIMPLE',
    mandateHonorairesCharge: b.mandateHonorairesCharge || 'ACQUEREUR',
    mandatePlace: b.mandatePlace || b.city || '',
    owners: Array.isArray(b.owners) ? b.owners : [],
    sellerNotary: b.sellerNotary,
    buyerNotary: b.buyerNotary,
    mandateSignerName: signerName,
    mandateSignerEmail: owner?.email || '',
  };

  const saved = await updateJSON(FILE, list => {
    // Calcul sur la donnée fraîche ; le nombre d'éléments n'est pas un numéro.
    const numbers = list.map((m: any) => String(m.mandateNumber || ''))
      .filter((number: string) => number.startsWith(`${ym}-`) && /^\d+$/.test(number.slice(ym.length + 1)))
      .map((number: string) => Number(number.slice(ym.length + 1)));
    const seq = numbers.reduce((max: number, n: number) => Math.max(max, n), 0) + 1;
    const item = { ...mandat, mandateNumber: `${ym}-${String(seq).padStart(2, '0')}` };
    list.push(item);
    return item;
  });
  return NextResponse.json(saved);
}
