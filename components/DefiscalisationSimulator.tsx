"use client";
import { useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type Dispositif = "MALRAUX" | "MONUMENT_HISTORIQUE" | "DEFICIT_FONCIER";

const DISPOSITIFS: { key: Dispositif; label: string; hint: string }[] = [
  { key: "MALRAUX", label: "Loi Malraux", hint: "Réduction d'impôt sur les travaux de restauration en secteur sauvegardé." },
  { key: "MONUMENT_HISTORIQUE", label: "Monument Historique", hint: "Déduction des travaux du revenu global, sans plafonnement." },
  { key: "DEFICIT_FONCIER", label: "Déficit Foncier", hint: "Imputation des travaux sur votre revenu, report possible sur 10 ans." },
];

const TMI_OPTIONS = [0, 0.11, 0.30, 0.41, 0.45];
const PRELEVEMENTS_SOCIAUX = 0.172;
const PLAFOND_MALRAUX = 400000;   // dépenses sur 4 ans
const PLAFOND_DEFICIT_AN = 10700; // imputation revenu global / an

const eur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

export default function DefiscalisationSimulator() {
  const [dispositif, setDispositif] = useState<Dispositif>("MALRAUX");
  const [travaux, setTravaux] = useState<number | "">(150000);
  const [tmi, setTmi] = useState<number>(0.41);
  const [tauxMalraux, setTauxMalraux] = useState<number>(0.30);

  // Capture de lead
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | boolean>(null);

  const result = useMemo(() => {
    const T = Math.max(0, Number(travaux) || 0);
    if (dispositif === "MALRAUX") {
      const base = Math.min(T, PLAFOND_MALRAUX);
      const total = base * tauxMalraux;
      return {
        total,
        lines: [
          { label: "Dépenses de travaux retenues", value: eur(base) + (T > PLAFOND_MALRAUX ? " (plafond 400 000 €)" : "") },
          { label: `Taux de réduction`, value: `${Math.round(tauxMalraux * 100)} %` },
        ],
        note: "Réduction d'impôt étalée sur la durée des travaux (jusqu'à 4 ans). Taux de 30 % en site patrimonial remarquable avec plan approuvé (PSMV), 22 % dans les autres cas.",
        headline: "Réduction d'impôt estimée",
      };
    }
    if (dispositif === "MONUMENT_HISTORIQUE") {
      const total = T * tmi;
      return {
        total,
        lines: [
          { label: "Travaux déductibles du revenu global", value: eur(T) },
          { label: "Tranche marginale d'imposition", value: `${Math.round(tmi * 100)} %` },
        ],
        note: "Les travaux et charges sont déductibles du revenu global, sans plafonnement. L'économie dépend directement de votre tranche marginale d'imposition. Engagement de conservation de 15 ans.",
        headline: "Économie d'impôt estimée",
      };
    }
    // DÉFICIT FONCIER
    const total = T * (tmi + PRELEVEMENTS_SOCIAUX);
    const imputAn1 = Math.min(T, PLAFOND_DEFICIT_AN);
    return {
      total,
      lines: [
        { label: "Travaux imputables", value: eur(T) },
        { label: "Imputation sur le revenu global (an 1)", value: eur(imputAn1) + (T > PLAFOND_DEFICIT_AN ? " — surplus reporté" : "") },
        { label: "Économie (impôt + prélèvements sociaux 17,2 %)", value: `${Math.round((tmi + PRELEVEMENTS_SOCIAUX) * 100)} %` },
      ],
      note: "Le déficit s'impute sur le revenu global dans la limite de 10 700 €/an ; le surplus est reporté sur vos revenus fonciers pendant 10 ans. Économie totale estimée, étalée sur plusieurs années.",
      headline: "Économie totale estimée",
    };
  }, [dispositif, travaux, tmi, tauxMalraux]);

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !consent) return;
    setSending(true);
    const dispoLabel = DISPOSITIFS.find((d) => d.key === dispositif)?.label || dispositif;
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone,
          category: "defiscalisation",
          source: "simulateur-defiscalisation",
          topic: "Défiscalisation",
          message: `Simulation ${dispoLabel} — travaux ${eur(Number(travaux) || 0)}, TMI ${Math.round(tmi * 100)} % → ${result.headline.toLowerCase()} ${eur(result.total)}.`,
          consent: true,
          meta: {
            dispositif: dispoLabel,
            travaux: Number(travaux) || 0,
            tmi,
            tauxMalraux: dispositif === "MALRAUX" ? tauxMalraux : undefined,
            estimation: Math.round(result.total),
          },
        }),
      });
      setSent(r.ok);
      if (r.ok) trackEvent('generate_lead', 'simulateur', dispoLabel, Number(travaux) || 0);
    } catch {
      setSent(false);
    }
    setSending(false);
  }

  return (
    <div className="card p-6 md:p-8">
      {/* Choix du dispositif */}
      <div className="flex flex-wrap gap-2 mb-6">
        {DISPOSITIFS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDispositif(d.key)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
              dispositif === d.key ? "bg-[#1F3B2C] text-white" : "bg-black/5 text-[#1F3B2C] hover:bg-black/10"
            }`}
            data-testid={`tab-${d.key}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Entrées */}
        <div>
          <p className="text-sm opacity-70 mb-4">{DISPOSITIFS.find((d) => d.key === dispositif)?.hint}</p>

          <label htmlFor="sim-travaux" className="block text-sm font-medium mb-1">Montant des travaux de restauration</label>
          <div className="flex items-center gap-2 mb-4">
            <input
              id="sim-travaux"
              className="input"
              type="number" min="0" step="1000"
              value={travaux}
              onChange={(e) => setTravaux(e.target.value === "" ? "" : Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              data-testid="input-travaux"
            />
            <span className="opacity-60">€</span>
          </div>

          {dispositif === "MALRAUX" && (
            <div className="mb-4">
              <span className="block text-sm font-medium mb-1" id="sim-taux-label">Taux applicable</span>
              <div className="flex gap-2" role="group" aria-labelledby="sim-taux-label">
                {[0.30, 0.22].map((t) => (
                  <button
                    key={t} type="button" onClick={() => setTauxMalraux(t)}
                    className={`px-3 py-2 rounded-2xl text-sm border ${tauxMalraux === t ? "border-[#B89C6D] bg-[#B89C6D]/10 font-medium" : "border-black/10"}`}
                  >
                    {Math.round(t * 100)} %
                  </button>
                ))}
              </div>
              <p className="text-xs opacity-60 mt-1">30 % : site patrimonial remarquable avec plan approuvé (PSMV). 22 % : autres cas.</p>
            </div>
          )}

          {dispositif !== "MALRAUX" && (
            <div className="mb-4">
              <label htmlFor="sim-tmi" className="block text-sm font-medium mb-1">Votre tranche marginale d&apos;imposition (TMI)</label>
              <select
                id="sim-tmi"
                className="input"
                value={tmi}
                onChange={(e) => setTmi(Number(e.target.value))}
                data-testid="select-tmi"
              >
                {TMI_OPTIONS.map((t) => (
                  <option key={t} value={t}>{Math.round(t * 100)} %</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Résultat */}
        <div className="rounded-2xl bg-[#1F3B2C] text-white p-6 flex flex-col">
          <div className="text-sm text-cream/80">{result.headline}</div>
          <div className="luxe text-4xl md:text-5xl mt-1 mb-4" data-testid="result-total">{eur(result.total)}</div>
          <div className="space-y-1.5 text-sm text-cream/90 border-t border-white/15 pt-3">
            {result.lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3">
                <span className="text-cream/70">{l.label}</span>
                <span className="font-medium text-right">{l.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-cream/60 mt-4">{result.note}</p>
        </div>
      </div>

      {/* Capture de lead */}
      <div className="mt-8 border-t pt-6">
        {sent === true ? (
          <div className="text-green-700 font-medium">
            Merci — votre demande est bien reçue. Un conseiller vous adresse une étude personnalisée sous 48h.
          </div>
        ) : (
          <form onSubmit={submitLead} className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <h3 className="luxe text-xl">Recevez une étude personnalisée</h3>
              <p className="text-sm opacity-70">Un conseiller affine cette estimation selon votre situation réelle.</p>
            </div>
            <input className="input" aria-label="Prénom" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <input className="input" aria-label="Nom" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            <input className="input" type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input" aria-label="Téléphone (optionnel)" placeholder="Téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label className="sm:col-span-2 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-1" />
              <span>J&apos;accepte d&apos;être recontacté et la politique de confidentialité.</span>
            </label>
            <div className="sm:col-span-2">
              <button className="btn btn-gold" type="submit" disabled={sending} data-testid="button-submit-lead">
                {sending ? "Envoi…" : "Recevoir mon étude"}
              </button>
              {sent === false && <span className="text-red-700 text-sm ml-3">Un problème est survenu. Réessayez.</span>}
            </div>
          </form>
        )}
      </div>

      {/* Avertissement */}
      <p className="text-xs opacity-55 mt-6 leading-relaxed">
        Estimation indicative et non contractuelle, fournie à titre informatif. Elle ne constitue pas un conseil
        personnalisé ni une offre. Les avantages fiscaux dépendent de votre situation et de la réglementation en
        vigueur, susceptible d&apos;évoluer. Lemeille Patrimoine — Arthur Lemeille, conseiller en investissements
        financiers immatriculé ORIAS (voir mentions légales).
      </p>
    </div>
  );
}
