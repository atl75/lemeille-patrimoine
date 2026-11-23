import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { readJSON } from '@/lib/utils';
import { DOCUMENT_FILE, isPublicDocument } from '@/lib/documentAccess';
import { readStoredDocument } from '@/lib/documentStore';

export const dynamic = 'force-dynamic';
const headers = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, noarchive',
};

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  if (!DOCUMENT_FILE.test(file)) return notFound();
  try {
    if (!isAdmin(req)) {
      // Lecture fraîche : retirer un plan ou masquer le bien retire l'accès
      // sans attendre le cache court de lecture des pages.
      const [properties, programs] = await Promise.all([
        readJSON('properties.json', { fresh: true }),
        readJSON('programs.json', { fresh: true }),
      ]);
      if (!isPublicDocument(file, properties, programs, process.env.NEXT_PUBLIC_SITE_URL)) return notFound();
    }
    const { buffer, mime } = await readStoredDocument(file);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { ...headers, 'Content-Type': mime, 'Content-Disposition': `inline; filename="${file}"` },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return notFound();
    console.error('[documents] Lecture indisponible');
    return NextResponse.json({ error: 'Document momentanément indisponible' }, { status: 503, headers });
  }
}
