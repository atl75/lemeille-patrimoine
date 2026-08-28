import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readJSON, updateJSON, uid } from '@/lib/utils';
import { isAdmin } from '@/lib/adminGuard';
import { isConnected, gmailSearch, gmailGetMessage } from '@/lib/googleMail';
import { parseLeadEmail } from '@/lib/leadParsers';

// Ingestion automatique des leads reçus par email (SeLoger, LeBonCoin…).
// Autorisé à l'admin (bouton) OU via l'en-tête x-ingest-secret (tâche planifiée).
// ?dryRun=1 : analyse sans créer (pour valider le parsing).
const PROCESSED_FILE = 'ingested-emails.json';
// Capte les mails reçus directement (from portail) ET transférés (sujet/contenu).
const DEFAULT_QUERY = 'newer_than:30d (from:leboncoin.fr OR from:seloger.com OR from:bienici.com OR from:pap.fr OR subject:leboncoin OR "un acquéreur est intéressé par un de vos biens" OR "Nouveau message pour")';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret') || '';
  const authorized = isAdmin(req) || (!!process.env.INGEST_SECRET && secret === process.env.INGEST_SECRET);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isConnected())) return NextResponse.json({ error: 'Gmail non connecté.' }, { status: 400 });

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const query = req.nextUrl.searchParams.get('q') || DEFAULT_QUERY;

  let ids: string[] = [];
  try { ids = await gmailSearch(query, 40); }
  catch (e: any) {
    const msg = String(e?.message || e);
    const scope = /401|403|insufficient|permission|scope/i.test(msg);
    return NextResponse.json({ error: scope ? 'Accès lecture Gmail non autorisé — reconnectez Google.' : msg }, { status: 200 });
  }

  const processedRaw = await readJSON(PROCESSED_FILE);
  const processed: string[] = Array.isArray(processedRaw) ? processedRaw : [];
  const toProcess = ids.filter((id) => !processed.includes(id));

  const created: any[] = [];
  const preview: any[] = [];
  const newlyProcessed: string[] = [];

  for (const id of toProcess) {
    let parsed = null, subject = '';
    try {
      const m = await gmailGetMessage(id);
      subject = m.subject;
      parsed = parseLeadEmail(m);
    } catch (e) { console.error('Ingest lecture message échouée:', e); continue; }

    if (!parsed) { newlyProcessed.push(id); continue; } // email sans données exploitables : marqué traité
    preview.push({ id, subject, ...parsed });
    if (dryRun) continue;

    const lead = {
      id: uid('L'),
      createdAt: new Date().toISOString(),
      status: 'new',
      role: 'ACHETEUR' as const,
      category: 'immobilier' as const,
      source: parsed.source,
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      topic: parsed.topic || '',
      message: parsed.message || '',
      emailMessageId: id,
    };
    await updateJSON('leads.json', (data: any[]) => { (Array.isArray(data) ? data : []).push(lead); return Array.isArray(data) ? data : [lead]; });
    created.push(lead);
    newlyProcessed.push(id);
  }

  if (!dryRun && newlyProcessed.length) {
    await updateJSON(PROCESSED_FILE, (data: any[]) => {
      const list = Array.isArray(data) ? data : [];
      for (const id of newlyProcessed) if (!list.includes(id)) list.push(id);
      return list.slice(-2000); // borne la taille
    });
  }

  return NextResponse.json({ ok: true, scanned: ids.length, new: toProcess.length, created: created.length, dryRun, preview: dryRun ? preview : undefined });
}
