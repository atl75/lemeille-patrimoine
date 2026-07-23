import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protéger toutes les routes /admin/* sauf /admin/login
  if (request.nextUrl.pathname.startsWith('/admin') && 
      !request.nextUrl.pathname.startsWith('/admin/login')) {
    
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
  matcher: '/admin/:path*',
};
