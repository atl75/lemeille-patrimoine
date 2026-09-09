import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimer, composer, ajustementsDe, alertes, criteresDe, modalitesDe, pourcentDe,
  BAREME_COURANT, type Bareme,
} from '../lib/estimation.ts';

const bien = { baseM2: 5000, surface: 100, type: 'Appartement' as const };

test('sans aucun critère renseigné, la valeur est celle du secteur', () => {
  const r = estimer({ ...bien, choix: {} });
  assert.equal(r?.valeur, 500000);
  assert.equal(r?.ajustements.length, 0);
  assert.equal(r?.composition.pourcent, 0);
});

test('un critère neutre produit une ligne à 0 %, un critère absent n’en produit aucune', () => {
  // La distinction porte tout le document : « regardé, c'est neutre » n'est pas
  // « pas regardé ». Confondre les deux ferait passer une lacune pour un constat.
  const neutre = estimer({ ...bien, choix: { dpe: 'D' } });
  assert.equal(neutre?.ajustements.length, 1);
  assert.equal(neutre?.ajustements[0].pourcent, 0);
  assert.equal(neutre?.valeur, 500000);

  const absent = estimer({ ...bien, choix: {} });
  assert.equal(absent?.ajustements.length, 0);
});

test('le DPE décote deux fois plus fort une maison qu’un appartement', () => {
  const appart = estimer({ ...bien, choix: { dpe: 'G' } });
  const maison = estimer({ ...bien, type: 'Maison', choix: { dpe: 'G' } });
  assert.equal(appart?.ajustements[0].pourcent, -12);
  assert.equal(maison?.ajustements[0].pourcent, -25);
});

test('la composition est multiplicative, pas additive', () => {
  // -12 % puis -8 % ne font pas -20 % : ils font -19,04 %. L'écart paraît
  // mince sur deux critères et devient grossier sur six.
  const r = estimer({ ...bien, choix: { dpe: 'G', etat: 'TRAVAUX' } });
  assert.equal(r?.ajustements.length, 2);
  assert.ok(Math.abs(r!.composition.pourcentBrut - (0.88 * 0.92 - 1) * 100) < 1e-9);
  assert.notEqual(Math.round(r!.composition.pourcentBrut), -20);
});

test('le cumul est plafonné, et le dit', () => {
  const r = estimer({
    ...bien, type: 'Maison',
    choix: { dpe: 'G', etat: 'A_RENOVER', bruit: 'AERIEN', ensoleillement: 'SOMBRE' },
  });
  assert.equal(r?.composition.plafonne, true);
  assert.equal(r?.composition.pourcent, -30);
  assert.ok(r!.composition.pourcentBrut < -30, 'le brut doit rester consultable');
  assert.equal(Math.round(r!.valeur), 350000);
});

test('le plafond joue aussi à la hausse', () => {
  const bareme: Bareme = { ...BAREME_COURANT, plafond: 5 };
  const r = estimer({ ...bien, choix: { dpe: 'A' }, bareme });
  assert.equal(r?.composition.pourcent, 5);
  assert.equal(r?.composition.plafonne, true);
});

test('une correction de l’agent remplace la valeur du barème et se signale', () => {
  const r = estimer({ ...bien, choix: { etage: 'RDC' }, corrections: { etage: -3 } });
  const a = r!.ajustements[0];
  assert.equal(a.pourcent, -3);
  assert.equal(a.corrige, true);
  assert.equal(a.pourcentBareme, -10);
  assert.match(a.source, /agent/i);
});

test('une correction égale au barème n’est pas présentée comme une correction', () => {
  const r = estimer({ ...bien, choix: { etage: 'RDC' }, corrections: { etage: -10 } });
  assert.equal(r!.ajustements[0].corrige, false);
});

test('une correction à zéro est retenue — c’est un choix, pas une absence', () => {
  // Piège classique : `corrections.etage || bareme` traiterait 0 comme non
  // renseigné et réappliquerait -10 %, à l'insu de l'agent qui vient
  // précisément d'annuler la décote.
  const r = estimer({ ...bien, choix: { etage: 'RDC' }, corrections: { etage: 0 } });
  assert.equal(r!.ajustements[0].pourcent, 0);
  assert.equal(r!.ajustements[0].corrige, true);
});

test('étage et ascenseur ne concernent pas une maison', () => {
  const criteres = criteresDe(BAREME_COURANT, 'Maison');
  assert.ok(!criteres.includes('etage'));
  assert.ok(!criteres.includes('ascenseur'));
  assert.ok(criteres.includes('dpe'));
  assert.equal(modalitesDe(BAREME_COURANT, 'etage', 'Maison').length, 0);

  // Et un choix d'étage glissé sur une maison est ignoré, pas appliqué.
  const r = estimer({ ...bien, type: 'Maison', choix: { etage: 'RDC' } });
  assert.equal(r?.ajustements.length, 0);
});

test('une modalité inconnue est ignorée plutôt que de faire tomber le calcul', () => {
  const r = estimer({ ...bien, choix: { dpe: 'Z' } });
  assert.equal(r?.ajustements.length, 0);
  assert.equal(r?.valeur, 500000);
});

test('sans surface ou sans prix au m², il n’y a pas d’estimation', () => {
  assert.equal(estimer({ ...bien, surface: 0, choix: {} }), null);
  assert.equal(estimer({ ...bien, baseM2: 0, choix: {} }), null);
  assert.equal(estimer({ ...bien, baseM2: NaN, choix: {} }), null);
});

