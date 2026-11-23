"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// pdf.js ne fonctionne que côté navigateur.
const DocumentReader = dynamic(() => import("@/components/DocumentReader"), { ssr: false });

type Info = {
  status: string;
  signed: boolean;
  signerName: string;
  mandateNumber: string;
  mandateType: string;
  typeLabel: string;
  address: string;
  signedAt: string | null;
  error?: string;
  documentVersion?: string;
  // Renseigné quand le jeton désigne un AVENANT : même circuit de signature,
  // mais le document et le vocabulaire diffèrent.
  document?: "AVENANT";
  avenant?: {
    numero: number;
    objet: string;
    motif?: string;
    ancienPrix: number | null;
    nouveauPrix: number | null;
    ancienNetVendeur: number | null;
    nouveauNetVendeur: number | null;
  };
};

const eur = (n: number | null | undefined) =>
  (n || n === 0) ? Math.round(n).toLocaleString("fr-FR") + " €" : "—";

// Défini au niveau module (et non dans le composant) : sinon il serait recréé à
// chaque frappe, ce qui démonterait/remonterait tout le sous-arbre — le champ nom
// perdrait le focus et le canvas de signature s'effacerait à chaque caractère.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "#F4F1EB", padding: "24px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#1F3B2C", letterSpacing: 1 }}>Lemeille Patrimoine</div>
          <div style={{ color: "#B89C6D", fontSize: 13, marginTop: 2 }}>Signature électronique du mandat de vente</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", padding: 24 }}>
          {children}
        </div>
        <p style={{ textAlign: "center", color: "#8a8a8a", fontSize: 11, marginTop: 16 }}>
          NOVUS CAPITAL SAS — CPI 7606 2024 000 000 038 — 50 rue de la Garenne, 76130 Mont-Saint-Aignan
        </p>
      </div>
    </main>
  );
}

