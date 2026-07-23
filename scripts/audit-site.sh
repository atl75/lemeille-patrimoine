#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-https://lemeillepatrimoine.com}"
MAX_PAGES="${MAX_PAGES:-60}"
MAX_DEPTH="${MAX_DEPTH:-3}"
MOBILE_EMULATION="${MOBILE_EMULATION:-true}"

echo "🚀 Lancement de l'audit complet de $SITE_URL"
mkdir -p audit audit/links audit/axe audit/seo audit/perf

echo "📦 Vérification des dépendances..."
if ! npm list puppeteer >/dev/null 2>&1; then
  echo "Installing audit dependencies..."
  npm i -D puppeteer@latest @axe-core/puppeteer@latest linkinator@latest cheerio@latest lighthouse@latest
fi

echo "✍️  Création du runner Node (ESM)..."
cat > audit/run-audit.mjs << 'JSEND'
import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { LinkChecker } from 'linkinator';
import puppeteer from 'puppeteer';
import AxePuppeteer from '@axe-core/puppeteer';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = process.env.SITE_URL || 'https://lemeillepatrimoine.com';
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '60', 10);
const MAX_DEPTH = parseInt(process.env.MAX_DEPTH || '3', 10);
const MOBILE_EMULATION = (process.env.MOBILE_EMULATION || 'true') === 'true';

const outDir = path.join(__dirname);
const linksDir = path.join(outDir, 'links');
const axeDir = path.join(outDir, 'axe');
const seoDir = path.join(outDir, 'seo');
const perfDir = path.join(outDir, 'perf');
for (const d of [linksDir, axeDir, seoDir, perfDir]) fs.mkdirSync(d, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

function sameOrigin(u) {
  try {
    const a = new URL(u);
    const b = new URL(SITE_URL);
    return a.origin === b.origin;
  } catch (e) { return false; }
}

async function crawl() {
  const checker = new LinkChecker();
  const pages = new Set();
  const broken = [];

  const result = await checker.check({
    path: SITE_URL,
    recurse: true,
    maxDepth: MAX_DEPTH,
    concurrency: 4,
    linksToIgnore: [/^mailto:/i, /^tel:/i, /^javascript:/i, /^#/, /googletagmanager/],
    timeout: 30000,
    retryErrors: true,
  });

  for (const l of result.links) {
    if (l.state !== 'BROKEN' && sameOrigin(l.url)) pages.add(l.url.split('#')[0]);
    if (l.state === 'BROKEN') broken.push(l);
  }

  const pagesArr = Array.from(pages).slice(0, MAX_PAGES);
  fs.writeFileSync(path.join(linksDir, 'pages.json'), JSON.stringify(pagesArr, null, 2));
  fs.writeFileSync(path.join(linksDir, 'broken-links.json'), JSON.stringify(broken, null, 2));

  const brokenCsv = ['url,status,from'];
  broken.forEach(b => brokenCsv.push(`"${b.url.replace(/"/g,'""')}",${b.status || ''},"${(b.parent||'').replace(/"/g,'""')}"`));
  fs.writeFileSync(path.join(linksDir, 'broken-links.csv'), brokenCsv.join('\n'));

  return { pages: pagesArr, broken };
}

function analyzeSEO(html, url) {
  const $ = cheerio.load(html);
  const issues = [];
  const notices = [];

  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const h1s = $('h1');
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDesc = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
  const lang = $('html').attr('lang') || '';
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';

  if (!title) issues.push('TITLE manquant');
  else if (title.length < 25 || title.length > 65) notices.push(`TITLE longueur optimisable (${title.length})`);

  if (!metaDesc) issues.push('Meta description manquante');
  else if (metaDesc.length < 120 || metaDesc.length > 165) notices.push(`Meta description longueur optimisable (${metaDesc.length})`);

  if (!canonical) notices.push('Lien canonical manquant');
  else {
    try {
      const c = new URL(canonical, url);
      if (c.origin !== new URL(url).origin) notices.push('Canonical pointe hors domaine');
    } catch(e) { notices.push('Canonical mal formé'); }
  }

  if (h1s.length === 0) issues.push('Aucun H1');
  if (h1s.length > 1) notices.push(`Plusieurs H1 (${h1s.length})`);

  if (!ogTitle || !ogDesc) notices.push('Open Graph incomplet (og:title / og:description)');
  if (!ogImage) notices.push('Open Graph image manquante');

  if (!twitterCard) notices.push('Twitter Card manquante (twitter:card)');
  if (!lang) notices.push('Attribut <html lang="..."> manquant ou vide');
  if (!viewport) notices.push('Meta viewport manquante');
  if (/noindex/i.test(robotsMeta)) notices.push('robots meta en noindex (vérifier si voulu)');

  const jsonLdBlocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { jsonLdBlocks.push(JSON.parse($(el).text())); } catch {}
  });
  if (jsonLdBlocks.length === 0) notices.push('JSON-LD manquant (Organization/LocalBusiness conseillé)');
  else {
    const hasOrg = jsonLdBlocks.some(b => {
      const t = Array.isArray(b['@type']) ? b['@type'] : [b['@type']];
      return t.some(x => (''+x).toLowerCase().includes('organization') || (''+x).toLowerCase().includes('localbusiness'));
    });
    if (!hasOrg) notices.push('JSON-LD présent mais pas de type Organization/LocalBusiness');
  }

  const hasIcon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  if (!hasIcon) notices.push('Favicon non déclaré');

  let imgTotal = 0, imgMissingAlt = 0;
  $('img').each((_, el) => {
    imgTotal++;
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') imgMissingAlt++;
  });
  if (imgMissingAlt > 0) notices.push(`Images sans alt: ${imgMissingAlt}/${imgTotal}`);

  return { url, title, metaDesc, issues, notices };
}

