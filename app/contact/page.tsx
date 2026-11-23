"use client";

import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import MapEmbed from "@/components/MapEmbed";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { creerEnvoiDemandePublique } from "@/lib/publicLeadRequest";
import { referenceBien, contexteBien } from "@/lib/propertyContact";
import { referenceLot, contexteProgramme, lienProgramme } from "@/lib/programContact";

// Lien de réservation en ligne (Calendly, RDV Google...). Laisser vide tant
// qu'il n'est pas défini : le bouton "Prendre rendez-vous" bascule alors sur
// un appel téléphonique.
const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL || "";
const TOPICS = ['Vendre', 'Estimation', 'Acheter', 'Immobilier', 'Défiscalisation', 'Autre'];

const OFFICES = [
  { name: "Rouen", line: "35 rue Ganterie, 76000", query: "35 rue Ganterie, 76000 Rouen", testid: "link-map-rouen" },
  { name: "Siège social — Mont-Saint-Aignan", line: "50 rue de la Garenne, 76130", query: "50 rue de la Garenne, 76130 Mont-Saint-Aignan", testid: "link-map-siege" },
];

export default function Page(){
  const [ok,setOk] = useState<boolean|null>(null);
  const [sending, setSending] = useState(false);
  const [erreur, setErreur] = useState('');
  const [topic, setTopic] = useState('Immobilier');
  const [bienRef, setBienRef] = useState('');
  const [programmeRef, setProgrammeRef] = useState('');
  const [lotRef, setLotRef] = useState('');
  const contexte = bienRef ? contexteBien(bienRef) : contexteProgramme(programmeRef, lotRef);
  const envoiEnCours = useRef(false);
  const [envoyerDemande] = useState(() => creerEnvoiDemandePublique());
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sujet = params.get('topic');
    const ref = referenceBien(params.get('ref'));
    setBienRef(ref);
    const programme = ref ? '' : referenceBien(params.get('programme'));
    setProgrammeRef(programme);
    setLotRef(programme ? referenceLot(params.get('lot')) : '');
    if (programme) setTopic('Défiscalisation');
    if (ref) setTopic('Acheter');
    if (sujet && TOPICS.includes(sujet)) setTopic(sujet);
    if (params.get('ok') === '1') setOk(true);
  }, []);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if (envoiEnCours.current) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = { ...Object.fromEntries(fd.entries()),
      message: contexte + String(fd.get('message') || ''),
      source: 'contact-form', consent: fd.get('consent') === 'on' };
    envoiEnCours.current = true;
    setSending(true); setOk(null); setErreur('');
    try {
      await envoyerDemande(payload);
      setOk(true);
      form.reset();
      try { trackEvent('generate_lead', 'contact'); } catch { /* La mesure ne bloque pas la confirmation. */ }
    } catch (error) {
      setOk(false);
      setErreur(error instanceof Error ? error.message : 'Vérifiez votre connexion ou appelez le 06 87 15 72 59.');
    } finally {
      envoiEnCours.current = false;
      setSending(false);
    }
  }

  return (
    <main>
      <Hero
        title="Contact"
        subtitle="Un projet de vente ou une question ? Écrivez-moi ou appelez-moi : je vous réponds personnellement sous 48h."
        primary={{ label: "Appeler", href: "tel:+33687157259" }}
        secondary={{ label: "Écrire", href: "#form" }}
        image="/hero-normandie.jpg"
        compact
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Contact"}]} />
      </section>

      <section className="container pb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colonne gauche (et 1re en mobile) : contact direct + RDV + formulaire */}
        <div className="flex flex-col gap-6">
          {/* Contact direct */}
          <div className="card p-6">
            <h2 className="luxe text-xl mb-4">Me joindre directement</h2>
            <div className="flex flex-col gap-2">
              <a href="tel:+33687157259" className="flex items-center gap-2 hover:text-[#B89C6D] transition-colors" data-testid="link-phone">
                <span>📞</span>
                <span>+33 6 87 15 72 59</span>
              </a>
              <a href="mailto:arthur@lemeillepatrimoine.com" className="flex items-center gap-2 hover:text-[#B89C6D] transition-colors" data-testid="link-email">
                <span>✉️</span>
                <span>arthur@lemeillepatrimoine.com</span>
              </a>
            </div>
          </div>

          {/* Prendre rendez-vous */}
          <div className="card p-6">
            <h2 className="luxe text-xl mb-2">Prendre rendez-vous</h2>
            <p className="text-sm opacity-80 mb-4">
              Prenons le temps d&apos;échanger sur votre projet, par téléphone, en visio ou sur rendez-vous à Rouen.
            </p>
            {RDV_URL ? (
              <a href={RDV_URL} target="_blank" rel="noopener noreferrer" className="btn btn-gold" data-testid="link-rdv">
                Choisir un créneau
              </a>
            ) : (
              <a href="tel:+33687157259" className="btn btn-gold" data-testid="link-rdv">
                Prendre rendez-vous par téléphone
              </a>
            )}
          </div>

          {/* Formulaire */}
          <form id="form" onSubmit={onSubmit} className="card p-6 scroll-mt-24" aria-busy={sending}>
            <h2 className="luxe text-xl mb-2">Parlons de votre projet</h2>
            <p className="text-sm text-luxe/75 mb-4">Votre message m&apos;est directement destiné. — Arthur Lemeille</p>
            <fieldset disabled={sending} className="grid gap-3">
              <legend className="sr-only">Votre demande de contact</legend>
              {bienRef && <div className="rounded-xl border border-luxe/20 bg-luxe/5 p-3 text-sm" id="bien-contexte">
                <p>Bien concerné : <a className="underline break-all" href={`/immobilier/biens/${bienRef}`}>{bienRef}</a></p>
                <p className="mt-1 text-luxe/75">Cette référence sera jointe à votre message.</p>
                <button type="button" className="underline underline-offset-2 min-h-11" onClick={() => setBienRef('')}>Retirer la référence</button>
              </div>}
              {programmeRef && <div className="rounded-xl border border-luxe/20 bg-luxe/5 p-3 text-sm" id="programme-contexte">
                <p>Programme concerné : <a className="underline break-all" href={lienProgramme(programmeRef, lotRef)}>{programmeRef}{lotRef ? ` — Lot ${lotRef}` : ''}</a></p>
                <p className="mt-1 text-luxe/75">Cette référence sera jointe à votre message.</p>
                <button type="button" className="underline underline-offset-2 min-h-11" onClick={() => { setProgrammeRef(''); setLotRef(''); }}>Retirer la référence</button>
              </div>}
              <label className="grid gap-1 text-sm">Prénom<input className="input" name="firstName" autoComplete="given-name" maxLength={120} required /></label>
              <label className="grid gap-1 text-sm">Nom<input className="input" name="lastName" autoComplete="family-name" maxLength={120} required /></label>
              <label className="grid gap-1 text-sm">Email<input className="input" type="email" name="email" autoComplete="email" maxLength={200} required /></label>
              <label className="grid gap-1 text-sm">Téléphone (facultatif)<input className="input" type="tel" name="phone" autoComplete="tel" maxLength={40} /></label>
              <label className="grid gap-1 text-sm">Sujet de votre demande
                <select className="input" name="topic" value={topic} onChange={e => setTopic(e.target.value)}>
                  {TOPICS.map(sujet => <option key={sujet}>{sujet}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">Votre message<textarea className="input" name="message" rows={5} maxLength={5000 - contexte.length} aria-describedby={bienRef ? 'bien-contexte' : programmeRef ? 'programme-contexte' : undefined} /></label>
              <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" name="consent" required />
                <span>J&apos;accepte d&apos;être recontacté au sujet de ma demande. <a href="/confidentialite" className="underline underline-offset-2">Utilisation de mes données</a>.</span>
              </label>
              <button className="btn btn-gold mt-2 disabled:opacity-60" type="submit">{sending ? 'Envoi en cours…' : 'Envoyer ma demande'}</button>
            </fieldset>
            {ok === true && <div role="status" className="text-green-800 text-sm mt-4">Merci, votre demande est bien enregistrée. Je vous réponds sous 48h. — Arthur Lemeille</div>}
            {ok === false && <div role="alert" className="text-red-800 text-sm mt-4">{erreur}</div>}
          </form>
        </div>

        {/* Colonne droite (et 2e en mobile) : bureaux */}
        <div className="card p-6">
          <h2 className="luxe text-xl mb-4">Où me rencontrer</h2>
          {OFFICES.map((o, idx) => (
            <div key={o.testid} className={idx < OFFICES.length - 1 ? "mb-6" : ""}>
              <div className="font-semibold">{o.name}</div>
              <div>{o.line}</div>
              <div className="mt-2">
                <MapEmbed query={o.query} precision="EXACT" height="240px" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
