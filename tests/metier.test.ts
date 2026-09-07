/**
 * Règles métier qui ont un effet direct sur le référencement et l'affichage :
 * longueur des titres, pages maigres sorties de l'index, rattachement d'un bien
 * à son secteur, et réécriture des images de bandeau.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { seoTitle } from "../lib/seoTitle.ts";
import { isThinListing } from "../lib/thinListing.ts";
import { matchesSector, sectorSlugFor, SECTORS, norm, locatifDe, codePostalDe } from "../lib/sectors.ts";
import cloudinaryLoader from "../lib/cloudinaryLoader.js";
import { needsFollowUp, formatDate } from "../lib/typesLead.ts";
import {
  erreurPrix,
  erreurNetVendeur,
  erreursProprietaires,
  erreursFiche,
} from "../lib/validationBien.ts";
import { leadJoignable, tronqueLead } from "../lib/validationLead.ts";

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

describe("les deux rives de Rouen", () => {
  // Signalé le 2026-09-05 : la page rive droite montrait des biens de la rive
  // gauche, absents de la page rive gauche. Deux causes distinctes.
  const rive = (cp: string) => ({ city: "Rouen", region: "NORMANDIE", postalCode: cp });

  test("codePostalDe lit le code dans l'adresse de la carte", () => {
    assert.equal(codePostalDe({ map: { query: "154 Rue Louis Blanc 76100 Rouen" } }), "76100");
    // Le DERNIER groupe de cinq chiffres, pour ne pas confondre avec un numéro.
    assert.equal(codePostalDe({ map: { query: "12345 Rue Untel 76000 Rouen" } }), "76000");
    assert.equal(codePostalDe({ postalCode: "76100" }), "76100");
    assert.equal(codePostalDe({ city: "Rouen" }), null);
    assert.equal(codePostalDe(null), null);
  });

  // Cause 1 : « Rouen » désignait les deux rives, et rouen-rive-gauche ne
  // listait que les communes voisines — pas Rouen même.
  test("un bien en 76100 va rive gauche, et PAS au cœur historique", () => {
    assert.equal(sectorSlugFor(rive("76100")), "rouen-rive-gauche");
    assert.equal(matchesSector(rive("76100"), SECTORS["rouen-rive-gauche"] as any), true);
    assert.equal(matchesSector(rive("76100"), SECTORS["rouen-centre"] as any), false);
  });

  test("un bien en 76000 reste au cœur historique", () => {
    assert.equal(sectorSlugFor(rive("76000")), "rouen-centre");
    assert.equal(matchesSector(rive("76000"), SECTORS["rouen-centre"] as any), true);
    assert.equal(matchesSector(rive("76000"), SECTORS["rouen-rive-gauche"] as any), false);
  });

  test("sans code postal connu, un bien à Rouen reste au cœur historique", () => {
    const sansCp = { city: "Rouen", region: "NORMANDIE" };
    assert.equal(matchesSector(sansCp, SECTORS["rouen-centre"] as any), true);
  });

  // Cause 2 : matchesSector comparait en sous-chaîne, et
  // « sotteville-les-rouen » contient « rouen ».
  test("Sotteville-lès-Rouen ne remonte pas sur le cœur historique", () => {
    const p = { city: "Sotteville-lès-Rouen", region: "NORMANDIE" };
    assert.equal(matchesSector(p, SECTORS["rouen-centre"] as any), false,
      "« sotteville-les-rouen » contient « rouen » : la comparaison doit être exacte");
    assert.equal(matchesSector(p, SECTORS["rouen-rive-gauche"] as any), true);
  });

  // Même bug, autre victime : « paris 18e » contient « Paris 1 ».
  test("Paris 18e ne remonte pas sur le centre historique", () => {
    const p = { city: "Paris 18e", region: "PARIS", postalCode: "75018" };
    assert.equal(matchesSector(p, SECTORS["paris-centre-historique"] as any), false);
    assert.equal(sectorSlugFor(p), "paris");
  });

  test("le 16e arrive sur Paris Ouest, y compris en 75116", () => {
    assert.equal(sectorSlugFor({ city: "Paris", region: "PARIS", postalCode: "75116" }), "paris-ouest");
  });
});

describe("aucun bien ne doit rester sans secteur", () => {
  // Sept biens ne relevaient d'aucun secteur : Bonsecours (×2), Houppeville,
  // Maromme, Roncherolles, Saint-Pierre-de-Varengeville et Deauville. Les six
  // premiers sont dans la métropole rouennaise ; Deauville est dans le
  // Calvados, à quatre-vingt-dix kilomètres et sur un autre marché — d'où deux
  // secteurs distincts plutôt qu'un fourre-tout.
  const villes = [
    ["Bonsecours", "couronne-rouennaise"],
    ["Houppeville", "couronne-rouennaise"],
    ["Maromme", "couronne-rouennaise"],
    ["Roncherolles-sur-le-Vivier", "couronne-rouennaise"],
    ["Saint-Pierre-de-Varengeville", "couronne-rouennaise"],
    ["Deauville", "deauville-cote-fleurie"],
  ] as const;

  for (const [ville, attendu] of villes) {
    test(`${ville} est rattaché à ${attendu}`, () => {
      assert.equal(sectorSlugFor({ city: ville, region: "NORMANDIE" }), attendu);
    });
  }

  // Le secteur large ne doit pas voler les communes des secteurs étroits :
  // sectorSlugFor retient celui qui a le moins de communes.
  test("les secteurs étroits gardent la priorité sur la couronne", () => {
    for (const [ville, attendu] of [
      ["Bois-Guillaume", "bois-guillaume"],
      ["Bihorel", "bihorel"],
      ["Isneauville", "isneauville"],
      ["Le Mesnil-Esnard", "mesnil-esnard-franqueville"],
    ] as const) {
      assert.equal(sectorSlugFor({ city: ville, region: "NORMANDIE" }), attendu, ville);
    }
  });

  test("Deauville ne remonte pas sur la couronne rouennaise", () => {
    const p = { city: "Deauville", region: "NORMANDIE" };
    assert.equal(matchesSector(p, SECTORS["couronne-rouennaise"] as any), false);
    assert.equal(matchesSector(p, SECTORS["deauville-cote-fleurie"] as any), true);
  });
});

describe("recevabilité d'un lead — un lead doit être joignable", () => {
  // /api/leads acceptait un corps VIDE et créait l'enregistrement. Le limiteur
  // de débit borne la cadence, pas le contenu : un robot pouvait remplir le
  // CRM d'entrées creuses. Constaté en production le 2026-09-07 — deux leads
  // vides créés pendant l'audit, supprimés dans la foulée.
  test("un corps vide est refusé", () => {
    assert.equal(typeof leadJoignable({}), "string");
    assert.equal(typeof leadJoignable(null), "string");
  });

  test("un email seul suffit", () => {
    assert.equal(leadJoignable({ email: "a@b.fr" }), null);
  });

  test("un téléphone seul suffit", () => {
    assert.equal(leadJoignable({ phone: "06 87 15 72 59" }), null);
    assert.equal(leadJoignable({ phone: "+33687157259" }), null);
  });

  test("un email manifestement faux est refusé, et le dit", () => {
    const m = leadJoignable({ email: "pas-un-email" });
    assert.match(String(m), /email/i);
  });

  test("un numéro trop court ne suffit pas", () => {
    assert.equal(typeof leadJoignable({ phone: "0687" }), "string");
  });

  test("les formulaires réels du site passent tous", () => {
    // Champs relevés un par un dans les composants qui postent sur /api/leads.
    const envois = [
      { firstName: "Marie", lastName: "Durand", email: "m@d.fr", source: "contact-form" },
      { firstName: "Jean", email: "j@x.com", phone: "0612345678", source: "estimation-immobilier" },
      { email: "k@y.fr", source: "guide-defiscalisation", consent: true },
      { firstName: "Luc", email: "l@z.fr", phone: "+33 6 12 34 56 78", source: "simulateur-defiscalisation" },
    ];
    for (const e of envois) assert.equal(leadJoignable(e), null, JSON.stringify(e));
  });

  test("les champs démesurés sont bornés", () => {
    const t = tronqueLead({ message: "x".repeat(9000), firstName: "y".repeat(500), email: "a@b.fr" });
    assert.equal(t.message.length, 5000);
    assert.equal(t.firstName.length, 120);
    assert.equal(t.email, "a@b.fr");
  });

  test("tronqueLead ne touche pas aux champs non textuels", () => {
    const t = tronqueLead({ email: "a@b.fr", meta: { surface: 80 }, consent: true } as any);
    assert.deepEqual((t as any).meta, { surface: 80 });
    assert.equal((t as any).consent, true);
  });
});
