import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleIdempotenceValide, ErreurDemande, lireCorpsPublic, preparerLead, enregistrerDemande } from '../lib/leadIntake.ts';
import { echapperHtml, messageAgence, messageAccuse, notifierLead } from '../lib/leadNotifications.ts';
import { envoyerDemandePublique } from '../lib/publicLeadRequest.ts';
import type { Message } from '../lib/envoiEmail.ts';

const DATE = '2026-09-10T12:00:00.000Z';
const contact = { firstName: 'Test', lastName: 'Local', email: 'test@example.com', consent: true, topic: 'Vendre' };
const preparer = (body: unknown, admin = false, key?: string) => preparerLead(body, admin, 'L-serveur', DATE, key);
const requete = (body: unknown) => new Request('http://localhost/api/leads', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('réception des demandes publiques', () => {
  test('clé d’idempotence valide conservée côté serveur, jamais fournie par le CRM', () => {
    assert.equal(cleIdempotenceValide('web-abc12345'), true);
    assert.equal(cleIdempotenceValide('court'), false);
    assert.equal(cleIdempotenceValide('a'.repeat(129)), false);
    assert.equal(preparer(contact, false, 'web-abc12345').idempotencyKey, 'web-abc12345');
    assert.equal(preparer({ ...contact, idempotencyKey: 'client' }, true, 'web-abc12345').idempotencyKey, undefined);
  });

  test('contact sans source : classé vendeur et source contact-form', () => {
    const lead = preparer(contact);
    assert.equal(lead.source, 'contact-form');
    assert.equal(lead.role, 'VENDEUR');
    assert.equal(lead.category, 'immobilier');
    assert.deepEqual(lead.consentRecord, {
      acceptedAt: DATE, purpose: 'traitement-demande-et-recontact', noticePath: '/confidentialite', recordVersion: '2026-09-10',
    });
  });

  test('un visiteur ne choisit ni identifiant, ni date, ni statut, ni rôle ou notes internes', () => {
    const lead = preparer({ ...contact, id: 'existant', createdAt: 'hier', status: 'closed', role: 'ACHETEUR',
      attachments: ['privé'], actions: ['fausse action'], consentRecord: { acceptedAt: 'hier' },
      meta: { inconnu: 'à supprimer', property: { city: 'Rouen', owners: ['privé'] } } });
    assert.equal(lead.id, 'L-serveur'); assert.equal(lead.createdAt, DATE); assert.equal(lead.status, 'new');
    assert.equal(lead.role, 'VENDEUR'); assert.equal(lead.attachments, undefined); assert.equal(lead.actions, undefined);
    assert.equal(lead.meta.inconnu, undefined); assert.equal(lead.meta.property.owners, undefined);
  });

  test('les six sources actuellement publiques sont acceptées', () => {
    const exemples = [
      { source: 'contact-form' },
      { source: 'estimation-immobilier', phone: '0600000000', meta: { property: { city: 'Rouen', surface: 80, dpe: 'Inconnu' } } },
      { source: 'simulateur-defiscalisation', meta: { dispositif: 'Malraux', travaux: 100000, tmi: 0.3, estimation: 30000 } },
      { source: 'guide-defiscalisation', meta: { guide: 'malraux', guideTitle: 'Guide Malraux' } },
      { source: 'simulateur-capacite-emprunt', meta: { revenus: 4000, apport: 20000, duree: 20, budget: 200000 } },
      { source: 'simulateur-financement-bien', meta: { charges: 0, assurance: 0.3, mensualiteMax: 1400 } },
    ];
    for (const exemple of exemples) assert.equal(preparer({ ...contact, ...exemple }).source, exemple.source);
  });

  test('aucun enregistrement public sans accord explicite', () => {
    for (const consent of [undefined, false, 'false', 1, {}]) {
      assert.throws(() => preparer({ ...contact, consent }), ErreurDemande);
    }
    assert.equal(preparer({ ...contact, consent: 'on' }).consent, true);
  });

  test('entrées invalides ou démesurées refusées', () => {
    for (const body of [null, [], {}, { ...contact, email: 'invalide' },
      { ...contact, email: '', phone: '123' }, { ...contact, message: 'x'.repeat(5001) },
      { ...contact, firstName: {} }, { ...contact, source: 'admin' },
      { ...contact, meta: { property: { surface: -20 } } }]) {
      assert.throws(() => preparer(body), ErreurDemande);
    }
  });

  test('adresse et surface indispensables à une estimation', () => {
    for (const property of [{}, { city: 'Rouen' }, { city: 'Rouen', surface: '' }]) {
      assert.throws(() => preparer({ ...contact, source: 'estimation-immobilier', meta: { property } }), ErreurDemande);
    }
  });

  test('téléphone seul accepté ; email renseigné mais erroné refusé', () => {
    assert.equal(preparer({ ...contact, email: '', phone: '0600000000' }).phone, '0600000000');
    assert.throws(() => preparer({ ...contact, email: 'erreur', phone: '0600000000' }), ErreurDemande);
  });

  test('saisie CRM : nom seul, pièces et rôle conservés, mais ID généré', () => {
    const lead = preparer({ firstName: 'Test', role: 'ACHETEUR', attachments: ['fictif'], status: 'qualified', id: 'existant' }, true);
    assert.equal(lead.role, 'ACHETEUR'); assert.equal(lead.status, 'qualified');
    assert.deepEqual(lead.attachments, ['fictif']); assert.equal(lead.id, 'L-serveur');
    assert.equal(lead.consentRecord, undefined);
  });
});

describe('lecture HTTP bornée', () => {
  test('JSON, formulaire URL-encodé et FormData convergent vers le même format', async () => {
    assert.deepEqual(await lireCorpsPublic(requete(contact)), contact);
    const champs = { firstName: 'Test', email: 'test@example.com', topic: 'Vendre', consent: 'on' };
    const form = new FormData(); Object.entries(champs).forEach(([k, v]) => form.set(k, v));
    for (const body of [new URLSearchParams(champs), form]) {
      const req = new Request('http://localhost/api/leads', { method: 'POST', body });
      assert.deepEqual(await lireCorpsPublic(req), { ...champs, source: 'contact-form' });
    }
  });

  test('JSON illisible renvoie une erreur de demande, pas une erreur serveur', async () => {
    const req = new Request('http://localhost/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    await assert.rejects(() => lireCorpsPublic(req), (e: unknown) => e instanceof ErreurDemande && e.status === 400);
  });

  test('limite réelle même sans Content-Length, comptée en octets UTF-8', async () => {
    await assert.rejects(() => lireCorpsPublic(requete({ message: 'é'.repeat(17000) })),
      (e: unknown) => e instanceof ErreurDemande && e.status === 413);
  });

  test('formats non autorisés et taille annoncée excessive refusés', async () => {
    await assert.rejects(() => lireCorpsPublic(new Request('http://localhost', { method: 'POST', body: 'abc' })),
      (e: unknown) => e instanceof ErreurDemande && e.status === 415);
    const req = requete(contact); req.headers.set('Content-Length', '40000');
    await assert.rejects(() => lireCorpsPublic(req), (e: unknown) => e instanceof ErreurDemande && e.status === 413);
  });
});

describe('notifications sans transport externe', () => {
  test('contact enregistré une fois avant notification agence et accusé client', async () => {
    const lead = preparer(contact), events: string[] = [], messages: Message[] = [];
    await enregistrerDemande(lead, false, async () => { events.push('sauvegarde'); }, async payload => {
      assert.deepEqual(events, ['sauvegarde']);
      return notifierLead(payload, { agence: 'agence@example.com', signature: '<p>Arthur Lemeille</p>',
        envoyer: async message => { messages.push(message); return { ok: true, id: 'test' }; } });
    });
    assert.equal(messages.length, 2);
    assert.equal(messages[0].to, 'agence@example.com'); assert.equal(messages[0].replyTo, contact.email);
    assert.match(messages[0].subject, /projet de vente/);
    assert.equal(messages[1].to, contact.email);
    assert.ok(messages.every(message => message.copie === false));
    assert.match(messages[1].html, /Je vous recontacte/);
    assert.doesNotMatch(messages[1].html, /conseillers|un conseiller/);
  });

  test('aucun email si le stockage échoue', async () => {
    let envois = 0;
    await assert.rejects(() => enregistrerDemande(preparer(contact), false,
      async () => { throw new Error('stockage'); }, async () => { envois++; }));
    assert.equal(envois, 0);
  });

  test('aucune notification pour une saisie manuelle admin', async () => {
    let envois = 0, sauvegardes = 0;
    await enregistrerDemande(preparer(contact, true), true, async () => { sauvegardes++; }, async () => { envois++; });
    assert.equal(sauvegardes, 1); assert.equal(envois, 0);
  });

  test('refus Resend et panne réseau ne font pas perdre le lead sauvegardé', async () => {
    let sauvegardes = 0;
    await enregistrerDemande(preparer(contact), false, async () => { sauvegardes++; }, async lead => {
      const result = await notifierLead(lead, { agence: 'agence@example.com', signature: '',
        envoyer: async message => { if (message.to === 'agence@example.com') throw new Error('réseau'); return { ok: false, raison: 'quota' }; } });
      assert.equal(result.agence.ok, false); assert.equal(result.client?.ok, false);
    });
    assert.equal(sauvegardes, 1);
  });

  test('sans email client, seule l’agence est notifiée', async () => {
    const messages: Message[] = [];
    const result = await notifierLead(preparer({ ...contact, email: '', phone: '0600000000' }), {
      agence: 'agence@example.com', signature: '', envoyer: async m => { messages.push(m); return { ok: true }; },
    });
    assert.equal(messages.length, 1); assert.equal(result.client, null);
  });

  test('contenu utilisateur échappé dans les emails ; signature conservée', () => {
    const lead = preparer({ ...contact, firstName: '<img src=x>', message: '<script>alert(1)</script>\nFin' });
    const agence = messageAgence(lead, 'agence@example.com');
    assert.doesNotMatch(agence.html, /<script>|<img/);
    assert.match(agence.html, /&lt;script&gt;/); assert.match(agence.html, /<br>Fin/);
    const client = messageAccuse(lead, '<p>Signature officielle</p>')!;
    assert.match(client.html, /&lt;img src=x&gt;/); assert.match(client.html, /<p>Signature officielle<\/p>/);
    assert.equal(echapperHtml('"\'&<>'), '&quot;&#39;&amp;&lt;&gt;');
  });

  test('confirmation estimation : délai après visite, pas de prix automatique', () => {
    const lead = preparer({ ...contact, source: 'estimation-immobilier', meta: { property: { city: 'Rouen', surface: 80 } } });
    assert.match(messageAccuse(lead, '')!.html, /24 heures maximum après la visite/);
    assert.match(messageAgence(lead, 'agence@example.com').html, /Rouen/);
  });
});

describe('confirmation côté navigateur', () => {
  test('succès uniquement si l’API confirme un ID enregistré', async () => {
    const id = await envoyerDemandePublique(contact, async (_url, init) => {
      assert.equal(init?.method, 'POST'); assert.deepEqual(JSON.parse(String(init?.body)), contact);
      assert.match(String((init?.headers as Record<string, string>)['Idempotency-Key']), /^[A-Za-z0-9._:-]{8,128}$/);
      return Response.json({ success: true, id: 'L-test' });
    });
    assert.equal(id, 'L-test');
  });
  test('400, 429 et 500 restent des erreurs visibles', async () => {
    for (const status of [400, 429, 500]) {
      await assert.rejects(() => envoyerDemandePublique(contact, async () => Response.json({ error: 'Réessayez plus tard' }, { status })), /Réessayez plus tard/);
    }
  });
  test('réseau coupé, faux 200 et corps illisible ne sont pas confirmés', async () => {
    await assert.rejects(() => envoyerDemandePublique(contact, async () => { throw new Error('réseau'); }), /réseau/);
    for (const response of [Response.json({}), Response.json({ success: true }), new Response('<html>Erreur</html>')]) {
      await assert.rejects(() => envoyerDemandePublique(contact, async () => response));
    }
  });
});
