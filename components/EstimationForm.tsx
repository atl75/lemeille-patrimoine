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

const fmt = (n:number)=> n.toLocaleString("fr-FR");

export default function EstimationForm(){
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

  const [firstName,setFirstName] = useState("");
  const [lastName,setLastName]   = useState("");
  const [email,setEmail]         = useState("");
  const [phone,setPhone]         = useState("");
  const [consent,setConsent]     = useState(false);
  const [sending,setSending]     = useState(false);
  const [sent,setSent]           = useState<null|boolean>(null);
  const [validationError, setValidationError] = useState("");

  const set = (k:keyof TInput)=>(e:any)=>{
    const v = (typeof e === "object" && e?.target) ? (e.target.type==="number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value) : e;
    setInp(s=>({...s,[k]: v}));
  };

  // === Calcul indicatif ===
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

  async function sendLead(){
    setValidationError("");
    
    // Validation
    if(!phone && !consent) {
      setValidationError("Veuillez renseigner votre numéro de téléphone et accepter la politique de confidentialité.");
      return;
    }
    if(!phone) {
      setValidationError("Veuillez renseigner votre numéro de téléphone.");
      return;
    }
    if(!consent) {
      setValidationError("Veuillez accepter la politique de confidentialité pour continuer.");
      return;
    }
    
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
        setFirstName("");
        setLastName(""); 
        setEmail(""); 
        setPhone(""); 
        setConsent(false); 
        setValidationError("");
      }
    }catch{ setSent(false); }
    setSending(false);
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="grid gap-3">
            <div className="text-sm font-semibold opacity-80">Localisation & type</div>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Adresse complète</span>
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
                }}
                placeholder="Ex : 35 rue Ganterie, Rouen"
                className="input"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Type de bien</span>
              <div className="flex gap-2">
                <label className="pill cursor-pointer">
                  <input type="radio" name="type" checked={inp.type==="Appartement"} onChange={()=>set("type")("Appartement")} /> Appartement
                </label>
                <label className="pill cursor-pointer">
                  <input type="radio" name="type" checked={inp.type==="Maison"} onChange={()=>set("type")("Maison")} /> Maison
                </label>
              </div>
            </label>
          </div>

          <div className="grid gap-3">
            <div className="text-sm font-semibold opacity-80">Caractéristiques principales</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium">Surface (m²)</span>
                <input className="input" type="number" min="0" step="1" value={inp.surface} onChange={set("surface") as any} onFocus={e => e.target.select()} placeholder="80"/>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium">Nombre de pièces</span>
                <input className="input" type="number" min="0" step="1" value={inp.rooms} onChange={set("rooms") as any} onFocus={e => e.target.select()} placeholder="3"/>
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm font-medium">État général</span>
              <select className="input" value={inp.condition} onChange={set("condition") as any}>
                {["Refait à neuf","Bon état","À rafraîchir","À rénover"].map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Diagnostic de performance énergétique</span>
              <select className="input" value={inp.dpe} onChange={set("dpe") as any}>
                {["A","B","C","D","E","F","G","Inconnu"].map(v=><option key={v} value={v}>{v === "Inconnu" ? "Inconnu" : `DPE ${v}`}</option>)}
              </select>
            </label>
            {inp.type==="Appartement" && (
              <div className="flex gap-2">
                <label className="grid gap-1 flex-1">
                  <span className="text-sm font-medium">Étage</span>
                  <input className="input" type="number" min="0" step="1" value={inp.floor ?? ''} onChange={set("floor") as any} onFocus={e => e.target.select()} placeholder="3"/>
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium opacity-0">Ascenseur</span>
                  <label className="pill h-9 flex items-center"><input type="checkbox" checked={!!inp.elevator} onChange={e=>setInp(s=>({...s,elevator:e.target.checked}))}/> Ascenseur</label>
                </label>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            <div className="text-sm font-semibold opacity-80">Extérieurs & atouts</div>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Espaces extérieurs</span>
              <div className="flex gap-2">
                <label className="pill"><input type="checkbox" checked={!!inp.extTerrasse} onChange={e=>setInp(s=>({...s,extTerrasse:e.target.checked}))}/> Terrasse</label>
                <label className="pill"><input type="checkbox" checked={!!inp.extJardin} onChange={e=>setInp(s=>({...s,extJardin:e.target.checked}))}/> Jardin</label>
              </div>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Atouts supplémentaires</span>
              <div className="flex gap-2 flex-wrap">
                <label className="pill"><input type="checkbox" checked={!!inp.parking} onChange={e=>setInp(s=>({...s,parking:e.target.checked}))}/> Parking</label>
                <label className="pill"><input type="checkbox" checked={!!inp.seaView} onChange={e=>setInp(s=>({...s,seaView:e.target.checked}))}/> Vue mer</label>
                {inp.type === "Maison" && (
                  <label className="pill"><input type="checkbox" checked={!!inp.pool} onChange={e=>setInp(s=>({...s,pool:e.target.checked}))}/> Piscine</label>
                )}
                <label className="pill"><input type="checkbox" checked={!!inp.lumineux} onChange={e=>setInp(s=>({...s,lumineux:e.target.checked}))}/> Lumineux</label>
                <label className="pill"><input type="checkbox" checked={!!inp.calme} onChange={e=>setInp(s=>({...s,calme:e.target.checked}))}/> Calme</label>
                <label className="pill"><input type="checkbox" checked={!!inp.cuisineEquipee} onChange={e=>setInp(s=>({...s,cuisineEquipee:e.target.checked}))}/> Cuisine équipée</label>
                <label className="pill"><input type="checkbox" checked={!!inp.cuisineRecente} onChange={e=>setInp(s=>({...s,cuisineRecente:e.target.checked}))}/> Cuisine récente</label>
                <label className="pill"><input type="checkbox" checked={!!inp.parquet} onChange={e=>setInp(s=>({...s,parquet:e.target.checked}))}/> Parquet</label>
                <label className="pill"><input type="checkbox" checked={!!inp.dressing} onChange={e=>setInp(s=>({...s,dressing:e.target.checked}))}/> Dressing</label>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Lead */}
      <div className="card p-6">
        <div className="luxe text-lg mb-2">Recevoir mon estimation détaillée et un avis de valeur</div>
        <div className="grid md:grid-cols-4 gap-2">
          <input aria-label="Prénom" className="input" placeholder="Prénom" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
          <input aria-label="Nom" className="input" placeholder="Nom" value={lastName} onChange={e=>setLastName(e.target.value)} required />
          <input aria-label="Téléphone" className="input" placeholder="Téléphone" value={phone} onChange={e=>setPhone(e.target.value)} required />
          <input aria-label="Email (optionnel)" className="input" type="email" placeholder="Email (optionnel)" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />
          J&apos;accepte la politique de confidentialité.
        </label>
        <div className="mt-3 flex flex-col gap-2">
          <button className="btn btn-gold" onClick={sendLead} disabled={sending}>
            {sending ? "Envoi..." : "Demander mon avis de valeur"}
          </button>
          {validationError && <span className="text-red-700 text-sm">{validationError}</span>}
          {sent===true  && <span className="text-green-700 text-sm">Merci, nous revenons vers vous rapidement pour affiner l&apos;estimation.</span>}
          {sent===false && <span className="text-red-700 text-sm">Échec de l&apos;envoi. Vérifiez vos informations.</span>}
        </div>
      </div>
    </div>
  );
}
