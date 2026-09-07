import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  const bureaux = [
    { label: "Rouen", detail: "35 rue Ganterie, 76000", q: "35+rue+Ganterie%2C+76000+Rouen", testid: "link-map-rouen" },
    { label: "Siège", detail: "50 rue de la Garenne, 76130 Mont-Saint-Aignan", q: "50+rue+de+la+Garenne%2C+76130+Mont-Saint-Aignan", testid: "link-map-siege" },
  ];
  const nav = [
    { href: "/qui-suis-je", label: "Qui suis-je" },
    { href: "/vendre", label: "Vendre son bien" },
    { href: "/financement", label: "Capacité d'emprunt" },
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
    { href: "/secteurs/rouen-centre", label: "Rouen centre" },
    { href: "/secteurs/rouen-rive-gauche", label: "Rouen Rive Gauche" },
    { href: "/secteurs/mont-saint-aignan-bois-guillaume", label: "Mont-Saint-Aignan" },
    { href: "/secteurs/bois-guillaume", label: "Bois-Guillaume" },
    { href: "/secteurs/bihorel", label: "Bihorel" },
    { href: "/secteurs/isneauville", label: "Isneauville" },
    { href: "/secteurs/mesnil-esnard-franqueville", label: "Le Mesnil-Esnard & Franqueville" },
    // Les deux autres régions d'intervention. Chaque entrée mène là où il y a
    // effectivement des biens :
    //   Paris → le secteur d'ensemble Paris & Île-de-France, qui liste les
    //   quatre biens de la région ; les trois secteurs parisiens ne couvrent
    //   que le centre, la rive gauche et l'ouest ;
    //   Côte d'Azur → le secteur d'ensemble Var + Alpes-Maritimes, qui liste
    //   les quatre biens de la région. Il pointait vers /immobilier tant que
    //   les seuls secteurs définis couvraient le Var, où rien n'est en vente.
    { href: "/secteurs/paris", label: "Paris" },
    { href: "/secteurs/cote-d-azur", label: "Côte d'Azur" },
  ];

  const heading = "text-[11px] font-semibold uppercase tracking-[0.18em] text-luxe/70 mb-4";
  const link = "inline-block py-1 text-luxe/70 hover:text-gold transition-colors";

  return (
    <footer className="mt-20 border-t border-gold/25 bg-cream/30 text-sm">
      <div className="container py-14 grid gap-10 md:grid-cols-12">
        {/* Marque */}
        <div className="md:col-span-4">
          <div className="luxe text-lg text-luxe">Lemeille Patrimoine</div>
          <p className="mt-2 text-luxe/70 leading-relaxed max-w-xs">
            Agence immobilière à Rouen, Mont-Saint-Aignan et Bois-Guillaume.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-luxe/70">
            Marque du groupe Novus Capital · SIREN 937 847 937<br />
            Carte professionnelle CPI 7606 2024 000 000 038 — CCI de Rouen Métropole<br />
            CIF — ORIAS n° 23 003 614
          </p>
        </div>

        {/* Contact */}
        <div className="md:col-span-4">
          <div className={heading}>Nous contacter</div>
          <div className="flex flex-col gap-1.5">
            <a href="tel:+33687157259" className={link}>+33 6 87 15 72 59</a>
            <a href="mailto:arthur@lemeillepatrimoine.com" className={link}>arthur@lemeillepatrimoine.com</a>
            <a
              href="https://x.com/lempatrimoine"
              target="_blank"
              rel="noopener noreferrer"
              className={`${link} inline-flex items-center gap-2 mt-0.5`}
              aria-label="Suivez Lemeille Patrimoine sur X (Twitter)"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @lempatrimoine
            </a>
            <a
              href="https://www.youtube.com/channel/UCynpnLvgiGdgZH2OIDmYiYA"
              target="_blank"
              rel="noopener noreferrer"
              className={`${link} inline-flex items-center gap-2`}
              aria-label="La chaîne YouTube de Lemeille Patrimoine"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
              </svg>
              Notre chaîne YouTube
            </a>
            <a
              href="https://www.linkedin.com/in/arthurlemeille/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${link} inline-flex items-center gap-2`}
              aria-label="Le profil LinkedIn d'Arthur Lemeille"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
              </svg>
              Arthur Lemeille sur LinkedIn
            </a>
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
                <span className="block text-xs text-luxe/70">{b.detail}</span>
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-luxe/70 mb-2">Secteurs d&apos;intervention</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {secteurs.map(s => (
              <Link key={s.href} href={s.href} className="inline-block py-1.5 text-luxe/70 hover:text-gold transition-colors">{s.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gold/15">
        <div className="container py-5 text-xs text-luxe/70">
          &copy; {year} Lemeille Patrimoine — Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
