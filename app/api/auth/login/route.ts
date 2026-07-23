import { NextResponse } from 'next/server';
export async function POST(req: Request){
  const { password } = await req.json();
  console.log('[AUTH] Password attempt length:', password?.length);
  console.log('[AUTH] Expected password length:', process.env.ADMIN_PASSWORD?.length);
  console.log('[AUTH] Passwords match:', password === process.env.ADMIN_PASSWORD);
  
  if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'ADMIN_PASSWORD not set' }, { status: 500 });
  if (password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const res = NextResponse.json({ ok: true });
  const isDev = process.env.NODE_ENV === 'development';
  
  // Cookie plus permissif en dev pour Replit
  const cookieFlags = isDev 
    ? `lp_admin=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    : `lp_admin=1; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;
  
  console.log('[AUTH] Setting cookie:', cookieFlags);
  res.headers.set('Set-Cookie', cookieFlags);
  return res;
}
