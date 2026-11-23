import type { ResultatEnvoi } from './envoiEmail.ts';
import { emailPlausible } from './validationLead.ts';

export type EtatNotification = 'EN_ATTENTE' | 'ACCEPTE_SERVICE' | 'NON_CONFIRME' | 'NON_CONFIGURE' | 'SANS_EMAIL';
export type SuiviNotificationLead = { version: 1; startedAt: string;
  agence: { etat: EtatNotification; checkedAt?: string; providerId?: string };
  client: { etat: EtatNotification; checkedAt?: string; providerId?: string } };

export function initialiserSuiviNotification(email: unknown, date: string): SuiviNotificationLead {
  return {version:1,startedAt:date,agence:{etat:'EN_ATTENTE'},client:{etat:emailPlausible(email) ? 'EN_ATTENTE':'SANS_EMAIL'}};
}

/** Mise à jour du seul canal concerné sur la lecture fraîche, sans recréer un prospect supprimé. */
export function noterNotification(leads: any[], id: string, startedAt: string, canal: 'agence'|'client', resultat: ResultatEnvoi, date: string, sansEcriture: symbol) {
  const lead=leads.find(l=>l.id===id);
  const suivi=lead?.notificationSuivi;
  if(suivi?.version!==1 || suivi.startedAt!==startedAt || suivi[canal]?.etat!=='EN_ATTENTE') return sansEcriture;
  suivi[canal]={etat:resultat.ok ? 'ACCEPTE_SERVICE' : resultat.configuration ? 'NON_CONFIGURE' : 'NON_CONFIRME',checkedAt:date,
    ...(resultat.ok && typeof resultat.id==='string' ? {providerId:resultat.id.slice(0,200)} : {})};
  // Ne pas conserver d'erreur brute susceptible de contenir une adresse ou un secret.
  return leads;
}

export function libelleNotification(etat: EtatNotification): string {
  return ({EN_ATTENTE:'Résultat non enregistré (en cours ou interrompu)',ACCEPTE_SERVICE:'Accepté par le service — livraison non confirmée',
    NON_CONFIRME:'Envoi non confirmé — vérification nécessaire',NON_CONFIGURE:'Envoi non configuré',SANS_EMAIL:'Non prévu : aucune adresse email'} as const)[etat] || 'État inconnu — à vérifier';
}
