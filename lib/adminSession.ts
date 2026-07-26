import crypto from 'crypto';

// Session admin signée (HMAC-SHA256). Le cookie « lp_admin » contient
// `<expiration>.<signature>` : impossible à forger sans le secret, et
// expire côté serveur. Utilisé par les routes API (runtime Node) et la
// page de login. Le middleware (runtime Edge) a sa propre vérification
// Web Crypto dans middleware.ts — même algorithme, même secret.

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}

export function createSessionValue(): string {
  const exp = String(Date.now() + MAX_AGE_MS);
  const sig = crypto.createHmac('sha256', secret()).update(exp).digest('hex');
  return `${exp}.${sig}`;
}

export function verifySessionValue(value: string | undefined | null): boolean {
  if (!value || !secret()) return false;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return false;
  const exp = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = crypto.createHmac('sha256', secret()).update(exp).digest('hex');
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}
