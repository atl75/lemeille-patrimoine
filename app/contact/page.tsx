"use client";

import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import DeferredIframe from "@/components/DeferredIframe";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";
import BandeauReassurance from "@/components/BandeauReassurance";

// Lien de réservation en ligne (Calendly, RDV Google...). Laisser vide tant
// qu'il n'est pas défini : le bouton "Prendre rendez-vous" bascule alors sur
// un appel téléphonique.
const RDV_URL = process.env.NEXT_PUBLIC_RDV_URL || "";

const OFFICES = [
  { name: "Rouen", line: "35 rue Ganterie, 76000", query: "35 rue Ganterie, 76000 Rouen", testid: "link-map-rouen" },
  { name: "Siège social — Mont-Saint-Aignan", line: "50 rue de la Garenne, 76130", query: "50 rue de la Garenne, 76130 Mont-Saint-Aignan", testid: "link-map-siege" },
];

export default function Page(){
  const [ok,setOk] = useState<boolean|null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const r = await fetch("/api/leads", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    setOk(r.ok);
    if(r.ok){ trackEvent('generate_lead', 'contact', String((payload as any).topic || '')); (e.currentTarget as HTMLFormElement).reset(); }
  }

  return (
    <main>
      <Hero
        title="Contact"
        subtitle="Écrivez-nous, appelez-nous ou prenons rendez-vous — nos conseillers vous répondent sous 48h."
        primary={{ label: "Appeler", href: "tel:+33687157259" }}
        secondary={{ label: "Écrire", href: "#form" }}
      />
      <BandeauReassurance />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Contact"}]} />
      </section>

      <section className="container pb-12 grid md:grid-cols-2 gap-6">
        {/* Colonne gauche (et 1re en mobile) : contact direct + RDV + formulaire */}
        <div className="flex flex-col gap-6">
          {/* Contact direct */}
          <div className="card p-6">
            <h2 className="luxe text-xl mb-4">Nous joindre directement</h2>
            <div className="flex flex-col gap-2">
              <a href="tel:+33687157259" className="flex items-center gap-2 hover:text-[#B89C6D] transition-colors" data-testid="link-phone">
                <span>📞</span>
                <span>+33 6 87 15 72 59</span>
              </a>
              <a href="mailto:arthur.lemeille@lemeillepatrimoine.com" className="flex items-center gap-2 hover:text-[#B89C6D] transition-colors" data-testid="link-email">
                <span>✉️</span>
                <span>arthur.lemeille@lemeillepatrimoine.com</span>
              </a>
            </div>
          </div>

          {/* Prendre rendez-vous */}
          <div className="card p-6">
            <h2 className="luxe text-xl mb-2">Prendre rendez-vous</h2>
            <p className="text-sm opacity-80 mb-4">
              Réservez un échange avec un conseiller, en visio ou dans l&apos;un de nos bureaux.
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
          <form id="form" onSubmit={onSubmit} className="card p-6">
            <h2 className="luxe text-xl mb-4">Contactez-nous</h2>
            <div className="grid gap-3">
              <input aria-label="Prénom" className="input" name="firstName" placeholder="Prénom" required />
              <input aria-label="Nom" className="input" name="lastName" placeholder="Nom" required />
              <input aria-label="Email" className="input" type="email" name="email" placeholder="Email" required />
              <input aria-label="Téléphone" className="input" name="phone" placeholder="Téléphone" />
              <select className="input" name="topic" aria-label="Sujet de votre demande" defaultValue="Immobilier">
                <option>Immobilier</option><option>Défiscalisation</option><option>Autre</option>
              </select>
              <textarea aria-label="Votre message" className="input" name="message" placeholder="Votre message" rows={5} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="consent" required /> J&apos;accepte la politique de confidentialité.</label>
              <button className="btn btn-gold mt-2" type="submit">Envoyer</button>
              {ok === true && <div className="text-green-700 text-sm">Merci, votre message a bien été envoyé.</div>}
              {ok === false && <div className="text-red-700 text-sm">Un problème est survenu. Réessayez.</div>}
            </div>
          </form>
        </div>

        {/* Colonne droite (et 2e en mobile) : bureaux */}
        <div className="card p-6">
          <h2 className="luxe text-xl mb-4">Nos bureaux</h2>
          {OFFICES.map((o, idx) => (
            <div key={o.testid} className={idx < OFFICES.length - 1 ? "mb-6" : ""}>
              <div className="font-semibold">{o.name}</div>
              <div>{o.line}</div>
              <div className="mt-2 rounded-2xl overflow-hidden border relative group">
                <DeferredIframe
                  title={`${o.name} — ${o.line}`}
                  src={"https://www.google.com/maps?hl=fr&q="+encodeURIComponent(o.query)+"&z=16&output=embed"}
                  className="w-full h-60 border-0"
                />
                <a
                  href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(o.query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                  data-testid={o.testid}
                >
                  <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-2xl shadow-lg text-sm font-medium transition-opacity">
                    Ouvrir dans Google Maps
                  </span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
