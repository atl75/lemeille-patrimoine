// Échelle consommation énergétique (vert → rouge)
const energyScale = [
  { c: "A", bg: "#2e7d32" },
  { c: "B", bg: "#558b2f" },
  { c: "C", bg: "#9e9d24" },
  { c: "D", bg: "#f9a825" },
  { c: "E", bg: "#fb8c00" },
  { c: "F", bg: "#f4511e" },
  { c: "G", bg: "#c62828" },
];

// Échelle émissions de GES (dégradé violet, comme l'étiquette officielle)
const gesScale = [
  { c: "A", bg: "#8e6fc4" },
  { c: "B", bg: "#7e57c2" },
  { c: "C", bg: "#6f42b5" },
  { c: "D", bg: "#5e35b1" },
  { c: "E", bg: "#512da8" },
  { c: "F", bg: "#45279a" },
  { c: "G", bg: "#3a2185" },
];

function Gauge({ title, scale, value }: { title: string; scale: { c: string; bg: string }[]; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="grid gap-1">
        {scale.map((s) => {
          const active = s.c === value;
          return (
            <div key={s.c} className="flex items-center gap-2">
              <div
                className={`w-6 shrink-0 text-xs text-white text-center rounded ${active ? "font-bold ring-2 ring-black/40" : "opacity-90"}`}
                style={{ background: s.bg }}
              >
                {s.c}
              </div>
              <div className="h-2 rounded w-full" style={{ background: active ? s.bg : "#e6e3dd" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DPECard({ dpe }: { dpe?: any }) {
  if (!dpe) return <div className="text-sm opacity-80">DPE non communiqué.</div>;
  const energy = String(dpe.classEnergy || "").toUpperCase();
  const ges = String(dpe.classGES || "").toUpperCase();
  return (
    <div className="card p-6">
      <h3 className="luxe text-xl mb-3">DPE</h3>
      <div className="grid sm:grid-cols-2 gap-5">
        <Gauge title="Classe énergie (consommation)" scale={energyScale} value={energy} />
        <Gauge title="Classe climat (GES)" scale={gesScale} value={ges} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div><strong>Conso.</strong> {dpe.consumptionKwh ? `${dpe.consumptionKwh} kWh/m²/an` : "—"}</div>
        <div><strong>Émissions</strong> {dpe.emissionsKg ? `${dpe.emissionsKg} kgCO₂/m²/an` : "—"}</div>
        <div><strong>Date</strong> {dpe.date || "—"}</div>
      </div>
    </div>
  );
}
