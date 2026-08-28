"use client";
import { useEffect, useRef, useState } from "react";
import { propertyLabel } from "@/lib/propertyLabel";
import dynamic from "next/dynamic";

// pdf.js ne fonctionne que côté navigateur.
const DocumentReader = dynamic(() => import("@/components/DocumentReader"), { ssr: false });

type Prop = { id: string; title?: string; city?: string; price?: number; priceOnRequest?: boolean; type?: string; rooms?: number; surface?: number; sold?: boolean; status?: string; visible?: boolean };

const eur = (n?: number) => (n || n === 0) ? Math.round(Number(n)).toLocaleString("fr-FR") + " €" : "—";

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const has = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!; ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => { e.preventDefault(); drawing.current = true; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); c.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!drawing.current) return; e.preventDefault(); const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); has.current = true; onChange(c.toDataURL("image/png")); };
    const up = () => { drawing.current = false; };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move); c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
  }, [onChange]);

  const clear = () => { const c = ref.current!; const ctx = c.getContext("2d")!; ctx.clearRect(0, 0, c.width, c.height); has.current = false; onChange(null); };

  return (
    <div>
      <canvas ref={ref} className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white touch-none" style={{ height: 180 }} />
      <button type="button" onClick={clear} className="mt-1 text-sm text-gray-500 underline">Effacer</button>
    </div>
  );
}

