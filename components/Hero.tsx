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
      <div className="container py-16 md:py-24 min-h-[320px] md:min-h-[360px] flex flex-col justify-center">
        <h1 className="text-4xl md:text-5xl luxe text-cream">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-cream/90">{subtitle}</p>}
        {(primary || secondary) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {primary && (
              <Link href={primary.href} className="btn btn-gold">
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href} className="btn btn-ghost">
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
