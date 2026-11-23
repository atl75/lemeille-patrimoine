import test from 'node:test';
import assert from 'node:assert/strict';
import {initialiserSuiviNotification,noterNotification,libelleNotification} from '../lib/suiviNotificationLead.ts';
import {notifierLead} from '../lib/leadNotifications.ts';
import {preparerLead} from '../lib/leadIntake.ts';
const date='2026-09-16T16:00:00Z', stop=Symbol('sans-écriture');
const contact={firstName:'Fictif',email:'fictif@example.invalid',consent:true,topic:'Vendre'};
const lead=()=>({...preparerLead(contact,false,'L-test',date),notificationSuivi:initialiserSuiviNotification(contact.email,date)});
test('notifications : état préalable indépendant par canal, aucun accusé sans email',()=>{
  const s=initialiserSuiviNotification('',date);assert.equal(s.agence.etat,'EN_ATTENTE');assert.equal(s.client.etat,'SANS_EMAIL');
  assert.notEqual(s.agence,s.client);
});
test('notifications : résultat accepté distinct de la livraison, sans erreur brute persistée',()=>{
  const rows=[lead()];noterNotification(rows,'L-test',date,'agence',{ok:true,id:'fictif-provider'},date,stop);
  noterNotification(rows,'L-test',date,'client',{ok:false,raison:'secret ou email'},date,stop);
  assert.equal(rows[0].notificationSuivi.agence.etat,'ACCEPTE_SERVICE');assert.equal(rows[0].notificationSuivi.client.etat,'NON_CONFIRME');
  assert.ok(!JSON.stringify(rows).includes('secret ou email'));assert.match(libelleNotification('ACCEPTE_SERVICE'),/livraison non confirmée/);
});
test('notifications : configuration absente distincte, données CRM conservées',()=>{
  const rows=[{...lead(),notes:'Conserver',status:'qualified'}];
  noterNotification(rows,'L-test',date,'agence',{ok:false,raison:'absente',configuration:true},date,stop);
  assert.equal(rows[0].notificationSuivi.agence.etat,'NON_CONFIGURE');assert.equal(rows[0].status,'qualified');assert.equal(rows[0].notes,'Conserver');
});
test('notifications : absence, ancienne tentative et résultat déjà noté ne sont pas écrasés',()=>{
  const rows=[lead()];assert.equal(noterNotification(rows,'absent',date,'agence',{ok:true},date,stop),stop);
  assert.equal(noterNotification(rows,'L-test','autre','agence',{ok:true},date,stop),stop);
  noterNotification(rows,'L-test',date,'agence',{ok:true},date,stop);
  assert.equal(noterNotification(rows,'L-test',date,'agence',{ok:false,raison:'tardif'},date,stop),stop);
});
test('notifications : chaque canal est noté sans attendre le second',async()=>{
  let terminer!: (r:any)=>void;const lent=new Promise<any>(r=>terminer=r);const notes:string[]=[];
  const p=notifierLead(lead(),{agence:'agence@example.invalid',signature:'',envoyer:async m=>m.to==='agence@example.invalid' ? {ok:true,id:'a'}:lent,noter:async c=>{notes.push(c);}});
  await new Promise(r=>setImmediate(r));assert.deepEqual(notes,['agence']);terminer({ok:true,id:'c'});await p;assert.deepEqual(notes,['agence','client']);
});
test('notifications : panne de journalisation ne renvoie pas les emails et ne masque pas leur résultat',async()=>{
  let envois=0;const r=await notifierLead(lead(),{agence:'agence@example.invalid',signature:'',envoyer:async()=>{envois++;return {ok:true};},noter:async()=>{throw new Error('panne fictive');}});
  assert.equal(envois,2);assert.equal(r.agence.ok,true);assert.equal(r.client?.ok,true);
});
test('notifications : statut technique non imposable par une saisie publique ou manuelle',()=>{
  for(const admin of [true,false])assert.equal(preparerLead({...contact,notificationSuivi:{version:1,agence:{etat:'ACCEPTE_SERVICE'}}},admin,'id',date).notificationSuivi,undefined);
});
