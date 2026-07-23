import { NextRequest } from 'next/server';
export function isAdmin(req: NextRequest | Request): boolean {
  try {
    // @ts-ignore
    const cookieValue = req.cookies?.get?.('lp_admin')?.value;
    const cookieHeader = req.headers.get('cookie') || '';
    
    console.log('[AUTH] Cookie value:', cookieValue);
    console.log('[AUTH] Cookie header:', cookieHeader);
    console.log('[AUTH] Has lp_admin=1:', /lp_admin=1/.test(cookieHeader));
    
    return cookieValue === '1' || /lp_admin=1/.test(cookieHeader);
  } catch (e) { 
    console.error('[AUTH] Error checking admin:', e);
    return false; 
  }
}
