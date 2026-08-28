"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

// pdf.js ne fonctionne que côté navigateur.
const DocumentReader = dynamic(() => import("@/components/DocumentReader"), { ssr: false });

type Info = {
  number: string; ownerName: string; propertyTitle: string; propertyCity: string;
  offerAmount?: number; atAskingPrice: boolean; signed: boolean; signedAt: string | null; error?: string;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100dvh", background: "#F4F1EB", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "#1F3B2C", letterSpacing: 1 }}>Lemeille Patrimoine</div>
          <div style={{ color: "#B89C6D", fontSize: 13, marginTop: 2 }}>Acceptation d&apos;une offre d&apos;achat</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", padding: 24 }}>{children}</div>
        <p style={{ textAlign: "center", color: "#8a8a8a", fontSize: 11, marginTop: 16 }}>
          NOVUS CAPITAL SAS — CPI 7606 2024 000 000 038 — 50 rue de la Garenne, 76130 Mont-Saint-Aignan
        </p>
      </div>
    </main>
  );
}

export default function AcceptOffrePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string;

  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [documentRead, setDocumentRead] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/documents/sign/${token}`)
      .then(r => r.json())
      .then((d: Info) => { setInfo(d); if (d.ownerName) setName(d.ownerName); })
      .catch(() => setInfo({ error: "Lien invalide." } as any))
      .finally(() => setLoading(false));
  }, [token]);

  // Le canvas n'existe qu'une fois le document lu : on l'initialise à ce moment.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !documentRead) return;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
  }, [documentRead]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!; const { x, y } = pos(e);
    ctx.beginPath(); ctx.moveTo(x, y); canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!; const { x, y } = pos(e);
    ctx.lineTo(x, y); ctx.stroke(); setHasDrawn(true);
  };
  const end = () => { drawing.current = false; };
  const clearCanvas = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setHasDrawn(false);
  }, []);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Merci d'indiquer vos nom et prénom.");
    if (!hasDrawn) return setError("Merci de signer dans le cadre.");
    if (!consent) return setError("Merci de cocher la case de consentement.");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/sign/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), consent, signature: { dataUrl: canvasRef.current!.toDataURL("image/png") } }),
      });
      const d = await res.json();
      if (!res.ok) setError(d.error || "La signature n'a pas pu être enregistrée.");
      else setDone(true);
    } catch { setError("Erreur réseau. Réessayez."); }
    setSubmitting(false);
  };

  if (loading) return <Shell><p style={{ color: "#666" }}>Chargement…</p></Shell>;
  if (!info || (info as any).error) return <Shell><p style={{ color: "#b00" }}>{(info as any)?.error || "Lien invalide."}</p></Shell>;

  if (done || info.signed) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#1F3B2C", marginBottom: 8 }}>Offre acceptée</h1>
          <p style={{ color: "#444" }}>
            Merci. Votre acceptation de l&apos;offre {info.number ? `N° ${info.number} ` : ""}a bien été enregistrée.
          </p>
          <p style={{ color: "#666", fontSize: 13, marginTop: 12 }}>Un exemplaire signé vous est transmis par email.</p>
        </div>
      </Shell>
    );
  }

  const amount = info.atAskingPrice ? "au prix affiché" : (info.offerAmount ? `${Number(info.offerAmount).toLocaleString("fr-FR")} €` : "");

  return (
    <Shell>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#1F3B2C", marginBottom: 4 }}>
        Offre d&apos;achat{info.number ? ` — N° ${info.number}` : ""}
      </h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 4 }}>
        {info.propertyTitle}{info.propertyCity ? ` — ${info.propertyCity}` : ""}
      </p>
      {amount && <p style={{ color: "#1F3B2C", fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Montant proposé : {amount}</p>}

      <button type="button" onClick={() => setReading(true)}
        style={{ display: "block", width: "100%", marginBottom: 18, padding: "12px", background: "#fff",
                 border: "2px solid #1F3B2C", color: "#1F3B2C", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
        data-testid="button-read-offer">
        📄 {documentRead ? "Relire l'offre" : "Lire l'offre complète avant d'accepter"}
      </button>

      {!documentRead && (
        <p style={{ fontSize: 13, color: "#777", textAlign: "center" }} data-testid="text-signature-locked">
          La signature sera disponible après lecture et validation de l&apos;offre.
        </p>
      )}

      {documentRead && (
        <>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Vos nom et prénom</label>
          <input value={name} onChange={e => setName(e.target.value)} autoComplete="name" autoCapitalize="words" placeholder="Prénom NOM"
            style={{ width: "100%", padding: "9px 12px", border: "1px solid #ccc", borderRadius: 8, marginBottom: 16, fontSize: 14 }} />

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Votre signature <span style={{ fontWeight: 400, color: "#888" }}>(tracez avec la souris ou le doigt)</span>
          </label>
          <div style={{ border: "1px dashed #bbb", borderRadius: 10, background: "#fafafa", position: "relative" }}>
            <canvas ref={canvasRef} width={1200} height={400}
              onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
              style={{ width: "100%", height: 200, touchAction: "none", cursor: "crosshair", display: "block" }}
              data-testid="canvas-owner-signature" />
            {!hasDrawn && (
              <span style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", color: "#bbb", fontSize: 14, pointerEvents: "none" }}>
                Signez ici
              </span>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "#777" }}>Mention : « Bon pour acceptation »</span>
            <button type="button" onClick={clearCanvas} style={{ fontSize: 13, color: "#B89C6D", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Effacer</button>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#444", marginBottom: 18 }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>{"J'accepte l'offre d'achat aux prix et conditions qui y sont énoncés. Je consens à la signer par voie électronique (signature électronique simple, eIDAS). Ma signature, la date, l'heure et mon adresse IP seront conservées comme preuve."}</span>
          </label>
        </>
      )}

      {error && <p style={{ color: "#b00", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button type="button" onClick={submit} disabled={submitting || !documentRead}
        style={{ width: "100%", padding: "12px", background: "#B89C6D", color: "#fff", border: "none", borderRadius: 10,
                 fontSize: 15, fontWeight: 600, cursor: submitting || !documentRead ? "default" : "pointer",
                 opacity: submitting || !documentRead ? 0.45 : 1 }}
        data-testid="button-accept-offer">
        {submitting ? "Enregistrement…" : "Accepter et signer l'offre"}
      </button>

      {reading && (
        <DocumentReader
          url={`/api/documents/sign/${token}/pdf`}
          title={`Offre d'achat${info.number ? ` — N° ${info.number}` : ""}`}
          onClose={() => setReading(false)}
          onAcknowledge={() => { setDocumentRead(true); setReading(false); }}
          acknowledgeLabel="Je reconnais avoir lu et pris connaissance de l'intégralité de l'offre d'achat."
        />
      )}
    </Shell>
  );
}
