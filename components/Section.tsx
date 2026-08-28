export default function Section({
  title,
  subtitle,
  eyebrow,
  children,
  center,
}: {
  title?: string;
  subtitle?: string | JSX.Element;
  /** Sur-titre en petites capitales, au-dessus du titre. */
  eyebrow?: string;
  center?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`container py-16 md:py-20 ${center ? "text-center" : ""}`}>
      {(title || subtitle) && (
        <header className={`mb-10 ${center ? "mx-auto max-w-2xl" : "max-w-3xl"}`}>
          {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
          {title && <h2 className="luxe text-3xl md:text-[2.5rem] leading-[1.15]">{title}</h2>}
          <div className={`rule-gold mt-5 ${center ? "mx-auto" : ""}`} />
          {subtitle && <p className="mt-5 text-luxe/70 leading-relaxed">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
