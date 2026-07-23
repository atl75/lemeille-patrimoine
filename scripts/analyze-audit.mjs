import fs from 'fs';
import path from 'path';

const ROOT = process.argv[2] || 'audit';
const file = p => path.join(ROOT, p);
const rd = p => JSON.parse(fs.readFileSync(p,'utf8'));
const sx = p => fs.existsSync(p)?p:null;

const seo = sx(file('seo/seo-summary.json'));
const axe = sx(file('axe/axe-summary.json'));
const perf= sx(file('perf/perf-summary.json'));
const brk = sx(file('links/broken-links.json'));
const pages= sx(file('links/pages.json'));

const sum = {
  pages: pages? rd(pages).length : 0,
  broken: brk? rd(brk).length : 0,
  a11yPages: 0, a11yViol: 0,
  perfRows: [], mode: 'unknown',
  topIssues: {}, topNotices: {}
};

if (axe) {
  const a = rd(axe);
  for (const r of a) if (Number.isInteger(r.violations)) { sum.a11yPages++; sum.a11yViol += r.violations; }
}

if (seo) {
  for (const r of rd(seo)) {
    (r.issues||[]).forEach(x=> sum.topIssues[x]=(sum.topIssues[x]||0)+1);
    (r.notices||[]).forEach(x=> sum.topNotices[x]=(sum.topNotices[x]||0)+1);
  }
}

if (perf) {
  const p = rd(perf);
  if (p.some(x=>x.psi_mobile)) sum.mode = 'PSI'; else sum.mode = 'LH';
  for (const r of p) {
    if (sum.mode==='PSI') {
      const m=r.psi_mobile||{}, d=r.psi_desktop||{}, pct=x=>x==null?'—':Math.round(x*100);
      sum.perfRows.push([r.url, pct(m.performance), pct(m.seo), pct(m.accessibility), pct(d.performance), pct(d.seo), pct(d.accessibility)]);
    } else {
      sum.perfRows.push([r.url, r.lighthouse_mobile_ok?'✅':'❌', r.lighthouse_desktop_ok?'✅':'❌']);
    }
  }
}

const top = (obj, n=10)=> Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);

// --- Génère rapport & tâches ---
const outDir = path.join(ROOT, 'summary');
fs.mkdirSync(outDir, { recursive: true });

const md = [];
md.push(`# Audit – Synthèse`);
md.push(``);
md.push(`**Date** : ${new Date().toLocaleDateString('fr-FR')}`);
md.push(``);
md.push(`## 📊 Vue d'ensemble`);
md.push(`- Pages scannées : **${sum.pages}**`);
md.push(`- Liens cassés : **${sum.broken}**`);
if (sum.a11yPages) md.push(`- Accessibilité : **${sum.a11yViol}** violations sur **${sum.a11yPages}** pages (axe-core)`);
md.push(`- Performance : **${sum.mode==='PSI'?'PageSpeed Insights':'Lighthouse local'}**`);
md.push(``);
md.push(`## 🔴 SEO — points critiques`);
if (Object.keys(sum.topIssues).length) top(sum.topIssues).forEach(([k,v])=> md.push(`- ❌ **${k}** — ${v} page(s)`)); else md.push(`- ✅ RAS`);
md.push(``);
md.push(`## ⚠️ SEO — améliorations recommandées`);
if (Object.keys(sum.topNotices).length) top(sum.topNotices).forEach(([k,v])=> md.push(`- ${k} — ${v} page(s)`)); else md.push(`- ✅ RAS`);
md.push(``);
md.push(`## ⚡ Performance (échantillon)`);
if (sum.perfRows.length) {
  if (sum.mode==='PSI') {
    md.push(`| URL | Perf M | SEO M | A11y M | Perf D | SEO D | A11y D |`);
    md.push(`|---|---:|---:|---:|---:|---:|---:|`);
    sum.perfRows.forEach(r=> md.push(`| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | ${r[5]} | ${r[6]} |`));
  } else {
    md.push(`| URL | LH Mobile | LH Desktop |`);
    md.push(`|---|:---:|:---:|`);
    sum.perfRows.forEach(r=> md.push(`| ${r[0]} | ${r[1]} | ${r[2]} |`));
  }
} else md.push(`- Pas de données perf.`);

fs.writeFileSync(path.join(outDir, 'AUDIT-SUMMARY.md'), md.join('\n'), 'utf8');

// Tâches priorisées
const tasks = [];
const push = (prio,cat,url,detail)=> tasks.push({prio,cat,url,detail});

if (brk) rd(brk).slice(0,200).forEach(b=> push('P0','Liens cassés', b.url, `Depuis: ${b.parent} (HTTP ${b.status||''})`));
if (seo) rd(seo).forEach(r=>{
  (r.issues||[]).forEach(i=> push('P1','SEO', r.url, i));
  (r.notices||[]).forEach(n=> push('P2','SEO (amélioration)', r.url, n));
});
if (axe) rd(axe).forEach(r=>{
  if (Number.isInteger(r.violations) && r.violations > 0) push(r.violations>5?'P1':'P2','Accessibilité', r.url, `${r.violations} violations axe-core`);
});
if (perf) rd(perf).forEach(r=>{
  if (r.lighthouse_mobile_ok === false || r.lighthouse_desktop_ok === false) {
    push('P2','Performance', r.url, 'Optimiser Core Web Vitals (voir rapports HTML dans audit/perf/)');
  }
});

const csv = ['priority,category,url,detail', ...tasks.map(t=>
  `"${t.prio}","${t.cat}","${(t.url||'').replace(/"/g,'""')}","${(t.detail||'').replace(/"/g,'""')}"`
)];
fs.writeFileSync(path.join(outDir, 'AUDIT-TASKS.csv'), csv.join('\n'), 'utf8');

// Digest JSON pour exploitation programmatique
fs.writeFileSync(path.join(outDir, 'audit-digest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  summary: sum,
  tasks: tasks
}, null, 2), 'utf8');

// Affiche un digest console
console.log('');
console.log('==== ✅ RÉSUMÉ AUDIT ====');
console.log(`📄 Pages scannées : ${sum.pages}`);
console.log(`🔗 Liens cassés : ${sum.broken}`);
console.log(`♿ Violations accessibilité : ${sum.a11yViol}`);
console.log(`⚡ Mode performance : ${sum.mode}`);
console.log('');
console.log(`📊 Fichiers générés :`);
console.log(`   → ${path.join(outDir, 'AUDIT-SUMMARY.md')}`);
console.log(`   → ${path.join(outDir, 'AUDIT-TASKS.csv')} (${tasks.length} tâches)`);
console.log(`   → ${path.join(outDir, 'audit-digest.json')}`);
console.log('');
