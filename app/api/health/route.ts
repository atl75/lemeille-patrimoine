import { NextResponse } from 'next/server';

/**
 * Health check endpoint for deployment monitoring
 * Returns 200 immediately without any database or API calls
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'lemeille-patrimoine'
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}
