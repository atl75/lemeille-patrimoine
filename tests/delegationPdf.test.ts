import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { createDelegationPdf, delegationDateParis, formatDelegationCpi } from '../lib/delegationPdf.ts';

test('CPI formatting preserves all digits and leaves incomplete values intact', () => {
  assert.equal(formatDelegationCpi('CPI 76062024000000038'), '7606 2024 000 000 038');
  assert.equal(formatDelegationCpi('7606 2024 000 000 038'), '7606 2024 000 000 038');
  assert.equal(formatDelegationCpi('CPI à confirmer'), 'CPI à confirmer');
});

test('agency date uses the Paris calendar even across UTC midnight', () => {
  assert.equal(delegationDateParis(new Date('2026-11-23T23:30:00Z')), '24/11/2026');
  assert.equal(delegationDateParis(new Date('2026-07-23T22:30:00Z')), '24/07/2026');
});

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
