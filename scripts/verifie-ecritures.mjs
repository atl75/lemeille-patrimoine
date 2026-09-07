#!/usr/bin/env node
/**
 * Garde-fou sur la couche de données.
 *
 * Interdit le motif « readJSON(f) … writeJSON(f) » : entre la lecture et
 * l'écriture, la requête rend la main (await) et une autre peut enregistrer
 * quelque chose que l'écriture finale efface. Mesuré le 2026-09-03 sur
 * 50 ajouts concurrents : 49 perdus avec ce motif, 0 avec updateJSON.
 *
 * Toute modification d'un fichier de données passe par updateJSON(), qui tient
 * la lecture et l'écriture sous le même verrou.
 *
 * ANGLE MORT CORRIGÉ LE 2026-09-07. La détection n'acceptait qu'un littéral —
 * readJSON('x.json'). Onze routes passent par une constante, readJSON(FILE) :
 * le garde-fou ne les voyait pas et annonçait « aucune violation » alors
 * qu'elles portaient toutes le motif. Un contrôle vert qui ne voit rien est
 * pire que pas de contrôle. Les constantes sont désormais résolues.
 *
 * CLIQUET. Faire échouer d'un coup onze routes bloquerait tout déploiement
 * sans rien réparer. Les occurrences connues sont donc listées ci-dessous,
 * nommément : elles sont RAPPELÉES à chaque build mais ne bloquent pas. Toute
 * occurrence NOUVELLE, elle, fait échouer. La liste ne doit que rétrécir.
 *
 * Usage : node scripts/verifie-ecritures.mjs   (sort en 1 si une violation NOUVELLE existe)
 */
import fs from 'fs';
import path from 'path';

const RACINE = process.cwd();
const DOSSIERS = ['app', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const FENETRE = 2500; // caractères examinés après la lecture

// Dette connue au 2026-09-07, relevée à la main. Ces routes lisent puis
// écrivent hors verrou : deux requêtes simultanées sur la même collection et
// l'une des deux écritures est perdue. Elles ne bloquent pas le build, mais
// chaque ligne retirée d'ici est une route convertie à updateJSON.
const CONNUES = new Set([
  'app/api/mandats/route.ts',
  'app/api/mandats/[id]/route.ts',
  'app/api/articles/route.ts',
  'app/api/articles/[id]/route.ts',
  'app/api/features/route.ts',
  'app/api/programs/route.ts',
  'app/api/programs/[id]/route.ts',
  'app/api/properties/route.ts',
  'app/api/properties/[id]/route.ts',
  'app/api/reviews/route.ts',
  'app/api/reviews/[id]/route.ts',
  // Cas différent, gardé pour mémoire : la lecture et l'écriture du jeton
  // Google vivent dans DEUX fonctions distinctes (readToken / exchangeCode),
  // ce n'est pas une lecture-modification-écriture. La fenêtre de détection
  // les rapproche par accident.
  'lib/googleMail.ts',
]);

// Résout « const FILE = 'x.json' » pour que readJSON(FILE) soit vu comme
// readJSON('x.json'). C'est précisément ce qui échappait au contrôle.
function constantes(source) {
  const m = new Map();
  for (const c of source.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*['"]([\w.-]+\.json)['"]/g)) {
    m.set(c[1], c[2]);
  }
  return m;
}

function* fichiers(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next') continue;
      yield* fichiers(p);
    } else if (EXTENSIONS.has(path.extname(e.name))) {
      yield p;
    }
  }
}

const violations = [];
for (const dossier of DOSSIERS) {
  const abs = path.join(RACINE, dossier);
  if (!fs.existsSync(abs)) continue;
  for (const f of fichiers(abs)) {
    const s = fs.readFileSync(f, 'utf-8');
    const cst = constantes(s);
    // Littéral OU identifiant : on capture les deux formes d'appel.
    for (const m of s.matchAll(/readJSON\(\s*(?:['"]([\w.-]+)['"]|([A-Za-z_$][\w$]*))\s*\)/g)) {
      const donnee = m[1] || cst.get(m[2]);
      if (!donnee) continue;                 // variable dont on ignore la cible
      const nom = m[1] ? null : m[2];
      const cible = m.index + m[0].length;
      const suite = s.slice(cible, cible + FENETRE);
      const echappe = donnee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const ecrit = new RegExp(`writeJSON\\(\\s*(?:['"]${echappe}['"]` + (nom ? `|${nom}\\b` : '') + `)`);
      if (ecrit.test(suite)) {
        violations.push({
          fichier: path.relative(RACINE, f),
          ligne: s.slice(0, m.index).split('\n').length,
          donnee,
        });
      }
    }
  }
}

const nouvelles = violations.filter((v) => !CONNUES.has(v.fichier));
const rappels = violations.filter((v) => CONNUES.has(v.fichier));

if (rappels.length) {
  const fichiers = [...new Set(rappels.map((v) => v.fichier))];
  console.log(
    `· dette connue : ${rappels.length} lecture-écriture hors verrou dans ` +
    `${fichiers.length} fichiers. Elles ne bloquent pas le build ; la liste CONNUES ` +
    `de ce script ne doit que rétrécir.`
  );
}

if (nouvelles.length === 0) {
  console.log('✓ Aucune NOUVELLE lecture-modification-écriture hors verrou.');
  process.exit(0);
}

violations.length = 0;
violations.push(...nouvelles);



console.error(`\n✗ ${violations.length} lecture(s) suivie(s) d'une écriture du même fichier, hors verrou :\n`);
for (const v of violations) {
  console.error(`   ${v.fichier}:${v.ligne}   ${v.donnee}`);
}
console.error(`
   Entre readJSON et writeJSON, une autre requête peut enregistrer une donnée
   que l'écriture finale effacera — sans erreur et sans trace.

   Remplacer par :

     await updateJSON('${violations[0].donnee}', (data) => {
       // modifier data ici, sous verrou
       return data;              // ou SANS_ECRITURE pour ne rien écrire
     });
`);
process.exit(1);
