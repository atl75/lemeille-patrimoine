import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { googleConfigured, isConnected, connectedEmail } from '@/lib/googleMail';

// État de la connexion Gmail pour l'admin (bouton « Connecter Gmail »).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    configured: googleConfigured(),
    connected: await isConnected(),
    email: await connectedEmail(),
  });
}
