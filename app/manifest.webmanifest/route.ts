import terrainManifest from '@/lib/terrainManifest';

// Une route explicite conserve l'URL historique sans imposer ce manifest à
// toutes les pages via la convention automatique app/manifest.ts de Next.js.
export const dynamic = 'force-static';
export function GET() {
  return Response.json(terrainManifest(), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}
