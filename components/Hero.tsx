import Link from "next/link";

type Btn = { label: string; href: string };

// En-tête de page interne — version allégée (éditoriale) : plus d'aplat vert,
// un filet doré, un titre serif vert sur fond clair. Le CTA suit le même
// principe que l'accueil : un bouton principal + un lien secondaire discret.
export default function Hero({
  title,
  subtitle,
  primary,
  secondary,
}: {
  title: string;
  subtitle?: React.ReactNode;
  primary?: Btn;
  secondary?: Btn;
}) {
  return (
    <section className="bg-white/50 border-b border-gold/20">
      <div className="container py-14 md:py-20">
        <h1 className="text-4xl md:text-5xl luxe text-luxe leading-tight">{title}</h1>
        <div className="mt-4 h-px w-14 bg-gold/60" />
        {subtitle && <p className="mt-5 max-w-2xl text-luxe/60 leading-relaxed">{subtitle}</p>}
        {(primary || secondary) && (
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
            {primary && (
              <Link href={primary.href} className="btn btn-gold">
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link
                href={secondary.href}
                className="group inline-flex items-center gap-1.5 font-medium text-luxe/70 hover:text-luxe transition-colors"
              >
                {secondary.label}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
