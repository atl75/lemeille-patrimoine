#!/usr/bin/env node
// Smoke tests NON DESTRUCTIFS des routes critiques (lecture seule).
// Usage : node scripts/smoke.mjs [baseUrl]   (défaut : prod)
// Vérifie disponibilité, protection des routes admin, non-fuite de PII et
// gestion d'erreur des jetons de signature. Sort en code ≠ 0 si un test échoue.

const BASE = (process.argv[2] || 'https://lemeillepatrimoine.com').replace(/\/$/, '');
let pass = 0, fail = 0;
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`); pass++;
  } catch (e) {
    results.push(`❌ ${name} — ${e.message}`); fail++;
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function get(path, opts) {
  const r = await fetch(`${BASE}${path}`, opts);
  return r;
}

await check('GET / → 200', async () => {
  const r = await get('/'); assert(r.status === 200, `status ${r.status}`);
});
await check('GET /immobilier → 200', async () => {
  const r = await get('/immobilier'); assert(r.status === 200, `status ${r.status}`);
});
await check('GET /immobilier/estimation → 200', async () => {
  const r = await get('/immobilier/estimation'); assert(r.status === 200, `status ${r.status}`);
});
await check('robots.txt + sitemap.xml → 200', async () => {
  assert((await get('/robots.txt')).status === 200, 'robots');
  assert((await get('/sitemap.xml')).status === 200, 'sitemap');
});
await check('GET /api/properties → tableau public SANS PII', async () => {
  const r = await get('/api/properties'); assert(r.status === 200, `status ${r.status}`);
  const body = await r.text();
  assert(body.trim().startsWith('['), 'pas un tableau JSON');
  for (const leak of ['netSellerAmount', 'commissionAmount', 'sellerNotary', 'buyerNotary', 'owners', 'mandateSignToken']) {
    assert(!body.includes(leak), `FUITE PII: "${leak}" présent dans /api/properties`);
  }
});
await check('Routes admin protégées → 401 sans cookie', async () => {
  for (const p of ['/api/mandats', '/api/companies', '/api/notaires?q=paris', '/api/google/status']) {
    const r = await get(p); assert(r.status === 401, `${p} → ${r.status} (attendu 401)`);
  }
});
await check('Jeton de signature invalide → 404 JSON', async () => {
  const r = await get('/api/mandat/sign/invalidtoken123');
  assert(r.status === 404, `status ${r.status}`);
  const j = await r.json(); assert(typeof j.error === 'string', 'pas de message d\'erreur JSON');
});

console.log(`\nSmoke tests sur ${BASE}\n` + results.join('\n'));
console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
