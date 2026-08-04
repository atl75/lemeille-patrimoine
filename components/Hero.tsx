import Link from "next/link";

type Btn = { label: string; href: string };
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
    <section className="bg-luxe text-white">
      <div className="container py-8 md:py-12 min-h-[360px] md:min-h-[380px] flex flex-col justify-center">
        <h1 className="text-4xl md:text-5xl luxe text-cream">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-cream/90">{subtitle}</p>}
        {(primary || secondary) && (
          <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
            {primary && (
              <Link href={primary.href} className="btn btn-gold">
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link
                href={secondary.href}
                className="group inline-flex items-center gap-1.5 font-medium text-cream/90 hover:text-cream transition-colors"
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