test('la fourchette encadre la valeur centrale', () => {
  const r = estimer({ ...bien, choix: {} })!;
  assert.ok(r.bas < r.valeur && r.valeur < r.haut);
  assert.equal(Math.round(r.bas), 475000);
  assert.equal(Math.round(r.haut), 525000);
});

test('composer sur une liste vide ne bouge rien', () => {
  const c = composer([], 30);
  assert.equal(c.facteur, 1);
  assert.equal(c.pourcent, 0);
  assert.equal(c.plafonne, false);
});

test('alerte quand une mauvaise étiquette et des travaux se cumulent', () => {
  const a = ajustementsDe(BAREME_COURANT, { dpe: 'G', etat: 'A_RENOVER' }, 'Maison');
  const al = alertes(a);
  assert.equal(al.length, 1);
  assert.deepEqual(al[0].criteres, ['dpe', 'etat']);
});

test('alerte quand un rez-de-chaussée est en plus déclaré sombre', () => {
  const a = ajustementsDe(BAREME_COURANT, { etage: 'RDC', ensoleillement: 'SOMBRE' }, 'Appartement');
  assert.equal(alertes(a).length, 1);
});

test('pas d’alerte sur un cumul qui ne se recouvre pas', () => {
  const a = ajustementsDe(BAREME_COURANT, { dpe: 'C', etat: 'RENOVE', bruit: 'ROUTIER' }, 'Appartement');
  assert.deepEqual(alertes(a), []);
});

test('les pourcentages par type de bien se résolvent dans les deux sens', () => {
  assert.equal(pourcentDe(-7, 'Maison'), -7);
  assert.equal(pourcentDe({ Appartement: -12, Maison: -25 }, 'Maison'), -25);
  assert.equal(pourcentDe({ Appartement: -12, Maison: -25 }, 'Appartement'), -12);
});

test('le barème est cohérent : clés uniques, fiabilité connue, point neutre présent', () => {
  for (const [nom, echelle] of Object.entries(BAREME_COURANT.criteres)) {
    const cles = echelle.modalites.map((m) => m.cle);
    assert.equal(new Set(cles).size, cles.length, `clés dupliquées dans ${nom}`);
    assert.ok(echelle.neutre.length > 0, `${nom} n'a pas de point neutre écrit`);
    for (const m of echelle.modalites) {
      assert.ok(['mesuree', 'estimee', 'usage'].includes(m.fiabilite), `${nom}/${m.cle} : fiabilité inconnue`);
      assert.ok(m.source.length > 0, `${nom}/${m.cle} : sans source`);
      const vals = typeof m.pourcent === 'number' ? [m.pourcent] : [m.pourcent.Appartement, m.pourcent.Maison];
      for (const v of vals) assert.ok(Math.abs(v) <= 30, `${nom}/${m.cle} : ${v} % dépasse le plafond`);
    }
    // Chaque échelle doit contenir exactement un point à 0 % : sans lui, le
    // barème n'aurait pas d'origine et tout deviendrait relatif à rien.
    const zeros = echelle.modalites.filter((m) => {
      const v = typeof m.pourcent === 'number' ? m.pourcent : m.pourcent.Appartement;
      return v === 0;
    });
    assert.equal(zeros.length, 1, `${nom} doit avoir exactement une modalité neutre`);
  }
});

test('toute valeur mesurée cite une étude nommée, pas « pratique professionnelle »', () => {
  for (const [nom, echelle] of Object.entries(BAREME_COURANT.criteres)) {
    for (const m of echelle.modalites) {
      if (m.fiabilite !== 'mesuree') continue;
      assert.ok(
        !/pratique professionnelle/i.test(m.source),
        `${nom}/${m.cle} se dit mesuré mais ne cite aucune étude`,
      );
    }
  }
});

// ── Historique des ventes, année par année ──────────────────────────────────

import { parAnnee } from '../lib/dvf.ts';

const vente = (date: string, prixM2: number) =>
  ({ date, prixM2, prix: 0, surface: 0, type: 'Appartement', distance: 0 } as any);

test('les ventes se regroupent par année, la plus récente en tête', () => {
  const a = parAnnee([
    vente('2024-03-01', 3000), vente('2024-09-01', 3200),
    vente('2025-01-01', 3400),
  ]);
  assert.deepEqual(a.map((x) => x.annee), [2025, 2024]);
  assert.equal(a[0].nombre, 1);
  assert.equal(a[1].nombre, 2);
  assert.equal(a[1].medianeM2, 3100);
});

test('une année sans vente ne produit pas de ligne à zéro', () => {
  // Une ligne « 0 vente — 0 €/m² » se lit comme un effondrement du marché
  // alors qu'elle ne dit rien : elle ne doit pas exister.
  const a = parAnnee([vente('2022-01-01', 3000), vente('2025-01-01', 3400)]);
  assert.deepEqual(a.map((x) => x.annee), [2025, 2022]);
  assert.ok(a.every((x) => x.nombre > 0));
});

test('une date illisible est écartée sans faire tomber le calcul', () => {
  const a = parAnnee([vente('', 3000), vente('pas-une-date', 1), vente('2025-01-01', 3400)]);
  assert.equal(a.length, 1);
  assert.equal(a[0].annee, 2025);
});

test('sans vente, l’historique est vide', () => {
  assert.deepEqual(parAnnee([]), []);
});
