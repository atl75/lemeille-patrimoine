import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Secret partagé avec lib/adminSession.ts (routes API, runtime Node).
function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

// Vérifie la session admin signée (HMAC-SHA256) via Web Crypto — le
// middleware s'exécute en runtime Edge, sans accès à node:crypto.
async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value || !secret()) return false;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return false;
  const exp = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(exp));
  const expected = Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protéger toutes les routes /admin/* sauf /admin/login.
  const needsAuth = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');

  if (needsAuth) {
    const adminCookie = request.cookies.get('lp_admin')?.value;
    if (!(await verifySession(adminCookie))) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
