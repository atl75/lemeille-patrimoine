/**
 * Règles de recevabilité d'un lead entrant.
 *
 * Vivent ici, et non dans la route, pour la même raison que validationBien :
 * une règle qui décide si l'on enregistre ou si l'on refuse doit être
 * testable sans lancer de serveur.
 *
 * CONTEXTE. /api/leads acceptait un corps VIDE et créait quand même
 * l'enregistrement — `{...body}` sans le moindre contrôle. Le limiteur de
 * débit borne la cadence, huit par IP et par dix minutes, mais pas le
 * contenu : un robot pouvait remplir le CRM d'entrées creuses, et un email
 * mal saisi passait sans un mot.
 */

/** Un email a-t-il une forme plausible ? Volontairement permissif. */
export function emailPlausible(v: unknown): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(String(v ?? '').trim());
}

/** Un téléphone exploitable : au moins huit chiffres, séparateurs ignorés. */
export function telephonePlausible(v: unknown): boolean {
  return String(v ?? '').replace(/\D/g, '').length >= 8;
}

/**
 * Le lead est-il JOIGNABLE ? Renvoie `null` s'il l'est, sinon le message à
 * afficher.
 *
 * Un email plausible OU un téléphone suffit. Tous les formulaires du site
 * envoient au moins l'email — vérifié un par un — la règle ne casse donc
 * aucune saisie légitime. L'admin authentifié n'y est pas soumis : il crée
 * parfois une fiche à partir d'un nom seul, en attendant les coordonnées.
 */
export function leadJoignable(body: any): string | null {
  const email = String(body?.email ?? '').trim();
  if (emailPlausible(email)) return null;
  if (telephonePlausible(body?.phone)) return null;
  if (email) return "L'adresse email n'est pas valide.";
  return 'Indiquez un email ou un numéro de téléphone pour être recontacté.';
}

/**
 * Borne la taille des champs texte. Rien ici ne justifie un roman, et un
 * champ démesuré alourdit le fichier de données pour tout le monde.
 */
const LONGUEURS: Record<string, number> = {
  firstName: 120, lastName: 120, name: 200, email: 200, phone: 40,
  message: 5000, topic: 200, source: 80, role: 40,
};

export function tronqueLead<T extends Record<string, any>>(body: T): T {
  const out: Record<string, any> = { ...body };
  for (const [champ, max] of Object.entries(LONGUEURS)) {
    if (typeof out[champ] === 'string') out[champ] = out[champ].slice(0, max);
  }
  return out as T;
}
