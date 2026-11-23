import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {selectionDvf, erreurSelectionDvf} from '../lib/selectionDvf.ts';
import {creerSnapshot} from '../lib/estimationRapport.ts';
import {cleRechercheDvf, erreurDonneesEstimation} from '../lib/estimationDossier.ts';
const vente=(id:string,type='Appartement',prix=200000)=>({id,type,prix,surface:50,prixM2:99999,date:'2026-01-01',adresse:'TEST '+id,distance:100,lat:49,lon:1,pieces:2});
const observation=()=>({data:{ventes:[vente('a'),vente('b','Appartement',300000),vente('m','Maison',500000)],stats:{nombre:1000,medianeM2:99999}}});
test('DVF : type strict, médiane et prix/m² recalculés depuis les références visibles',()=>{
  const o=observation();const a=selectionDvf(o,'Appartement')!; const m=selectionDvf(o,'Maison')!;
  assert.equal(a.stats?.medianeM2,5000);assert.equal(a.stats?.nombre,2);assert.equal(m.stats?.medianeM2,10000);
  assert.equal(a.selection.totalRecherche,1000);assert.equal(o.data.ventes[0].prixM2,99999);
});
test('DVF : sélection explicite et vide respectées sans retour implicite au marché',()=>{
  assert.equal(selectionDvf({...observation(),selectedIds:['b']},'Appartement')?.stats?.medianeM2,6000);
  assert.equal(selectionDvf({...observation(),selectedIds:[]},'Appartement')?.stats,null);
  assert.equal(selectionDvf({...observation(),selectedIds:['m']},'Appartement')?.ventes.length,0);
});
test('DVF : doublons et lignes inexploitables exclus',()=>{
  const o=observation();o.data.ventes.push(vente('a'),{...vente('zero'),surface:0});
  assert.equal(selectionDvf(o,'Appartement')?.ventes.length,2);
});
test('DVF : identifiants invalides, inconnus ou dupliqués refusés à la sauvegarde',()=>{
  for(const selectedIds of [null,'a',[2],['absent'],['a','a']]) assert.ok(erreurSelectionDvf({...observation(),selectedIds}));
  assert.equal(erreurSelectionDvf({...observation(),selectedIds:[]}),null);
  assert.ok(erreurDonneesEstimation({dvfObservation:{...observation(),selectedIds:['absent']}}));
});
test('DVF : calcul figé issu des seules ventes choisies, archive indépendante',()=>{
  const e:any={adresse:'TEST',surface:50,type:'Appartement',sourceBase:'DVF'};
  e.dvfObservation={...observation(),selectedIds:['b'],cle:cleRechercheDvf(e)};
  const s=creerSnapshot(e,'fictif','2026-09-16');
  assert.equal(s.rendererVersion,4);assert.equal(s.props.resultat.valeur,300000);assert.equal(s.props.dvf.ventes.length,1);
  e.dvfObservation.selectedIds=[];assert.equal(s.props.dvf.ventes[0].id,'b');
  assert.throws(()=>creerSnapshot(e,'vide','2026-09-16'),/source exploitable/);
  e.dvfObservation.selectedIds=['a'];e.type='Maison';assert.throws(()=>creerSnapshot(e,'perime','2026-09-16'),/source exploitable/);
});
test('rapport V3 historique inchangé',()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('../components/DocumentEstimationV3.tsx',import.meta.url))).digest('hex'),'c0adbbaf821a1c19b7182f6722546fbda775a39c2238d109af3cd795136939a3');
});
