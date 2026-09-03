"use client";
import { useMemo, useState } from "react";
import AddressAutocomplete from "./AddressAutocomplete";
import { trackEvent } from "@/lib/analytics";

/** Barèmes indicatifs €/m² (milieu de fourchette) */
const BASE_M2: Record<string, number> = {
  "paris": 12000,      // Moyenne des arrondissements parisiens
  "normandie": 4000,   // Moyenne Rouen et environs
  "cote-azur": 6500,   // Moyenne Côte d'Azur
};

type TInput = {
  sector: string;
  type: "Appartement" | "Maison";
  city: string;
  surface: number | "";
  rooms: number | "";
  condition: "Refait à neuf" | "Bon état" | "À rafraîchir" | "À rénover";
  dpe: "A"|"B"|"C"|"D"|"E"|"F"|"G"|"Inconnu";
  floor?: number | "";
  elevator?: boolean;
  extBalcon?: number | "";   // m²
  extTerrasse?: boolean;
  extJardin?: boolean;
  parking?: boolean;
  seaView?: boolean;
  pool?: boolean;
  lumineux?: boolean;
  calme?: boolean;
  cuisineEquipee?: boolean;
  cuisineRecente?: boolean;
  parquet?: boolean;
  dressing?: boolean;
};

/* ── Petits blocs de présentation ───────────────────────────────────────── */

/** Libellé au-dessus du champ. Les intitulés en simple « placeholder »
 *  disparaissaient dès la première frappe : impossible de se relire. */
function Champ({ label, aide, children, className = "" }: {
  label: string; aide?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-luxe">{label}</span>
      {children}
      {aide && <span className="text-xs text-luxe/55">{aide}</span>}
    </label>
  );
}

/** Groupe de cases à cocher, avec son intitulé. Treize pastilles alignées sur
 *  une seule ligne débordaient et ne se lisaient plus ; elles sont désormais
 *  réparties par famille, en grille. */
function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="text-sm font-medium text-luxe mb-1.5">{titre}</legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{children}</div>
    </fieldset>
  );
}

/** Case à cocher pleine largeur : toute la surface est cliquable, ce qui
 *  compte surtout au doigt. 44px de haut, la cible tactile recommandée. */