async function fetchHTML(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const html = await res.text();
  return html;
}

async function runSEO(pages) {
  const results = [];
  for (const u of pages) {
    try {
      const html = await fetchHTML(u);
      const r = analyzeSEO(html, u);
      results.push(r);
      fs.writeFileSync(path.join(seoDir, encodeURIComponent(u) + '.json'), JSON.stringify(r, null, 2));
      await sleep(100);
    } catch (e) {
      results.push({ url: u, error: e.message });
    }
  }
  fs.writeFileSync(path.join(seoDir, 'seo-summary.json'), JSON.stringify(results, null, 2));
  return results;
}

async function runAxe(pages) {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { stdout: chromiumPath } = await promisify(exec)('which chromium');
  
  const browser = await puppeteer.launch({ 
    headless: 'new', 
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'],
    executablePath: chromiumPath.trim()
  });
  const page = await browser.newPage();
  if (MOBILE_EMULATION) {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  } else {
    await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  }

  const results = [];
  const sample = pages.slice(0, Math.min(20, pages.length));
  for (const u of sample) {
    try {
      await page.goto(u, { waitUntil: 'networkidle2', timeout: 60000 });
      const axe = new AxePuppeteer(page);
      const res = await axe.analyze();
      fs.writeFileSync(path.join(axeDir, encodeURIComponent(u) + '.json'), JSON.stringify(res, null, 2));
      results.push({ url: u, violations: res.violations.length });
    } catch (e) {
      results.push({ url: u, error: e.message });
    }
    await sleep(200);
  }

  await browser.close();
  fs.writeFileSync(path.join(axeDir, 'axe-summary.json'), JSON.stringify(results, null, 2));
  return results;
}

async function runLighthouseCLI(url, mode='mobile') {
  const { spawnSync, execSync } = await import('node:child_process');
  const chromiumPath = execSync('which chromium', { encoding: 'utf-8' }).trim();
  
  const outBase = path.join(perfDir, encodeURIComponent(url) + `-lh-${mode}`);
  const flags = [`--chrome-path="${chromiumPath}"`, '--chrome-flags="--headless --no-sandbox --disable-setuid-sandbox --disable-gpu"','--only-categories=performance,seo,accessibility,best-practices','--output=json','--output=html',`--output-path=${outBase}`];
  if (mode === 'desktop') flags.push('--preset=desktop');
  const cmd = `npx --yes lighthouse "${url}" ${flags.join(' ')}`;
  const res = spawnSync(cmd, { shell: true, encoding: 'utf-8', stdio: 'pipe' });
  fs.writeFileSync(path.join(perfDir, encodeURIComponent(url) + `-lh-${mode}.log`), res.stdout + '\n' + res.stderr);
  return res.status === 0;
}

function mdEscape(s){return (s||'').replace(/\|/g,'\\|');}

