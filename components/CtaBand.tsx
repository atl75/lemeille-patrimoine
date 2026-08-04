import Image from "next/image";
import Link from "next/link";

// Bloc d'appel à l'action récurrent, posé en bas des pages internes (via
// SiteChrome). Reprend l'esprit du hero (photo + voile vert) pour clore chaque
// page sur une invitation à prendre contact — comble le vide et convertit.
export default function CtaBand() {
  return (
    <section className="relative isolate overflow-hidden mt-20">
      <Image
        src="/hero-cote-azur.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[#12241b]/88" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#12241b]/60 via-[#12241b]/30 to-[#12241b]/60" />

      <div className="container relative py-16 md:py-20 text-center">
        <span className="block text-xs font-medium uppercase tracking-[0.28em] text-gold mb-4">
          Lemeille Patrimoine
        </span>
        <h2 className="text-3xl md:text-4xl luxe text-cream max-w-2xl mx-auto leading-tight">
          Un projet immobilier ou de défiscalisation&nbsp;?
        </h2>
        <p className="mt-4 text-cream/85 max-w-xl mx-auto leading-relaxed">
          Parlons-en. Premier échange confidentiel et sans engagement.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          <Link href="/contact" className="btn btn-gold">
            Prendre rendez-vous
          </Link>
          <a
            href="tel:+33687157259"
            className="group inline-flex items-center gap-1.5 font-medium text-cream/90 hover:text-cream transition-colors"
          >
            06 87 15 72 59
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
