/** Projection en lecture seule : aucun jeton créé, aucune preuve exposée. */
export function liensSignatureExistants(document: any, base: string, legacy = false) {
  const signers = Array.isArray(document?.signers) && document.signers.length
    ? document.signers
    : legacy && document?.mandateSignToken
      ? [{ token: document.mandateSignToken, name: document.mandateSignerName,
          email: document.mandateSignerEmail, dataUrl: document.mandateSignature?.dataUrl,
          signed: document.mandateSignStatus === 'SIGNED' }]
      : [];
  return signers.map((s: any) => ({
    name: s.name || '', email: s.email || '', phone: s.phone || '',
    signed: !!(s.dataUrl || s.signed),
    url: typeof s.token === 'string' && s.token ? `${base.replace(/\/$/, '')}/mandat/signer/${encodeURIComponent(s.token)}` : '',
    // L'absence de preuve d'envoi n'est pas un échec de livraison.
    deliveryUnknown: true,
  }));
}
