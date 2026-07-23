const scale = [
  {c:"A", bg:"#2e7d32"}, // vert
  {c:"B", bg:"#558b2f"},
  {c:"C", bg:"#9e9d24"},
  {c:"D", bg:"#f9a825"},
  {c:"E", bg:"#fb8c00"},
  {c:"F", bg:"#f4511e"},
  {c:"G", bg:"#c62828"},
];
export default function DPECard({ dpe }: { dpe?: any }) {
  if (!dpe) return <div className="text-sm opacity-80">DPE non communiqué.</div>;
  const energy = String(dpe.classEnergy||"").toUpperCase();
  const ges = String(dpe.classGES||"").toUpperCase();
  return (
    <div className="card p-6">
      <h3 className="luxe text-xl mb-3">DPE</h3>
      <div className="grid gap-2">
        <div className="text-sm font-medium">Classe énergie</div>
        <div className="grid gap-1">
          {scale.map((s, i)=>(
            <div key={s.c} className="flex items-center gap-2">
              <div className="w-6 shrink-0 text-xs text-white text-center rounded" style={{background:s.bg}}>{s.c}</div>
              <div className="h-2 rounded w-full" style={{background: s.c===energy ? s.bg : "#e6e3dd"}} />
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div><strong>Conso.</strong> {dpe.consumptionKwh ? `${dpe.consumptionKwh} kWh/m²/an` : "—"}</div>
          <div><strong>Émissions</strong> {dpe.emissionsKg ? `${dpe.emissionsKg} kgCO₂/m²/an` : "—"}</div>
          <div><strong>GES</strong> {ges || "—"}</div>
          <div><strong>Date</strong> {dpe.date || "—"}</div>
        </div>
      </div>
    </div>
  );
}
