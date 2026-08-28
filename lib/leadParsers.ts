import type { GmailMessage } from '@/lib/googleMail';

export type ParsedLead = {
  source: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  topic?: string;
};

const decodeEntities = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Identifie le portail (expéditeur direct OU contenu d'un mail transféré).
export function detectPortal(from: string, text: string): string {
  const hay = `${from} ${text}`.toLowerCase();
  if (/leboncoin/.test(hay)) return 'leboncoin';
  if (/seloger/.test(hay)) return 'seloger';
  if (/bienici/.test(hay)) return 'bienici';
  if (/pap\.fr/.test(hay)) return 'pap';
  return 'email-import';
}

const cleanPhone = (s?: string) => (s || '').replace(/[\s().-]/g, '').replace(/^00/, '+');
// Exclut les adresses des portails, des systèmes, et NOS propres boîtes (destinataires).
const EXCLUDE_EMAIL = /seloger|leboncoin|bienici|messagerie|no-?reply|noreply|donotreply|notification|mailer|digital-?classifieds|a\.lemeille@gmail|arthur\.lemeille|lemeillepatrimoine/i;
const firstEmail = (t: string, exclude = EXCLUDE_EMAIL) =>
  ((t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).find((e) => !exclude.test(e)) || '').trim();
// Email du « Répondre à » (en-tête direct ou ligne du mail transféré) = souvent le prospect.
const replyToEmail = (msg: GmailMessage, t: string) =>
  (msg.replyTo.match(/<([^>]+@[^>]+)>/)?.[1] || msg.replyTo.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]
    || t.match(/R[ée]pondre à\s*:[^<\n]*<([^>]+@[^>]+)>/i)?.[1] || '').trim();
const frPhone = (t: string) => cleanPhone((t.match(/(?:\+|00)?33\s?[1-9](?:[\s.-]?\d{2}){4}|0[1-9](?:[\s.-]?\d{2}){4}/) || [])[0]);
const splitName = (full: string) => {
  const parts = (full || '').replace(/\s+/g, ' ').trim().split(' ');
  return { firstName: parts.shift() || undefined, lastName: parts.join(' ') || undefined };
};

// LeBonCoin : libellés « Prénom : / Nom : / E-mail : / Téléphone : / Ville : / Type de recherche : » + message entre « … ».
function parseLeboncoin(t: string, msg: GmailMessage): ParsedLead {
  const g = (re: RegExp) => (t.match(re)?.[1] || '').trim();
  const firstName = g(/Pr[ée]nom\s*:\s*(.+)/i) || undefined;
  const lastName = g(/(?:^|\n)\s*Nom\s*:\s*(.+)/i) || undefined;
  const email = firstEmail(g(/E-?mail\s*:\s*<?([^\s<>]+@[^\s<>]+)/i) || t);
  const phone = frPhone(g(/T[ée]l[ée]phone\s*:\s*(.+)/i) || t);
  const ville = g(/Ville\s*:\s*(.+)/i);
  const typeRech = g(/Type de recherche\s*:\s*(.+)/i);
  const message = g(/«\s*([\s\S]*?)\s*»/);
  const title = msg.subject.match(/pour\s+["“]([^"”]+)["”]/i)?.[1] || '';
  const topic = ['LeBonCoin', title, ville, typeRech].filter(Boolean).join(' — ').slice(0, 200);
  return { source: 'leboncoin', firstName, lastName, email: email || undefined, phone: phone || undefined, message: message || undefined, topic };
}

// SeLoger : nom via « Répondre à » / « X s'intéresse à ce bien », email + tél du prospect, prix/ville/réf annonce.
function parseSeloger(t: string, msg: GmailMessage): ParsedLead {
  const replyName = (msg.replyTo.match(/^"?([^"<]+?)"?\s*</)?.[1] || '').trim()
    || (t.match(/R[ée]pondre à\s*:\s*"?([^"<\n]+?)"?\s*</i)?.[1] || '').trim()
    || (t.match(/([A-ZÀ-Ÿ][\p{L}'-]+(?:\s+[A-ZÀ-Ÿ][\p{L}'-]+)+)\s+s['’]int[ée]resse/u)?.[1] || '').trim();
  const { firstName, lastName } = splitName(replyName);
  const rt = replyToEmail(msg, t);
  const email = (rt && !EXCLUDE_EMAIL.test(rt) ? rt : '') || firstEmail(t);
  const phone = frPhone(t);
  const ref = t.match(/R[ée]f\.?\s*(?:de l['’]annonce)?\s*:?\s*(\d{4,})/i)?.[1] || '';
  const propLine = (t.match(/(\d[\d\s]{2,}€[\s\S]{0,90}?m²)/)?.[1] || '').replace(/\s+/g, ' ').trim();
  let message = (t.match(/Bonjour[\s\S]{0,400}?(?=R[ée]pondre|Ce message|D[ée]couvrir|<|$)/i)?.[0] || '').replace(/\s+/g, ' ').trim();
  if (message.length < 5) message = '';
  const topic = ['SeLoger', propLine, ref ? `Réf. ${ref}` : ''].filter(Boolean).join(' — ').slice(0, 200);
  return { source: 'seloger', firstName, lastName, email: email || undefined, phone: phone || undefined, message: message || undefined, topic };
}

function parseGeneric(t: string, msg: GmailMessage, source: string): ParsedLead | null {
  const rt = replyToEmail(msg, t);
  const email = (rt && !EXCLUDE_EMAIL.test(rt) ? rt : '') || firstEmail(t);
  const phone = frPhone(t);
  if (!email && !phone) return null;
  const { firstName, lastName } = splitName((msg.replyTo.match(/^"?([^"<]+?)"?\s*</)?.[1] || '').trim());
  return { source, firstName, lastName, email: email || undefined, phone: phone || undefined, message: t.slice(0, 400), topic: msg.subject?.slice(0, 200) };
}

export function parseLeadEmail(msg: GmailMessage): ParsedLead | null {
  const source = detectPortal(msg.from, msg.text);
  // Retire les marqueurs de citation « > » des mails transférés.
  const t = decodeEntities(msg.text || '').replace(/\r/g, '').replace(/^\s*>+ ?/gm, '');
  let parsed: ParsedLead | null;
  if (source === 'leboncoin') parsed = parseLeboncoin(t, msg);
  else if (source === 'seloger') parsed = parseSeloger(t, msg);
  else parsed = parseGeneric(t, msg, source);
  // Rien d'exploitable (ni email ni téléphone) → ignoré.
  if (!parsed || (!parsed.email && !parsed.phone)) return null;
  return parsed;
}
