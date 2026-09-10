import { MAIL_COPY } from './mailCopy.ts';

/**
 * Le seul point d'envoi d'email du projet.
 *
 * POURQUOI IL EXISTE. Le SDK Resend ne LÈVE pas ses erreurs, il les RENVOIE :
 * `send()` résout vers `{ data, error: null }` ou `{ error, data: null }` — c'est
 * écrit dans ses propres types. Onze appels du projet faisaient donc
 *
 *     try { await resend.emails.send(...); envoye = true; }
 *     catch { envoye = false; }
 *
 * où le `catch` ne se déclenche que sur une panne réseau. Un domaine non
 * vérifié, un quota dépassé, une adresse refusée — les cas courants — passaient
 * pour des succès. L'agent lisait « lien de signature envoyé », le client ne
 * recevait rien, et personne n'attendait au bon endroit.
 *
 * Cette fonction NE LÈVE JAMAIS : elle rend un résultat qu'il faut lire. C'est
 * volontaire — un envoi raté ne doit pas faire échouer l'enregistrement du
 * mandat qui vient d'être signé, mais il doit se voir.
 */

export type ResultatEnvoi =
  | { ok: true; id?: string }
  | { ok: false; raison: string; configuration?: boolean };

export type Piece = { filename: string; content: string };

export type Message = {
  to: string | string[];
  subject: string;
  html: string;
  /** Arthur en copie cachée par défaut ; passer `false` pour un envoi qui lui est destiné. */
  copie?: boolean;
  attachments?: Piece[];
  replyTo?: string;
};

/** Expéditeur commun, pour ne pas le recopier à chaque appel. */
function expediteur(): string {
  return process.env.RESEND_FROM || 'Lemeille Patrimoine <onboarding@resend.dev>';
}

/**
 * Met une erreur Resend en français lisible dans un journal.
 *
 * Le nom de l'erreur porte l'essentiel du diagnostic : `validation_error` sur
 * un domaine non vérifié n'appelle pas la même action que `rate_limit_exceeded`.
 */
function raisonLisible(erreur: any): string {
  const nom = erreur?.name ? String(erreur.name) : '';
  const message = erreur?.message ? String(erreur.message) : 'cause inconnue';
  return nom ? `${nom} — ${message}` : message;
}

export async function envoyerEmail(m: Message): Promise<ResultatEnvoi> {
  if (!process.env.RESEND_API_KEY) {
    // Ce n'est pas une panne, c'est une absence de configuration. Le distinguer
    // évite d'alerter l'agent en développement, où la clé n'est pas posée.
    return { ok: false, raison: "L'envoi d'email n'est pas configuré (RESEND_API_KEY absente).", configuration: true };
  }

  const destinataires = (Array.isArray(m.to) ? m.to : [m.to])
    .map((x) => String(x ?? '').trim())
    .filter((x) => /.+@.+\..+/.test(x));
  if (!destinataires.length) return { ok: false, raison: 'Aucune adresse destinataire valide.' };

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: expediteur(),
      to: destinataires,
      ...(m.copie === false ? {} : { bcc: MAIL_COPY }),
      subject: m.subject,
      html: m.html,
      ...(m.replyTo ? { replyTo: m.replyTo } : {}),
      ...(m.attachments?.length ? { attachments: m.attachments } : {}),
    } as any);

    // LA LIGNE POUR LAQUELLE CE FICHIER EXISTE.
    if (error) {
      console.error('[email] refusé par Resend :', raisonLisible(error), '→', destinataires.join(', '));
      return { ok: false, raison: raisonLisible(error) };
    }
    return { ok: true, id: data?.id };
  } catch (e: any) {
    // Ici seulement : panne réseau, DNS, coupure.
    console.error('[email] envoi impossible :', e);
    return { ok: false, raison: e?.message ? String(e.message) : 'envoi impossible' };
  }
}

/**
 * Envoie plusieurs messages et rend le compte de ce qui est réellement parti.
 *
 * Sert aux envois en lot (alerte nouveaux biens, propositions de biens) où
 * l'échec d'un destinataire ne doit pas masquer le succès des autres — ni
 * l'inverse, ce qui était le cas avec `Promise.allSettled` sans lecture.
 */
export async function envoyerLot(messages: Message[]): Promise<{ envoyes: number; echecs: string[] }> {
  const resultats = await Promise.all(messages.map((m) => envoyerEmail(m)));
  const echecs = resultats.filter((r): r is Extract<ResultatEnvoi, { ok: false }> => !r.ok).map((r) => r.raison);
  return { envoyes: resultats.length - echecs.length, echecs };
}
