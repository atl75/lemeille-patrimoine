import { NextResponse } from 'next/server';
import { uid, updateJSON } from '@/lib/utils';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { allowed } = rateLimit(`visit:${ip}`, 60, 60 * 1000);
    if (!allowed) return NextResponse.json({ success: false }, { status: 429 });

    const body = await req.json();
    const visit = {
      id: uid('V'),
      page: String(body.page || '/').slice(0, 300),
      referrer: String(body.referrer || '').slice(0, 300),
      userAgent: String(body.userAgent || '').slice(0, 400),
      timestamp: body.timestamp || new Date().toISOString(),
      screenWidth: Number(body.screenWidth) || 0,
      screenHeight: Number(body.screenHeight) || 0,
      isMobile: /Mobile|Android|iPhone/i.test(body.userAgent || ''),
      country: req.headers.get('cf-ipcountry') || 'Unknown',
    };
    await updateJSON('analytics.json', (visits) => { visits.push(visit); return visits; });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
