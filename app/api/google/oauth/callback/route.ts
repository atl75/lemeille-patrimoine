import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { exchangeCode, verifyState } from '@/lib/googleMail';

// Retour du consentement Google : échange le code contre un refresh_token,
// stocké côté serveur. Autorisé via l'état signé (le cookie admin SameSite=Strict
// n'est pas transmis lors du retour cross-site depuis Google).
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get('state') || '';
  const { ok, ret } = verifyState(state);
  const dest = ret.startsWith('/') ? ret : '/admin/contenu/biens';
  if (!ok) return NextResponse.json({ error: 'État OAuth invalide ou expiré. Relancez la connexion.' }, { status: 401 });

  const err = req.nextUrl.searchParams.get('error');
  if (err) return NextResponse.redirect(new URL(`${dest}?gmail=denied`, req.url));
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL(`${dest}?gmail=error`, req.url));

  try {
    await exchangeCode(code);
    return NextResponse.redirect(new URL(`${dest}?gmail=connected`, req.url));
  } catch (e) {
    console.error('Google OAuth callback:', e);
    return NextResponse.redirect(new URL(`${dest}?gmail=error`, req.url));
  }
}
