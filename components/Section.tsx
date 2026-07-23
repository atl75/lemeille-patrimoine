export default function Section({ title, subtitle, children }: { title?:string; subtitle?:string|JSX.Element; children:React.ReactNode }) {
  return (
    <section className="container py-12">
      {title && <h2 className="luxe text-3xl mb-2">{title}</h2>}
      {subtitle && <p className="opacity-80 mb-6">{subtitle}</p>}
      {children}
    </section>
  );
}