async function main() {
  console.log('🔎 Crawl en cours…', SITE_URL);
  const { pages, broken } = await crawl();
  const sampleForPerf = [SITE_URL,
    ...pages.filter(p=>/\/(immobilier|programmes|patrimoine|avis|contact)/.test(p)).slice(0,4)
  ].slice(0,5);
  fs.writeFileSync(path.join(outDir,'pages-sampled.json'), JSON.stringify(sampleForPerf,null,2));

  console.log('📐 SEO on-page…');
  const seoResults = await runSEO(pages);

  console.log('♿ Accessibilité (axe-core)…');
  const axeResults = await runAxe(pages);

  console.log('⚡ Performance (Lighthouse)…');
  const perfSummaries = [];
  for (const u of sampleForPerf) {
    const okMob = await runLighthouseCLI(u, 'mobile');
    const okDesk = await runLighthouseCLI(u, 'desktop');
    perfSummaries.push({ url: u, lighthouse_mobile_ok: okMob, lighthouse_desktop_ok: okDesk });
  }
  fs.writeFileSync(path.join(perfDir, 'perf-summary.json'), JSON.stringify(perfSummaries,null,2));

  const brokenCount = broken.length;
  const axeViolations = axeResults.filter(r=>!r.error).reduce((a,c)=>a + (c.violations||0),0);

  const topSeoIssues = {};
  for (const r of seoResults) {
    (r.issues||[]).forEach(i=> topSeoIssues[i]=(topSeoIssues[i]||0)+1 );
  }
  const topSeoNotices = {};
  for (const r of seoResults) {
    (r.notices||[]).forEach(i=> topSeoNotices[i]=(topSeoNotices[i]||0)+1 );
  }

  const lines = [];
  lines.push(`# Audit Lemeille Patrimoine`);
  lines.push('');
  lines.push(`**Site audité** : ${SITE_URL}`);
  lines.push(`**Pages scannées** : ${pages.length} (max ${MAX_PAGES}, profondeur ${MAX_DEPTH})`);
  lines.push(`**Liens cassés** : ${brokenCount}`);
  lines.push(`**Violations accessibilité (axe)** : ${axeViolations} (sur ${Math.min(20,pages.length)} pages testées)`);
  lines.push('');
  lines.push(`## Performance`);
  lines.push(`Source : **Lighthouse (local)** - rapports HTML/JSON dans \`audit/perf/\`.`);
  lines.push('');
  lines.push('| URL | LH Mobile | LH Desktop |');
  lines.push('|---|:---:|:---:|');
  for (const p of perfSummaries) {
    lines.push(`| ${mdEscape(p.url)} | ${p.lighthouse_mobile_ok ? '✅' : '❌'} | ${p.lighthouse_desktop_ok ? '✅' : '❌'} |`);
  }

  lines.push('');
  lines.push('## SEO — points critiques');
  if (Object.keys(topSeoIssues).length === 0) {
    lines.push('- ✅ Aucun blocage critique détecté (TITLE/meta ok)');
  } else {
    Object.entries(topSeoIssues).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>{
      lines.push(`- ❌ ${k} — ${v} page(s)`);
    });
  }
  lines.push('');
  lines.push('## SEO — améliorations recommandées');
  if (Object.keys(topSeoNotices).length === 0) {
    lines.push('- ✅ RAS');
  } else {
    Object.entries(topSeoNotices).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>{
      lines.push(`- ⚠️ ${k} — ${v} page(s)`);
    });
  }

  lines.push('');
  lines.push('## Accessibilité (axe-core) — résumé');
  lines.push('| URL | Violations |');
  lines.push('|---|---:|');
  axeResults.forEach(r=>{
    const icon = (r.violations === 0 || r.violations === undefined) ? '✅' : '❌';
    lines.push(`| ${icon} ${mdEscape(r.url)} | ${r.violations ?? '—'} |`);
  });

  lines.push('');
  lines.push('## Liens cassés (extrait)');
  if (broken.length === 0) {
    lines.push('- ✅ Aucun lien cassé détecté');
  } else {
    lines.push('| URL cassée | statut | Page référente |');
    lines.push('|---|---:|---|');
    broken.slice(0,20).forEach(b=>{
      lines.push(`| ${mdEscape(b.url)} | ${b.status||''} | ${mdEscape(b.parent||'')} |`);
    });
  }
  lines.push('');
  lines.push('_Rapports détaillés JSON/HTML dans \`audit/links/\`, \`audit/axe/\`, \`audit/seo/\`, \`audit/perf/\`._');

  fs.writeFileSync(path.join(outDir, 'AUDIT-REPORT.md'), lines.join('\n'), 'utf-8');
  console.log('');
  console.log('✅ Audit terminé !');
  console.log('📄 Voir audit/AUDIT-REPORT.md');
}

await main();
JSEND

# Exécute l'audit
echo ""
echo "🏃 Exécution de l'audit..."
SITE_URL="$SITE_URL" MAX_PAGES="$MAX_PAGES" MAX_DEPTH="$MAX_DEPTH" MOBILE_EMULATION="$MOBILE_EMULATION" node audit/run-audit.mjs
