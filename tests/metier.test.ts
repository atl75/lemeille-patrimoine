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
import { adresseInterdite, urlAutorisee } from "../lib/urlSortante.ts";
import { analyserCsvDvf, statistiquesDvf, distanceM, urlDvf } from "../lib/dvf.ts";
import {
  nombreFr, sourceDepuisUrl, prixDepuisTexte, surfaceDepuisTexte, fusionner, extraireReferenceM2,
  piecesDepuisTexte, villeDepuisTexte, extraireDepuisTexte, extraireDepuisHtml,
} from "../lib/annonceConcurrente.ts";
import { needsFollowUp, formatDate } from "../lib/typesLead.ts";
import {
  erreurPrix,
  erreurNetVendeur,
  erreursProprietaires,
  erreursFiche,
} from "../lib/validationBien.ts";
import { leadJoignable, tronqueLead } from "../lib/validationLead.ts";
import {
  prixM2,
  m2Retenu,
  mediane,
  statistiques,
  positionner,
  fourchetteConseillee,
  impactNetVendeur,
  fiabilite,
  comparablesDuPortefeuille,
  type Comparable,
} from "../lib/ajustementPrix.ts";
import {
  PERIODES,
  periodeValide,
  etiquettePoint,
  plageCouverte,
  type ClePeriode,
} from "../lib/periodesAnalytics.ts";
import {
  erreurCommentaire,
  nouveauCommentaire,
  parOrdreAntichronologique,
  LONGUEUR_MAX,
} from "../lib/commentairesLead.ts";

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

