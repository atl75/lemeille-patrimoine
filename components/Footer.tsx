import Link from "next/link";

export function Footer(){
  return (
    <footer className="border-t border-black/5 mt-16">
      <div className="container py-10 text-sm grid md:grid-cols-3 gap-6">
        <div>
          <div className="font-semibold luxe">Lemeille Patrimoine</div>
          <div className="opacity-70 mt-1">Marque du groupe Novus Capital (SIREN 937 847 937)</div>
          <div className="opacity-70 mt-1 text-xs">Carte professionnelle CPI 7606 2024 000 000 038 — CCI de Rouen Métropole</div>
          <div className="opacity-70 text-xs">CIF — ORIAS n° 23 003 614 (<a href="/mentions-legales" className="hover:text-[#B89C6D] underline">mentions légales</a>)</div>
        </div>
        <div>
          <div className="font-semibold">Nos bureaux</div>
          <div className="flex flex-col gap-1 mt-1">
            <a
              href="https://www.google.com/maps/search/?api=1&query=35+rue+Ganterie%2C+76000+Rouen"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B89C6D]"
              data-testid="link-map-rouen"
            >
              Rouen — 35 rue Ganterie, 76000
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=722+avenue+Alfred+de+Musset%2C+83370+Fr%C3%A9jus"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B89C6D]"
              data-testid="link-map-frejus"
            >
              Fréjus — 722 avenue Alfred de Musset, 83370
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=50+rue+de+la+Garenne%2C+76130+Mont-Saint-Aignan"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#B89C6D]"
              data-testid="link-map-siege"
            >
              Siège — 50 rue de la Garenne, 76130 Mont-Saint-Aignan
            </a>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <a href="tel:+33687157259" className="hover:text-[#B89C6D]">📞 06 87 15 72 59</a>
            <a href="mailto:arthur.lemeille@lemeillepatrimoine.com" className="hover:text-[#B89C6D]">✉️ arthur.lemeille@lemeillepatrimoine.com</a>
          </div>
        </div>
        <div className="justify-self-end">
          <nav className="flex flex-col gap-2 text-right">
            <Link href="/references" className="hover:text-[#B89C6D]">Références</Link>
            <Link href="/partenaires" className="hover:text-[#B89C6D]">Partenaires</Link>
            <Link href="/faq" className="hover:text-[#B89C6D]">FAQ</Link>
            <Link href="/actualites" className="hover:text-[#B89C6D]">Actualités</Link>
            <Link href="/bareme-honoraires" className="hover:text-[#B89C6D]">Barème d&apos;honoraires</Link>
            <Link href="/mentions-legales" className="hover:text-[#B89C6D]">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-[#B89C6D]">Confidentialité</Link>
            <Link href="/cookies" className="hover:text-[#B89C6D]">Cookies</Link>
          </nav>
        </div>
      </div>

      {/* Secteurs d'intervention — maillage interne / SEO local */}
      <div className="container pb-6 border-t border-black/5 pt-6">
        <div className="text-xs font-semibold opacity-70 mb-2">Secteurs d&apos;intervention</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80">
          <Link href="/secteurs/paris-rive-gauche" className="hover:text-[#B89C6D]">Paris Rive gauche</Link>
          <Link href="/secteurs/paris-ouest" className="hover:text-[#B89C6D]">Paris Ouest</Link>
          <Link href="/secteurs/paris-centre-historique" className="hover:text-[#B89C6D]">Paris Centre historique</Link>
          <Link href="/secteurs/rouen-centre" className="hover:text-[#B89C6D]">Rouen centre</Link>
          <Link href="/secteurs/mont-saint-aignan-bois-guillaume" className="hover:text-[#B89C6D]">Mont-Saint-Aignan &amp; Bois-Guillaume</Link>
          <Link href="/secteurs/saint-aygulf-frejus" className="hover:text-[#B89C6D]">Saint-Aygulf &amp; Fréjus</Link>
          <Link href="/secteurs/sainte-maxime-golfe-saint-tropez" className="hover:text-[#B89C6D]">Sainte-Maxime &amp; Golfe de Saint-Tropez</Link>
          <Link href="/secteurs/esterel-arriere-pays" className="hover:text-[#B89C6D]">Estérel &amp; arrière-pays</Link>
        </div>
      </div>

      <div className="container pb-8 text-xs opacity-70">&copy; {new Date().getFullYear()} Lemeille Patrimoine — Tous droits réservés.</div>
    </footer>
  );
}
