import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {versionDocumentSignature,versionSignatureValide,erreurImageSignature} from '../lib/signatureIntegrity.ts';
const record={id:'fictif',type:'MAISON',price:300000,owners:[{firstName:'TEST'}]};
test('empreinte : modification métier refusée, signatures parallèles sans changement des termes',()=>{
 const documentVersion=versionDocumentSignature(record);
 assert.ok(versionSignatureValide({documentVersion},record));
 assert.ok(!versionSignatureValide({documentVersion},{...record,price:310000}));
 assert.ok(!versionSignatureValide({},record));
 assert.equal(documentVersion,versionDocumentSignature({...record,signers:[{dataUrl:'signature'}],mandateSignStatus:'PENDING'}));
 assert.equal(documentVersion,versionDocumentSignature({owners:record.owners,price:300000,type:'MAISON',id:'fictif'}));
});
test('avenant : l’empreinte inclut les nouvelles conditions, pas les signatures',()=>{
 const av={id:'a',nouveau:{price:280000}};
 const v=versionDocumentSignature(record,av);
 assert.notEqual(v,versionDocumentSignature(record,{...av,nouveau:{price:270000}}));
 assert.equal(v,versionDocumentSignature(record,{...av,signers:[{dataUrl:'signé'}]}));
});
test('image : faux PNG, image blanche et dimensions abusives refusés',async()=>{
 assert.ok(await erreurImageSignature('data:image/png;base64,aW52YWxpZGU='));
 const blanc=await sharp({create:{width:100,height:100,channels:4,background:'#ffffff'}}).png().toBuffer();
 assert.ok(await erreurImageSignature('data:image/png;base64,'+blanc.toString('base64')));
 const large=await sharp({create:{width:2500,height:100,channels:4,background:'#000000'}}).png().toBuffer();
 assert.ok(await erreurImageSignature('data:image/png;base64,'+large.toString('base64')));
});
test('image : tracé visible décodable accepté sans conservation supplémentaire',async()=>{
 const data=Buffer.alloc(100*50*4);for(let y=15;y<25;y++)for(let x=10;x<70;x++){const i=(y*100+x)*4;data[i]=20;data[i+1]=40;data[i+2]=30;data[i+3]=255;}
 const png=await sharp(data,{raw:{width:100,height:50,channels:4}}).png().toBuffer();
 assert.equal(await erreurImageSignature('data:image/png;base64,'+png.toString('base64')),null);
});
