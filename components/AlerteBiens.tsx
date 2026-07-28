"use client";
import { useState } from "react";

export default function AlerteBiens() {
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) return;
    setSending(true);
    try {
      const r = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, region, propertyType }),
      });
      if (r.ok) setDone(true);
      else {
        const d = await r.json().catch(() => ({}));
        setError(d.error || "Un problème est survenu.");
      }
    } catch {
      setError("Un problème est survenu.");
    }
    setSending(false);
  }

  return (
    <div className="rounded-2xl bg-[#1F3B2C] text-white p-6 md:p-8">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <h2 className="luxe text-2xl md:text-3xl text-cream">Alerte nouveaux biens</h2>
          <p className="text-cream/80 mt-2">
            Recevez nos biens en avant-première, y compris nos mandats off-market, avant leur diffusion publique.
          </p>
        </div>
        <div>
          {done ? (
            <div className="bg-white/10 rounded-xl p-4 text-cream">
              Merci — vous êtes inscrit(e). Vous recevrez nos nouveaux biens en priorité.
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3">
              <input
                className="input text-[#1F3B2C]"
                type="email"
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-alerte-email"
              />
              <div className="grid grid-cols-2 gap-3">
                <select className="input text-[#1F3B2C]" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Secteur">
                  <option value="">Tous les secteurs</option>
                  <option value="PARIS">Paris</option>
                  <option value="NORMANDIE">Normandie</option>
                  <option value="COTE_D_AZUR">Côte d&apos;Azur</option>
                </select>
                <select className="input text-[#1F3B2C]" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} aria-label="Type de bien">
                  <option value="">Tous les biens</option>
                  <option value="APPARTEMENT">Appartement</option>
                  <option value="MAISON">Maison</option>
                </select>
              </div>
              <button className="btn btn-gold" type="submit" disabled={sending} data-testid="button-alerte-submit">
                {sending ? "Inscription…" : "M'inscrire à l'alerte"}
              </button>
              {error && <div className="text-red-200 text-sm">{error}</div>}
              <p className="text-cream/50 text-xs">Désinscription à tout moment. Aucune communication commerciale non sollicitée.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
