import { NextResponse } from 'next/server';
import { readJSON, writeJSON, uid } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const visits = await readJSON('analytics.json');
    
    const visit = {
      id: uid('V'),
      page: body.page || '/',
      referrer: body.referrer || '',
      userAgent: body.userAgent || '',
      timestamp: body.timestamp || new Date().toISOString(),
      screenWidth: body.screenWidth || 0,
      screenHeight: body.screenHeight || 0,
      // Extract useful info from user agent
      isMobile: /Mobile|Android|iPhone/i.test(body.userAgent || ''),
      // Extract country from headers if available
      country: req.headers.get('cf-ipcountry') || 'Unknown'
    };
    
    visits.push(visit);
    await writeJSON('analytics.json', visits);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
