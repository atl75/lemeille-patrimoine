import { readJSON, writeJSON } from '@/lib/utils';
import crypto from 'crypto';

// Intégration Gmail (API REST, sans dépendance externe) pour déposer des
// BROUILLONS dans la boîte de l'agence. OAuth2 « installed/web » : le jeton de
// rafraîchissement est obtenu une fois via le flux de consentement, puis stocké
// dans data/google-token.json. Les identifiants client viennent des variables
// d'environnement GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.

const TOKEN_FILE = 'google-token.json';
// Brouillons Gmail + lecture Gmail (ingestion des leads SeLoger/LeBonCoin) + lecture Google Analytics 4.
const SCOPE = 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/analytics.readonly';

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://lemeillepatrimoine.com';
  return `${base.replace(/\/$/, '')}/api/google/oauth/callback`;
}

// État OAuth signé (HMAC) : prouve que le flux a été lancé par l'admin, sans
// dépendre du cookie de session (bloqué en SameSite=Strict au retour de Google).
const stateSecret = () => process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || 'lp-fallback-secret';
export function signState(ret: string, ttlMs = 10 * 60 * 1000): string {
  const payload = `${ret}|${Date.now() + ttlMs}`;
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}
export function verifyState(state: string): { ok: boolean; ret: string } {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    const idx = decoded.lastIndexOf('|');
    const payload = decoded.slice(0, idx);
    const sig = decoded.slice(idx + 1);
    const expect = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
    if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return { ok: false, ret: '/admin/contenu/biens' };
    const [ret, expStr] = payload.split('|');
    if (Number(expStr) < Date.now()) return { ok: false, ret };
    return { ok: true, ret: ret || '/admin/contenu/biens' };
  } catch { return { ok: false, ret: '/admin/contenu/biens' }; }
}

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

async function readToken(): Promise<any> {
  const d = await readJSON(TOKEN_FILE);
  return d && !Array.isArray(d) ? d : null;
}

export async function isConnected(): Promise<boolean> {
  const t = await readToken();
  return !!t?.refresh_token;
}

export async function connectedEmail(): Promise<string> {
  const t = await readToken();
  return t?.email || '';
}

// Échange le code d'autorisation contre un refresh_token (stocké) + récupère
// l'adresse Gmail connectée pour affichage.
export async function exchangeCode(code: string): Promise<void> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.refresh_token) throw new Error('Pas de refresh_token renvoyé (révoquez l\'accès et réessayez).');

  let email = '';
  try {
    const p = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (p.ok) email = (await p.json()).emailAddress || '';
  } catch { /* facultatif */ }

  await writeJSON(TOKEN_FILE, { refresh_token: data.refresh_token, email });
}

export async function getAccessToken(): Promise<string> {
  const t = await readToken();
  if (!t?.refresh_token) throw new Error('Gmail non connecté.');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: t.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

type Attachment = { filename: string; mime: string; base64: string };
type InlineImage = { cid: string; mime: string; base64: string };
type DraftOpts = { cc?: string[]; inlineImages?: InlineImage[] };

const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const wrap76 = (s: string) => s.replace(/(.{76})/g, '$1\r\n');
const encodeHeader = (s: string) => `=?UTF-8?B?${Buffer.from(s, 'utf-8').toString('base64')}?=`;

function buildMime(to: string[], subject: string, html: string, attachments: Attachment[], opts: DraftOpts = {}): string {
  const rid = () => Math.random().toString(36).slice(2);
  const mixed = 'lpmix_' + rid();
  const related = 'lprel_' + rid();
  const inline = opts.inlineImages || [];
  const lines: string[] = [];
  lines.push(`To: ${to.join(', ')}`);
  if (opts.cc && opts.cc.length) lines.push(`Cc: ${opts.cc.join(', ')}`);
  lines.push(`Subject: ${encodeHeader(subject)}`);
  lines.push('MIME-Version: 1.0');
  lines.push(`Content-Type: multipart/mixed; boundary="${mixed}"`);
  lines.push('');

  // Partie 1 : HTML seul, ou multipart/related (HTML + images inline via cid).
  if (inline.length) {
    lines.push(`--${mixed}`);
    lines.push(`Content-Type: multipart/related; boundary="${related}"`);
    lines.push('');
    lines.push(`--${related}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(wrap76(Buffer.from(html, 'utf-8').toString('base64')));
    for (const im of inline) {
      lines.push(`--${related}`);
      lines.push(`Content-Type: ${im.mime}`);
      lines.push('Content-Transfer-Encoding: base64');
      lines.push(`Content-ID: <${im.cid}>`);
      lines.push(`Content-Disposition: inline; filename="${im.cid}"`);
      lines.push('');
      lines.push(wrap76(im.base64));
    }
    lines.push(`--${related}--`);
  } else {
    lines.push(`--${mixed}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(wrap76(Buffer.from(html, 'utf-8').toString('base64')));
  }

  // Pièces jointes (documents).
  for (const a of attachments) {
    lines.push(`--${mixed}`);
    lines.push(`Content-Type: ${a.mime}; name="${a.filename}"`);
    lines.push('Content-Transfer-Encoding: base64');
    lines.push(`Content-Disposition: attachment; filename="${a.filename}"`);
    lines.push('');
    lines.push(wrap76(a.base64));
  }
  lines.push(`--${mixed}--`);
  return lines.join('\r\n');
}

// Crée un brouillon Gmail (NON envoyé) et renvoie son id.
export async function createDraft(to: string[], subject: string, html: string, attachments: Attachment[], opts: DraftOpts = {}): Promise<string> {
  const accessToken = await getAccessToken();
  const raw = b64url(Buffer.from(buildMime(to, subject, html, attachments, opts), 'utf-8'));
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw } }),
  });
  if (!res.ok) throw new Error(`draft create failed: ${res.status} ${await res.text()}`);
  return (await res.json()).id;
}

// ---------- Lecture Gmail (ingestion des leads) ----------

export type GmailMessage = { id: string; from: string; replyTo: string; subject: string; date: string; text: string };

const b64urlDecode = (s: string) => Buffer.from((s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');

// Recherche des messages correspondant à une requête Gmail (ex. "from:seloger.com newer_than:7d").
export async function gmailSearch(query: string, maxResults = 25): Promise<string[]> {
  const token = await getAccessToken();
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`gmail search ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return (d.messages || []).map((m: any) => m.id);
}

// Aplatit récursivement les parts MIME et récupère le corps texte (préférence text/plain,
// sinon un text/html dégradé en texte).
function extractText(payload: any): string {
  if (!payload) return '';
  const walk = (part: any, out: { plain: string; html: string }) => {
    const mime = part.mimeType || '';
    const data = part.body?.data;
    if (data && mime === 'text/plain') out.plain += b64urlDecode(data) + '\n';
    else if (data && mime === 'text/html') out.html += b64urlDecode(data) + '\n';
    for (const p of part.parts || []) walk(p, out);
  };
  const out = { plain: '', html: '' };
  walk(payload, out);
  if (out.plain.trim()) return out.plain;
  // Dégrade le HTML en texte (retire les balises).
  return out.html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}

export async function gmailGetMessage(id: string): Promise<GmailMessage> {
  const token = await getAccessToken();
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`gmail get ${r.status}`);
  const d = await r.json();
  const headers: any[] = d.payload?.headers || [];
  const h = (name: string) => (headers.find((x) => (x.name || '').toLowerCase() === name.toLowerCase())?.value) || '';
  return { id, from: h('From'), replyTo: h('Reply-To'), subject: h('Subject'), date: h('Date'), text: extractText(d.payload) };
}
