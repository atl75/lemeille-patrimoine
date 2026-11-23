/**
 * Couche de données — le code le plus dangereux du projet.
 *
 * Node 24 exécute le TypeScript nativement : aucun lanceur, aucune dépendance.
 *   npm test
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { COLLECTIONS_PROTEGEES, CollectionAbsente } from '../lib/missingCollection.ts';

// DATA_DIR est calculé à l'import à partir de process.cwd() : il faut donc se
// placer dans un dossier jetable AVANT de charger le module.
const ancienCwd = process.cwd();
let bac: string;
let utils: typeof import("../lib/utils.ts");

before(async () => {
  bac = await fs.mkdtemp(path.join(os.tmpdir(), "lp-tests-"));
  await fs.mkdir(path.join(bac, "data"), { recursive: true });
  process.chdir(bac);
  utils = await import("../lib/utils.ts");
});

after(async () => {
  process.chdir(ancienCwd);
  await fs.rm(bac, { recursive: true, force: true });
});

describe("updateJSON — écritures concurrentes", () => {
  test("50 ajouts en parallèle : aucun perdu", async () => {
    await fs.writeFile(path.join(bac, "data", "t1.json"), "[]");
    const N = 50;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        utils.updateJSON("t1.json", (d: any[]) => {
          d.push({ id: i });
          return d;
        })
      )
    );
    const final = await utils.readJSON("t1.json");
    assert.equal(final.length, N, `${N - final.length} enregistrement(s) perdu(s)`);
    assert.deepEqual(
      final.map((x: any) => x.id).sort((a: number, b: number) => a - b),
      Array.from({ length: N }, (_, i) => i)
    );
  });

  test("l'ancien motif readJSON puis writeJSON perd bien des données", async () => {
    // Ce test documente POURQUOI updateJSON existe. S'il se met à passer,
    // c'est que quelque chose a changé dans les hypothèses du modèle.
    await fs.writeFile(path.join(bac, "data", "t2.json"), "[]");
    const N = 50;
    await Promise.all(
      Array.from({ length: N }, async (_, i) => {
        const d = await utils.readJSON("t2.json");
        d.push({ id: i });
        await utils.writeJSON("t2.json", d);
      })
    );
    const final = await utils.readJSON("t2.json");
    assert.ok(
      final.length < N,
      "le motif non verrouillé devrait perdre des enregistrements ; s'il n'en perd plus, revoir ce test"
    );
  });

  test("SANS_ECRITURE laisse le fichier intact", async () => {
    const chemin = path.join(bac, "data", "t3.json");
    await fs.writeFile(chemin, '[{"garde":1}]');
    const avant = await fs.stat(chemin);
    const r = await utils.updateJSON("t3.json", () => utils.SANS_ECRITURE);
    assert.equal(r, utils.SANS_ECRITURE);
    const apres = await fs.stat(chemin);
    assert.equal(apres.size, avant.size);
    assert.deepEqual(await utils.readJSON("t3.json"), [{ garde: 1 }]);
  });

  test("un fichier absent est lu comme un tableau vide", async () => {
    assert.deepEqual(await utils.readJSON("jamais-cree.json"), []);
  });

  test('collections protégées absentes : lecture et mutation refusées, aucun fichier créé', async () => {
    for (const file of COLLECTIONS_PROTEGEES) {
      await assert.rejects(utils.readJSON(file), CollectionAbsente);
      await assert.rejects(utils.updateJSON(file, () => assert.fail('mutation interdite')), CollectionAbsente);
      await assert.rejects(fs.stat(path.join(bac, 'data', file)), { code: 'ENOENT' });
    }
  });

  test('collection protégée restaurée : reprise sans redémarrage ni perte de son historique', async () => {
    const file = path.join(bac, 'data', 'leads.json');
    await fs.writeFile(file, '[{"id":"historique-fictif"}]');
    await utils.updateJSON('leads.json', rows => { rows.push({ id: 'nouveau-fictif' }); });
    assert.deepEqual(await utils.readJSON('leads.json'), [{ id: 'historique-fictif' }, { id: 'nouveau-fictif' }]);
  });

  test("un JSON illisible bloque la lecture et toute mutation", async () => {
    await fs.writeFile(path.join(bac, "data", "t4.json"), "{ceci n'est pas du json");
    await assert.rejects(utils.readJSON("t4.json"), SyntaxError);
    let called = false;
    await assert.rejects(utils.updateJSON("t4.json", () => { called = true; }), SyntaxError);
    assert.equal(called, false);
    assert.equal(await fs.readFile(path.join(bac, 'data', 't4.json'), 'utf8'), "{ceci n'est pas du json");
  });

  test("un fichier vide n'est pas une collection vide", async () => {
    await fs.writeFile(path.join(bac, 'data', 'empty.json'), '');
    await assert.rejects(utils.updateJSON('empty.json', data => data.push({ id: 1 })), SyntaxError);
    assert.equal(await fs.readFile(path.join(bac, 'data', 'empty.json'), 'utf8'), '');
  });

  test("un objet ne peut pas être écrasé par une mutation de collection", async () => {
    await fs.writeFile(path.join(bac, 'data', 'config.json'), '{"key":"preserve"}');
    await assert.rejects(utils.updateJSON('config.json', () => []), /Collection attendue/);
    assert.deepEqual(await utils.readJSON('config.json'), { key: 'preserve' });
  });

  test("une erreur de lecture autre que ENOENT est propagée", async () => {
    await fs.mkdir(path.join(bac, 'data', 'directory.json'));
    await assert.rejects(utils.readJSON('directory.json'), { code: 'EISDIR' });
  });

  test("une mutation rejetée ne bloque pas les écritures suivantes", async () => {
    await fs.writeFile(path.join(bac, 'data', 'retry.json'), '[]');
    await assert.rejects(utils.updateJSON('retry.json', () => { throw new Error('test'); }), /test/);
    await utils.updateJSON('retry.json', data => { data.push({ id: 1 }); });
    assert.deepEqual(await utils.readJSON('retry.json'), [{ id: 1 }]);
  });
});

describe("uid — jetons de signature", () => {
  test("24 caractères hexadécimaux, préfixe respecté", () => {
    const u = utils.uid();
    assert.match(u, /^[0-9a-f]{24}$/);
    assert.match(utils.uid("doc"), /^doc[0-9a-f]{24}$/);
  });

  test("1000 tirages, aucune collision", () => {
    const vus = new Set(Array.from({ length: 1000 }, () => utils.uid()));
    assert.equal(vus.size, 1000);
  });
});

describe("getVideoInfo", () => {
  const cas: [string, { provider: string; id: string } | null][] = [
    ["https://www.youtube.com/watch?v=abc123", { provider: "youtube", id: "abc123" }],
    ["https://youtu.be/xyz789", { provider: "youtube", id: "xyz789" }],
    ["https://vimeo.com/123456", { provider: "vimeo", id: "123456" }],
    ["https://exemple.fr/video.mp4", null],
    ["pas une url", null],
  ];
  for (const [url, attendu] of cas) {
    test(url.slice(0, 42), () => assert.deepEqual(utils.getVideoInfo(url), attendu));
  }

  test("l'URL d'intégration YouTube passe par le domaine sans cookie", () => {
    assert.ok(utils.getVideoEmbedUrl("https://youtu.be/x")?.includes("youtube-nocookie.com"));
  });
});

describe("isolation : la couche GCS ne doit JAMAIS s'activer sous test", () => {
  // Le 3 septembre au matin, la suite a écrit un fichier d'essai dans le bucket
  // de PRODUCTION : les tests tournaient dans Cloud Build, qui est un
  // environnement GCP, et le garde-fou reposait sur NODE_ENV — que
  // « node --test » ne pose pas. Ce test verrouille la correction.
  test("le lanceur de tests est reconnu par lui-même", () => {
    assert.ok(
      process.env.NODE_TEST_CONTEXT,
      "NODE_TEST_CONTEXT devrait être posé par node --test ; sans lui, le garde-fou retombe sur une variable qu'on peut oublier"
    );
  });

  test("disponible() renvoie faux, quel que soit l'environnement", async () => {
    const gcs = await import("../lib/gcsStore.ts");
    assert.equal(
      await gcs.disponible(),
      false,
      "la couche GCS s'activerait sous test — elle écrirait dans le bucket de production"
    );
  });

  test("lireJSON et ecrireJSON refusent d'agir", async () => {
    const gcs = await import("../lib/gcsStore.ts");
    assert.equal(await gcs.lireJSON("properties.json"), null);
    assert.equal(await gcs.ecrireJSON("properties.json", []), false);
  });

  test("modifierAtomiquement rend la main sans rien écrire", async () => {
    const gcs = await import("../lib/gcsStore.ts");
    let appelee = false;
    const r = await gcs.modifierAtomiquement(
      "properties.json",
      (d: any[]) => { appelee = true; return d; },
      () => false
    );
    assert.equal(r.ok, false);
    assert.equal(appelee, false, "la mutation ne doit même pas être exécutée");
  });
});

describe("analyserContenu — un fichier objet doit rester un objet", () => {
  // Le 4 septembre : la couche GCS forçait tout contenu en tableau
  // (`Array.isArray(d) ? d : []`). google-token.json, qui porte un OBJET,
  // était donc lu comme []. isConnected() répondait non, et le site se
  // croyait déconnecté de Google — statistiques de visite, ingestion des
  // leads depuis Gmail et brouillons au notaire tombaient tous en panne,
  // alors que le jeton était intact dans le bucket.
  test("un objet est rendu tel quel, pas aplati en tableau", async () => {
    const { analyserContenu } = await import("../lib/gcsStore.ts");
    const jeton = analyserContenu('{"refresh_token":"x","email":"a@b.fr"}');
    assert.equal(Array.isArray(jeton), false, "l'objet a été aplati en tableau");
    assert.equal(jeton.refresh_token, "x");
  });

  test("un tableau reste un tableau", async () => {
    const { analyserContenu } = await import("../lib/gcsStore.ts");
    assert.deepEqual(analyserContenu('[{"id":1}]'), [{ id: 1 }]);
  });

  test("un corps vide est une erreur, pas une collection vide", async () => {
    const { analyserContenu } = await import("../lib/gcsStore.ts");
    assert.throws(() => analyserContenu(""), /illisible/);
  });

  test("un JSON illisible lève plutôt que d'écraser", async () => {
    const { analyserContenu } = await import("../lib/gcsStore.ts");
    assert.throws(() => analyserContenu("{ceci n'est pas du json"), /illisible/);
  });
});

describe("readJSON — le chemin fichier ne doit pas aplatir non plus", () => {
  test("un fichier objet est relu comme un objet", async () => {
    await fs.writeFile(
      path.join(bac, "data", "objet.json"),
      '{"refresh_token":"x","email":"a@b.fr"}'
    );
    const d = await utils.readJSON("objet.json");
    assert.equal(Array.isArray(d), false);
    assert.equal(d.email, "a@b.fr");
  });
});
