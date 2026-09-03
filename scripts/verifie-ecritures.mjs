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
 * Usage : node scripts/verifie-ecritures.mjs   (sort en 1 si une violation existe)
 */
import fs from 'fs';
import path from 'path';

const RACINE = process.cwd();
const DOSSIERS = ['app', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const FENETRE = 2500; // caractères examinés après la lecture

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
    for (const m of s.matchAll(/readJSON\(\s*['"]([\w.-]+)['"]/g)) {
      const cible = m.index + m[0].length;
      const suite = s.slice(cible, cible + FENETRE);
      const echappe = m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`writeJSON\\(\\s*['"]${echappe}['"]`).test(suite)) {
        violations.push({
          fichier: path.relative(RACINE, f),
          ligne: s.slice(0, m.index).split('\n').length,
          donnee: m[1],
        });
      }
    }
  }
}

if (violations.length === 0) {
  console.log('✓ Aucune lecture-modification-écriture hors verrou.');
  process.exit(0);
}

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
