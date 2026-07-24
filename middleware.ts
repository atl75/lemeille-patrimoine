import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protéger toutes les routes /admin/* sauf /admin/login, ainsi que
  // l'outil de debug interne (expose la liste complète des biens)
  const needsAuth =
    (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) ||
    pathname.startsWith('/debug-immobilier');

  if (needsAuth) {
    // Vérifier la présence du cookie d'authentification
    const adminCookie = request.cookies.get('lp_admin');

    if (!adminCookie || adminCookie.value !== '1') {
      // Rediriger vers la page de connexion
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/debug-immobilier/:path*'],
};
