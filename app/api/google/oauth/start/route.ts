import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { authUrl, googleConfigured, signState } from '@/lib/googleMail';

// Démarre le consentement Google (admin). Redirige vers l'écran d'autorisation.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL('/admin/contenu/biens?gmail=notconfigured', req.url));
  }
  const ret = req.nextUrl.searchParams.get('return') || '/admin/contenu/biens';
  return NextResponse.redirect(authUrl(signState(ret)));
}
