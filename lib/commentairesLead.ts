/**
 * Commentaires horodatés d'un lead — le journal de suivi du dossier.
 *
 * Distinct des `Action` : une action est une tâche À VENIR, qu'on coche quand
 * elle est faite. Un commentaire est une trace du PASSÉ, qui ne se modifie
 * plus. « Rappelé, il visite samedi » n'est pas une tâche, et le noter dans
 * une action datée d'aujourd'hui puis cochée aussitôt était le seul moyen
 * jusqu'ici de garder l'information.
 *
 * Les règles vivent ici, et non dans la route, pour la même raison que
 * validationLead : ce qui décide d'accepter ou de refuser doit être testable
 * sans lancer de serveur.
 */
import type { Commentaire } from './typesLead';

/**
 * Un commentaire de plus de 4 000 caractères n'est plus une note de suivi, et
 * le fichier leads.json est relu en entier à chaque écriture : on borne.
 */
export const LONGUEUR_MAX = 4000;

/**
 * Le texte est-il recevable ? Renvoie `null` s'il l'est, sinon le message.
 * Le seul refus est le vide : un commentaire blanc n'apprend rien et pollue
 * le journal, et c'est l'erreur de saisie la plus probable (entrée frappée
 * par mégarde dans la zone de texte).
 */
export function erreurCommentaire(texte: unknown): string | null {
  if (!String(texte ?? '').trim()) return 'Le commentaire est vide.';
  return null;
}

/**
 * Fabrique le commentaire à enregistrer.
 *
 * À APPELER AVANT updateJSON, jamais dedans : la fonction de mutation est
 * rejouée en cas de conflit d'écriture, et l'identifiant comme l'horodatage
 * changeraient d'une tentative à l'autre.
 */
export function nouveauCommentaire(texte: string, auteur?: string): Commentaire {
  return {
    id: `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    texte: String(texte).trim().slice(0, LONGUEUR_MAX),
    createdAt: new Date().toISOString(),
    ...(auteur ? { auteur } : {}),
  };
}

/**
 * Du plus récent au plus ancien : on ouvre une fiche pour savoir où en est le
 * dossier aujourd'hui, pas pour en relire la genèse.
 */
export function parOrdreAntichronologique(commentaires: Commentaire[] = []): Commentaire[] {
  return [...commentaires].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
