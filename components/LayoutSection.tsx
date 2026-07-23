export default function LayoutSection({
  title, subtitle, children, className=""
}: {
  title?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`container py-10 ${className}`}>
      {title && <h2 className="luxe text-3xl mb-2">{title}</h2>}
      {subtitle && <p className="opacity-80 mb-6">{subtitle}</p>}
      {children}
    </section>
  );
}
