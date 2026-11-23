export const delegationVide = { mandatId:'', partnerName:'', partnerTradeName:'', partnerSiren:'', partnerCard:'', partnerAddress:'', partnerEmail:'', partnerPhone:'', representative:'', territory:'', scope:'', startDate:'', endDate:'', feeSharePercent:50, feeNotes:'', status:'BROUILLON' };

export function formulaireDelegation(record: Record<string, any>) {
  const form = { ...delegationVide };
  for (const key of Object.keys(form) as (keyof typeof form)[]) {
    if (key === 'feeSharePercent') {
      form[key] = typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] : 50;
    } else form[key] = typeof record[key] === 'string' ? record[key] : delegationVide[key];
  }
  return form;
}

export function derniereDelegationPourMandat<T extends { mandatId: string; updatedAt?: string; createdAt?: string }>(records: T[], mandatId: string): T | undefined {
  const time = (r: T) => Date.parse(r.updatedAt || r.createdAt || '') || 0;
  return records.filter(r => r.mandatId === mandatId).reduce<T | undefined>((last, r) => !last || time(r) >= time(last) ? r : last, undefined);
}
