// Bande de réassurance — signaux de confiance placés juste sous le Hero.
//
// Présente sur toutes les pages : un visiteur arrivé par Google sur une fiche
// bien ou un article doit voir les garanties du cabinet sans avoir à remonter
// à l'accueil.
//
// Le nombre de ventes est celui annoncé (voir VENTES_REALISEES dans app/page.tsx) ;
// la page d'accueil peut passer le comptage réel, qui prend le dessus s'il le
// dépasse.
export default function BandeauReassurance({ soldCount }: { soldCount?: number }) {
  const ventes = soldCount && soldCount > 50 ? String(soldCount) : "50+";
  const signaux: [string, string][] = [
    [`${ventes} ventes réalisées`, "Rouen, Plateau Nord et au-delà"],
    ["8 ans d'expérience", "Master école de commerce"],
    ["Carte T", "CPI 7606 2024 000 000 038"],
    ["Réponse sous 48h", "Interlocuteur unique"],
    ["Estimation gratuite", "Avis de valeur sous 3 jours"],
  ];
  return (
    <section className="border-b border-black/5 bg-white/70" data-testid="bandeau-reassurance">
      <div className="container py-7 grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-4 text-center divide-y-0 md:divide-x md:divide-black/[0.06]">
        {signaux.map(([t, s], i) => (
          <div key={i} className="px-2">
            <div className="luxe text-lg md:text-xl text-luxe leading-tight">{t}</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-luxe/70 mt-1.5">{s}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
