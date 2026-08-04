import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  const bureaux = [
    { label: "Rouen", detail: "35 rue Ganterie, 76000", q: "35+rue+Ganterie%2C+76000+Rouen", testid: "link-map-rouen" },
    { label: "Fréjus", detail: "722 avenue Alfred de Musset, 83370", q: "722+avenue+Alfred+de+Musset%2C+83370+Fr%C3%A9jus", testid: "link-map-frejus" },
    { label: "Siège", detail: "50 rue de la Garenne, 76130 Mont-Saint-Aignan", q: "50+rue+de+la+Garenne%2C+76130+Mont-Saint-Aignan", testid: "link-map-siege" },
  ];
  const nav = [
    { href: "/references", label: "Références" },
    { href: "/partenaires", label: "Partenaires" },
    { href: "/faq", label: "FAQ" },
    { href: "/actualites", label: "Actualités" },
    { href: "/bareme-honoraires", label: "Barème d'honoraires" },
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/confidentialite", label: "Confidentialité" },
    { href: "/cookies", label: "Cookies" },
  ];
  const secteurs = [
    { href: "/secteurs/paris-rive-gauche", label: "Paris Rive gauche" },
    { href: "/secteurs/paris-ouest", label: "Paris Ouest" },
    { href: "/secteurs/paris-centre-historique", label: "Paris Centre historique" },
    { href: "/secteurs/rouen-centre", label: "Rouen centre" },
    { href: "/secteurs/mont-saint-aignan-bois-guillaume", label: "Mont-Saint-Aignan & Bois-Guillaume" },
    { href: "/secteurs/saint-aygulf-frejus", label: "Saint-Aygulf & Fréjus" },
    { href: "/secteurs/sainte-maxime-golfe-saint-tropez", label: "Sainte-Maxime & Golfe de Saint-Tropez" },
    { href: "/secteurs/esterel-arriere-pays", label: "Estérel & arrière-pays" },
  ];

  const heading = "text-[11px] font-semibold uppercase tracking-[0.18em] text-luxe/45 mb-4";
  const link = "text-luxe/65 hover:text-gold transition-colors";

  return (
    <footer className="mt-20 border-t border-gold/25 bg-cream/30 text-sm">
      <div className="container py-14 grid gap-10 md:grid-cols-12">
        {/* Marque */}
        <div className="md:col-span-4">
          <div className="luxe text-lg text-luxe">Lemeille Patrimoine</div>
          <p className="mt-2 text-luxe/55 leading-relaxed max-w-xs">
            Immobilier de caractère à Paris, en Normandie et sur la Côte d&apos;Azur.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-luxe/40">
            Marque du groupe Novus Capital · SIREN 937 847 937<br />
            Carte professionnelle CPI 7606 2024 000 000 038 — CCI de Rouen Métropole<br />
            CIF — ORIAS n° 23 003 614
          </p>
        </div>

        {/* Contact */}
        <div className="md:col-span-4">
          <div className={heading}>Nous contacter</div>
          <div className="flex flex-col gap-1.5">
            <a href="tel:+33687157259" className={link}>06 87 15 72 59</a>
            <a href="mailto:arthur.lemeille@lemeillepatrimoine.com" className={link}>arthur.lemeille@lemeillepatrimoine.com</a>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            {bureaux.map(b => (
              <a
                key={b.testid}
                href={`https://www.google.com/maps/search/?api=1&query=${b.q}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group leading-tight"
                data-testid={b.testid}
              >
                <span className="text-luxe/80 group-hover:text-gold transition-colors">{b.label}</span>
                <span className="block text-xs text-luxe/45">{b.detail}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="md:col-span-4">
          <div className={heading}>Le cabinet</div>
          <nav className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {nav.map(n => (
              <Link key={n.href} href={n.href} className={link}>{n.label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Secteurs d'intervention — maillage interne / SEO local */}
      <div className="border-t border-gold/15">
        <div className="container py-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-luxe/40 mb-2">Secteurs d&apos;intervention</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            {secteurs.map(s => (
              <Link key={s.href} href={s.href} className="text-luxe/55 hover:text-gold transition-colors">{s.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gold/15">
        <div className="container py-5 text-xs text-luxe/40">
          &copy; {year} Lemeille Patrimoine — Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
