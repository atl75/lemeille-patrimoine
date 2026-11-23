import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { createDelegationPdf } from '../lib/delegationPdf.ts';

test('delegation export has eight fillable fields and does not mutate records', async () => {
  const d = { partnerName: 'Agence fictive', representative: 'Camille Test', feeSharePercent: 0, feeNotes: 'Conditions fictives', status: 'ACTIVE' };
  const m = { mandateNumber: 'TEST-01', owners: [] };
  const before = JSON.stringify({ d, m });
  const pdf = await PDFDocument.load(await createDelegationPdf(d, m));
  assert.equal(pdf.getPageCount(), 2);
  const form = pdf.getForm();
  assert.equal(form.getFields().length, 8);
  assert.equal(form.getTextField('delegataire_nom').getText(), 'Camille Test');
  for (const side of ['delegant', 'delegataire']) {
    assert.equal(form.getTextField(side + '_date').getText(), undefined);
    assert.equal(form.getTextField(side + '_lieu').getText(), undefined);
    assert.equal(form.getTextField(side + '_qualite').getText(), undefined);
  }
  assert.equal(JSON.stringify({ d, m }), before);
});

test('long accented text paginates and preserves fillable signature section', async () => {
  const pdf = await PDFDocument.load(await createDelegationPdf({ partnerName: 'Élodie & Cœur', scope: 'X'.repeat(1200), feeNotes: 'Condition à vérifier.\n'.repeat(100), representative: 'Élodie Test' }, { owners: [] }));
  assert.ok(pdf.getPageCount() > 2);
  assert.equal(pdf.getForm().getFields().length, 8);
  assert.equal(pdf.getForm().getTextField('delegataire_nom').getText(), 'Élodie Test');
});