function Case({ coche, onChange, children }: {
  coche: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded border px-3 py-2 text-sm transition-colors
        ${coche ? "border-gold bg-gold/10 text-luxe" : "border-black/10 bg-white text-luxe/80 hover:border-gold/50"}`}
    >
      <input
        type="checkbox"
        checked={coche}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 flex-none accent-[#B89C6D]"
      />
      <span className="leading-tight">{children}</span>
    </label>
  );
}

/* ── Formulaire ─────────────────────────────────────────────────────────── */

export default function EstimationForm(){
  // Deux étapes : le bien, puis le contact. Vingt champs affichés d'un coup
  // faisaient renoncer — et l'on ne demande les coordonnées qu'après que le
  // visiteur a investi un peu de temps.
  const [etape, setEtape] = useState<1 | 2>(1);

  const [inp, setInp] = useState<TInput>({
    sector: "normandie",
    type: "Appartement",
    city: "",
    surface: "",
    rooms: "",
    condition: "Bon état",
    dpe: "D",
    floor: "",
    elevator: false,
    extBalcon: "",
    extTerrasse: false,
    extJardin: false,
    parking: false,
    seaView: false,
    pool: false,
    lumineux: false,
    calme: false,
    cuisineEquipee: false,
    cuisineRecente: false,
    parquet: false,
    dressing: false,
  });

  // Le balcon a une surface propre dans le calcul, mais aucun champ ne
  // permettait de la saisir : la branche était morte. La case révèle le champ.
  const [balcon, setBalcon] = useState(false);

  const [firstName,setFirstName] = useState("");
  const [lastName,setLastName]   = useState("");
  const [email,setEmail]         = useState("");
  const [phone,setPhone]         = useState("");
  const [consent,setConsent]     = useState(false);
  const [sending,setSending]     = useState(false);
  const [sent,setSent]           = useState<null|boolean>(null);
  const [erreurs, setErreurs]    = useState<Record<string, string>>({});

  const set = (k:keyof TInput)=>(e:any)=>{
    const v = (typeof e === "object" && e?.target) ? (e.target.type==="number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value) : e;
    setInp(s=>({...s,[k]: v}));
  };
  const coche = (k: keyof TInput) => (v: boolean) => setInp(s => ({ ...s, [k]: v }));

  // === Calcul indicatif ===
  // Note interne : la fourchette n'est PAS montrée au visiteur. L'avis de
  // valeur est rédigé et envoyé à la main ; un chiffre automatique affiché
  // ancrerait le vendeur avant même la visite.
  const result = useMemo(()=>{
    const baseM2 = BASE_M2[inp.sector] || 4000;
    let coef = 1;

    // état
    if (inp.condition === "Refait à neuf") coef *= 1.10;
    if (inp.condition === "Bon état")      coef *= 1.05;
    if (inp.condition === "À rafraîchir")  coef *= 0.93;
    if (inp.condition === "À rénover")     coef *= 0.85;

    // DPE
    const dpe = inp.dpe;
    if (dpe==="B") coef *= 1.02;
    if (dpe==="A") coef *= 1.03;
    if (dpe==="F") coef *= 0.95;
    if (dpe==="G") coef *= 0.90;

    // étage/ascenseur (appartement)
    if (inp.type==="Appartement") {
      const floor = Number(inp.floor||0);
      if (floor>=5 && !inp.elevator) coef *= 0.95;
      if (floor>=5 && inp.elevator)  coef *= 1.02;
    }

    // vue mer (Côte d'Azur)
    if (inp.sector === "cote-azur") {
      if (inp.seaView) coef *= 1.10;
    }

    // valeur de base (m² intérieurs)
    const base = baseM2 * (inp.surface||0) * coef;

    // extérieurs – pondération simple (bonus si présent)
    const pondBalcon = (inp.extBalcon||0) * baseM2 * 0.25;
    const pondTerr   = inp.extTerrasse ? base * 0.05 : 0;  // +5% si terrasse
    const pondJardin = inp.extJardin ? base * 0.08 : 0;    // +8% si jardin

    // parking bonus
    const pkBonus = inp.parking ? base * 0.02 : 0;

    // piscine bonus (maison uniquement)
    const poolBonus = inp.pool && inp.type === "Maison" ? base * 0.10 : 0;

    const estimate = base + pondBalcon + pondTerr + pondJardin + pkBonus + poolBonus;

    // Bande +/-7%
    const low  = Math.round(estimate * 0.93);
    const high = Math.round(estimate * 1.07);
    const reco = Math.round((low+high)/2);
    return { baseM2, low, high, reco };
  }, [inp]);

  /** Contrôles de l'étape 1, avant de passer au contact. */
  function validerBien() {
    const e: Record<string, string> = {};
    if (!inp.city.trim()) e.city = "Indiquez l’adresse du bien.";
    if (!inp.surface || Number(inp.surface) <= 0) e.surface = "Indiquez la surface habitable.";
    setErreurs(e);
    if (Object.keys(e).length) return false;
    return true;
  }

  function continuer() {
    if (!validerBien()) return;
    setEtape(2);
    // Le formulaire est long : on ramène le visiteur en haut du bloc.
    document.getElementById("estimation-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function envoyer(ev: React.FormEvent){
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!phone.trim())   e.phone = "Un numéro de téléphone est nécessaire pour vous rappeler.";
    if (!consent)        e.consent = "Merci d’accepter la politique de confidentialité.";
    setErreurs(e);
    if (Object.keys(e).length) return;

    setSending(true);
    try{
      const payload = {
        source: "estimation-immobilier",
        topic: "Estimation gratuite",
        firstName, lastName, email, phone,
        message: "Demande d'estimation gratuite envoyée depuis le site.",
        meta: { property: inp, estimation: result }
      };
      const r = await fetch("/api/leads", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      setSent(r.ok);
      if(r.ok){
        trackEvent('generate_lead', 'estimation', inp.sector, Math.round((result?.reco || 0)));
        setFirstName(""); setLastName(""); setEmail(""); setPhone("");
        setConsent(false); setErreurs({});
      }
    }catch{ setSent(false); }
    setSending(false);
  }

  const champErreur = (cle: string) =>
    erreurs[cle] ? <span className="text-xs text-[#A2543C]">{erreurs[cle]}</span> : null;

  /* ── Envoi réussi : on remplace tout le formulaire ──────────────────── */
  if (sent === true) {
    return (
      <div className="card p-8 text-center" id="estimation-form">
        <div className="luxe text-2xl text-luxe">Demande bien reçue</div>
        <div className="rule-gold mt-4 mx-auto" />
        <p className="mt-5 text-luxe/75 leading-relaxed max-w-md mx-auto">
          Je reprends vos éléments un par un et je vous adresse un avis de valeur
          argumenté sous trois jours. Si quelque chose manque, je vous appelle avant.
        </p>
        <button
          type="button"
          className="btn mt-7"
          onClick={() => { setSent(null); setEtape(1); }}
        >
          Estimer un autre bien
        </button>
      </div>
    );
  }

  return (
    <form id="estimation-form" onSubmit={envoyer} className="grid gap-5" noValidate>

      {/* ── Fil de progression ───────────────────────────────────────── */}
      <div className="flex items-center gap-3" aria-hidden>
        {([1, 2] as const).map((n) => (
          <div key={n} className="flex flex-1 items-center gap-3">
            <span
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border font-serif text-sm
                ${etape >= n ? "border-gold bg-gold text-luxe" : "border-black/15 bg-white text-luxe/40"}`}
            >
              {n}
            </span>
            <span className={`text-sm ${etape === n ? "font-medium text-luxe" : "text-luxe/50"}`}>
              {n === 1 ? "Votre bien" : "Vous"}
            </span>
            {n === 1 && <span className="h-px flex-1 bg-black/10" />}
          </div>
        ))}
      </div>

      {/* ══ ÉTAPE 1 — LE BIEN ═══════════════════════════════════════════ */}
      {etape === 1 && (
        <>
          <div className="card p-6 md:p-7 grid gap-6">
            <Champ label="Adresse du bien" aide="Commencez à taper, les suggestions apparaissent.">
              <AddressAutocomplete
                value={inp.city}
                onChange={(components) => {
                  // Repli sur la Normandie, marché de référence du cabinet :
                  // basculer sur la Côte d'Azur appliquait 6 500 €/m² à
                  // n'importe quelle adresse hors Paris et Normandie.
                  const sector = components.region === 'PARIS' ? 'paris'
                    : components.region === 'COTE_D_AZUR' ? 'cote-azur'
                    : 'normandie';
                  setInp(s => ({...s, city: components.address, sector}));
                  setErreurs(e => ({ ...e, city: "" }));
                }}
                // Sans ceci, une adresse tapée sans cliquer de suggestion
                // n'était jamais enregistrée : le lead partait avec une adresse
                // vide, et personne ne s'en apercevait. Le secteur, lui, reste
                // sur son repli Normandie tant qu'aucune suggestion n'est
                // choisie — c'est le marché du cabinet.
                onTextChange={(texte) => {
                  setInp(s => ({ ...s, city: texte }));
                  if (texte.trim()) setErreurs(e => ({ ...e, city: "" }));
                }}
                placeholder="Ex : 35 rue Ganterie, Rouen"
                className="input"
              />
              {champErreur("city")}
            </Champ>

            {/* Sélecteur segmenté : deux choix, plus lisible que deux radios. */}
            <fieldset>
              <legend className="text-sm font-medium text-luxe mb-1.5">Type de bien</legend>
              <div className="inline-grid grid-cols-2 gap-1 rounded border border-black/10 bg-black/[0.03] p-1">
                {(["Appartement", "Maison"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInp(s => ({ ...s, type: t }))}
                    aria-pressed={inp.type === t}
                    className={`min-h-[40px] rounded px-6 text-sm transition-colors
                      ${inp.type === t ? "bg-white font-medium text-luxe shadow-sm" : "text-luxe/60 hover:text-luxe"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Champ label="Surface habitable">
                <div className="relative">
                  <input
                    className="input pr-12" type="number" min="0" step="1" inputMode="numeric"
                    value={inp.surface} onChange={set("surface") as any}
                    onFocus={e => e.target.select()} placeholder="80"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-luxe/45">m²</span>
                </div>
                {champErreur("surface")}
              </Champ>
              <Champ label="Nombre de pièces">
                <input
                  className="input" type="number" min="0" step="1" inputMode="numeric"
                  value={inp.rooms} onChange={set("rooms") as any}
                  onFocus={e => e.target.select()} placeholder="3"
                />
              </Champ>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Champ label="État général">
                <select className="input" value={inp.condition} onChange={set("condition") as any}>
                  {["Refait à neuf","Bon état","À rafraîchir","À rénover"].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </Champ>
              <Champ label="Diagnostic énergétique" aide="Laissez « Inconnu » si le DPE n’est pas fait.">
                <select className="input" value={inp.dpe} onChange={set("dpe") as any}>
                  {["A","B","C","D","E","F","G","Inconnu"].map(v=><option key={v} value={v}>{v === "Inconnu" ? "Inconnu" : `DPE ${v}`}</option>)}
                </select>
              </Champ>
            </div>

            {inp.type==="Appartement" && (
              <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
                <Champ label="Étage">
                  <input
                    className="input" type="number" min="0" step="1" inputMode="numeric"
                    value={inp.floor ?? ''} onChange={set("floor") as any}
                    onFocus={e => e.target.select()} placeholder="3"
                  />
                </Champ>
                <Case coche={!!inp.elevator} onChange={coche("elevator")}>Ascenseur dans l’immeuble</Case>
              </div>
            )}
          </div>

          <div className="card p-6 md:p-7 grid gap-6">
            <Groupe titre="Espaces extérieurs">
              <Case coche={!!inp.extTerrasse} onChange={coche("extTerrasse")}>Terrasse</Case>
              <Case coche={!!inp.extJardin} onChange={coche("extJardin")}>Jardin</Case>
              <Case
                coche={balcon}
                onChange={(v) => { setBalcon(v); if (!v) setInp(s => ({ ...s, extBalcon: "" })); }}
              >
                Balcon
              </Case>
            </Groupe>

            {balcon && (
              <Champ label="Surface du balcon" className="sm:max-w-[220px]">
                <div className="relative">
                  <input
                    className="input pr-12" type="number" min="0" step="1" inputMode="numeric"
                    value={inp.extBalcon ?? ""} onChange={set("extBalcon") as any}
                    onFocus={e => e.target.select()} placeholder="6"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-luxe/45">m²</span>
                </div>
              </Champ>
            )}

            <Groupe titre="Confort et prestations">
              <Case coche={!!inp.lumineux} onChange={coche("lumineux")}>Lumineux</Case>
              <Case coche={!!inp.calme} onChange={coche("calme")}>Calme</Case>
              <Case coche={!!inp.parquet} onChange={coche("parquet")}>Parquet</Case>
              <Case coche={!!inp.dressing} onChange={coche("dressing")}>Dressing</Case>
              <Case coche={!!inp.cuisineEquipee} onChange={coche("cuisineEquipee")}>Cuisine équipée</Case>
              <Case coche={!!inp.cuisineRecente} onChange={coche("cuisineRecente")}>Cuisine récente</Case>
            </Groupe>

            <Groupe titre="Autres atouts">
              <Case coche={!!inp.parking} onChange={coche("parking")}>Parking</Case>
              {inp.type === "Maison" && (
                <Case coche={!!inp.pool} onChange={coche("pool")}>Piscine</Case>
              )}
              {/* « Vue mer » n'a d'effet que sur la Côte d'Azur, et n'a aucun
                  sens à Rouen : le choix n'apparaît que là où il compte. */}
              {inp.sector === "cote-azur" && (
                <Case coche={!!inp.seaView} onChange={coche("seaView")}>Vue mer</Case>
              )}
            </Groupe>
          </div>

          <div className="flex justify-end">
            <button type="button" className="btn btn-gold min-h-[46px] px-7" onClick={continuer}>
              Continuer
            </button>
          </div>
        </>
      )}

      {/* ══ ÉTAPE 2 — LE CONTACT ════════════════════════════════════════ */}
      {etape === 2 && (
        <>
          {/* Récapitulatif : le visiteur se relit avant d'envoyer, sans avoir
              à revenir en arrière. */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="eyebrow">Le bien à estimer</div>
              <button
                type="button"
                className="text-sm font-medium text-gold underline underline-offset-2 hover:opacity-70"
                onClick={() => setEtape(1)}
              >
                Modifier
              </button>
            </div>
            <div className="mt-3 text-luxe">
              <span className="luxe text-lg">
                {inp.type}{inp.rooms ? ` · ${inp.rooms} pièces` : ""}{inp.surface ? ` · ${inp.surface} m²` : ""}
              </span>
              {inp.city && <div className="mt-1 text-sm text-luxe/70">{inp.city}</div>}
              <div className="mt-1 text-sm text-luxe/70">
                {inp.condition} · {inp.dpe === "Inconnu" ? "DPE inconnu" : `DPE ${inp.dpe}`}
              </div>
            </div>
          </div>

          <div className="card p-6 md:p-7 grid gap-5">
            <div>
              <div className="luxe text-xl text-luxe">Où vous adresser l’avis de valeur</div>
              <p className="mt-2 text-sm text-luxe/70 leading-relaxed">
                Un seul interlocuteur, sous trois jours, sans engagement. Le téléphone
                sert à vérifier les points qui manquent avant de chiffrer.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Champ label="Prénom">
                <input className="input" autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} />
              </Champ>
              <Champ label="Nom">
                <input className="input" autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} />
              </Champ>
              <Champ label="Téléphone">
                <input
                  className="input" type="tel" inputMode="tel" autoComplete="tel"
                  value={phone} onChange={e=>{ setPhone(e.target.value); setErreurs(x=>({...x, phone:""})); }}
                  placeholder="06 12 34 56 78"
                />
                {champErreur("phone")}
              </Champ>
              <Champ label="Email" aide="Facultatif — pour recevoir l’avis de valeur par écrit.">
                <input className="input" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} />
              </Champ>
            </div>

            <div className="grid gap-1.5">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-luxe/85">
                <input
                  type="checkbox" checked={consent}
                  onChange={e=>{ setConsent(e.target.checked); setErreurs(x=>({...x, consent:""})); }}
                  className="h-4 w-4 flex-none accent-[#B89C6D]"
                />
                <span>
                  J’accepte la{" "}
                  <a href="/confidentialite" className="underline underline-offset-2 hover:text-gold">politique de confidentialité</a>.
                </span>
              </label>
              {champErreur("consent")}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" className="btn btn-gold min-h-[46px] px-7" disabled={sending}>
                {sending ? "Envoi…" : "Demander mon avis de valeur"}
              </button>
              <button type="button" className="text-sm text-luxe/60 hover:text-luxe" onClick={() => setEtape(1)}>
                Revenir au bien
              </button>
            </div>

            {sent===false && (
              <p className="text-sm text-[#A2543C]">
                L’envoi a échoué. Vérifiez votre connexion, ou appelez le 06 87 15 72 59.
              </p>
            )}
          </div>
        </>
      )}
    </form>
  );
}
