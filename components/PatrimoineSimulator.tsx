"use client";
import { useMemo, useState } from "react";

/* -----------------------------------------------------------
   Petits helpers UI : champ avec label + unité (€, %, ans…)
----------------------------------------------------------- */
function Field({
  label, hint, children, id
}: { label: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <label htmlFor={id} className="grid gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs opacity-70">{hint}</span>}
    </label>
  );
}

function NumberUnitInput({
  id, value, onChange, min, step, placeholder, unit, disabled
}: {
  id?: string; value: number; onChange: (e:any)=>void;
  min?: number; step?: number; placeholder?: string; unit?: string; disabled?: boolean;
}) {
  return (
    <div className="input-unit">
      <input
        id={id}
        className="input pr-14"
        type="number"
        inputMode="decimal"
        value={value}
        onChange={onChange}
        min={min} step={step} placeholder={placeholder} disabled={disabled}
      />
      {unit && <span className="unit-badge">{unit}</span>}
    </div>
  );
}

/* -----------------------------------------------------------
   Logique du simulateur
----------------------------------------------------------- */
type Inputs = {
  price: number; down: number; rate: number; years: number;
  rentM: number; vacancy: number; chargesY: number; taxeY: number;
  travauxY: number; tmi: number; scenario: "DF"|"CLASSIC"; capDF: number;
};

const fmt = (n:number, d=0)=> n.toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d});

