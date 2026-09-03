/**
 * Règles métier qui ont un effet direct sur le référencement et l'affichage :
 * longueur des titres, pages maigres sorties de l'index, rattachement d'un bien
 * à son secteur, et réécriture des images de bandeau.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { seoTitle } from "../lib/seoTitle.ts";
import { isThinListing } from "../lib/thinListing.ts";
import { matchesSector, sectorSlugFor, SECTORS, norm } from "../lib/sectors.ts";
import cloudinaryLoader from "../lib/cloudinaryLoader.js";

describe("seoTitle — 62 caractères, marque sacrifiée avant troncature", () => {
  test("titre court : la marque est conservée", () => {
    const t = seoTitle(["Maison T4"]);
    assert.equal(t, "Maison T4 | Lemeille Patrimoine");
    assert.ok(t.length <= 62);
  });

  test("jamais plus de 62 caractères, quelle que soit l'entrée", () => {
    const entrees = [
      ["Appartement T3 de caractère avec terrasse et vue dégagée", "Rouen centre", "Normandie"],
      ["Maison"],
      ["Un intitulé volontairement démesuré ".repeat(4)],
      [],
      [null, undefined, ""],
    ];
    for (const e of entrees) {
      const t = seoTitle(e as any);
      assert.ok(t.length <= 62, `${t.length} caractères pour ${JSON.stringify(e)} : ${t}`);
    }
  });

  test("les parties de fin sont abandonnées avant la troncature", () => {
    const t = seoTitle(["Appartement T3 avec terrasse", "Mont-Saint-Aignan", "Plateau Nord"]);
    assert.ok(t.startsWith("Appartement T3 avec terrasse"), t);
    assert.ok(!t.includes("…"), "aucune troncature ne devrait être nécessaire ici");
  });

  test("entrée vide : la marque seule", () => {
    assert.equal(seoTitle([]), "Lemeille Patrimoine");
  });
});

describe("isThinListing — quelles fiches sortent de l'index", () => {
  const vendu = { sold: true, status: "SOLD" };

  test("vendue, sans description et sans photo : maigre", () => {
    assert.equal(isThinListing({ ...vendu, description: ".", images: [] }), true);
  });

  test("vendue mais décrite : pas maigre", () => {
    assert.equal(
      isThinListing({ ...vendu, description: "x".repeat(60), images: [] }),
      false
    );
  });

  test("vendue avec plusieurs photos : pas maigre", () => {
    assert.equal(isThinListing({ ...vendu, description: "", images: ["a", "b"] }), false);
  });

  test("EN VENTE et vide : jamais maigre — on n'exclut pas un bien à vendre", () => {
    assert.equal(isThinListing({ status: "AVAILABLE", description: "", images: [] }), false);
  });

  test("entrée nulle ou absente", () => {
    assert.equal(isThinListing(null), false);
    assert.equal(isThinListing(undefined), false);
  });
});

describe("sectors — rattachement d'un bien à son secteur", () => {
  test("norm neutralise accents et casse (il ne rogne PAS les espaces)", () => {
    assert.equal(norm("Mont-Saint-Aignan"), norm("mont-saint-aignan"));
    assert.equal(norm("Déville"), "deville");
    assert.equal(norm("Bihorel "), "bihorel ");
  });

  test("matchesSector exige la région ET la ville", () => {
    const s = SECTORS["bihorel"] as any;
    assert.equal(matchesSector({ city: "Bihorel", region: "NORMANDIE" }, s), true);
    assert.equal(matchesSector({ city: "Bihorel" }, s), false, "sans région, pas de rattachement");
    assert.equal(matchesSector({ city: "Bihorel", region: "PARIS" }, s), false);
  });

  test("chaque secteur reconnaît sa première commune, région fournie", () => {
    for (const [slug, s] of Object.entries(SECTORS) as [string, any][]) {
      const villes: string[] = s.cities || [];
      if (!villes.length) continue;
      assert.ok(
        matchesSector({ city: villes[0], region: s.region }, s),
        `${slug} ne reconnaît pas « ${villes[0]} »`
      );
    }
  });

  // Régression : « Paris 18e » contient « Paris 1 » et se retrouvait rattaché au
  // centre historique. sectorSlugFor compare donc à l'identique, pas en sous-chaîne.
  test("sectorSlugFor compare à l'identique : Paris 18e n'est pas Paris 1er", () => {
    const slug = sectorSlugFor({ city: "Paris 18e", region: "PARIS" });
    assert.notEqual(slug, "paris-centre-historique");
  });

  test("« Rouen » va au centre : lui seul liste la commune à l'identique", () => {
    // La rive gauche ne liste que Sotteville, les Quevilly, Saint-Étienne-du-Rouvray.
    // Il n'y a donc pas d'égalité à départager, contrairement à ce que laisse
    // craindre le commentaire du module.
    assert.equal(sectorSlugFor({ city: "Rouen", region: "NORMANDIE" }), "rouen-centre");
  });

  test("une commune de la rive gauche va bien rive gauche", () => {
    assert.equal(
      sectorSlugFor({ city: "Sotteville-lès-Rouen", region: "NORMANDIE" }),
      "rouen-rive-gauche"
    );
  });

  test("le secteur le plus spécifique l'emporte", () => {
    // Bois-Guillaume a son propre secteur ET figure dans « Mont-Saint-Aignan
    // & Bois-Guillaume » : c'est le premier, plus étroit, qui doit gagner.
    assert.equal(sectorSlugFor({ city: "Bois-Guillaume", region: "NORMANDIE" }), "bois-guillaume");
  });

  test("un bien hors zone n'est rattaché à aucun secteur", () => {
    assert.equal(sectorSlugFor({ city: "Marseille", region: "PACA" }), null);
    assert.equal(sectorSlugFor({ city: "", region: "NORMANDIE" }), null);
    assert.equal(sectorSlugFor(null), null);
  });
});

describe("cloudinaryLoader — réécriture des images", () => {
  const LARGEURS = [640, 828, 1200, 1600, 2400];

  test("une image de bandeau part vers sa déclinaison WebP", () => {
    assert.equal(
      cloudinaryLoader({ src: "/hero-rouen.jpg", width: 1200, quality: 80 }),
      "/hero/rouen-1200.webp"
    );
  });

  test("la largeur demandée est arrondie à la déclinaison supérieure", () => {
    assert.equal(cloudinaryLoader({ src: "/hero-rouen.jpg", width: 700, quality: 80 }), "/hero/rouen-828.webp");
    assert.equal(cloudinaryLoader({ src: "/hero-rouen.jpg", width: 1, quality: 80 }), "/hero/rouen-640.webp");
  });

  test("au-delà de la plus grande déclinaison, on sert la plus grande", () => {
    assert.equal(
      cloudinaryLoader({ src: "/hero-rouen.jpg", width: 5000, quality: 80 }),
      `/hero/rouen-${LARGEURS[LARGEURS.length - 1]}.webp`
    );
  });

  test("Cloudinary reçoit ses paramètres de transformation", () => {
    const u = cloudinaryLoader({
      src: "https://res.cloudinary.com/x/image/upload/v1/photo.jpg",
      width: 800,
      quality: 75,
    });
    assert.ok(u.includes("f_auto"));
    assert.ok(u.includes("q_75"));
    assert.ok(u.includes("w_800"));
  });

  test("toute autre image est laissée telle quelle", () => {
    assert.equal(cloudinaryLoader({ src: "/images/arthur.jpg", width: 800, quality: 80 }), "/images/arthur.jpg");
  });
});
