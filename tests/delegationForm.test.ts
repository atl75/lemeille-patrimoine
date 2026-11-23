import test from 'node:test';
import assert from 'node:assert/strict';
import { formulaireDelegation, derniereDelegationPourMandat } from '../lib/delegationForm.ts';

test('saved delegation fields including zero fee share are restored without metadata leakage', () => {
  const form = formulaireDelegation({ mandatId:'m', partnerName:'Agence', partnerTradeName:'Enseigne', partnerAddress:'Adresse', representative:'Camille', partnerCard:'CPI', scope:'Mission', feeNotes:'Conditions', feeSharePercent:0, id:'private-id', history:[] });
  assert.equal(form.partnerName,'Agence');assert.equal(form.partnerTradeName,'Enseigne');
  assert.equal(form.partnerAddress,'Adresse');assert.equal(form.representative,'Camille');assert.equal(form.partnerCard,'CPI');
  assert.equal(form.scope,'Mission');assert.equal(form.feeNotes,'Conditions');assert.equal(form.feeSharePercent,0);
  assert.equal('history' in form,false);assert.equal('id' in form,false);
});
test('latest saved delegation is selected only for the requested mandate', () => {
  const records=[{mandatId:'m',updatedAt:'2026-11-23T10:00:00Z'},{mandatId:'other',updatedAt:'2026-11-23T15:00:00Z'},{mandatId:'m',updatedAt:'2026-11-23T12:00:00Z'}];
  assert.equal(derniereDelegationPourMandat(records,'m'),records[2]);
  assert.equal(derniereDelegationPourMandat(records,'missing'),undefined);
});
test('legacy records without dates remain selectable and absent optional values get defaults', () => {
  const records=[{mandatId:'m'},{mandatId:'m'}];assert.equal(derniereDelegationPourMandat(records,'m'),records[1]);
  const form=formulaireDelegation({partnerName:'Agence'});assert.equal(form.partnerTradeName,'');assert.equal(form.feeSharePercent,50);
});
