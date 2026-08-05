import Image from "next/image";
import Link from "next/link";

type Btn = { label: string; href: string; blank?: boolean };

// En-tête de page interne. Deux variantes :
// - avec `image` : hero photo plein cadre + voile vert (registre premium).
// - sans `image` : en-tête éditorial clair (filet doré, titre serif vert).
export default function Hero({
  title,
  subtitle,
  primary,
  secondary,
  image,
}: {
  title: string;
  subtitle?: React.ReactNode;
  primary?: Btn;
  secondary?: Btn;
  image?: string;
}) {
  const cta = (primary || secondary) && (
    <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3">
      {primary && (
        <Link href={primary.href} className="btn btn-gold" {...(primary.blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {primary.label}
        </Link>
      )}
      {secondary && (
        <Link
          href={secondary.href}
          className={`group inline-flex items-center gap-1.5 font-medium transition-colors ${image ? "text-cream/90 hover:text-cream" : "text-luxe/70 hover:text-luxe"}`}
        >
          {secondary.label}
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );

  if (image) {
    return (
      <section className="relative isolate overflow-hidden">
        <Image src={image} alt="" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12241b]/90 via-[#1F3B2C]/65 to-[#1F3B2C]/30" />
        <div className="container relative py-16 md:py-24">
          <h1 className="text-4xl md:text-5xl luxe text-cream leading-tight">{title}</h1>
          <div className="mt-4 h-px w-14 bg-gold/70" />
          {subtitle && <p className="mt-5 max-w-2xl text-cream/90 leading-relaxed">{subtitle}</p>}
          {cta}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/50 border-b border-gold/20">
      <div className="container py-14 md:py-20">
        <h1 className="text-4xl md:text-5xl luxe text-luxe leading-tight">{title}</h1>
        <div className="mt-4 h-px w-14 bg-gold/60" />
        {subtitle && <p className="mt-5 max-w-2xl text-luxe/60 leading-relaxed">{subtitle}</p>}
        {cta}
      </div>
    </section>
  );
}
