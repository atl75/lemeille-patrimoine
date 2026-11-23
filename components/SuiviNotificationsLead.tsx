import {libelleNotification, type SuiviNotificationLead} from '@/lib/suiviNotificationLead';

export default function SuiviNotificationsLead({suivi}:{suivi?:SuiviNotificationLead}) {
  if(!suivi || suivi.version!==1) return null;
  const attention=[suivi.agence,suivi.client].some(s=>!['ACCEPTE_SERVICE','SANS_EMAIL'].includes(s?.etat));
  return <details className={`w-full rounded border p-2 text-xs ${attention ? 'border-amber-300 bg-amber-50 text-amber-950':'border-stone-200 text-stone-700'}`} data-testid="suivi-notifications">
    <summary className="cursor-pointer font-medium">{attention ? 'Notifications à vérifier' : 'Suivi des notifications email'}</summary>
    <ul className="mt-2 space-y-1">{(['agence','client'] as const).map(canal=><li key={canal}>
      {canal==='agence' ? 'Agence' : 'Accusé au client'} : {libelleNotification(suivi[canal]?.etat)}
      {suivi[canal]?.checkedAt && <> · {new Date(suivi[canal].checkedAt!).toLocaleString('fr-FR')}</>}
    </li>)}</ul>
    <p className="mt-2">La demande est enregistrée dans le CRM. Aucun renvoi automatique n’est effectué. Avant tout nouvel envoi, vérifier le service email pour éviter un doublon ; ce suivi ne confirme ni réception en boîte ni lecture.</p>
  </details>;
}
