/**
 * Règles métier qui ont un effet direct sur le référencement et l'affichage :
 * longueur des titres, pages maigres sorties de l'index, rattachement d'un bien
 * à son secteur, et réécriture des images de bandeau.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { seoTitle } from "../lib/seoTitle.ts";
import { isThinListing } from "../lib/thinListing.ts";
import { matchesSector, sectorSlugFor, SECTORS, norm, locatifDe } from "../lib/sectors.ts";
import cloudinaryLoader from "../lib/cloudinaryLoader.js";
import { needsFollowUp, formatDate } from "../lib/typesLead.ts";
import {
  erreurPrix,
  erreurNetVendeur,
  erreursProprietaires,
  erreursFiche,
} from "../lib/validationBien.ts";

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

describe("needsFollowUp — quand un lead doit être relancé", () => {
  // Seuils : nouveau 3 j, contacté 5 j, qualifié 10 j, clos jamais.
  const ilYA = (jours: number) => new Date(Date.now() - jours * 86400000).toISOString();

  test("un lead clos n'est jamais à relancer, même très ancien", () => {
    assert.equal(needsFollowUp({ status: "closed", createdAt: ilYA(365) } as any), false);
  });

  test("nouveau : relance à partir de 3 jours", () => {
    assert.equal(needsFollowUp({ status: "new", createdAt: ilYA(2) } as any), false);
    assert.equal(needsFollowUp({ status: "new", createdAt: ilYA(4) } as any), true);
  });

  test("contacté : le seuil monte à 5 jours", () => {
    assert.equal(needsFollowUp({ status: "contacted", createdAt: ilYA(4) } as any), false);
    assert.equal(needsFollowUp({ status: "contacted", createdAt: ilYA(6) } as any), true);
  });

  test("qualifié : 10 jours", () => {
    assert.equal(needsFollowUp({ status: "qualified", createdAt: ilYA(9) } as any), false);
    assert.equal(needsFollowUp({ status: "qualified", createdAt: ilYA(11) } as any), true);
  });

  test("la dernière activité prime sur la date de création", () => {
    // Créé il y a un mois, mais rappelé hier : pas de relance.
    assert.equal(
      needsFollowUp({ status: "new", createdAt: ilYA(30), lastActivityAt: ilYA(1) } as any),
      false
    );
  });

  test("sans aucune date, le lead est à relancer", () => {
    // daysSince renvoie Infinity : mieux vaut une relance de trop qu'un lead oublié.
    assert.equal(needsFollowUp({ status: "new" } as any), true);
  });
});

describe("formatDate", () => {
  test("format français avec l'heure", () => {
    const t = formatDate("2026-09-03T14:05:00Z");
    assert.match(t, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/, t);
  });
});

describe("validation d'une fiche bien — ce qui bloque l'enregistrement", () => {
  test("prix nul ou négatif refusé", () => {
    assert.equal(erreurPrix({ price: 250000 }), "");
    assert.equal(erreurPrix({ price: 0 }), "Prix invalide");
    assert.equal(erreurPrix({ price: -1 }), "Prix invalide");
  });

  test("« prix sur demande » dispense du prix", () => {
    assert.equal(erreurPrix({ price: 0, priceOnRequest: true }), "");
  });

  test("un prix absent n'est pas une erreur — la fiche peut être en cours de saisie", () => {
    assert.equal(erreurPrix({}), "");
    assert.equal(erreurPrix(null), "");
  });

  test("le net vendeur ne peut pas dépasser le prix FAI", () => {
    assert.equal(erreurNetVendeur({ price: 200000, netSellerAmount: 190000 }), "");
    assert.equal(erreurNetVendeur({ price: 200000, netSellerAmount: 200000 }), "");
    assert.match(erreurNetVendeur({ price: 200000, netSellerAmount: 210000 }), /ne peut pas dépasser/);
  });

  test("email de propriétaire", () => {
    const [a, b] = erreursProprietaires([{ email: "jean@exemple.fr" }, { email: "pas-un-email" }]);
    assert.equal(a.email, "");
    assert.equal(b.email, "Adresse email invalide");
  });

  test("SIREN : neuf chiffres, exigé des seules sociétés", () => {
    const r = erreursProprietaires([
      { type: "COMPANY", siren: "123456789" },
      { type: "COMPANY", siren: "123 456 789" },  // les espaces sont tolérés
      { type: "COMPANY", siren: "12345" },
      { type: "INDIVIDUAL", siren: "12345" },     // un particulier n'en a pas
    ]);
    assert.equal(r[0].siren, "");
    assert.equal(r[1].siren, "", "les espaces doivent être ignorés");
    assert.match(r[2].siren, /9 chiffres/);
    assert.equal(r[3].siren, "");
  });

  test("erreursFiche rassemble tout et ne garde que le non vide", () => {
    assert.deepEqual(erreursFiche({ price: 200000, owners: [{ email: "ok@x.fr" }] }), []);
    // Prix à -5 : le prix est invalide ET le net vendeur (10) le dépasse.
    // Les deux règles se déclenchent — ce n'est pas un doublon, ce sont deux
    // défauts distincts que l'utilisateur doit voir.
    const e = erreursFiche({
      price: -5,
      netSellerAmount: 10,
      owners: [{ email: "cassé" }, { type: "COMPANY", siren: "1" }],
    });
    assert.equal(e.length, 4, e.join(" | "));
  });

  test("une fiche vide ne bloque rien", () => {
    assert.deepEqual(erreursFiche({}), []);
    assert.deepEqual(erreursFiche(null), []);
  });
});

describe("locatifDe — le secteur nommé en complément de lieu", () => {
  // « Vous vendez à Côte d'Azur ? » : le gabarit collait « à » devant tous les
  // titres. Une région veut « sur la », et un titre portant un article se
  // contracte — d'où la locution entière plutôt que la seule préposition, qui
  // aurait donné « au Le Mesnil-Esnard ».
  test("une commune garde le « à » par défaut", () => {
    assert.equal(locatifDe(SECTORS["bihorel"] as any), "à Bihorel");
  });

  test("une région prend sa propre locution", () => {
    assert.equal(locatifDe(SECTORS["cote-d-azur"] as any), "sur la Côte d'Azur");
  });

  test("un titre portant un article ne le redouble pas", () => {
    const l = locatifDe(SECTORS["mesnil-esnard-franqueville"] as any);
    assert.equal(l, "au Mesnil-Esnard & Franqueville-Saint-Pierre");
    assert.ok(!/au Le/.test(l), "« au Le » : la préposition redouble l'article");
  });

  test("aucun secteur ne produit une locution fautive", () => {
    for (const [slug, s] of Object.entries(SECTORS) as [string, any][]) {
      const l = locatifDe(s);
      assert.ok(!/\b(au|du) L[ae]\b/.test(l), `${slug} : « ${l} »`);
      assert.ok(l.trim().length > 2, `${slug} : locution vide`);
    }
  });
});

describe("cote-d-azur — le secteur d'ensemble ne vole pas les communes du Var", () => {
  test("une commune du Var reste sur son secteur étroit", () => {
    assert.equal(sectorSlugFor({ city: "Fréjus", region: "COTE_D_AZUR" }), "saint-aygulf-frejus");
    assert.equal(sectorSlugFor({ city: "Sainte-Maxime", region: "COTE_D_AZUR" }), "sainte-maxime-golfe-saint-tropez");
    assert.equal(sectorSlugFor({ city: "Agay", region: "COTE_D_AZUR" }), "esterel-arriere-pays");
  });

  test("les Alpes-Maritimes, qui n'ont pas de secteur propre, tombent sur l'ensemble", () => {
    for (const ville of ["Cannes", "Nice", "Antibes", "Le Rouret"]) {
      assert.equal(sectorSlugFor({ city: ville, region: "COTE_D_AZUR" }), "cote-d-azur", ville);
    }
  });

  test("la page d'ensemble reconnaît les deux départements", () => {
    const s = SECTORS["cote-d-azur"] as any;
    for (const ville of ["Cannes", "Nice", "Fréjus", "Saint-Tropez"]) {
      assert.equal(matchesSector({ city: ville, region: "COTE_D_AZUR" }, s), true, ville);
    }
  });
});
