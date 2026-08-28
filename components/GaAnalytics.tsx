"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Data = {
  ok: boolean; reason?: string; message?: string; propertyId?: string;
  summary?: { users: number; newUsers: number; sessions: number; pageViews: number; avgDuration: number; bounceRate: number };
  trend?: { date: string; users: number; sessions: number }[];
  pages?: { path: string; views: number; avgDuration: number }[];
  sources?: { source: string; sessions: number }[];
  geo?: { country: string; city: string; users: number }[];
  devices?: { device: string; users: number }[];
  newReturning?: { type: string; users: number }[];
};

const fmtDur = (s: number) => {
  s = Math.round(s || 0);
  const m = Math.floor(s / 60), r = s % 60;
  return m ? `${m} min ${r}s` : `${r}s`;
};
const fmtDate = (d: string) => (d && d.length === 8 ? `${d.slice(6, 8)}/${d.slice(4, 6)}` : d);
const fmtDevice = (d: string) => ({ desktop: "Ordinateur", mobile: "Mobile", tablet: "Tablette" } as any)[d] || d;
const fmtNR = (t: string) => (t === "new" ? "Nouveaux" : t === "returning" ? "Récurrents" : t || "—");

export default function GaAnalytics() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/ga").then(r => r.json()).then((j) => { setD(j); setLoading(false); }).catch(() => { setD({ ok: false, reason: "error", message: "Erreur réseau." }); setLoading(false); });
  }, []);

  const Card = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="p-4 bg-black/[0.03] rounded-lg text-center">
      <div className="text-2xl font-semibold text-[#1F3B2C]">{value}</div>
      <div className="text-xs opacity-70 mt-1">{label}</div>
      {sub && <div className="text-[11px] opacity-50">{sub}</div>}
    </div>
  );

  const Table = ({ title, rows }: { title: string; rows: [string, string | number][] }) => (
    <div className="card p-4">
      <div className="font-semibold text-sm mb-2 text-[#1F3B2C]">{title}</div>
      {rows.length ? (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v], i) => (
              <tr key={i} className={i % 2 ? "bg-black/[0.02]" : ""}>
                <td className="py-1 pr-2 truncate max-w-[220px]" title={k}>{k}</td>
                <td className="py-1 text-right whitespace-nowrap font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="text-xs opacity-50">Aucune donnée.</div>}
  </div>
  );

  return (
    <div className="mt-8">
      <h2 className="luxe text-2xl mb-1">Statistiques de visite</h2>
      <p className="text-xs opacity-60 mb-4">
        Google Analytics — 28 derniers jours{d?.propertyId ? ` · propriété ${d.propertyId}` : ""}
        {" · "}
        <a href="/api/google/oauth/start?return=/admin/kpi" className="underline hover:text-[#1F3B2C]" title="Ré-autoriser Google (ajouter/mettre à jour les droits)">Reconnecter Google</a>
      </p>

      {loading && <div className="card p-6 opacity-70">Chargement des statistiques…</div>}

      {!loading && d && !d.ok && (
        <div className="card p-6">
          <p className="text-sm mb-3">
            {d.reason === "not_connected" && "Google n'est pas connecté."}
            {d.reason === "scope" && "L'accès Analytics n'est pas autorisé (ou le compte connecté n'a pas accès à la propriété GA)."}
            {d.reason === "error" && "Statistiques indisponibles."}
            {" "}
            <span className="opacity-60 text-xs">{d.message}</span>
          </p>
          <a href="/api/google/oauth/start?return=/admin/kpi" className="btn btn-gold text-sm">Connecter / autoriser Google Analytics</a>
        </div>
      )}

      {!loading && d?.ok && d.summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card label="Visiteurs" value={d.summary.users.toLocaleString("fr-FR")} />
            <Card label="Nouveaux" value={d.summary.newUsers.toLocaleString("fr-FR")} />
            <Card label="Sessions" value={d.summary.sessions.toLocaleString("fr-FR")} />
            <Card label="Pages vues" value={d.summary.pageViews.toLocaleString("fr-FR")} />
            <Card label="Durée moy./session" value={fmtDur(d.summary.avgDuration)} />
            <Card label="Taux de rebond" value={`${Math.round(d.summary.bounceRate * 100)} %`} />
          </div>

          {d.trend && d.trend.length > 0 && (
            <div className="card p-4">
              <div className="font-semibold text-sm mb-2 text-[#1F3B2C]">Fréquentation quotidienne</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={d.trend.map(t => ({ ...t, label: fmtDate(t.date) }))} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" name="Visiteurs" stroke="#1F3B2C" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#B89C6D" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Table title="Pages les plus vues" rows={(d.pages || []).map(p => [p.path, `${p.views} vues · ${fmtDur(p.avgDuration)}`])} />
            <Table title="Sources de trafic" rows={(d.sources || []).map(s => [s.source, `${s.sessions}`])} />
            <Table title="Provenance géographique" rows={(d.geo || []).map(g => [[g.city, g.country].filter(Boolean).join(", ") || g.country, `${g.users}`])} />
            <div className="grid grid-cols-1 gap-4">
              <Table title="Appareils" rows={(d.devices || []).map(x => [fmtDevice(x.device), `${x.users}`])} />
              <Table title="Nouveaux vs récurrents" rows={(d.newReturning || []).map(x => [fmtNR(x.type), `${x.users}`])} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