export default function SignMandatPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string;

  const [info, setInfo] = useState<Info | null>(null);
  // Le même écran sert le mandat et ses avenants : seul le vocabulaire change.
  const estAvenant = info?.document === "AVENANT";
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  // La signature n'est délivrée qu'après lecture complète et validation du mandat.
  const [mandateRead, setMandateRead] = useState(false);
  const submissionLock = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/mandat/sign/${token}`,{cache:'no-store',signal:AbortSignal.timeout(20000)})
      .then(r => r.json())
      .then((d: Info) => {
        setInfo(d);
        setSignerName(d.signerName || "");
        setLoading(false);
      })
      .catch(() => { setInfo({ error: "Chargement impossible. Vérifiez votre connexion et rechargez la page. Aucune signature n’a été envoyée." } as Info); setLoading(false); });
  }, [token]);

  // ---- Canvas de signature ----
  const setupCanvas = (c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1F3B2C";
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (c) setupCanvas(c);
  }, [info, done, mandateRead]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if(submitting || !mandateRead)return;
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasDrawn) setHasDrawn(true);
  };
  const end = () => { drawing.current = false; last.current = null; };

  const clearCanvas = () => {
    if(submitting)return;
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  const submit = async () => {
    if(submissionLock.current)return;
    setError(null);
    if(!mandateRead || !info?.documentVersion){setError("Veuillez lire et valider le document avant de signer.");return;}
    if (!hasDrawn) { setError("Veuillez tracer votre signature dans le cadre."); return; }
    if (!consent) { setError("Veuillez cocher la case de consentement."); return; }
    if (!signerName.trim()) { setError("Veuillez indiquer votre nom."); return; }
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    setSubmitting(true);
    submissionLock.current=true;
    try {
      const res = await fetch(`/api/mandat/sign/${token}`, {
        method: "POST",
        signal:AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl, consent: true, signerName: signerName.trim(), documentVersion:info.documentVersion,
          mention: estAvenant ? "Bon pour avenant" : "Bon pour mandat",
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Une erreur est survenue."); setSubmitting(false); return; }
      if(d.ok!==true)throw new Error('Réponse non confirmée');
      setDone(true);
    } catch {
      setError("Résultat non confirmé. Rechargez la page pour vérifier si votre signature a été enregistrée avant de réessayer.");
      setSubmitting(false);
    } finally {submissionLock.current=false;}
  };

  const canSign=!submitting && mandateRead && hasDrawn && consent && !!signerName.trim();
  if (loading) return <Shell><p role="status">Chargement…</p></Shell>;
  if (!info || info.error) return <Shell><p style={{ color: "#b00" }}>{info?.error || "Lien de signature invalide ou expiré."}</p></Shell>;

  if (done || info.signed) {
    return (
      <Shell>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#1F3B2C", marginBottom: 8 }}>
            {estAvenant ? "Avenant signé" : "Mandat signé"}
          </h1>
          <p style={{ color: "#444" }}>
            Merci. {estAvenant ? "L'avenant à votre mandat de vente" : "Votre mandat de vente"} {info.mandateNumber ? `N° ${info.mandateNumber} ` : ""}a bien été signé électroniquement.
            {info.signedAt && !done ? ` Le ${new Date(info.signedAt).toLocaleString("fr-FR")}.` : ""}
          </p>
          <p style={{ color: "#666", fontSize: 13, marginTop: 12 }}>Votre signature est enregistrée. Si d’autres signataires sont attendus, le document sera finalisé après leurs signatures. Arthur reste votre interlocuteur.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#1F3B2C", marginBottom: 4 }}>
        {estAvenant ? "Avenant au mandat de vente" : "Mandat de vente"}{info.mandateNumber ? ` — N° ${info.mandateNumber}` : ""}
      </h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 4 }}>
        {info.typeLabel}{info.address ? ` — ${info.address}` : ""}
      </p>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>Mandataire : NOVUS CAPITAL SAS (Arthur Lemeille).</p>

      {/* Ce que l'avenant change, annoncé AVANT l'ouverture du document : le
          signataire doit savoir sur quoi il s'engage sans avoir à déplier le
          PDF. Le détail complet reste dans l'avenant lui-même. */}
      {estAvenant && info.avenant && (
        <div style={{ border: "1px solid #B89C6D", background: "#FBF8F2", borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1F3B2C", marginBottom: 8 }}>
            Ce que cet avenant modifie
          </div>
          <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ color: "#666", padding: "3px 0" }}>Prix de vente</td>
                <td style={{ textAlign: "right", color: "#888", textDecoration: "line-through" }}>{eur(info.avenant.ancienPrix)}</td>
                <td style={{ textAlign: "right", fontWeight: 700, color: "#1F3B2C", paddingLeft: 12 }}>{eur(info.avenant.nouveauPrix)}</td>
              </tr>
              <tr>
                <td style={{ color: "#666", padding: "3px 0" }}>Net vendeur</td>
                <td style={{ textAlign: "right", color: "#888", textDecoration: "line-through" }}>{eur(info.avenant.ancienNetVendeur)}</td>
                <td style={{ textAlign: "right", fontWeight: 700, color: "#1F3B2C", paddingLeft: 12 }}>{eur(info.avenant.nouveauNetVendeur)}</td>
              </tr>
            </tbody>
          </table>
          {info.avenant.motif && (
            <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>Motif : {info.avenant.motif}</div>
          )}
          <div style={{ fontSize: 12, color: "#777", marginTop: 8 }}>
            Toutes les autres clauses du mandat restent inchangées.
          </div>
        </div>
      )}

      <p className="text-sm text-gray-600">1. Lisez le document ci-dessous. 2. Confirmez votre lecture. 3. Signez au bas de cette page.</p>
      <DocumentReader inline
        url={`/api/mandat/sign/${token}/pdf?version=${encodeURIComponent(info.documentVersion || '')}`}
        title={`${estAvenant ? 'Avenant' : 'Mandat de vente'}${info.mandateNumber ? ` — N° ${info.mandateNumber}` : ''}`}
        onClose={()=>{}}
        onAcknowledge={()=>{setMandateRead(true);setTimeout(()=>document.getElementById('signer-name')?.focus(),0);}}
        acknowledgeLabel={`Je confirme avoir lu l’intégralité ${estAvenant ? 'de l’avenant' : 'du mandat'}.`}
      />
      <h2 className="text-xl font-semibold mb-4" id="signature-title">Votre signature</h2>

      {!mandateRead && (
        <p style={{ fontSize: 13, color: "#777", textAlign: "center", marginBottom: 4 }} data-testid="text-signature-locked">
          La signature sera disponible après lecture et validation {estAvenant ? "de l'avenant" : "du mandat"}.
        </p>
      )}

      {mandateRead && (
        <>
        <label htmlFor="signer-name" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Votre nom et prénom</label>
        <input id="signer-name" maxLength={200} disabled={submitting} aria-label="Vos nom et prénom" value={signerName} onChange={e => setSignerName(e.target.value)}
          autoComplete="name" autoCapitalize="words"
          placeholder="Prénom NOM"
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: 8, marginBottom: 16, fontSize: 14 }} />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          Votre signature <span style={{ fontWeight: 400, color: "#888" }}>(tracez avec la souris ou le doigt)</span>
        </label>
        <div style={{ border: "1px dashed #bbb", borderRadius: 10, background: "#fafafa", position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={400}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            onPointerCancel={end}
            aria-label="Cadre de signature manuscrite"
            data-testid="signature-canvas"
            style={{ width: "100%", height: 200, touchAction: "none", cursor: "crosshair", display: "block" }}
          />
          {!hasDrawn && (
            <span style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", color: "#bbb", fontSize: 14, pointerEvents: "none" }}>
              Signez ici
            </span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#777" }}>Mention : « {estAvenant ? 'Bon pour avenant' : 'Bon pour mandat'} »</span>
          <button type="button" onClick={clearCanvas} style={{ fontSize: 13, color: "#B89C6D", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Effacer</button>
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#444", marginBottom: 18 }}>
          <input type="checkbox" data-testid="consent-signature" disabled={submitting} checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span>J’accepte les termes {estAvenant ? 'de cet avenant' : 'de ce mandat'} et consens à le signer électroniquement. Ma signature, la version du document, la date, l’heure et mon adresse IP seront conservées dans le dossier de signature.</span>
        </label>
        </>
      )}

      {error && <div role="alert" style={{ color: "#b00", fontSize: 13, marginBottom: 12 }}><p>{error}</p><button type="button" className="underline mt-2" onClick={()=>window.location.reload()}>Recharger et vérifier le statut</button></div>}

      <button type="button" data-testid="submit-signature" onClick={submit} disabled={!canSign}
        style={{ width: "100%", padding: "12px", background: "#1F3B2C", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: canSign ? "pointer" : "default", opacity: canSign ? 1 : 0.45 }}>
        {submitting ? "Signature en cours…" : estAvenant ? "Signer l’avenant" : "Signer le mandat"}
      </button>
      <p className="text-sm text-gray-600 mt-4">Une difficulté pour lire ou tracer votre signature ? Contactez Arthur au <a href="tel:+33687157259" className="underline">06 87 15 72 59</a>. Ne transmettez pas votre lien de signature.</p>
    </Shell>
  );
}