describe("commentairesLead — le journal de suivi d'un dossier", () => {
  test("un texte vide ou blanc est refusé", () => {
    for (const v of ["", "   ", "\n\t", null, undefined]) {
      assert.equal(erreurCommentaire(v), "Le commentaire est vide.");
    }
  });

  test("un texte réel passe", () => {
    assert.equal(erreurCommentaire("Rappelé, visite samedi."), null);
  });

  test("le commentaire est horodaté et le texte élagué", () => {
    const avant = Date.now();
    const c = nouveauCommentaire("  Visite faite, offre à venir.  ");
    assert.equal(c.texte, "Visite faite, offre à venir.");
    const t = new Date(c.createdAt).getTime();
    assert.ok(t >= avant && t <= Date.now(), "horodatage dans la fenêtre d'appel");
    assert.match(c.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  test("l'auteur n'est présent que s'il est fourni", () => {
    assert.equal("auteur" in nouveauCommentaire("x"), false);
    assert.equal(nouveauCommentaire("x", "Arthur").auteur, "Arthur");
  });

  test("les identifiants ne collident pas dans la même milliseconde", () => {
    const ids = new Set(Array.from({ length: 500 }, () => nouveauCommentaire("x").id));
    assert.equal(ids.size, 500);
  });

  test("un texte démesuré est borné", () => {
    assert.equal(nouveauCommentaire("z".repeat(9000)).texte.length, LONGUEUR_MAX);
  });

  test("l'affichage va du plus récent au plus ancien", () => {
    const cs = [
      { id: "a", texte: "premier", createdAt: "2026-01-05T09:00:00.000Z" },
      { id: "b", texte: "dernier", createdAt: "2026-03-20T18:30:00.000Z" },
      { id: "c", texte: "milieu", createdAt: "2026-02-11T12:00:00.000Z" },
    ];
    assert.deepEqual(parOrdreAntichronologique(cs).map(c => c.id), ["b", "c", "a"]);
  });

  test("le tri ne modifie pas le tableau reçu, et encaisse le vide", () => {
    const cs = [
      { id: "a", texte: "x", createdAt: "2026-01-05T09:00:00.000Z" },
      { id: "b", texte: "y", createdAt: "2026-03-20T18:30:00.000Z" },
    ];
    parOrdreAntichronologique(cs);
    assert.deepEqual(cs.map(c => c.id), ["a", "b"], "l'ordre d'origine est préservé");
    assert.deepEqual(parOrdreAntichronologique([]), []);
    assert.deepEqual(parOrdreAntichronologique(undefined), []);
  });
});

describe("periodesAnalytics — semaine, mois, année", () => {
  test("les trois fenêtres existent et sont croissantes", () => {
    assert.deepEqual(Object.keys(PERIODES), ["semaine", "mois", "annee"]);
    const jours = (k: ClePeriode) => Number(PERIODES[k].debut.replace(/\D/g, ""));
    assert.ok(jours("semaine") < jours("mois"), "la semaine est plus courte que le mois");
    assert.ok(jours("mois") < jours("annee"), "le mois est plus court que l'année");
  });

  test("l'année s'agrège par mois, les fenêtres courtes par jour", () => {
    assert.equal(PERIODES.semaine.dimension, "date");
    assert.equal(PERIODES.mois.dimension, "date");
    assert.equal(PERIODES.annee.dimension, "yearMonth");
  });

  test("une période inconnue retombe sur le mois, jamais d'erreur", () => {
    for (const v of ["", "trimestre", null, undefined, 42, "../../etc"]) {
      assert.equal(periodeValide(v), "mois");
    }
    assert.equal(periodeValide("SEMAINE"), "semaine", "insensible à la casse");
    assert.equal(periodeValide("annee"), "annee");
  });

  test("étiquettes : un jour se lit JJ/MM, un mois en toutes lettres", () => {
    assert.equal(etiquettePoint("20260908"), "08/09");
    assert.equal(etiquettePoint("202601"), "janv. 2026");
    assert.equal(etiquettePoint("202612"), "déc. 2026");
    assert.equal(etiquettePoint("bizarre"), "bizarre");
  });

  test("la plage couverte annonce les bornes réelles des données reçues", () => {
    const pts = [{ date: "20260906" }, { date: "20260904" }, { date: "20260908" }];
    assert.equal(plageCouverte(pts), "04/09 → 08/09");
    assert.equal(plageCouverte([{ date: "20260904" }]), "04/09", "un seul point : pas de flèche");
    assert.equal(plageCouverte([]), null);
  });
});

describe("ajustementPrix — situer un bien face à ses concurrents", () => {
  const c = (id: string, prix: number, surface: number, extra: Partial<Comparable> = {}): Comparable =>
    ({ id, titre: id, prix, surface, ...extra });

  test("prix au m² : refuse ce qui n'a pas de sens", () => {
    assert.equal(prixM2(300000, 100), 3000);
    assert.equal(prixM2(300000, 0), null);
    assert.equal(prixM2(0, 100), null);
    assert.equal(prixM2(null, 100), null);
    assert.equal(prixM2(300000, undefined), null);
  });

  test("le prix de VENTE prime sur le prix affiché", () => {
    assert.equal(m2Retenu(c("a", 300000, 100)), 3000);
    assert.equal(m2Retenu(c("b", 300000, 100, { prixVente: 270000 })), 2700);
  });

  test("médiane, y compris sur un effectif pair", () => {
    assert.equal(mediane([3, 1, 2]), 2);
    assert.equal(mediane([4, 1, 2, 3]), 2.5);
    assert.equal(mediane([]), null);
  });

  test("l'écart au marché est chiffré en pourcentage ET en euros", () => {
    const bien = { price: 400000, surface: 100 }; // 4 000 €/m²
    const comps = [c("a", 300000, 100), c("b", 320000, 100), c("c", 340000, 100)]; // médiane 3 200
    const p = positionner(bien, comps)!;
    assert.equal(p.prixM2Bien, 4000);
    assert.equal(p.stats.medianeM2, 3200);
    assert.equal(Math.round(p.ecartPourcent), 25);
    assert.equal(p.ecartEuros, 80000);
    assert.equal(p.prixAligne, 320000);
    assert.equal(p.moinsChers, 3, "les trois concurrents sont moins chers au m²");
  });

  test("sans comparable exploitable, on n'affiche rien plutôt qu'un chiffre creux", () => {
    assert.equal(positionner({ price: 400000, surface: 100 }, []), null);
    assert.equal(positionner({ price: 400000, surface: 0 }, [c("a", 300000, 100)]), null);
    assert.equal(statistiques([c("a", 0, 0)]), null);
  });

  test("la fourchette va du premier quartile à la médiane", () => {
    const comps = [c("a", 200000, 100), c("b", 300000, 100), c("c", 400000, 100), c("d", 500000, 100)];
    const f = fourchetteConseillee({ surface: 100 }, comps)!;
    assert.equal(f.haut, 350000, "médiane des 4 : 3 500 €/m²");
    assert.equal(f.bas, 250000, "premier quartile : 2 500 €/m²");
    assert.ok(f.bas < f.haut);
  });

  test("le net vendeur baisse du montant de la baisse, honoraires préservés", () => {
    const i = impactNetVendeur({ price: 300000, netSellerAmount: 285000 }, 280000)!;
    assert.equal(i.honoraires, 15000);
    assert.equal(i.netActuel, 285000);
    assert.equal(i.netNouveau, 265000);
    assert.equal(i.perte, 20000, "20 000 € de baisse affichée = 20 000 € de net en moins");
  });

  test("sans net vendeur renseigné, le prix affiché en tient lieu", () => {
    const i = impactNetVendeur({ price: 300000 }, 280000)!;
    assert.equal(i.honoraires, 0);
    assert.equal(i.netNouveau, 280000);
  });

  test("la fiabilité suit l'effectif", () => {
    const stats = (n: number) => statistiques(Array.from({ length: n }, (_, i) => c(String(i), 300000, 100)));
    assert.equal(fiabilite(stats(2)), "faible");
    assert.equal(fiabilite(stats(4)), "moyenne");
    assert.equal(fiabilite(stats(8)), "bonne");
    assert.equal(fiabilite(null), null);
  });

  test("les comparables du portefeuille : même type, même ville, surface proche", () => {
    const tous = [
      { id: "moi", type: "APPARTEMENT", city: "Rouen", surface: 100, price: 400000 },
      { id: "ok", type: "APPARTEMENT", city: "Rouen", surface: 90, price: 300000 },
      { id: "autre-ville", type: "APPARTEMENT", city: "Paris", surface: 100, price: 900000 },
      { id: "autre-type", type: "MAISON", city: "Rouen", surface: 100, price: 350000 },
      { id: "trop-petit", type: "APPARTEMENT", city: "Rouen", surface: 40, price: 150000 },
      { id: "vendu", type: "APPARTEMENT", city: "rouen", surface: 105, price: 320000, status: "SOLD" },
    ];
    const cs = comparablesDuPortefeuille(tous[0], tous);
    assert.deepEqual(cs.map(x => x.id).sort(), ["ok", "vendu"]);
    assert.equal(cs.find(x => x.id === "vendu")!.statut, "VENDU", "casse de la ville ignorée");
    assert.equal(cs.find(x => x.id === "ok")!.statut, "EN_VENTE");
  });
});

describe("annonceConcurrente — lire une annonce sans se faire piéger", () => {
  test("nombres à la française, y compris la fine insécable de toLocaleString", () => {
    assert.equal(nombreFr("249 900"), 249900);
    assert.equal(nombreFr("249 900"), 249900);
    assert.equal(nombreFr("249 900"), 249900);   // celle que produit fr-FR
    assert.equal(nombreFr("1 250 000"), 1250000);
    assert.equal(nombreFr("249.900"), 249900);        // point = séparateur de milliers
    assert.equal(nombreFr("65,5"), 65.5);             // virgule = décimale
    assert.equal(nombreFr((249900).toLocaleString("fr-FR")), 249900);
  });

  test("la source se déduit du domaine", () => {
    assert.equal(sourceDepuisUrl("https://www.seloger.com/annonces/1.htm"), "SeLoger");
    assert.equal(sourceDepuisUrl("https://www.leboncoin.fr/ad/2"), "LeBonCoin");
    assert.equal(sourceDepuisUrl("https://www.bienici.com/a/3"), "Bien'ici");
    assert.equal(sourceDepuisUrl("https://immo-durand.fr/bien/4"), "immo-durand.fr");
    assert.equal(sourceDepuisUrl("pas une url"), undefined);
  });

  test("PRIX : les charges et la taxe foncière ne sont pas un prix de vente", () => {
    const t = "Appartement T3. Prix : 249 900 € FAI. Charges 120 €/mois. Taxe foncière 1 240 €.";
    assert.equal(prixDepuisTexte(t)?.valeur, 249900);
  });

  test("PRIX : un loyer mensuel n'est jamais retenu", () => {
    assert.equal(prixDepuisTexte("Loyer 850 €/mois, charges comprises."), null);
  });

  test("PRIX : « à partir de » d'un programme neuf est écarté", () => {
    assert.equal(prixDepuisTexte("Programme neuf, à partir de 189 000 €."), null);
  });

  test("PRIX : sous 10 000 €, ce n'est pas un bien", () => {
    assert.equal(prixDepuisTexte("Honoraires 5 000 € à la charge du vendeur."), null);
  });

  test("PRIX : le montant qualifié l'emporte sur le plus gros montant", () => {
    // Le budget travaux est plus élevé, mais c'est « Prix » qui désigne la vente.
    const t = "Prix 180 000 €. Enveloppe de travaux estimée à 250 000 € par l'architecte.";
    assert.equal(prixDepuisTexte(t)?.valeur, 180000);
  });

  test("SURFACE : le terrain n'est pas la surface habitable", () => {
    const t = "Maison de 95 m² sur un terrain de 620 m².";
    assert.equal(surfaceDepuisTexte(t)?.valeur, 95);
  });

  test("SURFACE : un prix au m² n'est pas une surface", () => {
    assert.equal(surfaceDepuisTexte("Quartier coté à 3 500 €/m²."), null);
  });

  test("SURFACE : loi Carrez avec décimale", () => {
    assert.equal(surfaceDepuisTexte("Surface habitable Loi Carrez : 64,20 m²")?.valeur, 64.2);
  });

  test("SURFACE : le balcon et la cave ne comptent pas", () => {
    const t = "Surface habitable 72 m², balcon de 9 m², cave de 6 m².";
    assert.equal(surfaceDepuisTexte(t)?.valeur, 72);
  });

  test("PIÈCES : T3, F3, « 3 pièces » et studio", () => {
    assert.equal(piecesDepuisTexte("Appartement T3"), 3);
    assert.equal(piecesDepuisTexte("Beau F4 rénové"), 4);
    assert.equal(piecesDepuisTexte("Logement de 5 pièces"), 5);
    assert.equal(piecesDepuisTexte("Studio meublé"), 1);
  });

  test("VILLE : ancrée par le code postal, dans les deux ordres", () => {
    assert.equal(villeDepuisTexte("Bien situé 76000 Rouen, proche gare"), "Rouen");
    assert.equal(villeDepuisTexte("À vendre à Mont-Saint-Aignan (76130)"), "Mont-Saint-Aignan");
    assert.equal(villeDepuisTexte("Aucun code postal ici"), null);
  });

  test("une annonce complète collée depuis le navigateur", () => {
    const colle = `
      Appartement 3 pièces 65 m² — 76000 Rouen
      Prix : 249 900 € FAI (honoraires inclus)
      Charges de copropriété : 145 €/mois
      Taxe foncière : 1 180 €
      DPE : D (180 kWh/m²/an) — GES : 25 kg CO2/m²/an
      Cave de 8 m² et place de parking.
    `;
    const { champs, provenance } = extraireDepuisTexte(colle);
    assert.equal(champs.prix, 249900);
    assert.equal(champs.surface, 65);
    assert.equal(champs.pieces, 3);
    assert.equal(champs.ville, "Rouen");
    assert.equal(champs.titre, "Appartement 3 pièces 65 m² — Rouen");
    assert.ok(provenance.prix?.includes("249"), "la provenance cite le montant trouvé");
  });

  test("le prix de vente signé n'est JAMAIS extrait", () => {
    // Il déclenche le statut VENDU et c'est l'argument le plus fort : il se
    // saisit à la main, en conscience.
    const { champs } = extraireDepuisTexte("Vendu 232 000 € le mois dernier, affiché 249 900 €.");
    assert.equal("prixVente" in champs, false);
  });

  test("HTML : le balisage schema.org prime sur le texte visible", () => {
    const html = `<html><head>
      <meta property="og:title" content="T3 de 65 m² — Rouen centre">
      <script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"BreadcrumbList","itemListElement":[]},
        {"@type":"Product","offers":{"@type":"Offer","price":"249900","priceCurrency":"EUR"}}
      ]}
      </script>
      <script type="application/ld+json">
      {"@type":"RealEstateListing","floorSize":{"value":65},"numberOfRooms":3,
       "address":{"addressLocality":"Rouen","postalCode":"76000"}}
      </script>
      </head><body>
      <h1>Appartement 3 pièces</h1>
      <p>Charges 120 €/mois — terrain de 400 m²</p>
      </body></html>`;
    const { champs, provenance } = extraireDepuisHtml(html, "https://www.seloger.com/annonces/1.htm");
    assert.equal(champs.prix, 249900);
    assert.equal(champs.surface, 65);
    assert.equal(champs.pieces, 3);
    assert.equal(champs.ville, "Rouen");
    assert.equal(champs.source, "SeLoger");
    assert.equal(champs.lien, "https://www.seloger.com/annonces/1.htm");
    assert.equal(provenance.prix, "balisage schema.org");
  });

  test("titre d'impression SeLoger : le « 2 » de m² ne se colle pas au prix", () => {
    // Cas réel. Après NFKC « m² » devient « m2 » ; sans regard en arrière,
    // « 56.59 m2 735000 € » se lisait « 2 735000 € » — un prix multiplié par
    // 3,7 dans un document remis au vendeur.
    const titre = "Appartement à vendre T3-F3 56.59 m² 735000 € Montmartre Paris (75018)";
    const { champs } = extraireDepuisTexte(titre);
    assert.equal(champs.prix, 735000);
    assert.equal(champs.surface, 56.59);
    assert.equal(champs.pieces, 3);
    assert.equal(champs.ville, "Paris");
  });

  test("impression PDF : le titre l'emporte sur les « biens similaires »", () => {
    // Une impression d'annonce fait quinze pages et embarque des biens
    // voisins, souvent plus grands. Le corps seul retenait leur surface.
    const titre = "Appartement à vendre T3-F3 56.59 m² 735000 € Montmartre Paris (75018)";
    const corps = `Appartement 3 pieces 56,59 m2 Montmartre
      Prix 735 000 EUR honoraires inclus
      Biens similaires
      Appartement 4 pieces 88 m2 - 1 190 000 EUR`;
    assert.equal(extraireDepuisTexte(corps).champs.surface, 88, "le corps seul se trompe");
    const { champs } = fusionner(extraireDepuisTexte(titre), extraireDepuisTexte(corps));
    assert.equal(champs.surface, 56.59, "le titre rétablit la bonne surface");
    assert.equal(champs.prix, 735000);
  });

  test("prix de référence au m² : le quartier, pas les honoraires", () => {
    const page = `Prix immobilier Rouen Centre
      Prix m² moyen appartement : 3 245 €/m²
      Fourchette : de 2 890 €/m² à 3 780 €/m²
      Évolution sur un an : +2,1 %
      Honoraires de l'agence : 4 % du prix de vente
      Un bien en vitrine : 249 000 €`;
    const r = extraireReferenceM2(page)!;
    assert.equal(r.m2, 3245);
    assert.equal(r.bas, 2890);
    assert.equal(r.haut, 3780);
  });

  test("prix de référence : rien plutôt qu'un chiffre au hasard", () => {
    assert.equal(extraireReferenceM2("Page sans le moindre prix au mètre carré."), null);
    // 12 €/m² de charges annuelles n'est pas un prix de marché.
    assert.equal(extraireReferenceM2("Charges : 12 €/m² par an"), null);
  });

  test("HTML : le prix d'une PAGE DE RÉSULTATS n'est pas celui d'un bien", () => {
    // Mesuré chez ParuVendu et sur les listes SeLoger : le JSON-LD d'une page
    // de recherche déclare un AggregateOffer couvrant tout le catalogue. Le
    // prendre pour un prix déplacerait la médiane sans le moindre bruit.
    const html = `<html><head>
      <script type="application/ld+json">
      {"@type":"Product","offers":{"@type":"AggregateOffer","offerCount":32793,
       "lowPrice":900,"highPrice":75000000,"priceCurrency":"EUR"}}
      </script></head><body><h1>32 793 annonces</h1></body></html>`;
    const { champs } = extraireDepuisHtml(html, "https://www.seloger.com/list.htm");
    assert.equal(champs.prix, undefined);
  });

  test("les unités et espaces exotiques passent par NFKC", () => {
    // ㎡ (U+33A1), fine insécable U+202F, espace idéographique U+3000.
    const { champs } = extraireDepuisTexte(
      "Appartement 76000 Rouen 72 \u33a1 Prix : 249\u202f900 \u20ac");
    assert.equal(champs.surface, 72);
    assert.equal(champs.prix, 249900);
    assert.equal(champs.ville, "Rouen");
  });

  test("HTML : une balise JSON-LD cassée ne fait pas tomber l'analyse", () => {
    const html = `<html><head>
      <script type="application/ld+json">{ ceci n'est pas du JSON }</script>
      </head><body><h1>Maison 120 m²</h1><p>Prix 349 000 €</p></body></html>`;
    const { champs } = extraireDepuisHtml(html, "https://immo-durand.fr/b/1");
    assert.equal(champs.prix, 349000);
    assert.equal(champs.surface, 120);
    assert.equal(champs.source, "immo-durand.fr");
  });

  test("HTML : le pied de page ne dicte pas la ville du bien", () => {
    // Constaté en conditions réelles : la ville sortait du pied de page
    // (« Siège social … 76000 Rouen ») pour une annonce parisienne. Sur une
    // annonce concurrente, ce serait la ville de l'agence adverse.
    const html = `<html><body>
      <main><h1>Appartement T2</h1><p>75018 Paris — 59 m² — 699 000 €</p></main>
      <footer><p>Siège social : 12 rue des Carmes, 76000 Rouen</p></footer>
      </body></html>`;
    const { champs } = extraireDepuisHtml(html, "https://agence-x.fr/b/1");
    assert.equal(champs.ville, "Paris");
    assert.equal(champs.prix, 699000);
    assert.equal(champs.surface, 59);
  });

  test("HTML : une coquille JavaScript vide ne propose rien plutôt qu'inventer", () => {
    // Bien'ici sert exactement cela : 200 OK, aucun prix, aucune surface.
    const { champs } = extraireDepuisHtml(
      "<html><head><title>Annonce</title></head><body><div id=app></div></body></html>",
      "https://www.bienici.com/a/1");
    assert.equal(champs.prix, undefined);
    assert.equal(champs.surface, undefined);
    assert.equal(champs.source, "Bien'ici");  // le lien sert quand même à quelque chose
  });
});

describe("urlSortante — ne pas devenir un proxy vers l'intérieur", () => {
  test("le serveur de métadonnées Cloud Run est refusé", () => {
    // La cible d'un SSRF sur Cloud Run : il délivre des jetons d'identité
    // de service, et l'instance tourne sans connecteur VPC.
    assert.equal(adresseInterdite("169.254.169.254"), true);
  });

  test("boucle locale et réseaux privés refusés", () => {
    for (const ip of ["127.0.0.1", "127.1.2.3", "10.0.0.1", "10.255.255.254",
                      "192.168.1.1", "172.16.0.1", "172.31.255.255",
                      "100.64.0.1", "0.0.0.0", "224.0.0.1"]) {
      assert.equal(adresseInterdite(ip), true, `${ip} devrait être refusée`);
    }
  });

  test("les bornes de plages sont justes : ce qui est dehors passe", () => {
    // 172.16/12 va de 172.16 à 172.31 : 172.15 et 172.32 sont publiques.
    assert.equal(adresseInterdite("172.15.0.1"), false);
    assert.equal(adresseInterdite("172.32.0.1"), false);
    assert.equal(adresseInterdite("100.63.255.255"), false); // hors CGNAT
    assert.equal(adresseInterdite("11.0.0.1"), false);
    assert.equal(adresseInterdite("8.8.8.8"), false);
    assert.equal(adresseInterdite("1.1.1.1"), false);
  });

  test("IPv6 : boucle locale, uniques locales, lien-local", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1"]) {
      assert.equal(adresseInterdite(ip), true, `${ip} devrait être refusée`);
    }
    assert.equal(adresseInterdite("2001:4860:4860::8888"), false); // Google DNS
  });

  test("IPv4 mappée en IPv6, sous TOUTES ses écritures", () => {
    // Le piège : new URL() CANONISE l'adresse. « [::ffff:169.254.169.254] »
    // devient « [::ffff:a9fe:a9fe] ». Un contrôle écrit pour la seule notation
    // pointée laissait donc repasser le serveur de métadonnées — trou constaté
    // en essai de bout en bout, pas par ce test, qui ne l'aurait pas vu.
    assert.equal(adresseInterdite("::ffff:127.0.0.1"), true);
    assert.equal(adresseInterdite("::ffff:7f00:1"), true);        // forme canonisée
    assert.equal(adresseInterdite("::ffff:169.254.169.254"), true);
    assert.equal(adresseInterdite("::ffff:a9fe:a9fe"), true);     // forme canonisée
    assert.equal(adresseInterdite("::ffff:8.8.8.8"), false);
    assert.equal(adresseInterdite("::ffff:808:808"), false);      // 8.8.8.8 canonisé
  });

  test("ce que new URL() rend vraiment, c'est cela qu'on doit refuser", () => {
    // On interroge le garde avec la chaîne que l'URL produit réellement.
    for (const brut of ["http://[::ffff:127.0.0.1]/",
                        "http://[::ffff:169.254.169.254]/",
                        "http://0177.0.0.1/",        // octal
                        "http://2130706433/"]) {     // entier
      const hote = new URL(brut).hostname.replace(/^\[|\]$/g, "");
      assert.equal(adresseInterdite(hote), true, `${brut} → ${hote} devrait être refusée`);
    }
  });

  test("ce qui n'est pas une adresse IP est refusé par défaut", () => {
    assert.equal(adresseInterdite("pas une ip"), true);
    assert.equal(adresseInterdite(""), true);
  });

  test("seuls http et https sont acceptés", async () => {
    for (const u of ["file:///etc/passwd", "ftp://x.fr/a", "gopher://x.fr",
                     "data:text/html,<b>x", "javascript:alert(1)"]) {
      const v = await urlAutorisee(u);
      assert.equal(v.ok, false, `${u} devrait être refusée`);
    }
  });

  test("une IP interne écrite en clair dans l'URL est refusée sans résolution", async () => {
    const v = await urlAutorisee("http://169.254.169.254/computeMetadata/v1/");
    assert.equal(v.ok, false);
    assert.match((v as any).raison, /interne/);
  });

  test("une URL malformée est refusée proprement", async () => {
    const v = await urlAutorisee("pas du tout une url");
    assert.equal(v.ok, false);
  });
});

describe("dvf — les ventes signées, sans se laisser abuser par les actes groupés", () => {
  const ENTETES = "id_mutation,date_mutation,numero_disposition,nature_mutation,valeur_fonciere," +
    "adresse_numero,adresse_suffixe,adresse_nom_voie,adresse_code_voie,code_postal,code_commune," +
    "nom_commune,code_departement,ancien_code_commune,ancien_nom_commune,id_parcelle," +
    "ancien_id_parcelle,numero_volume,lot1_numero,lot1_surface_carrez,lot2_numero,lot2_surface_carrez," +
    "lot3_numero,lot3_surface_carrez,lot4_numero,lot4_surface_carrez,lot5_numero,lot5_surface_carrez," +
    "nombre_lots,code_type_local,type_local,surface_reelle_bati,nombre_pieces_principales," +
    "code_nature_culture,nature_culture,code_nature_culture_speciale,nature_culture_speciale," +
    "surface_terrain,longitude,latitude";

  // Fabrique une ligne au bon gabarit : 40 colonnes.
  const ligne = (o: Record<string, string | number>) => {
    const cols = ENTETES.split(",");
    const v = new Array(cols.length).fill("");
    for (const [k, val] of Object.entries(o)) v[cols.indexOf(k)] = String(val);
    return v.join(",");
  };
  const CENTRE = { lat: 49.4417, lon: 1.0945 };
  const base = { nature_mutation: "Vente", longitude: 1.0945, latitude: 49.4417 };

  test("une vente simple est retenue, avec son prix au m²", () => {
    const csv = [ENTETES, ligne({ ...base, id_mutation: "M1", date_mutation: "2024-03-01",
      valeur_fonciere: 270000, type_local: "Appartement", surface_reelle_bati: 81,
      nombre_pieces_principales: 3, adresse_numero: 32, adresse_nom_voie: "RUE DES CARMES" })].join("\n");
    const v = analyserCsvDvf(csv, { ...CENTRE, rayon: 300 });
    assert.equal(v.length, 1);
    assert.equal(v[0].prix, 270000);
    assert.equal(v[0].surface, 81);
    assert.equal(Math.round(v[0].prixM2), 3333);
    assert.equal(v[0].adresse, "32 RUE DES CARMES");
  });

  test("les dépendances du même acte ne comptent pas comme des biens", () => {
    // Cas mesuré à Rouen : 315 000 € pour un appartement PLUS deux dépendances.
    // Le prix les inclut, la division par la surface du logement reste juste.
    const csv = [ENTETES,
      ligne({ ...base, id_mutation: "M2", valeur_fonciere: 315000, type_local: "Appartement",
              surface_reelle_bati: 72, date_mutation: "2024-05-02" }),
      ligne({ ...base, id_mutation: "M2", valeur_fonciere: 315000, type_local: "Dépendance" }),
      ligne({ ...base, id_mutation: "M2", valeur_fonciere: 315000, type_local: "Dépendance" }),
    ].join("\n");
    const v = analyserCsvDvf(csv, { ...CENTRE, rayon: 300 });
    assert.equal(v.length, 1, "un seul bien, pas trois");
    assert.equal(Math.round(v[0].prixM2), 4375);
  });

  test("UN ACTE À PLUSIEURS LOGEMENTS EST ÉCARTÉ — le piège le plus coûteux", () => {
    // valeur_fonciere est le prix de TOUTE la mutation, répété sur chaque
    // ligne. Un immeuble vendu d'un bloc donnerait ici 900 000 € / 40 m²,
    // soit 22 500 €/m² à Rouen : un chiffre absurde qui ruinerait
    // l'argumentaire remis au vendeur.
    const csv = [ENTETES,
      ligne({ ...base, id_mutation: "M3", valeur_fonciere: 900000, type_local: "Appartement", surface_reelle_bati: 40 }),
      ligne({ ...base, id_mutation: "M3", valeur_fonciere: 900000, type_local: "Appartement", surface_reelle_bati: 45 }),
      ligne({ ...base, id_mutation: "M3", valeur_fonciere: 900000, type_local: "Appartement", surface_reelle_bati: 38 }),
    ].join("\n");
    assert.deepEqual(analyserCsvDvf(csv, { ...CENTRE, rayon: 300 }), []);
  });

  test("un local commercial dans le même acte rend le prix mixte : écarté", () => {
    const csv = [ENTETES,
      ligne({ ...base, id_mutation: "M4", valeur_fonciere: 600000, type_local: "Appartement", surface_reelle_bati: 90 }),
      ligne({ ...base, id_mutation: "M4", valeur_fonciere: 600000, type_local: "Local industriel. commercial ou assimilé", surface_reelle_bati: 120 }),
    ].join("\n");
    assert.deepEqual(analyserCsvDvf(csv, { ...CENTRE, rayon: 300 }), []);
  });

  test("ce qui n'est pas une vente est écarté", () => {
    const csv = [ENTETES, ligne({ ...base, nature_mutation: "Echange", id_mutation: "M5",
      valeur_fonciere: 200000, type_local: "Appartement", surface_reelle_bati: 60 })].join("\n");
    assert.deepEqual(analyserCsvDvf(csv, { ...CENTRE, rayon: 300 }), []);
  });

  test("les valeurs aberrantes sont écartées", () => {
    const csv = [ENTETES,
      ligne({ ...base, id_mutation: "A", valeur_fonciere: 1, type_local: "Appartement", surface_reelle_bati: 60 }),
      ligne({ ...base, id_mutation: "B", valeur_fonciere: 5000000, type_local: "Appartement", surface_reelle_bati: 12 }),
      ligne({ ...base, id_mutation: "C", valeur_fonciere: 200000, type_local: "Appartement", surface_reelle_bati: 2 }),
    ].join("\n");
    assert.deepEqual(analyserCsvDvf(csv, { ...CENTRE, rayon: 300 }), []);
  });

  test("le rayon et le type filtrent réellement", () => {
    const csv = [ENTETES,
      ligne({ ...base, id_mutation: "P", valeur_fonciere: 270000, type_local: "Appartement", surface_reelle_bati: 81 }),
      ligne({ ...base, id_mutation: "L", valeur_fonciere: 300000, type_local: "Appartement",
              surface_reelle_bati: 81, latitude: 49.4600, longitude: 1.0945 }),   // ~2 km
      ligne({ ...base, id_mutation: "MA", valeur_fonciere: 400000, type_local: "Maison", surface_reelle_bati: 120 }),
    ].join("\n");
    assert.equal(analyserCsvDvf(csv, { ...CENTRE, rayon: 300 }).length, 2, "le lointain sort");
    assert.equal(analyserCsvDvf(csv, { ...CENTRE, rayon: 300, type: "Appartement" }).length, 1);
    assert.equal(analyserCsvDvf(csv, { ...CENTRE, rayon: 5000 }).length, 3);
  });

  test("la tolérance de surface écarte ce qui n'est pas comparable", () => {
    const csv = [ENTETES,
      ligne({ ...base, id_mutation: "S1", valeur_fonciere: 270000, type_local: "Appartement", surface_reelle_bati: 81 }),
      ligne({ ...base, id_mutation: "S2", valeur_fonciere: 600000, type_local: "Appartement", surface_reelle_bati: 200 }),
    ].join("\n");
    const v = analyserCsvDvf(csv, { ...CENTRE, rayon: 300, surfaceRef: 80, toleranceSurface: 0.4 });
    assert.equal(v.length, 1);
    assert.equal(v[0].surface, 81);
  });

  test("statistiques : médiane et quartiles", () => {
    const faux = [1000, 2000, 3000, 4000, 5000].map((m, i) => ({
      id: `x${i}`, date: `2024-0${i + 1}-01`, type: "Appartement" as const,
      prix: m * 50, surface: 50, prixM2: m, pieces: null, adresse: "", distance: 10,
    }));
    const s = statistiquesDvf(faux)!;
    assert.equal(s.nombre, 5);
    assert.equal(s.medianeM2, 3000);
    assert.equal(s.q1M2, 2000);
    assert.equal(s.q3M2, 4000);
    assert.equal(s.derniereVente, "2024-05-01");
    assert.equal(statistiquesDvf([]), null);
  });

  test("distance : un ordre de grandeur juste", () => {
    // Un centième de degré de latitude vaut environ 1,11 km.
    assert.ok(Math.abs(distanceM(49.44, 1.09, 49.45, 1.09) - 1113) < 20);
    assert.equal(Math.round(distanceM(49.44, 1.09, 49.44, 1.09)), 0);
  });

  test("URL officielle, département sur deux chiffres — trois en outre-mer", () => {
    assert.equal(urlDvf("76540", 2024),
      "https://files.data.gouv.fr/geo-dvf/latest/csv/2024/communes/76/76540.csv");
    assert.equal(urlDvf("75118", 2023),
      "https://files.data.gouv.fr/geo-dvf/latest/csv/2023/communes/75/75118.csv");
    assert.ok(urlDvf("97411", 2024).includes("/communes/974/97411.csv"));
  });
});
