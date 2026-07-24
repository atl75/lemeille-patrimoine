"use client";

import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import { useState } from "react";

export default function Page(){
  const [ok,setOk] = useState<boolean|null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const r = await fetch("/api/leads", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    setOk(r.ok);
    if(r.ok) (e.currentTarget as HTMLFormElement).reset();
  }

  return (
    <main>
      <Hero
        title="Contact"
        subtitle="Deux bureaux pour vous recevoir : Rouen et Fréjus."
        primary={{ label: "Appeler", href: "tel:+33687157259" }}
        secondary={{ label: "Écrire", href: "#form" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Contact"}]} />
      </section>

      <section className="container pb-12 grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="luxe text-xl mb-4">Nos bureaux</h2>
          
          <div className="mb-6 pb-6 border-b">
            <div className="flex flex-col gap-2">
              <a href="tel:+33687157259" className="flex items-center gap-2 hover:text-[#B89C6D] transition-colors" data-testid="link-phone">
                <span>📞</span>
                <span>06 87 15 72 59</span>
              </a>
              <a href="mailto:arthur.lemeille@lemeillepatrimoine.com" className="flex items-center gap-2 hover:text-[#B89C6D] transition-colors" data-testid="link-email">
                <span>✉️</span>
                <span>arthur.lemeille@lemeillepatrimoine.com</span>
              </a>
            </div>
          </div>

          <div className="mb-6">
            <div className="font-semibold">Siège social — Mont-Saint-Aignan</div>
            <div>50 rue de la Garenne, 76130</div>
            <div className="mt-2 rounded-2xl overflow-hidden border relative group">
              <iframe title="Siège social — 50 rue de la Garenne, Mont-Saint-Aignan" src={"https://www.google.com/maps?hl=fr&q="+encodeURIComponent("50 rue de la Garenne, 76130 Mont-Saint-Aignan")+"&z=16&output=embed"} style={{border:0, width:"100%", height:"260px"}} loading="lazy" />
              <a
                href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("50 rue de la Garenne, 76130 Mont-Saint-Aignan")}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                data-testid="link-map-siege"
              >
                <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-2xl shadow-lg text-sm font-medium transition-opacity">
                  Ouvrir dans Google Maps
                </span>
              </a>
            </div>
          </div>

          <div className="mb-6">
            <div className="font-semibold">Rouen</div>
            <div>35 rue Ganterie, 76000</div>
            <div className="mt-2 rounded-2xl overflow-hidden border relative group">
              <iframe title="Rouen — 35 rue Ganterie" src={"https://www.google.com/maps?hl=fr&q="+encodeURIComponent("35 rue Ganterie, 76000 Rouen")+"&z=16&output=embed"} style={{border:0, width:"100%", height:"260px"}} loading="lazy" />
              <a
                href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("35 rue Ganterie, 76000 Rouen")}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                data-testid="link-map-rouen"
              >
                <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-2xl shadow-lg text-sm font-medium transition-opacity">
                  Ouvrir dans Google Maps
                </span>
              </a>
            </div>
          </div>
          <div>
            <div className="font-semibold">Fréjus</div>
            <div>722 avenue Alfred de Musset, 83370</div>
            <div className="mt-2 rounded-2xl overflow-hidden border relative group">
              <iframe title="Fréjus — 722 avenue Alfred de Musset" src={"https://www.google.com/maps?hl=fr&q="+encodeURIComponent("722 avenue Alfred de Musset, 83370 Fréjus")+"&z=16&output=embed"} style={{border:0, width:"100%", height:"260px"}} loading="lazy" />
              <a 
                href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent("722 avenue Alfred de Musset, 83370 Fréjus")}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                data-testid="link-map-frejus"
              >
                <span className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-2xl shadow-lg text-sm font-medium transition-opacity">
                  Ouvrir dans Google Maps
                </span>
              </a>
            </div>
          </div>
        </div>

        <form id="form" onSubmit={onSubmit} className="card p-6">
          <h2 className="luxe text-xl mb-4">Écrivez-nous</h2>
          <div className="grid gap-3">
            <input className="input" name="firstName" placeholder="Prénom" required />
            <input className="input" name="lastName" placeholder="Nom" required />
            <input className="input" type="email" name="email" placeholder="Email" required />
            <input className="input" name="phone" placeholder="Téléphone" />
            <select className="input" name="topic" defaultValue="Immobilier">
              <option>Immobilier</option><option>Gestion de patrimoine</option><option>Défiscalisation</option><option>Autre</option>
            </select>
            <textarea className="input" name="message" placeholder="Votre message" rows={5} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="consent" required /> J&apos;accepte la politique de confidentialité.</label>
            <button className="btn btn-gold mt-2" type="submit">Envoyer</button>
            {ok === true && <div className="text-green-700 text-sm">Merci, votre message a bien été envoyé.</div>}
            {ok === false && <div className="text-red-700 text-sm">Un problème est survenu. Réessayez.</div>}
          </div>
        </form>
      </section>
    </main>
  );
}
