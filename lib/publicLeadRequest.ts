/** Une clé stable pendant cet envoi permet au serveur de dédupliquer une relance. */
export function nouvelleCleIdempotence() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid || `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/** Une instance par formulaire, conservée pendant son montage. Aucune donnée persistée. */
export function creerEnvoiDemandePublique(transport: typeof fetch = fetch, delaiMs = 30_000, creerCle = nouvelleCleIdempotence) {
  let tentative: { corps: string; cle: string } | undefined;
  let enCours: Promise<string> | undefined;
  return (payload: Record<string, unknown>): Promise<string> => {
    const corps = JSON.stringify(payload);
    if (enCours) {
      if (tentative?.corps === corps) return enCours;
      return Promise.reject(new Error('Une demande est déjà en cours. Attendez sa confirmation avant de modifier votre envoi.'));
    }
    // Un changement de coordonnées, de message ou de guide constitue une nouvelle demande.
    if (tentative?.corps !== corps) tentative = { corps, cle: creerCle() };
    enCours = envoyerDemandePublique(JSON.parse(corps), transport, delaiMs, tentative.cle)
      .then(id => { tentative = undefined; return id; })
      .finally(() => { enCours = undefined; });
    return enCours;
  };
}

/** Le succès signifie que le CRM a enregistré la demande, pas que l’email est livré. */
export async function envoyerDemandePublique(payload: Record<string, unknown>, transport: typeof fetch = fetch, delaiMs = 30_000, idempotencyKey = nouvelleCleIdempotence()) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Limite l’attente des en-têtes ET du corps. Une annulation navigateur
  // ne prouve pas que le serveur n’a rien enregistré : aucune relance automatique.
  const expiration = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Le délai de confirmation est dépassé. Votre demande a peut-être été enregistrée. Avant de la renvoyer, contactez Arthur au 06 87 15 72 59.'));
      controller.abort();
    }, delaiMs);
  });
  try {
    return await Promise.race([expiration, (async () => {
      const response = await transport('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true || typeof result?.id !== 'string' || !result.id) {
        throw new Error(typeof result?.error === 'string' ? result.error
          : 'Votre demande n’a pas pu être confirmée. Réessayez ou appelez le 06 87 15 72 59.');
      }
      return result.id as string;
    })()]);
  } finally {
    clearTimeout(timer);
  }
}