export default function Page() {
  const [props, setProps] = useState<Prop[]>([]);
  const [type, setType] = useState<"VISITE" | "OFFRE">("VISITE");
  const [propertyId, setPropertyId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [atAsking, setAtAsking] = useState(true);
  const [offerAmount, setOfferAmount] = useState("");
  const [sequestre, setSequestre] = useState("");
  const [validityDays, setValidityDays] = useState("10");
  const [financing, setFinancing] = useState<"COMPTANT" | "CREDIT">("CREDIT");
  const [signature, setSignature] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string; number: string; emailed?: boolean } | null>(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  // La signature n'est délivrée qu'une fois le document lu et validé.
  const [documentRead, setDocumentRead] = useState(false);

  useEffect(() => {
    fetch("/api/properties").then(r => r.json()).then((d: Prop[]) => {
      // Uniquement les biens réellement en vente (ni vendus, ni sous promesse).
      setProps((Array.isArray(d) ? d : []).filter(p =>
        p.visible !== false && !p.sold && p.status !== "SOLD" && p.status !== "UNDER_OFFER"
      ));
    }).catch(() => {});
  }, []);

  const property = props.find(p => p.id === propertyId);
  const inCls = "w-full px-3 py-3 text-base border rounded-lg";

  const validBase = () => {
    if (!propertyId) { setError("Choisissez un bien."); return false; }
    if (!firstName && !lastName) { setError("Nom du client requis."); return false; }
    if (type === "OFFRE" && !atAsking && !(Number(offerAmount) > 0)) { setError("Montant de l'offre requis."); return false; }
    return true;
  };

  // Toute modification d'un champ entrant dans le document invalide la lecture :
  // on ne doit jamais pouvoir lire une version puis en signer une autre.
  useEffect(() => {
    setDocumentRead(false);
    setSignature(null);
    setConsent(false);
  }, [type, propertyId, firstName, lastName, email, phone, address, atAsking, offerAmount, sequestre, validityDays, financing]);

  const openPreview = async () => {
    setError("");
    if (!validBase()) return;
    setPreviewing(true);
    try {
      const res = await fetch("/api/documents/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, propertyId, client: { firstName, lastName, email, phone, address },
          atAskingPrice: type === "OFFRE" ? atAsking : undefined,
          offerAmount: type === "OFFRE" && !atAsking ? Number(offerAmount) : undefined,
          sequestreAmount: type === "OFFRE" && sequestre ? Number(sequestre) : undefined,
          validityDays: type === "OFFRE" && validityDays ? Number(validityDays) : undefined,
          financing: type === "OFFRE" ? financing : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Erreur d'aperçu."); }
      else { const blob = await res.blob(); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(URL.createObjectURL(blob)); }
    } catch { setError("Erreur réseau."); }
    setPreviewing(false);
  };
  const closePreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); };

  const submit = async () => {
    setError("");
    if (!propertyId) return setError("Choisissez un bien.");
    if (!firstName && !lastName) return setError("Nom du client requis.");
    if (type === "OFFRE" && !atAsking && !(Number(offerAmount) > 0)) return setError("Montant de l'offre requis.");
    if (!signature) return setError("La signature est requise.");
    if (!consent) return setError("Cochez la case de consentement.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, propertyId,
          client: { firstName, lastName, email, phone, address },
          atAskingPrice: type === "OFFRE" ? atAsking : undefined,
          offerAmount: type === "OFFRE" && !atAsking ? Number(offerAmount) : undefined,
          sequestreAmount: type === "OFFRE" && sequestre ? Number(sequestre) : undefined,
          validityDays: type === "OFFRE" && validityDays ? Number(validityDays) : undefined,
          financing: type === "OFFRE" ? financing : undefined,
          signature: { dataUrl: signature, mention: type === "OFFRE" ? "Bon pour offre" : "Lu et approuvé" },
        }),
      });
      const d = await res.json();
      if (res.ok) setDone({ id: d.id, number: d.number, emailed: d.emailed });
      else setError(d.error || "Erreur.");
    } catch { setError("Erreur réseau."); }
    setSubmitting(false);
  };

  const reset = () => { setDone(null); setSignature(null); setConsent(false); setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setAddress(""); setOfferAmount(""); setAtAsking(true); setSequestre(""); setValidityDays("10"); setFinancing("CREDIT"); };

  if (done) {
    return (
      <main className="min-h-screen bg-[#f6f4ef] p-5 flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-xl font-semibold text-[#1F3B2C] mb-1">{type === "OFFRE" ? "Offre d'achat" : "Bon de visite"} enregistré</h1>
        <p className="text-sm opacity-70 mb-2">N° {done.number}</p>
        <p className="text-sm mb-6">{done.emailed ? `✉️ Copie envoyée à ${email}` : (email ? "✉️ Envoi de l’email non effectué" : "Aucun email client renseigné")}</p>
        <a href={`/api/documents/${done.id}/pdf`} target="_blank" rel="noopener noreferrer" className="w-full max-w-xs px-4 py-3 bg-[#1F3B2C] text-white rounded-lg mb-3">Ouvrir le PDF signé</a>
        <button onClick={reset} className="w-full max-w-xs px-4 py-3 border border-[#B89C6D] text-[#B89C6D] rounded-lg">Nouveau document</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] pb-24">
      <header className="bg-[#1F3B2C] text-white px-5 py-4 sticky top-0 z-10">
        <div className="text-lg font-semibold">Documents terrain</div>
        <div className="text-xs opacity-80">Lemeille Patrimoine · Novus Capital</div>
      </header>

      <div className="p-5 space-y-5 max-w-md mx-auto">
        {/* Type */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setType("VISITE")} className={`py-4 rounded-xl border-2 font-medium ${type === "VISITE" ? "bg-[#1F3B2C] text-white border-[#1F3B2C]" : "bg-white border-gray-300"}`}>Bon de visite</button>
          <button onClick={() => setType("OFFRE")} className={`py-4 rounded-xl border-2 font-medium ${type === "OFFRE" ? "bg-[#1F3B2C] text-white border-[#1F3B2C]" : "bg-white border-gray-300"}`}>Offre d’achat</button>
        </div>

        {/* Bien */}
        <div>
          <label className="block text-sm font-medium mb-1">Bien concerné</label>
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={inCls}>
            <option value="">— Choisir un bien —</option>
            {props.map(p => (
              <option key={p.id} value={p.id}>{propertyLabel(p)}</option>
            ))}
          </select>
          {property && <p className="text-xs opacity-70 mt-1">{property.title}</p>}
        </div>

        {/* Client */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">{type === "OFFRE" ? "Acquéreur" : "Visiteur"}</label>
          <div className="grid grid-cols-2 gap-2">
            <input className={inCls} placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input className={inCls} placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <input className={inCls} type="tel" placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className={inCls} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className={inCls} placeholder="Adresse (facultatif)" value={address} onChange={e => setAddress(e.target.value)} />
        </div>

        {/* Offre */}
        {type === "OFFRE" && (
          <div className="space-y-2 p-3 bg-white rounded-xl border">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={atAsking} onChange={e => setAtAsking(e.target.checked)} /> Offre <strong>au prix</strong> {property && !property.priceOnRequest ? `(${eur(property.price)})` : ""}</label>
            {!atAsking && (
              <div>
                <label className="block text-sm mb-1">Montant proposé (€)</label>
                <input className={inCls} inputMode="numeric" value={offerAmount} onChange={e => setOfferAmount(e.target.value.replace(/[^\d]/g, ""))} placeholder="ex : 480000" />
              </div>
            )}
            <div>
              <label className="block text-sm mb-1">Séquestre (€)</label>
              <input className={inCls} inputMode="numeric" value={sequestre} onChange={e => setSequestre(e.target.value.replace(/[^\d]/g, ""))} placeholder="ex : 10000 (facultatif)" />
            </div>
            <div>
              <label className="block text-sm mb-1">Validité de l’offre (jours)</label>
              <input className={inCls} inputMode="numeric" value={validityDays} onChange={e => setValidityDays(e.target.value.replace(/[^\d]/g, ""))} placeholder="10" />
            </div>
            <div>
              <label className="block text-sm mb-1">Financement</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFinancing("COMPTANT")} className={`py-3 rounded-lg border-2 text-sm font-medium ${financing === "COMPTANT" ? "bg-[#1F3B2C] text-white border-[#1F3B2C]" : "bg-white border-gray-300"}`}>Comptant</button>
                <button type="button" onClick={() => setFinancing("CREDIT")} className={`py-3 rounded-lg border-2 text-sm font-medium ${financing === "CREDIT" ? "bg-[#1F3B2C] text-white border-[#1F3B2C]" : "bg-white border-gray-300"}`}>À crédit</button>
              </div>
            </div>
          </div>
        )}

        {/* Lecture obligatoire du document avant signature */}
        <button type="button" onClick={openPreview} disabled={previewing} className="w-full py-3 border-2 border-[#1F3B2C] text-[#1F3B2C] rounded-xl font-medium disabled:opacity-60" data-testid="button-read-document">
          {previewing ? "Chargement…" : documentRead ? "📄 Relire le document" : "📄 Lire le document avant de signer"}
        </button>

        {!documentRead ? (
          <p className="text-xs text-gray-500 text-center" data-testid="text-signature-locked">
            La signature sera disponible après lecture et validation du document.
          </p>
        ) : (
          <>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800" data-testid="text-document-read">
              ✓ Document lu et approuvé par le {type === "OFFRE" ? "l'acquéreur" : "visiteur"}.
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Signature du {type === "OFFRE" ? "l'acquéreur" : "visiteur"}</label>
              <SignaturePad onChange={setSignature} />
            </div>

            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
              <span>Je reconnais avoir lu et accepté le contenu du document et j&rsquo;appose ma signature électronique.</span>
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={submit} disabled={submitting || !documentRead} className="w-full py-4 bg-[#B89C6D] text-white rounded-xl font-medium disabled:opacity-40">
          {submitting ? "Génération…" : `Signer & générer le ${type === "OFFRE" ? "l'offre" : "bon de visite"}`}
        </button>
      </div>

      {previewUrl && (
        <DocumentReader
          url={previewUrl}
          title={type === "OFFRE" ? "Offre d'achat (non signée)" : "Bon de visite (non signé)"}
          onClose={closePreview}
          onAcknowledge={() => { setDocumentRead(true); closePreview(); }}
        />
      )}

    </main>
  );
}
