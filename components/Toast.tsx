"use client";
import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; type: ToastType; message: string };

// Notifications non bloquantes pour l'admin (remplacent les alert()).
// `toast(message, type?)` — si le type n'est pas fourni, il est déduit du texte
// (✅ → succès, ⚠️/❌/« erreur » → erreur), ce qui rend la migration mécanique.
const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function inferType(message: string): ToastType {
  if (/❌|⚠️|erreur|échou|invalide|impossible|manquant/i.test(message)) return "error";
  if (/✅|succès|enregistr|ajouté|supprimé|réussi|envoyé|créé|mis à jour/i.test(message)) return "success";
  return "info";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const remove = (id: number) => setItems((p) => p.filter((x) => x.id !== id));
  const push = useCallback((message: string, type?: ToastType) => {
    const t = type || inferType(message);
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, type: t, message }]);
    setTimeout(() => remove(id), t === "error" ? 6500 : 4000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, pointerEvents: "none" }}>
        {items.map((t) => (
          <div
            key={t.id}
            onClick={() => remove(t.id)}
            role="status"
            style={{
              pointerEvents: "auto", cursor: "pointer", padding: "12px 16px", borderRadius: 10, color: "#fff",
              fontSize: 14, lineHeight: 1.4, boxShadow: "0 6px 22px rgba(0,0,0,.20)", whiteSpace: "pre-line",
              background: t.type === "error" ? "#b91c1c" : t.type === "success" ? "#1F3B2C" : "#334155",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
