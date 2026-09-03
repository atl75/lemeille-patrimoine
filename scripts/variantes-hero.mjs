#!/usr/bin/env node
/**
 * Génère les déclinaisons WebP des images de bandeau.
 *
 * POURQUOI CE SCRIPT EXISTE
 * lib/cloudinaryLoader.js réécrit toute source `/hero-<nom>.jpg` vers
 * `/hero/<nom>-<largeur>.webp`. Si la déclinaison n'existe pas, le navigateur
 * reçoit un 404 : l'image ne s'affiche pas, et RIEN ne le signale — ni au
 * build, ni dans la console du serveur. Ajouter une photo de bandeau
 * supposait donc de fabriquer cinq fichiers à la main, en n'oubliant aucune
 * largeur. C'est exactement ce qui a failli arriver avec la vue de Rouen.
 *
 * USAGE
 *   node scripts/variantes-hero.mjs           génère ce qui manque
 *   node scripts/variantes-hero.mjs --check   ne génère rien, sort en 1 s'il
 *                                             manque une déclinaison
 *   node scripts/variantes-hero.mjs --force   régénère tout
 *
 * Le mode --check tourne en prebuild : une photo sans ses déclinaisons ne peut
 * plus partir en production.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Doit rester identique à HERO_WIDTHS dans lib/cloudinaryLoader.js.
const LARGEURS = [640, 828, 1200, 1600, 2400];
const QUALITE = 82;

const RACINE = process.cwd();
const SOURCES = path.join(RACINE, "public");
const SORTIE = path.join(RACINE, "public", "hero");

const check = process.argv.includes("--check");
const force = process.argv.includes("--force");

/** Vérifie que le loader et ce script parlent des mêmes largeurs. */
function verifierAccordAvecLeLoader() {
  const loader = path.join(RACINE, "lib", "cloudinaryLoader.js");
  if (!fs.existsSync(loader)) return;
  const m = fs.readFileSync(loader, "utf-8").match(/HERO_WIDTHS\s*=\s*\[([^\]]*)\]/);
  if (!m) return;
  const attendues = m[1].split(",").map((x) => Number(x.trim())).filter(Boolean);
  const memes =
    attendues.length === LARGEURS.length && attendues.every((v, i) => v === LARGEURS[i]);
  if (!memes) {
    console.error(
      `\n✗ Désaccord de largeurs :\n` +
        `    lib/cloudinaryLoader.js : [${attendues.join(", ")}]\n` +
        `    ce script              : [${LARGEURS.join(", ")}]\n` +
        `  Les deux listes doivent être identiques, sinon le loader demandera\n` +
        `  des fichiers qui n'existent pas.\n`
    );
    process.exit(1);
  }
}

async function main() {
  verifierAccordAvecLeLoader();
  fs.mkdirSync(SORTIE, { recursive: true });

  const sources = fs
    .readdirSync(SOURCES)
    .filter((f) => /^hero-[a-z0-9-]+\.jpg$/i.test(f))
    .sort();

  if (!sources.length) {
    console.log("Aucune image /public/hero-*.jpg.");
    return;
  }

  const manquantes = [];
  let generees = 0;

  for (const fichier of sources) {
    const nom = fichier.replace(/^hero-/, "").replace(/\.jpg$/i, "");
    const source = path.join(SOURCES, fichier);
    const meta = await sharp(source).metadata();
    const aFaire = [];

    for (const l of LARGEURS) {
      const cible = path.join(SORTIE, `${nom}-${l}.webp`);
      if (!force && fs.existsSync(cible)) continue;
      aFaire.push({ largeur: l, cible });
    }

    if (!aFaire.length) {
      console.log(`  ✓ ${nom.padEnd(12)} ${LARGEURS.length}/${LARGEURS.length} déclinaisons`);
      continue;
    }

    if (check) {
      manquantes.push({ nom, largeurs: aFaire.map((x) => x.largeur) });
      continue;
    }

    for (const { largeur, cible } of aFaire) {
      // Ne jamais agrandir : une source plus étroite que la largeur demandée
      // donnerait une image floue, plus lourde que l'originale.
      const l = Math.min(largeur, meta.width || largeur);
      await sharp(source).resize({ width: l }).webp({ quality: QUALITE }).toFile(cible);
      generees++;
    }
    const poids = aFaire
      .map(({ cible }) => Math.round(fs.statSync(cible).size / 1024))
      .reduce((a, b) => a + b, 0);
    console.log(
      `  + ${nom.padEnd(12)} ${aFaire.length} déclinaison(s) générée(s)` +
        ` (${aFaire.map((x) => x.largeur).join(", ")}) — ${poids} Ko`
    );
  }

  if (check && manquantes.length) {
    console.error(`\n✗ ${manquantes.length} image(s) de bandeau sans déclinaisons complètes :\n`);
    for (const m of manquantes) {
      console.error(`   public/hero-${m.nom}.jpg  →  manque ${m.largeurs.join(", ")}`);
    }
    console.error(
      `\n   Le loader renverrait un 404 silencieux : l'image ne s'afficherait pas,\n` +
        `   sans la moindre erreur au build ni dans les journaux.\n\n` +
        `   Corriger avec :  npm run variantes\n`
    );
    process.exit(1);
  }

  if (check) console.log("✓ Toutes les images de bandeau ont leurs déclinaisons.");
  else if (!generees) console.log("\nRien à générer, tout est à jour.");
  else console.log(`\n${generees} fichier(s) écrit(s) dans public/hero/.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
