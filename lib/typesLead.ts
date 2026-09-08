/**
 * Types et règles pures du suivi des leads.
 *
 * Extraits de components/LeadsBoard.tsx, qui portait 1 624 lignes : les types,
 * le calcul de relance et le formatage vivaient au-dessus du composant, donc
 * rechargés avec lui et intestables séparément. Ce module n'a aucune dépendance
 * React — il se teste directement.
 */
export type Action = {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'other';
  description: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
};

/**
 * Une note de suivi horodatée. Écrite une fois, jamais modifiée : c'est ce qui
 * en fait un journal fiable. Voir lib/commentairesLead.ts pour les règles.
 */
export type Commentaire = {
  id: string;
  texte: string;
  createdAt: string;
  auteur?: string;
};

export type Attachment = {
  id: string;
  name: string;
  type: string;
  data: string; // Base64
  uploadedAt: string;
};

export type Lead = {
  id: string;
  createdAt: string;
  lastActivityAt?: string;
  status?: string;
  category?: 'immobilier' | 'patrimoine';
  role?: 'ACHETEUR' | 'VENDEUR';
  company?: boolean;
  companyName?: string;
  siren?: string;
  legalForm?: string;
  managerFirstName?: string;
  managerLastName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  topic?: string;
  source?: string;
  message?: string;
  meta?: any;
  actions?: Action[];
  attachments?: Attachment[];
  commentaires?: Commentaire[];
  // Critères de recherche (leads acheteurs)
  buyerCriteria?: { budgetMin?: number; budgetMax?: number; sector?: string; type?: string; roomsMin?: number; surfaceMin?: number };
  buyerSegment?: 'ANCIEN' | 'DEFISCALISATION';
  interestPropertyId?: string;
  priority?: 'hot' | 'warm' | 'cold' | null;
};

// Un lead est « à relancer » s'il n'est pas clôturé et qu'aucune action récente
// n'a eu lieu depuis un délai fonction de son statut (nouveau 3j, contacté 5j, qualifié 10j).
export const daysSince = (iso?: string) => iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : Infinity;
export function needsFollowUp(l: Lead): boolean {
  const s = l.status || 'new';
  if (s === 'closed') return false;
  const threshold = s === 'contacted' ? 5 : s === 'qualified' ? 10 : 3;
  return daysSince(l.lastActivityAt || l.createdAt) >= threshold;
}

// Priorisation / scoring des leads (cliquable, cycle none → chaud → tiède → froid).
export const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  hot: { label: '🔥 Chaud', cls: 'bg-red-100 border-red-300 text-red-700' },
  warm: { label: '🌤️ Tiède', cls: 'bg-amber-100 border-amber-300 text-amber-700' },
  cold: { label: '❄️ Froid', cls: 'bg-sky-100 border-sky-300 text-sky-700' },
};
export const PRIORITY_CYCLE: (('hot' | 'warm' | 'cold' | null))[] = [null, 'hot', 'warm', 'cold'];

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
