import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIEN_VIERGE } from '../lib/typesBien.ts';
import { erreurPublicationBien } from '../lib/publicationBien.ts';
import { champsEstimation, cleRechercheDvf, verifierEcriture, erreurDonneesEstimation } from '../lib/estimationDossier.ts';
import { creerSnapshot, sourceRapport } from '../lib/estimationRapport.ts';
import { annoncesActives, natureComparable, fourchetteConseillee } from '../lib/ajustementPrix.ts';
import { quantile } from '../lib/prixStatistiques.ts';

test('nouveau dossier privé, diagnostic réellement inconnu', () => {
  assert.equal(BIEN_VIERGE.visible, false);
  assert.equal(BIEN_VIERGE.dpe?.classEnergy, '');
  assert.equal(BIEN_VIERGE.dpe?.classGES, '');
  assert.equal(BIEN_VIERGE.dpe?.consumptionKwh, undefined);
  assert.equal(BIEN_VIERGE.dpe?.date, '');
  assert.equal(erreurPublicationBien(BIEN_VIERGE), null);
  assert.ok(erreurPublicationBien({ ...BIEN_VIERGE, visible: true }));
});
test('publication contrôlée sans réécrire le diagnostic existant', () => {
  const b = { title: 'Test fictif', city: 'Ville fictive', surface: 50, price: 200000, dpe: { classEnergy: 'E', classGES: 'B' } };
  const avant = JSON.stringify(b);
  assert.equal(erreurPublicationBien(b), null);
  assert.equal(JSON.stringify(b), avant);
  assert.ok(erreurPublicationBien({ ...b, dpe: {} }));
});
test('deux onglets : conflit, rejeu réseau idempotent, version requise', () => {
  assert.equal(verifierEcriture({}, { expectedRevision: 0, requestId: 'request-1' }), 'ok');
  const e = { revision: 1, lastRequestId: 'request-1' };
  assert.equal(verifierEcriture(e, { expectedRevision: 0, requestId: 'request-2' }), 'conflit');
  assert.equal(verifierEcriture(e, { expectedRevision: 0, requestId: 'request-1' }), 'rejoue');
  assert.equal(verifierEcriture(e, {}), 'invalide');
  assert.equal(verifierEcriture(e, []), 'invalide');
});
test('le PATCH ne modifie ni archives, ni identité, ni revision', () => {
  assert.deepEqual(champsEstimation({ id:'pirate', snapshots:[], revision:90, lastRequestId:'x', titre:'Brouillon', description:'Texte' }),
    { titre:'Brouillon', description:'Texte' });
});
test('validation : prix négatif, NaN, comparables malformés et honoraires', () => {
  for (const e of [{ surface:-1 }, { prixRetenu:NaN }, { comparables:[null] }, { honorairesPct:101 }, { sourceBase:'FAUSSE' }])
    assert.ok(erreurDonneesEstimation(e));
  assert.equal(erreurDonneesEstimation({ surface:0, comparables:[], criteres:{} }), null);
});
test('une annonce, un vendu sans prix et une vente déclarée sont distincts', () => {
  const a = { id:'a', titre:'Fictif', prix:100000, surface:50 };
  const b = { ...a, id:'b', statut:'VENDU' as const };
  const c = { ...a, id:'c', prixVente:90000 };
  assert.equal(natureComparable(a),'ANNONCE'); assert.equal(natureComparable(b),'VENDU_SANS_PRIX');
  assert.equal(natureComparable(c),'VENTE_DECLAREE'); assert.deepEqual(annoncesActives([a,b,c]),[a]);
});
test('quartiles interpolés identiques au calcul DVF', () => {
  assert.equal(quantile([1000,2000,3000,4000],.25),1750);
  const cs = [1000,2000,3000,4000].map((prix,i) => ({ id:String(i),titre:'Fictif',prix,surface:1 }));
  assert.deepEqual(fourchetteConseillee({ surface:1 },cs),{ bas:1750,haut:2500 });
});
test('source du rapport = source du calcul, même si DVF est aussi affiché', () => {
  const dvf = { stats: { nombre:12 } };
  assert.match(sourceRapport({sourceBase:'MANUELLE'},dvf,[]),/manuellement/);
  assert.match(sourceRapport({sourceBase:'REFERENCE',reference:{source:'Fictif'}},dvf,[]),/Fictif/);
  assert.match(sourceRapport({sourceBase:'COMPARABLES'},dvf,[]),/prix affichés|Prix affichés/);
  assert.match(sourceRapport({sourceBase:'DVF'},dvf,[]),/12 ventes/);
});
test('archive indépendante du brouillon, du barème futur et du rechargement', () => {
  const e = { adresse:'TEST: adresse fictive', surface:50, sourceBase:'MANUELLE', baseManuelle:4000, criteres:{}, description:'Initial' };
  const s = creerSnapshot(e,'avis-1','2026-09-15T10:00:00Z');
  const bytes = JSON.stringify(s);
  e.surface = 100; e.baseManuelle = 6000; e.description = 'Modifié';
  assert.equal(s.props.resultat.valeur,200000);
  assert.equal(s.props.estimation.description,'Initial');
  assert.equal(JSON.stringify(JSON.parse(bytes)),bytes);
  assert.equal(s.props.estimation.majAt,'2026-09-15T10:00:00Z');
  assert.ok(s.bareme.version);
});
test('DVF périmé après modification des filtres ne peut pas figer un prix', () => {
  const e: any = { adresse:'TEST: adresse', surface:50, sourceBase:'DVF' };
  e.dvfObservation = { cle:cleRechercheDvf(e),data:{ ventes:[{id:'fictive',type:'Appartement',prix:200000,surface:50,prixM2:4000,date:'2026-01-01'}], stats:{ nombre:1,medianeM2:4000 } } };
  assert.equal(creerSnapshot(e,'avis-1','2026-09-15').props.resultat.valeur,200000);
  e.surface = 60;
  assert.throws(() => creerSnapshot(e,'avis-2','2026-09-15'));
});