export default function PatrimoineSimulator(){
  const [inp, setInp] = useState<Inputs>({
    price: 420000, down: 84000, rate: 3.9, years: 20,
    rentM: 1800, vacancy: 6, chargesY: 2500, taxeY: 1200,
    travauxY: 15000, tmi: 30, scenario: "DF", capDF: 10700,
  });

  // bloc contact (envoi CRM)
  const [firstName,setFirstName] = useState("");
  const [lastName,setLastName]   = useState("");
  const [email,setEmail]         = useState("");
  const [phone,setPhone]         = useState("");
  const [consent,setConsent]     = useState(false);
  const [sending,setSending]     = useState(false);
  const [sent,setSent]           = useState<null|boolean>(null);

  const update = (k:keyof Inputs)=> (e:any)=>{
    const v = e.target.type==="number" ? Number(e.target.value) : e.target.value;
    setInp(s=>({...s,[k]: isNaN(v)?0:v}));
  };

  const res = useMemo(()=>{
    const loan = Math.max(0, inp.price - inp.down);
    const i = (inp.rate/100)/12;
    const n = Math.max(1, inp.years*12);
    const mensualite = i>0 ? loan*i/(1-Math.pow(1+i,-n)) : loan/n;

    const vacFactor = Math.max(0, 1 - inp.vacancy/100);
    const loyersNetMens = inp.rentM*vacFactor;
    const loyersAnn = loyersNetMens*12;

    const interetsAnnApprox = loan*(inp.rate/100);
    const chargesAnnTot = inp.chargesY + inp.taxeY;

    const baseFonc = loyersAnn - chargesAnnTot - interetsAnnApprox - (inp.scenario==="DF"?inp.travauxY:0);
    const neg = Math.max(0, -baseFonc);
    const ecoIR = Math.min(neg, inp.capDF) * (inp.tmi/100);
    const ecoPS = neg * 0.172;
    const avantageFiscal = inp.scenario==="DF" ? (ecoIR + ecoPS) : 0;

    const cfAvant = loyersAnn - chargesAnnTot - mensualite*12;
    const cfApres = cfAvant + avantageFiscal;
    const effortMensuel = Math.max(0, -(cfApres/12));
    const rendementBrut = inp.price>0 ? (loyersAnn/inp.price)*100 : 0;

    return { mensualite, loyersAnn, baseFonc, avantageFiscal, cfAvant, cfApres, effortMensuel, rendementBrut };
  },[inp]);

  async function sendLead(){
    if(!email || !consent){ setSent(false); return; }
    setSending(true);
    try{
      const payload = {
        source: "simulateur-patrimoine",
        topic: "Gestion de patrimoine",
        firstName, lastName, email, phone,
        message: "Simulation patrimoniale envoyée depuis le site.",
        meta: {
          inputs: inp,
          results: {
            mensualite: Math.round(res.mensualite),
            loyersAnn: Math.round(res.loyersAnn),
            baseFonc: Math.round(res.baseFonc),
            avantageFiscal: Math.round(res.avantageFiscal),
            cfAvant: Math.round(res.cfAvant),
            cfApres: Math.round(res.cfApres),
            effortMensuel: Math.round(res.effortMensuel),
            rendementBrut: Number(res.rendementBrut.toFixed(1)),
          }
        }
      };
      const r = await fetch("/api/leads", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      setSent(r.ok);
      if(r.ok){ setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setConsent(false); }
    }catch{ setSent(false); }
    setSending(false);
  }

  return (
    <div className="card p-6">
      <h3 className="luxe text-xl mb-4">Mini-simulateur (ordre de grandeur)</h3>

      {/* 1) PROJET */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="grid gap-3">
          <div className="text-sm font-semibold opacity-80">Projet</div>
          <Field id="prix" label="Prix d'achat" hint="Frais non inclus">
            <NumberUnitInput id="prix" unit="€" value={inp.price} onChange={update("price")} min={0} step={1000} placeholder="ex. 420000" />
          </Field>
          <Field id="apport" label="Apport personnel">
            <NumberUnitInput id="apport" unit="€" value={inp.down} onChange={update("down")} min={0} step={1000} placeholder="ex. 84000" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="taux" label="Taux du crédit">
              <NumberUnitInput id="taux" unit="%" value={inp.rate} onChange={update("rate")} min={0} step={0.05} placeholder="ex. 3,9" />
            </Field>
            <Field id="duree" label="Durée">
              <NumberUnitInput id="duree" unit="ans" value={inp.years} onChange={update("years")} min={1} step={1} placeholder="ex. 20" />
            </Field>
          </div>
        </div>

        {/* 2) EXPLOITATION */}
        <div className="grid gap-3">
          <div className="text-sm font-semibold opacity-80">Exploitation</div>
          <Field id="loyer" label="Loyer mensuel brut">
            <NumberUnitInput id="loyer" unit="€ /mois" value={inp.rentM} onChange={update("rentM")} min={0} step={50} placeholder="ex. 1800" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="vacance" label="Vacance locative" hint="% d'inoccupation estimé">
              <NumberUnitInput id="vacance" unit="%" value={inp.vacancy} onChange={update("vacancy")} min={0} step={0.5} placeholder="ex. 6" />
            </Field>
            <Field id="tf" label="Taxe foncière">
              <NumberUnitInput id="tf" unit="€ /an" value={inp.taxeY} onChange={update("taxeY")} min={0} step={100} placeholder="ex. 1200" />
            </Field>
          </div>
          <Field id="charges" label="Charges courantes" hint="Assurance, copro, gestion…">
            <NumberUnitInput id="charges" unit="€ /an" value={inp.chargesY} onChange={update("chargesY")} min={0} step={100} placeholder="ex. 2500" />
          </Field>
        </div>

        {/* 3) FISCALITÉ */}
        <div className="grid gap-3">
          <div className="text-sm font-semibold opacity-80">Fiscalité</div>
          <div className="flex gap-2">
            <label className={`pill cursor-pointer ${inp.scenario==="DF" ? "border-[#B89C6D]" : ""}`}>
              <input type="radio" name="sc" checked={inp.scenario==="DF"} onChange={()=>setInp(s=>({...s,scenario:"DF"}))}/> Déficit foncier
            </label>
            <label className={`pill cursor-pointer ${inp.scenario==="CLASSIC" ? "border-[#B89C6D]" : ""}`}>
              <input type="radio" name="sc" checked={inp.scenario==="CLASSIC"} onChange={()=>setInp(s=>({...s,scenario:"CLASSIC"}))}/> Classique
            </label>
          </div>
          <Field id="travaux" label="Travaux déductibles" hint="Pris en compte seulement en DF">
            <NumberUnitInput id="travaux" unit="€ /an" value={inp.travauxY} onChange={update("travauxY")} min={0} step={100} placeholder="ex. 15000" disabled={inp.scenario!=="DF"} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="tmi" label="TMI">
              <NumberUnitInput id="tmi" unit="%" value={inp.tmi} onChange={update("tmi")} min={0} step={1} placeholder="ex. 30" />
            </Field>
            <Field id="capdf" label="Plafond global (DF)" hint="Imputation revenu global">
              <NumberUnitInput id="capdf" unit="€" value={inp.capDF} onChange={update("capDF")} min={0} step={100} placeholder="10700" disabled={inp.scenario!=="DF"} />
            </Field>
          </div>
        </div>
      </div>

      {/* RÉSULTATS */}
      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <Stat title="Mensualité" value={`${fmt(res.mensualite,0)} €`} note={`crédit sur ${inp.years} ans`} />
        <Stat title="Cash-flow (après impôt)" value={`${fmt(res.cfApres,0)} € /an`} note={`avant : ${fmt(res.cfAvant,0)} € /an`} positive={res.cfApres>=0}/>
        <Stat title="Effort d'épargne estimé" value={`${fmt(res.effortMensuel,0)} € /mois`} note="si négatif, = 0 €" />
        <Stat title="Rendement brut" value={`${fmt(res.rendementBrut,1)} %`} note="loyers/an ÷ prix" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <Stat title="Loyers annuels (net vacance)" value={`${fmt(res.loyersAnn,0)} €`} />
        <Stat title="Base foncière taxable" value={`${fmt(res.baseFonc,0)} €`} positive={res.baseFonc<0}/>
        <Stat title="Économie d'impôt estimative" value={inp.scenario==="DF" ? `${fmt(res.avantageFiscal,0)} € /an` : "—"} note={inp.scenario==="DF" ? "approx. TMI + 17.2% (plafonné)" : undefined}/>
      </div>

      {/* Envoi au CRM */}
      <div className="card p-4 mt-6">
        <div className="luxe text-lg mb-2">Recevoir ma simulation & être recontacté</div>
        <div className="grid md:grid-cols-4 gap-2">
          <input className="input" placeholder="Prénom" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
          <input className="input" placeholder="Nom" value={lastName} onChange={e=>setLastName(e.target.value)} required />
          <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="input" placeholder="Téléphone (optionnel)" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
          J&apos;accepte la politique de confidentialité.
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn btn-gold" onClick={sendLead} disabled={sending || !email || !consent}>
            {sending ? "Envoi..." : "Envoyer ma simulation"}
          </button>
          {sent===true  && <span className="text-green-700 text-sm">Merci, votre simulation a été transmise. Nous vous recontactons très vite.</span>}
          {sent===false && <span className="text-red-700 text-sm">Échec de l&apos;envoi. Vérifiez vos infos et réessayez.</span>}
        </div>
      </div>

      <p className="text-xs opacity-70 mt-4">
        ⚠️ Simulation pédagogique (année 1). Ne remplace pas une étude personnalisée ni un conseil fiscal.
      </p>
    </div>
  );
}

function Stat({title,value,note,positive}:{title:string;value:string;note?:string;positive?:boolean}){
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm opacity-70">{title}</div>
      <div className={`text-2xl font-semibold ${positive?"text-green-700":""}`}>{value}</div>
      {note && <div className="text-xs opacity-60">{note}</div>}
    </div>
  );
}
