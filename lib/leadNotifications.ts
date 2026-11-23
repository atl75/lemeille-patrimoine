import type { Message, ResultatEnvoi } from './envoiEmail.ts';
import { emailPlausible } from './validationLead.ts';
import type { LeadEntrant } from './leadIntake.ts';

export function echapperHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}
const ligne = (label: string, value: unknown) =>
  `<tr><th style="text-align:left;padding:6px;vertical-align:top">${echapperHtml(label)}</th><td style="padding:6px">${echapperHtml(value === '' || value == null ? '—' : value)}</td></tr>`;

export function messageAgence(lead: LeadEntrant, to: string): Message {
  const titre = lead.source === 'estimation-immobilier' ? 'Nouvelle demande d’estimation'
    : lead.source === 'simulateur-defiscalisation' ? 'Nouvelle simulation de défiscalisation'
    : lead.source === 'guide-defiscalisation' ? 'Téléchargement de guide'
    : lead.role === 'VENDEUR' ? 'Nouveau projet de vente' : 'Nouvelle demande de contact';
  const nom = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
  const prop = lead.meta?.property;
  const details = prop ? `<h3>Le bien à estimer</h3><table>${[
    ligne('Adresse', prop.city), ligne('Type', prop.type), ligne('Surface (m²)', prop.surface),
    ligne('Pièces', prop.rooms), ligne('État', prop.condition), ligne('DPE', prop.dpe),
    ligne('Étage', prop.floor === 0 ? 'Rez-de-chaussée' : prop.floor), ligne('Balcon (m²)', prop.extBalcon),
    ligne('Atouts', [prop.elevator && 'Ascenseur', prop.parking && 'Parking', prop.extTerrasse && 'Terrasse',
      prop.extJardin && 'Jardin', prop.seaView && 'Vue mer', prop.pool && 'Piscine', prop.lumineux && 'Lumineux',
      prop.calme && 'Calme', prop.parquet && 'Parquet', prop.dressing && 'Dressing',
      prop.cuisineEquipee && 'Cuisine équipée', prop.cuisineRecente && 'Cuisine récente'].filter(Boolean).join(', ')),
  ].join('')}</table>` : '';
  return {
    to, copie: false,
    subject: `${titre} — ${nom || 'Contact du site'}`.replace(/[\r\n]/g, ' '),
    ...(emailPlausible(lead.email) ? { replyTo: lead.email } : {}),
    html: `<div style="font-family:Arial,sans-serif;color:#1F3B2C;max-width:600px;margin:auto;line-height:1.6">
      <h2>${titre}</h2><table>${ligne('Nom', nom)}${ligne('Email', lead.email)}${ligne('Téléphone', lead.phone)}
      ${ligne('Sujet', lead.topic)}${ligne('Source', lead.source)}${ligne('Référence', lead.id)}</table>
      ${lead.message ? `<h3>Message</h3><p>${echapperHtml(lead.message).replace(/\n/g, '<br>')}</p>` : ''}
      ${details}<p>Demande enregistrée dans le CRM le ${echapperHtml(new Date(lead.createdAt).toLocaleString('fr-FR'))}.</p>
    </div>`,
  };
}

export function messageAccuse(lead: LeadEntrant, signature: string): Message | null {
  if (!emailPlausible(lead.email)) return null;
  const suite = lead.source === 'estimation-immobilier'
    ? 'Je vous rappelle sous 48 heures pour échanger sur votre bien et organiser la visite. Je vous remets ensuite un avis de valeur argumenté sous 24 heures maximum après la visite.'
    : 'Je vous recontacte sous 48 heures pour échanger sur votre projet.';
  return {
    to: lead.email, copie: false, subject: 'Votre demande a bien été reçue — Lemeille Patrimoine',
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;font-size:14px;line-height:1.55">
      <p>Bonjour${lead.firstName ? ` ${echapperHtml(lead.firstName)}` : ''},</p>
      <p>Merci pour votre message. Votre demande est bien enregistrée.</p><p>${suite}</p>
      <p>Vous pouvez aussi me joindre directement au +33 6 87 15 72 59.</p><p>À très bientôt,</p>${signature}</div>`,
  };
}

// Transport injecté : les tests ne contactent jamais Resend.
export async function notifierLead(lead: LeadEntrant, options: {
  envoyer: (message: Message) => Promise<ResultatEnvoi>; agence: string; signature: string;
  noter?: (canal: 'agence'|'client', resultat: ResultatEnvoi) => Promise<void>;
}) {
  const envoyerSansLever = async (message: Message): Promise<ResultatEnvoi> => {
    try { return await options.envoyer(message); }
    catch { return { ok: false, raison: 'Transport email indisponible.' }; }
  };
  const accuse = messageAccuse(lead, options.signature);
  const envoyerEtNoter = async (canal: 'agence'|'client', message: Message) => {
    const resultat = await envoyerSansLever(message);
    try { await options.noter?.(canal,resultat); }
    catch { console.error('[leads] résultat notification non enregistré', {leadId:lead.id,canal}); }
    return resultat;
  };
  const [agence, client] = await Promise.all([
    envoyerEtNoter('agence',messageAgence(lead, options.agence)),
    accuse ? envoyerEtNoter('client',accuse) : Promise.resolve(null),
  ]);
  return { agence, client };
}
