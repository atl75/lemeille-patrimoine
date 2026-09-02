import Image from "next/image";
import Link from "next/link";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import Breadcrumb from "@/components/Breadcrumb";
import BandeauReassurance from "@/components/BandeauReassurance";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qui suis-je | Lemeille Patrimoine",
  description:
    "Arthur Lemeille, fondateur de Lemeille Patrimoine à Rouen : parcours, méthode de travail, matériel photographique et cadre réglementaire de l'agence.",
  alternates: { canonical: "/qui-suis-je" },
};

// Étapes reprises de la page Vendre : même méthode, formulée à la première
// personne. Les deux pages doivent rester cohérentes si l'une évolue.
const ETAPES: [string, string][] = [
  ["Estimation", "Je visite le bien, j'analyse les ventes réellement signées dans le quartier et je remets un avis de valeur argumenté sous 3 jours."],
  ["Mise en valeur", "Reportage photo soigné, description travaillée, plans et diagnostics réunis avant la mise en ligne."],
  ["Diffusion", "Grands portails, site de l'agence et fichier d'acquéreurs suivis — ou en off-market si vous préférez la discrétion."],
  ["Visites", "Je fais visiter moi-même, je filtre les candidats et je vous rends compte après chaque passage."],
  ["Négociation", "J'analyse les offres, je vérifie le financement de l'acquéreur et je défends votre prix."],
  ["Signature", "Constitution du dossier notaire, suivi du compromis et de l'acte authentique, sans que vous ayez à relancer."],
];

const MATERIEL: [string, string][] = [
  ["Canon EOS R50", "Hybride APS-C 24 Mpx, autofocus Dual Pixel CMOS, rafale 15 im/s."],
  ["Canon RF-S 10-18 mm", "Ultra grand-angle stabilisé : restitue les volumes réels des pièces, même exiguës."],
  ["DJI Mini 3", "Vues aériennes : implantation du bien, terrain, exposition et environnement."],
  ["Trépied K&F", "Poses longues et cadrages d'aplomb — les lignes verticales restent droites."],
  ["Bracketing", "Trois expositions par cadrage, fusionnées : l'intérieur et la vue par la fenêtre restent lisibles sur la même image."],
  ["Photoshop & Luminar Neo", "Correction des perspectives et équilibrage de la lumière. Jamais de transformation du bien."],
];

const CADRE: [string, string][] = [
  ["Carte professionnelle", "CPI 7606 2024 000 000 038, délivrée par la CCI de Rouen Métropole, valable jusqu'au 12/12/2027."],
  ["Conseiller en investissements financiers", "Immatriculé à l'ORIAS sous le n° 23 003 614 depuis le 28 juin 2024, membre de l'ANACOFI-CIF, association agréée par l'AMF."],
  ["Garantie financière", "Non-détention de fonds : l'agence ne reçoit ni ne détient jamais de fonds pour le compte de ses clients."],
  ["Responsabilité civile professionnelle", "Assurée auprès de Zurich Insurance Europe AG."],
];

