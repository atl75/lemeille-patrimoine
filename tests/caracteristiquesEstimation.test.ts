import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { estimer } from '../lib/estimation.ts';
import { creerSnapshot } from '../lib/estimationRapport.ts';
import { blocagesCaracteristiques, cleRevueCaracteristiques, erreurCaracteristiques, ajustementsCaracteristiques,
  type CaracteristiquesEstimation as C } from '../lib/caracteristiquesEstimation.ts';

const base={baseM2:4000,surface:50,type:'Appartement' as const,choix:{}};
const dossier={adresse:'TEST fictif',surface:50,sourceBase:'MANUELLE',baseManuelle:4000,criteres:{}};
test('le rendu V1 des anciens avis reste strictement inchangé',()=>{
  const bytes=readFileSync(new URL('../components/DocumentEstimationV1.tsx',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'82f90ec31483191b59ed1a4226764431dea6c04f4ea81b7bf2098c398fbd8ba5');
});
test('un étage haut sans ascenseur peut recevoir une correction négative justifiée',()=>{
  const c:C={version:1,etage:5,ascenseur:'NON',impacts:{etage:-6},notes:{etage:'Comparables fictifs A/B avec accès par escalier.'}};
  assert.deepEqual(blocagesCaracteristiques(c,'Appartement'),[]);
  assert.equal(estimer({...base,caracteristiques:c})?.valeur,188000);
});
test('un étage favorable peut recevoir une correction positive sans deuxième bonus ascenseur',()=>{
  const c:C={version:1,etage:5,ascenseur:'OUI',impacts:{etage:3},notes:{etage:'Références fictives, desserte complète.'}};
  const r=estimer({...base,choix:{etage:'HAUT',ascenseur:'SANS_HAUT',ensoleillement:'EXCEPTIONNEL',bruit:'ROUTIER'},caracteristiques:c})!;
  assert.equal(r.ajustements.length,1); assert.equal(r.valeur,206000);
});
test('RDC conservé comme zéro, distinct d’un étage inconnu',()=>{
  assert.equal(ajustementsCaracteristiques({version:1},'Appartement').length,0);
  const lignes=ajustementsCaracteristiques({version:1,etage:0,impacts:{etage:0}},'Appartement');
  assert.equal(lignes.length,1); assert.match(lignes[0].modalite,/Rez-de-chaussée/);
});
test('exposition sud ne produit pas automatiquement une surcote',()=>{
  const c:C={version:1,exposition:'S'};
  assert.equal(estimer({...base,caracteristiques:c})?.valeur,200000);
  assert.match(blocagesCaracteristiques(c,'Appartement').join(' '),/saisir un effet/);
  assert.throws(()=>creerSnapshot({...dossier,caracteristiques:c},'s','2026-09-15'));
});
test('effet sans constat ou sans justification interdit à la validation',()=>{
  assert.ok(blocagesCaracteristiques({version:1,impacts:{visavis:-3}},'Appartement').length);
  assert.ok(blocagesCaracteristiques({version:1,visavis:'PROCHE',impacts:{visavis:-3}},'Appartement').length);
  assert.ok(blocagesCaracteristiques({version:1,etage:4,impacts:{etage:0}},'Appartement').length);
});
test('luminosité, exposition et vis-à-vis sont distincts mais demandent une revue du cumul',()=>{
  const c:C={version:1,exposition:'S',visavis:'AUCUN',ensoleillement:'LUMINEUX',
    impacts:{exposition:1,visavis:2,ensoleillement:1},notes:{exposition:'Constat fictif A',visavis:'Constat fictif B',ensoleillement:'Constat fictif C'}};
  assert.match(blocagesCaracteristiques(c,'Appartement').join(' '),/recouvrements/);
  c.revueCumuls='Les trois effets sont distingués par les références fictives.'; c.revueCle=cleRevueCaracteristiques(c);
  assert.deepEqual(blocagesCaracteristiques(c,'Appartement'),[]);
  c.impacts!.visavis=3;
  assert.match(blocagesCaracteristiques(c,'Appartement').join(' '),/recouvrements/);
});
test('un RDC sombre ne cumule pas ses effets sans justification actuelle',()=>{
  const c:C={version:1,etage:0,ensoleillement:'TRES_FAIBLE',impacts:{etage:-5,ensoleillement:-2},notes:{etage:'Accès / intimité',ensoleillement:'Profondeur des pièces'}};
  assert.match(blocagesCaracteristiques(c,'Appartement').join(' '),/recouvrements/);
});
test('calme favorable ou bruit défavorable : signes manuels conservés',()=>{
  for(const [bruit,impact] of [['TRES_CALME',2],['BRUYANT',-4]] as const) {
    const c:C={version:1,bruit,impacts:{bruit:impact},notes:{bruit:'Observation fictive et référence.'}};
    assert.equal(estimer({...base,caracteristiques:c})!.valeur,200000*(1+impact/100));
  }
});
test('maison : pas de correction étage/ascenseur d’appartement',()=>{
  assert.equal(estimer({...base,type:'Maison',caracteristiques:{version:1,etage:6,ascenseur:'NON',impacts:{etage:-8}}})!.valeur,200000);
});
test('formats et nombres invalides rejetés',()=>{
  for(const c of [{version:2},{version:1,etage:-1},{version:1,etage:1.5},{version:1,impacts:{bruit:Infinity}},{version:1,impacts:{bruit:'2'}},{version:1,exposition:'FAUX'},{version:1,visiteLe:'2026-02-31'},{version:1,notes:[]}])assert.ok(erreurCaracteristiques(c));
});
test('nouveau rapport V3 figé ; les propriétés du brouillon ne peuvent le modifier',()=>{
  const c:C={version:1,visavis:'PROCHE',impacts:{visavis:-2},notes:{visavis:'Référence fictive face-à-face.'}};
  const s=creerSnapshot({...dossier,caracteristiques:c},'s','2026-09-15');
  assert.equal(s.rendererVersion,4); assert.equal(s.props.resultat.valeur,196000);
  c.impacts!.visavis=5; assert.equal(s.props.resultat.valeur,196000);
  assert.equal(creerSnapshot(dossier,'nouveau','2026-09-15').rendererVersion,4);
});
