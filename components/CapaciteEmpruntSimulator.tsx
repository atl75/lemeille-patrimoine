"use client";
import { useMemo, useState } from "react";
import { trackEvent } from "@/lib/analytics";

// Simulateur de capacité d'emprunt : mensualité maximale (taux d'endettement),
// montant empruntable et budget d'acquisition. Aucun taux d'intérêt n'est
// affiché comme « taux du marché » — l'utilisateur saisit une hypothèse, que
// seul un courtier peut confirmer.
const eur = (n: number) => Math.round(n).toLocaleString("fr-FR") + " €";

// Mensualité d'un prêt amortissable à taux fixe.
function mensualite(capital: number, tauxAnnuel: number, annees: number) {
  const n = annees * 12;
  const i = tauxAnnuel / 100 / 12;
  if (n <= 0) return 0;
  if (i === 0) return capital / n;
  return (capital * i) / (1 - Math.pow(1 + i, -n));
}
// Capital empruntable pour une mensualité donnée (opération inverse).
function capitalEmpruntable(mens: number, tauxAnnuel: number, annees: number) {
  const n = annees * 12;
  const i = tauxAnnuel / 100 / 12;
  if (n <= 0) return 0;
  if (i === 0) return mens * n;
  return (mens * (1 - Math.pow(1 + i, -n))) / i;
}

type Props = {
  /** Prix du bien : si fourni, le simulateur calcule la mensualité de CE bien
   *  au lieu de la capacité d'emprunt à partir des revenus. */
  propertyPrice?: number;
};

