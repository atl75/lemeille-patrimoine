import { NextRequest } from 'next/server';
import { verifySessionValue } from './adminSession';

// Vérifie que la requête porte un cookie de session admin valide (signé).
// Synchrone : utilisable tel quel dans toutes les routes API (runtime Node).
export function isAdmin(req: NextRequest | Request): boolean {
  try {
    // @ts-ignore — NextRequest expose req.cookies, pas Request
    let value: string | undefined = req.cookies?.get?.('lp_admin')?.value;
    if (value === undefined) {
      const header = req.headers.get('cookie') || '';
      const m = header.match(/(?:^|;\s*)lp_admin=([^;]+)/);
      value = m ? decodeURIComponent(m[1]) : undefined;
    }
    return verifySessionValue(value);
  } catch {
    return false;
  }
}
