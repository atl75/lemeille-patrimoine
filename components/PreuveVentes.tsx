import Link from "next/link";

/**
 * Bandeau de preuve, placé juste avant le formulaire d'estimation : on demande
 * une estimation après avoir montré des ventes réelles, pas avant.
 *
 * Aucune donnée inventée — les trois biens viennent du portefeuille vendu et
 * publié. Aucune date non plus : sur properties.json, quinze ventes sur dix-sept
 * portent encore la date d'import (29/07/2026) et non leur date réelle. Le jour
 * où elles seront corrigées, il suffira de rétablir `dateVente` ci-dessous.
 *
 * Forme volontairement différente des sections voisines : ruban sombre pleine
 * largeur, pas de carte, pas de grille — c'est ce qui casse la série.
 */

type Vente = {
  id: string;
  type?: string;
  rooms?: number;
  surface?: number;
  city?: string;
};

function libelleType(v: Vente): string {
  const base = v.type === "MAISON" ? "Maison" : "Appartement";
  return v.rooms ? `${base} T${v.rooms}` : base;
}

export default function PreuveVentes({
  ventes,
  total,
}: {
  ventes: Vente[];
  total: number;
}) {
  // Sous trois ventes exploitables, le ruban ferait plus de mal que de bien.
  if (!ventes || ventes.length < 3) return null;

  return (
    <section className="bg-[#12241B]">
      <div className="container py-16 md:py-20">
        <div className="max-w-3xl">
          <div className="eyebrow mb-3">Nos dernières ventes</div>
          <h2 className="luxe text-3xl md:text-[2.5rem] leading-[1.15] text-cream">
            Ce qui s&apos;est réellement vendu
          </h2>
          <div className="rule-gold mt-5" />
          <p className="mt-5 text-cream/75 leading-relaxed">
            Des maisons familiales aux studios d&apos;investissement, sur Rouen et le Plateau Nord.
          </p>
        </div>

        {/* Une seule ligne de trois, séparée par un filet doré d'un pixel :
            l'écart de surface entre les trois montre l'amplitude du portefeuille. */}
        <ul className="mt-10 grid gap-px bg-gold/25 sm:grid-cols-3">
          {ventes.slice(0, 3).map((v) => (
            <li key={v.id} className="bg-[#12241B] p-6">
              <div className="luxe text-[2.1rem] leading-none text-gold tabular-nums">
                {v.surface}
                <span className="text-base"> m²</span>
              </div>
              <div className="mt-3 font-medium text-cream">{libelleType(v)}</div>
              {v.city && <div className="mt-1 text-sm text-cream/65">{v.city}</div>}
              <div className="mt-4 inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-gold">
                <span aria-hidden className="h-px w-3.5 bg-gold" />
                Vendu
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Link
            href="/references"
            className="group inline-flex items-center gap-1.5 font-medium text-gold hover:text-[#C9AE80] transition-colors"
            data-testid="link-preuve-references"
          >
            Voir les {total} ventes présentées
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
