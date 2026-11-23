/** Prépare un renvoi sans reconstruire les informations attachées à une preuve. */
export function signatairesInvitationMandat(owners: any[], previous: any[], createToken: () => string):
  { signers: any[]; error?: never } | { error: string; signers?: never } {
  const error = 'Les signatures existantes ne peuvent pas être associées sans ambiguïté aux mandants. Aucun lien modifié ; vérifiez le dossier.';
  for (const signer of previous) {
    if (!signer || typeof signer !== 'object') return { error };
    // Une date seule n’autorise pas à effacer/recréer une signature incomplète.
    if (signer.signedAt && !signer.dataUrl) return { error };
    if (!signer.dataUrl) continue;
    const index = signer.ownerIndex;
    if (!Number.isInteger(index) || index < 0 || index >= owners.length
      || previous.filter(s => s?.ownerIndex === index).length !== 1) return { error };
  }
  return { signers: owners.map((owner, ownerIndex) => {
    const existing = previous.find(s => s.ownerIndex === ownerIndex);
    // Identité, coordonnées, jeton, dates et champs de preuve restent inchangés,
    // y compris les métadonnées non connues de cette version de l’application.
    if (existing?.dataUrl) return { ...existing };
    const o = owner || {};
    const name = o.type === 'COMPANY'
      ? [o.managerFirstName, o.managerLastName].filter(Boolean).join(' ') || o.name || ''
      : [o.firstName, o.lastName].filter(Boolean).join(' ');
    return { ownerIndex, token: existing?.token || createToken(), name, email: o.email || '', phone: o.phone || '' };
  }) };
}
