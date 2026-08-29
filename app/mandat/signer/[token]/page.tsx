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
};

// Défini au niveau module (et non dans le composant) : sinon il serait recréé à
// chaque frappe, ce qui démonterait/remonterait tout le sous-arbre — le champ nom
// perdrait le focus et le canvas de signature s'effacerait à chaque caractère.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "#F4F1EB", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
  const [loading, setLoading] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  // La signature n'est délivrée qu'après lecture complète et validation du mandat.
  const [reading, setReading] = useState(false);
  const [mandateRead, setMandateRead] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/mandat/sign/${token}`)
      .then(r => r.json())
      .then((d: Info) => {
        setInfo(d);
        setSignerName(d.signerName || "");
        setLoading(false);
      })
      .catch(() => { setInfo({ error: "Lien invalide" } as Info); setLoading(false); });
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
  }, [info, done]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  };

  const submit = async () => {
    setError(null);
    if (!hasDrawn) { setError("Veuillez tracer votre signature dans le cadre."); return; }
    if (!consent) { setError("Veuillez cocher la case de consentement."); return; }
    if (!signerName.trim()) { setError("Veuillez indiquer votre nom."); return; }
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mandat/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, consent: true, signerName: signerName.trim(), mention: "Bon pour mandat" }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Une erreur est survenue."); setSubmitting(false); return; }
      setDone(true);
    } catch {
      setError("Une erreur réseau est survenue. Réessayez.");
      setSubmitting(false);
    }
  };

  if (loading) return <Shell><p>Chargement…</p></Shell>;
  if (!info || info.error) return <Shell><p style={{ color: "#b00" }}>{info?.error || "Lien de signature invalide ou expiré."}</p></Shell>;

  if (done || info.signed) {
    return (
      <Shell>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#1F3B2C", marginBottom: 8 }}>Mandat signé</h1>
          <p style={{ color: "#444" }}>
            Merci. Votre mandat de vente {info.mandateNumber ? `N° ${info.mandateNumber} ` : ""}a bien été signé électroniquement.
            {info.signedAt && !done ? ` Le ${new Date(info.signedAt).toLocaleString("fr-FR")}.` : ""}
          </p>
          <p style={{ color: "#666", fontSize: 13, marginTop: 12 }}>Un exemplaire signé vous sera transmis par votre conseiller.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#1F3B2C", marginBottom: 4 }}>
        Mandat de vente{info.mandateNumber ? ` — N° ${info.mandateNumber}` : ""}
      </h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 4 }}>
        {info.typeLabel}{info.address ? ` — ${info.address}` : ""}
      </p>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>Mandataire : NOVUS CAPITAL SAS (Arthur Lemeille).</p>

      <button type="button" onClick={() => setReading(true)}
        style={{ display: "block", width: "100%", marginBottom: 18, padding: "12px", background: "#fff",
                 border: "2px solid #1F3B2C", color: "#1F3B2C", borderRadius: 10, fontWeight: 600,
                 fontSize: 14, cursor: "pointer" }}
        data-testid="button-read-mandate">
        📄 {mandateRead ? "Relire le mandat" : "Lire le mandat complet avant de signer"}
      </button>

      {!mandateRead && (
        <p style={{ fontSize: 13, color: "#777", textAlign: "center", marginBottom: 4 }} data-testid="text-signature-locked">
          La signature sera disponible après lecture et validation du mandat.
        </p>
      )}

      {mandateRead && (
        <>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Votre nom et prénom</label>
        <input aria-label="Vos nom et prénom" value={signerName} onChange={e => setSignerName(e.target.value)}
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
            style={{ width: "100%", height: 200, touchAction: "none", cursor: "crosshair", display: "block" }}
          />
          {!hasDrawn && (
            <span style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", color: "#bbb", fontSize: 14, pointerEvents: "none" }}>
              Signez ici
            </span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#777" }}>Mention : « Bon pour mandat »</span>
          <button type="button" onClick={clearCanvas} style={{ fontSize: 13, color: "#B89C6D", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Effacer</button>
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#444", marginBottom: 18 }}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span>{"Je reconnais avoir pris connaissance de l'intégralité du mandat de vente et j'accepte ses termes. Je consens à le signer par voie électronique (signature électronique simple, eIDAS). Ma signature, la date, l'heure et mon adresse IP seront conservées comme preuve."}</span>
        </label>
        </>
      )}

      {error && <p style={{ color: "#b00", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button type="button" onClick={submit} disabled={submitting || !mandateRead}
        style={{ width: "100%", padding: "12px", background: "#B89C6D", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: submitting || !mandateRead ? "default" : "pointer", opacity: submitting || !mandateRead ? 0.45 : 1 }}>
        {submitting ? "Signature en cours…" : "Signer le mandat"}
      </button>
      {reading && (
        <DocumentReader
          url={`/api/mandat/sign/${token}/pdf`}
          title={`Mandat de vente${info.mandateNumber ? ` — N° ${info.mandateNumber}` : ""}`}
          onClose={() => setReading(false)}
          onAcknowledge={() => { setMandateRead(true); setReading(false); }}
          acknowledgeLabel="Je reconnais avoir lu et pris connaissance de l'intégralité du mandat de vente."
        />
      )}
    </Shell>
  );
}