export default function Page() {
  return (
    <main>
      <Hero
        title="Qui suis-je"
        subtitle={<span>Arthur Lemeille, fondateur de Lemeille Patrimoine — agence immobilière à Rouen, Mont-Saint-Aignan et sur le Plateau Nord.</span>}
        primary={{ label: "Me contacter", href: "/contact" }}
        secondary={{ label: "Vendre mon bien", href: "/vendre" }}
        image="/hero-normandie.jpg"
      />
      <BandeauReassurance />

      <section className="container py-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Qui suis-je" }]} />
      </section>

      {/* ── Parcours ─────────────────────────────────────────────────────── */}
      <Section eyebrow="Le parcours" title="D'où je viens">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="order-2 md:order-1">
            <Image
              src="/images/arthur-lemeille.jpg"
              alt="Arthur Lemeille, fondateur de Lemeille Patrimoine"
              width={1000}
              height={1500}
              sizes="(max-width: 768px) 100vw, 45vw"
              className="w-full h-auto rounded-lg shadow-lg"
              quality={85}
              data-testid="img-arthur"
            />
          </div>

          <div className="order-1 md:order-2 space-y-4 text-luxe/85 leading-relaxed">
            <p>
              Je suis rouennais. Après un Bachelor à <strong>NEOMA Business School</strong> à Rouen et un
              Master à <strong>KEDGE Business School</strong> à Bordeaux, j&apos;ai commencé par trois
              années de conseil en supply chain et logistique. C&apos;est là que j&apos;ai appris la
              rigueur des processus et le goût du détail vérifié plutôt que supposé.
            </p>
            <p>
              J&apos;ai poursuivi par le développement commercial au sein d&apos;une start-up. Le terrain,
              la relation directe, la négociation. Huit années d&apos;expérience commerciale au total,
              dans deux univers qui n&apos;ont rien à voir — et qui, mis bout à bout, décrivent assez bien
              ma façon de travailler aujourd&apos;hui.
            </p>
            <p>
              J&apos;ai choisi de revenir sur mes terres pour me consacrer à l&apos;immobilier de caractère
              et à la défiscalisation immobilière. Rouen, le Plateau Nord, Mont-Saint-Aignan,
              Bois-Guillaume : des secteurs où les écarts de prix se jouent parfois d&apos;une rue à
              l&apos;autre, et où connaître le terrain n&apos;est pas un argument commercial mais une
              condition d&apos;exercice.
            </p>
            <p>
              Je travaille seul, entouré d&apos;un réseau de partenaires de confiance — notaires,
              banquiers, fiscalistes, architectes, artisans. Vous avez un seul interlocuteur, du premier
              rendez-vous à l&apos;acte authentique. C&apos;est un choix : personne ne vous repassera le
              dossier en cours de route.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Méthode ──────────────────────────────────────────────────────── */}
      <section className="bg-white/50 border-y border-gold/20">
        <div className="container py-16 md:py-20">
          <div className="max-w-3xl">
            <div className="eyebrow mb-3">La méthode</div>
            <h2 className="luxe text-3xl md:text-[2.5rem] leading-[1.15]">Comment je travaille</h2>
            <div className="rule-gold mt-5" />
            <p className="mt-5 text-luxe/70 leading-relaxed">
              Six étapes, un seul interlocuteur. Rien d&apos;original — mais chacune est tenue.
            </p>
          </div>

          <ol className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ETAPES.map(([titre, texte], i) => (
              <li key={titre} className="card p-6">
                <div className="flex items-baseline gap-3">
                  <span className="luxe text-2xl text-gold">{i + 1}</span>
                  <h3 className="luxe text-xl">{titre}</h3>
                </div>
                <p className="mt-3 text-sm text-luxe/75 leading-relaxed">{texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Photographie ─────────────────────────────────────────────────── */}
      <Section
        eyebrow="La photographie"
        title="Pourquoi je ne photographie pas au téléphone"
        subtitle="Un acquéreur décide en quelques secondes, sur des images, s'il visite ou non votre bien. C'est le premier filtre — et le seul que vous maîtrisez complètement."
      >
        <div className="grid md:grid-cols-3 gap-5">
          {MATERIEL.map(([nom, desc]) => (
            <div key={nom} className="card p-6">
              <h3 className="luxe text-lg">{nom}</h3>
              <p className="mt-2 text-sm text-luxe/75 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-luxe/75 leading-relaxed">
          Ce travail est inclus dans le mandat, sans supplément. Je retouche la lumière et les
          perspectives, jamais la réalité du bien : une photo qui promet ce que la visite ne tient
          produit des visites inutiles et des acquéreurs déçus.
        </p>
        <Link href="/vendre" className="mt-6 inline-flex items-center gap-1.5 font-medium text-gold hover:gap-2.5 transition-all">
          Voir la démarche complète de vente
          <span aria-hidden>→</span>
        </Link>
      </Section>

      {/* ── Cadre réglementaire ──────────────────────────────────────────── */}
      <section className="bg-white/50 border-y border-gold/20">
        <div className="container py-16 md:py-20">
          <div className="max-w-3xl">
            <div className="eyebrow mb-3">Le cadre</div>
            <h2 className="luxe text-3xl md:text-[2.5rem] leading-[1.15]">Ce qui est vérifiable</h2>
            <div className="rule-gold mt-5" />
            <p className="mt-5 text-luxe/70 leading-relaxed">
              L&apos;activité est exercée par Novus Capital SAS (SIREN 937 847 937), dont je suis le
              représentant légal. Tout ce qui suit se vérifie.
            </p>
          </div>

          <dl className="mt-10 grid md:grid-cols-2 gap-5">
            {CADRE.map(([titre, texte]) => (
              <div key={titre} className="card p-6">
                <dt className="luxe text-lg">{titre}</dt>
                <dd className="mt-2 text-sm text-luxe/75 leading-relaxed">{texte}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-sm text-luxe/70">
            Bureaux au 35 rue Ganterie à Rouen, siège social au 50 rue de la Garenne à
            Mont-Saint-Aignan.{" "}
            <Link href="/mentions-legales" className="underline hover:text-gold transition-colors">
              Mentions légales complètes
            </Link>
            {" · "}
            <Link href="/bareme-honoraires" className="underline hover:text-gold transition-colors">
              Barème d&apos;honoraires
            </Link>
          </p>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <Section center title="Parlons de votre projet" subtitle="Premier échange confidentiel et sans engagement, que vous vendiez, achetiez ou cherchiez à réduire votre imposition.">
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          <Link href="/contact" className="btn btn-gold">Me contacter</Link>
          <a href="tel:+33687157259" className="group inline-flex items-center gap-1.5 font-medium text-luxe/70 hover:text-luxe transition-colors">
            +33 6 87 15 72 59
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
      </Section>
    </main>
  );
}