export default function CapaciteEmpruntSimulator({ propertyPrice }: Props = {}) {
  const modeBien = typeof propertyPrice === "number" && propertyPrice > 0;
  const [prix, setPrix] = useState<number | "">(propertyPrice ?? 0);
  const [revenus, setRevenus] = useState<number | "">(4000);
  const [charges, setCharges] = useState<number | "">(0);
  const [apport, setApport] = useState<number | "">(30000);
  const [duree, setDuree] = useState(20);
  const [taux, setTaux] = useState<number | "">(3.5);
  const [assurance, setAssurance] = useState<number | "">(0.34);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<null | boolean>(null);
  const [erreur, setErreur] = useState("");

  const r = useMemo(() => {
    const rev = Number(revenus) || 0;
    const ch = Number(charges) || 0;
    const t = Number(taux) || 0;
    const ass = Number(assurance) || 0;
    const ap = Number(apport) || 0;

    // Règle HCSF : taux d'endettement plafonné à 35 % (assurance comprise).
    const mensMax = Math.max(0, rev * 0.35 - ch);
    // On réserve la part d'assurance pour ne pas surestimer le capital.
    const capitalBrut = capitalEmpruntable(mensMax, t, duree);
    const coutAssuranceMensuel = (capitalBrut * (ass / 100)) / 12;
    const mensCredit = Math.max(0, mensMax - coutAssuranceMensuel);
    const capital = capitalEmpruntable(mensCredit, t, duree);
    const budget = capital + ap;
    // Frais de notaire indicatifs dans l'ancien (~7,5 % du prix du bien).
    const prixBien = budget / 1.075;
    const fraisNotaire = budget - prixBien;
    const coutTotalInterets = mensualite(capital, t, duree) * duree * 12 - capital;

    // Mode « fiche bien » : on part du prix affiché et on calcule la mensualité.
    const px = Number(prix) || 0;
    const fraisNotaireBien = px * 0.075;
    const aEmprunter = Math.max(0, px + fraisNotaireBien - ap);
    const mensCreditBien = mensualite(aEmprunter, t, duree);
    const assMensBien = (aEmprunter * (ass / 100)) / 12;
    const mensTotaleBien = mensCreditBien + assMensBien;
    // Revenus nets nécessaires pour respecter la règle des 35 % (charges incluses).
    const revenusNecessaires = (mensTotaleBien + ch) / 0.35;
    const interetsBien = mensCreditBien * duree * 12 - aEmprunter;

    return {
      mensMax, mensCredit, coutAssuranceMensuel, capital, budget, prixBien, fraisNotaire, coutTotalInterets,
      fraisNotaireBien, aEmprunter, mensCreditBien, assMensBien, mensTotaleBien, revenusNecessaires, interetsBien,
    };
  }, [revenus, charges, apport, duree, taux, assurance, prix]);

  const envoyer = async () => {
    setErreur("");
    if (!firstName || !lastName) return setErreur("Merci d'indiquer votre nom et prénom.");
    if (!phone && !email) return setErreur("Merci d'indiquer un téléphone ou un email.");
    if (!consent) return setErreur("Merci d'accepter la politique de confidentialité.");
    setSending(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: modeBien ? "simulateur-financement-bien" : "simulateur-capacite-emprunt",
          topic: modeBien ? "Financement d'un bien" : "Capacité d'emprunt",
          firstName, lastName, email, phone,
          message: modeBien
            ? `Simulation financement d'un bien à ${eur(Number(prix) || 0)} — apport ${eur(Number(apport) || 0)}, ${duree} ans à ${taux} % → mensualité estimée ${eur(r.mensTotaleBien)} (revenus nécessaires ${eur(r.revenusNecessaires)}/mois).`
            : `Simulation capacité d'emprunt — revenus ${eur(Number(revenus) || 0)}/mois, apport ${eur(Number(apport) || 0)}, ${duree} ans à ${taux} % → budget estimé ${eur(r.budget)}.`,
          meta: {
            revenus: Number(revenus) || 0, charges: Number(charges) || 0, apport: Number(apport) || 0,
            duree, taux: Number(taux) || 0, assurance: Number(assurance) || 0,
            mensualiteMax: Math.round(r.mensMax), capitalEmpruntable: Math.round(r.capital), budget: Math.round(r.budget),
          },
        }),
      });
      setSent(res.ok);
      if (res.ok) trackEvent("generate_lead", "capacite-emprunt", `${duree} ans`, Math.round(r.budget));
    } catch { setSent(false); }
    setSending(false);
  };

  const num = (v: number | "", set: (n: number | "") => void, opts: { step?: string; min?: string } = {}) => ({
    type: "number" as const,
    className: "input",
    value: v,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value === "" ? "" : Number(e.target.value)),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    ...opts,
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Saisie */}
      <div className="card p-6">
        <div className="luxe text-lg mb-4">{modeBien ? "Votre financement" : "Votre situation"}</div>
        <div className="space-y-3">
          {modeBien ? (
            <div>
              <label className="block text-sm mb-1">Prix du bien (€)</label>
              <input {...num(prix, setPrix, { step: "1000", min: "0" })} />
              <p className="text-xs opacity-60 mt-1">Prérempli avec le prix affiché de ce bien.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1">Revenus nets du foyer (€/mois)</label>
              <input {...num(revenus, setRevenus, { step: "100", min: "0" })} />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Crédits en cours (€/mois)</label>
            <input {...num(charges, setCharges, { step: "50", min: "0" })} />
            <p className="text-xs opacity-60 mt-1">Prêt auto, prêt conso, pension versée…</p>
          </div>
          <div>
            <label className="block text-sm mb-1">Apport disponible (€)</label>
            <input {...num(apport, setApport, { step: "1000", min: "0" })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Durée du prêt : <strong>{duree} ans</strong></label>
            <input type="range" min={10} max={25} step={1} value={duree} onChange={(e) => setDuree(Number(e.target.value))} className="w-full accent-[#B89C6D]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Taux du prêt (%)</label>
              <input {...num(taux, setTaux, { step: "0.05", min: "0" })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Assurance (% / an)</label>
              <input {...num(assurance, setAssurance, { step: "0.01", min: "0" })} />
            </div>
          </div>
          <p className="text-xs opacity-60">
            Le taux et l&apos;assurance sont des hypothèses que vous ajustez : ils dépendent de votre profil,
            de la banque et du moment. Seul un courtier peut vous confirmer les conditions réellement obtenues.
          </p>
        </div>
      </div>

      {/* Résultat */}
      <div className="space-y-4">
        <div className="card p-6">
          <div className="luxe text-lg mb-3">{modeBien ? "Votre mensualité estimée" : "Votre capacité estimée"}</div>
          <div className="text-3xl font-semibold text-[#1F3B2C]">{modeBien ? eur(r.mensTotaleBien) : eur(r.budget)}</div>
          <p className="text-sm opacity-70 mt-1">{modeBien ? "Par mois, assurance comprise" : "Budget total (emprunt + apport)"}</p>

          {modeBien ? (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Frais de notaire (~7,5 %)</span><span>{eur(r.fraisNotaireBien)}</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Montant à emprunter</span><strong>{eur(r.aEmprunter)}</strong>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>dont assurance (estimation)</span><span>{eur(r.assMensBien)} / mois</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Revenus nets nécessaires</span><strong>{eur(r.revenusNecessaires)} / mois</strong>
              </div>
              <div className="flex justify-between">
                <span>Coût total des intérêts</span><span>{eur(r.interetsBien)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Mensualité maximale</span><strong>{eur(r.mensMax)}</strong>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>dont assurance (estimation)</span><span>{eur(r.coutAssuranceMensuel)}</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Montant empruntable</span><strong>{eur(r.capital)}</strong>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Prix du bien (hors frais)</span><span>{eur(r.prixBien)}</span>
              </div>
              <div className="flex justify-between border-b border-black/5 pb-1">
                <span>Frais de notaire (~7,5 %)</span><span>{eur(r.fraisNotaire)}</span>
              </div>
              <div className="flex justify-between">
                <span>Coût total des intérêts</span><span>{eur(r.coutTotalInterets)}</span>
              </div>
            </div>
          )}

          <p className="text-xs opacity-60 mt-4">
            Estimation indicative fondée sur un taux d&apos;endettement maximal de 35 % (recommandation HCSF),
            assurance comprise. Elle ne vaut ni offre de prêt ni accord de financement.
          </p>
        </div>

        {/* Lead */}
        <div className="card p-6">
          {sent === true ? (
            <div>
              <div className="luxe text-lg mb-1">Merci — demande bien reçue.</div>
              <p className="text-sm opacity-80">Nous revenons vers vous sous 48 h, et pouvons vous mettre en relation avec notre courtier partenaire pour valider votre financement.</p>
            </div>
          ) : (
            <>
              <div className="luxe text-lg mb-1">Affiner avec un conseiller</div>
              <p className="text-sm opacity-75 mb-3">Recevez une étude personnalisée et, si vous le souhaitez, une mise en relation avec notre courtier partenaire.</p>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <input className="input" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                <input className="input" placeholder="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <label className="flex items-start gap-2 text-xs mt-3">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                <span>J&apos;accepte la politique de confidentialité.</span>
              </label>
              {erreur && <p className="text-sm text-red-600 mt-2">{erreur}</p>}
              {sent === false && <p className="text-sm text-red-600 mt-2">L&apos;envoi a échoué. Réessayez ou appelez-nous.</p>}
              <button onClick={envoyer} disabled={sending} className="btn btn-gold mt-3 disabled:opacity-60">
                {sending ? "Envoi…" : "Recevoir mon étude personnalisée"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
