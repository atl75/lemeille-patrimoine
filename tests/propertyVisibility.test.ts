import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyInCatalog} from '../lib/propertyVisibility.ts';
import {toPublicProperty} from '../lib/publicProperty.ts';
import {insertPropertySchema} from '../shared/schema.ts';

test('catalogue : compatibilité des anciens biens, hors ligne et lien uniquement', () => {
  assert.equal(propertyInCatalog({}),true);
  assert.equal(propertyInCatalog({visible:true,unlisted:false}),true);
  assert.equal(propertyInCatalog({visible:true,unlisted:true}),false);
  assert.equal(propertyInCatalog({visible:false,unlisted:false}),false);
  assert.equal(propertyInCatalog(null),false);
});
test('fiche par lien : statut public conservé sans exposer les données privées', () => {
  const p=toPublicProperty({id:'test',visible:true,unlisted:true,owners:[{name:'secret'}]});
  assert.equal(p.unlisted,true);assert.equal(p.visible,true);assert.equal(p.owners,undefined);
  assert.equal(Object.hasOwn(toPublicProperty({id:'ancien'}),'unlisted'),false);
});
test('option de catalogue : booléen facultatif strict', () => {
  const schema=insertPropertySchema.shape.unlisted;
  assert.equal(schema.parse(true),true);assert.equal(schema.parse(false),false);
  assert.equal(schema.parse(undefined),undefined);assert.equal(schema.safeParse('false').success,false);
});
