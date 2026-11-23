/** Préconditions de création, sans requalifier les preuves historiques. */
export function erreurCreationAvenant(mandat: any): string | null {
  if (mandat?.mandateSignStatus !== 'SIGNED') {
    return 'Le mandat de base doit être signé avant de créer un avenant.';
  }
  const avenants = Array.isArray(mandat.avenants) ? mandat.avenants : [];
  if (avenants.some((avenant: any) => avenant?.signStatus !== 'SIGNED')) {
    return 'Un avenant est déjà en attente ou nécessite une vérification. Terminez sa signature avant d’en créer un autre.';
  }
  return null;
}
