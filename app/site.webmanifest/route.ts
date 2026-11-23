import publicManifest from '@/lib/publicManifest';

export const dynamic = 'force-static';
export function GET() {
  return Response.json(publicManifest(), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}
