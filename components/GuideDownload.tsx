"use client";
import { useState } from "react";
import { GUIDES } from "@/lib/guides";

export default function GuideDownload() {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);

  async function submit(e: React.FormEvent, guide: (typeof GUIDES)[number]) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !consent) return;
    setSending(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email,
          category: "defiscalisation",
          source: "guide-defiscalisation",
          topic: "Défiscalisation",
          message: `Téléchargement du guide « ${guide.title} ».`,
          consent: true,
          meta: { guide: guide.slug, guideTitle: guide.title },
        }),
      });
    } catch { /* on télécharge quand même le guide */ }
    // Déclenche le téléchargement du PDF
    window.open(`/api/guides/${guide.slug}/pdf`, "_blank", "noopener");
    setDoneSlug(guide.slug);
    setSending(false);
    setFirstName(""); setLastName(""); setEmail(""); setConsent(false);
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {GUIDES.map((g) => (
        <div key={g.slug} className="card p-6 flex flex-col">
          <div className="text-xs font-semibold tracking-wide text-[#B89C6D] uppercase mb-1">Guide gratuit</div>
          <h3 className="luxe text-xl mb-1">{g.title}</h3>
          <p className="text-sm opacity-75 mb-3">{g.subtitle}</p>
          <ul className="text-sm space-y-1 mb-4">
            {g.keyFigures.map((k) => (
              <li key={k.label} className="flex justify-between gap-3 border-b border-black/5 pb-1">
                <span className="opacity-60">{k.label}</span>
                <span className="font-medium text-[#1F3B2C]">{k.value}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            {doneSlug === g.slug ? (
              <div className="text-sm text-green-700">
                Merci ! Votre guide se télécharge.{" "}
                <a href={`/api/guides/${g.slug}/pdf`} target="_blank" rel="noopener noreferrer" className="underline">
                  Relancer le téléchargement
                </a>
              </div>
            ) : openSlug === g.slug ? (
              <form onSubmit={(e) => submit(e, g)} className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  <input className="input" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <input className="input" type="email" placeholder="Votre email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <label className="flex items-start gap-2 text-xs opacity-80">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5" />
                  <span>J&apos;accepte de recevoir le guide et d&apos;être recontacté (politique de confidentialité).</span>
                </label>
                <button className="btn btn-gold" type="submit" disabled={sending} data-testid={`submit-guide-${g.slug}`}>
                  {sending ? "…" : "Recevoir le guide"}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => { setOpenSlug(g.slug); setDoneSlug(null); }}
                className="btn btn-gold w-full"
                data-testid={`open-guide-${g.slug}`}
              >
                Télécharger le guide (PDF)
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
