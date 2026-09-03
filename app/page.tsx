import Image from "next/image";
import Link from "next/link";
import Section from "@/components/Section";
import HeroSlideshow from "@/components/HeroSlideshow";
import PropertyCard from "@/components/PropertyCard";
import EstimationForm from "@/components/EstimationFormLazy";
import { getPropertyCards } from "@/lib/propertiesData";
import type { Metadata } from "next";
import BandeauReassurance from "@/components/BandeauReassurance";
import PreuveVentes from "@/components/PreuveVentes";

export const metadata: Metadata = {
  title: "Agence immobilière à Rouen | Lemeille Patrimoine",
  description: "Agence immobilière à Rouen, Mont-Saint-Aignan et Bois-Guillaume. Vente de maisons et appartements de caractère, estimation gratuite sous 3 jours.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Agence immobilière à Rouen & Plateau Nord | Lemeille Patrimoine",
    description:
      "Maisons et appartements de caractère à Rouen, Mont-Saint-Aignan, Bois-Guillaume. Estimation gratuite et conseil en défiscalisation.",
    url: "/",
  },
};

// Rendu à la requête : les biens sont lus depuis le volume monté au démarrage
// (bucket GCS). En prérendu statique, ce volume n'existe pas encore au build et
// la page serait figée sans aucun bien pendant toute la fenêtre de revalidation.
export const dynamic = 'force-dynamic';

// Ventes réalisées annoncées sur l'accueil. Le site ne publie qu'une partie du
// portefeuille vendu : ce chiffre reflète l'activité réelle du cabinet, pas le
// contenu de la base. À mettre à jour ici.
const VENTES_REALISEES = '50+';

// Nombre de biens vendus / sous promesse effectivement publiés. Sert de garde-fou :
// si un jour les ventes en ligne dépassent le chiffre annoncé, on affiche le réel
// plutôt qu'un chiffre qui sous-estimerait.
async function getSoldCount() {
  try {
    const all = await getPropertyCards();
    return all.filter((p: any) => p && (p.sold || p.status === 'SOLD' || p.status === 'UNDER_OFFER')).length;
  } catch {
    return 0;
  }
}

// Trois ventes réelles pour le bandeau de preuve, choisies pour couvrir
// l'amplitude du portefeuille : la plus grande, la médiane, la plus petite.
// Tant que les dates de vente ne sont pas fiables (quinze fiches portent encore
// la date d'import), on ne peut pas prendre « les trois plus récentes » — la
// surface est le seul critère qui distingue honnêtement les fiches entre elles.
async function getPreuves() {
  try {
    const all = await getPropertyCards();
    const vendus = all
      .filter((p: any) => p && p.visible !== false && (p.sold || p.status === 'SOLD'))
      .filter((p: any) => String(p.region || '').toUpperCase() === 'NORMANDIE')
      .filter((p: any) => Number(p.surface) > 0)
      .sort((a: any, b: any) => (b.surface || 0) - (a.surface || 0));

    // Le lien renvoie vers /references, qui présente TOUT le portefeuille vendu
    // et sous compromis, toutes régions. Compter seulement les normands ici
    // annoncerait 13 alors que la page en affiche 19.
    const total = all.filter(
      (p: any) => p && p.visible !== false && (p.sold || p.status === 'SOLD' || p.status === 'UNDER_OFFER')
    ).length;

    if (vendus.length < 3) return { ventes: [], total };
    const choix = [vendus[0], vendus[Math.floor(vendus.length / 2)], vendus[vendus.length - 1]];
    return { ventes: choix, total };
  } catch {
    return { ventes: [], total: 0 };
  }
}

async function getFeatured() {
  try {
    const all = await getPropertyCards();
    const available = all.filter(
      (p: any) => p && p.visible !== false && !p.sold && p.status !== 'UNDER_OFFER' && p.status !== 'SOLD'
    );
    // Le site est positionné sur Rouen : les biens normands passent devant,
    // quel que soit leur prix. Sans cela, le tri par prix faisait remonter
    // Cannes et Paris sous un H1 « Agence immobilière à Rouen ».
    const rang = (p: any) => (p.featured ? 0 : 1) + (String(p.region || '').toUpperCase() === 'NORMANDIE' ? 0 : 10);
    const list = [...available].sort((a: any, b: any) => rang(a) - rang(b) || (b.price || 0) - (a.price || 0));
    return list.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function Home() {
  const [featured, soldCount, preuves] = await Promise.all([getFeatured(), getSoldCount(), getPreuves()]);
  return (
    <main>
      {/* HERO — diaporama plein cadre + CTA unique */}
      <section className="relative isolate overflow-hidden">
        {/* Deux vues et non trois : le haussmannien sert désormais au bandeau
            « Le terrain » plus bas, où il colle au texte — une liste de communes
            urbaines. Le laisser aussi ici le faisait réapparaître un écran et
            demi plus loin, et le bloc censé rompre la répétition la produisait
            lui-même. Les seules photos déclinées en WebP dans public/hero sont
            accueil, chaumiere et normandie : toute nouvelle image doit d'abord y
            être générée en 640/828/1200/1600/2400, sinon le loader renvoie un 404. */}
        <HeroSlideshow
          images={[
            { src: "/hero-normandie.jpg", alt: "Maison de caractère en Normandie, région de Rouen" },
            { src: "/hero-chaumiere.jpg", alt: "Chaumière normande traditionnelle à colombages, campagne rouennaise" },
          ]}
        />
        {/* Voile vert dégradé — lisibilité du texte, le vert devient un accent et non un mur */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#12241b]/90 via-[#1F3B2C]/60 to-[#1F3B2C]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12241b]/60 via-transparent to-transparent" />

        <div className="container relative flex min-h-[70vh] md:min-h-[80vh] flex-col justify-center py-20 md:py-28">
          <span className="text-xs md:text-sm font-medium uppercase tracking-[0.28em] text-gold">
            Rouen &amp; Plateau Nord
          </span>
          <h1 className="mt-4 text-4xl md:text-6xl luxe text-cream leading-[1.05]">
            Agence immobilière à Rouen
          </h1>
          <div className="mt-5 h-px w-16 bg-gold/70" />
          <p className="mt-6 max-w-xl text-base md:text-lg text-cream/90 leading-relaxed">
            Lemeille Patrimoine — votre agence immobilière à Rouen, Mont-Saint-Aignan, Bois-Guillaume et sur
            l&apos;ensemble du Plateau Nord. Vente de maisons et appartements de caractère, estimation gratuite
            et défiscalisation sur mesure.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link href="/immobilier" className="btn btn-gold" data-testid="button-immobilier">
              Découvrir nos biens
            </Link>
            <Link
              href="/programmes"
              className="group inline-flex items-center gap-1.5 font-medium text-cream/90 hover:text-cream transition-colors"
              data-testid="button-defiscalisation"
            >
              Explorer la défiscalisation
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </section>


      <BandeauReassurance soldCount={soldCount} />

      {/* Biens à la une */}
      {featured.length > 0 && (
        <Section title="Nos biens à vendre à Rouen et alentours" subtitle="Une sélection de maisons et appartements de caractère.">
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((p: any, i: number) => (
              <PropertyCard
                key={p.id}
                property={p}
                cityLabel={[p.city, String(p.region || '').replaceAll('_', ' ')].filter(Boolean).join(' · ')}
                priority={i === 0}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/immobilier" className="btn btn-gold inline-flex items-center gap-2" data-testid="button-featured-all">
              Voir tous nos biens
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </Section>
      )}

      {/* RESPIRATION — bandeau photo pleine largeur.
          La page enchaînait quatre grilles de cartes identiques (biens,
          engagements, démarche, secteurs). Ce bloc bord à bord coupe la série
          au premier tiers : pas de carte, pas de conteneur, une photo et une
          phrase. Texte repris de /qui-suis-je pour ne rien affirmer de neuf. */}
      <section className="relative isolate overflow-hidden">
        {/* alt vide : la photo est un fond, pas un contenu. Même convention que
            HeroSlideshow, qui neutralise ses images. Un alt descriptif la
            faisait annoncer juste après « Voir tous nos biens », où rien ne la
            distinguait d'un quatrième bien à vendre.
            Pas de prop quality : next.config n'autorise que 75 et 85, et le
            loader maison ignore de toute façon ce paramètre pour /hero-*.jpg. */}
        <Image
          src="/hero-accueil.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_42%]"
        />
        {/* Voile calé sur le contraste, pas sur l'œil. La chaumière a des pixels
            très clairs (ciel, crépi) : un dégradé horizontal seul laissait le
            texte à 3,1:1 sur mobile, où les lignes vont jusqu'au bord droit.
            D'où deux régimes — voile uniforme tant que le texte occupe toute la
            largeur, dégradé horizontal seulement à partir de md, où le texte
            s'arrête avant que le voile ne s'ouvre. Au pire pixel de la photo, le
            texte courant reste au-dessus de 4,5:1 à toutes les largeurs. */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,36,27,0.88),rgba(18,36,27,0.86))] md:bg-[linear-gradient(to_right,rgba(18,36,27,0.95)_0%,rgba(18,36,27,0.86)_70%,rgba(31,59,44,0.35)_100%)]"
        />
        <div className="container relative py-16 md:py-24">
          {/* Même largeur de texte que le hero : les lignes s'arrêtent avant
              que le voile ne s'éclaircisse. */}
          <div className="max-w-xl">
            <span className="eyebrow">Le terrain</span>
            <p className="mt-4 luxe text-2xl md:text-[2rem] leading-[1.3] text-cream">
              Rouen, Mont-Saint-Aignan, Bois-Guillaume, Bihorel, Isneauville.
            </p>
            <p className="mt-5 text-sm md:text-base text-cream/85 leading-relaxed">
              Quelques kilomètres carrés, et des écarts de prix qui se jouent d&apos;une rue à
              l&apos;autre. Connaître le terrain n&apos;est pas un argument commercial :
              c&apos;est une condition d&apos;exercice.
            </p>
          </div>
        </div>
      </section>

      {/* Engagements Immobilier — six cartes et non sept : sur trois colonnes,
          la septième restait seule sur la dernière ligne et se lisait comme un
          oubli. « Réseau d'experts » et « Expertise locale » ont été réunis. */}
      <Section title="Nos engagements immobiliers" subtitle="Sélection rigoureuse, accompagnement sur-mesure, confidentialité.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Sélection de qualité","Biens vérifiés, diagnostics et potentiel de valorisation."],
            ["Conseil indépendant","Alignement d'intérêts, honoraires transparents."],
            ["Discrétion","Mandats off-market, confidentialité totale."],
            ["Photographie professionnelle","Boîtier hybride, ultra grand-angle et drone — vos biens présentés comme ils le méritent."],
            ["Expertise locale","Connaissance fine de Rouen et du Plateau Nord, et un réseau de notaires, banques, architectes et artisans de la région."],
            ["Réactivité","Retour sous 48h, suivi jusqu'à la signature."]
          ].map(([t, s], i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80">{s}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Démarche d'achat — frise et non grille de cartes.
          Le contenu est une séquence numérotée : la forme doit le dire. Le
          pastillage relié rend l'enchaînement lisible d'un coup d'œil, et
          suffit à ce qu'aucune grille de cartes n'en suive une autre. */}
      <Section title="Notre démarche d'acquisition" subtitle="Quatre étapes, un seul interlocuteur.">
        {/* role="list" : le preflight Tailwind met list-style:none sur les ol,
            ce qui fait perdre la sémantique de liste à VoiceOver. On la rétablit
            explicitement, sinon l'ordre des étapes n'est plus annoncé du tout. */}
        <ol role="list" className="grid gap-9 md:grid-cols-4 md:gap-7">
          {[
            ["Brief & critères","Budget, localisation, surface, objectifs d'investissement."],
            ["Sélection & visites","Présentation de biens ciblés, visites accompagnées."],
            ["Négociation","Défense de vos intérêts, analyse juridique et technique."],
            ["Signature & suivi","Accompagnement notarial, financement, travaux."]
          ].map(([t,s],i)=>(
            <li key={i} className="relative pl-14 md:pl-0 md:pt-12">
              {/* Filet de liaison : de cette pastille à la suivante, gouttière
                  comprise. Rien après la dernière — la frise s'arrête à la
                  signature, elle ne se prolonge pas dans le vide. */}
              {i < 3 && (
                <span
                  aria-hidden
                  className="hidden md:block absolute top-[18px] left-0 -right-7 h-px bg-gold/35"
                />
              )}
              {/* Pastille décorative : le rang est déjà porté par le ol/li, la
                  lire aussi ferait annoncer « 1 » deux fois. */}
              <span
                aria-hidden
                className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-gold bg-cream font-serif text-base text-gold"
              >
                {i + 1}
              </span>
              <div className="luxe text-lg">{t}</div>
              <p className="mt-2 text-sm text-luxe/75 leading-relaxed break-words">{s}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Secteurs */}
      <Section title="Nos secteurs à Rouen et alentours" subtitle="Une connaissance quartier par quartier du marché rouennais.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Rouen centre & rive droite","Vieux-Marché, Cathédrale, Jardin des Plantes • Appartements de caractère, immeubles anciens, hôtels particuliers.","/secteurs/rouen-centre"],
            ["Plateau Nord","Mont-Saint-Aignan, Bois-Guillaume, Bihorel, Isneauville • Maisons familiales, terrains arborés, secteurs prisés.","/secteurs/mont-saint-aignan-bois-guillaume"],
            ["Rive gauche & Plateau Est","Saint-Sever, Grammont, Le Mesnil-Esnard, Franqueville • Prix d'entrée accessibles et bons rendements locatifs.","/secteurs/rouen-rive-gauche"]
          ].map(([t,s,href],i)=>(
            <Link key={i} href={href} className="card p-6 block hover:border-[#B89C6D] transition" data-testid={`link-sector-${i}`}>
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm">{s}</p>
            </Link>
          ))}
        </div>

        {/* Pas de bouton ici : « Voir tous nos biens » mène déjà à /immobilier
            trois sections plus haut. Deux boutons dorés vers la même page se
            diluaient l'un l'autre. */}
      </Section>

      {/* PREUVE — juste avant le formulaire : on demande une estimation après
          avoir montré des ventes réelles. Ruban sombre pleine largeur : deuxième
          rupture de la série de grilles, après le bandeau « Le terrain ». */}
      <PreuveVentes ventes={preuves.ventes} total={preuves.total} />

      {/* Estimation gratuite — demande client */}
      <div id="estimation">
        <Section title="Estimez votre bien gratuitement" subtitle="Vous vendez à Rouen, Mont-Saint-Aignan ou Bois-Guillaume ? Obtenez une estimation indicative immédiate et un avis de valeur personnalisé, sans engagement.">
          <div className="max-w-3xl mx-auto">
            <EstimationForm />
          </div>
        </Section>
      </div>

      {/* Défiscalisation */}
      <Section title="Défiscalisation immobilière" subtitle="Réduisez votre imposition grâce à l'immobilier ancien de caractère.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Loi Malraux","Réduction d'impôt jusqu'à 30% sur les travaux de restauration en secteur sauvegardé."],
            ["Monument Historique","Déduction fiscale intégrale des travaux, sans plafonnement de ressources."],
            ["Déficit Foncier","Imputation sur le revenu global jusqu'à 10 700€/an, report possible."]
          ].map(([t, s], i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm">{s}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/programmes" className="btn btn-gold inline-flex items-center gap-2" data-testid="button-defiscalisation-plus">
            En savoir plus sur la défiscalisation
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </Section>

      {/* À propos - Arthur Lemeille */}
      <Section title="Qui suis-je ?">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Photo */}
          <div className="order-2 md:order-1">
            <Image
              src="/images/arthur-lemeille.jpg"
              alt="Arthur Lemeille - Fondateur de Lemeille Patrimoine"
              width={665}
              height={998}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full h-auto rounded-lg shadow-lg"
              priority
              quality={85}
              data-testid="img-arthur-lemeille"
            />
          </div>

          {/* Texte — version courte : le récit complet vit sur /qui-suis-je,
              pour éviter de dupliquer le même paragraphe sur deux pages. */}
          <div className="order-1 md:order-2">
            <h3 className="luxe text-2xl md:text-3xl mb-4 text-luxe">Arthur Lemeille</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Fondateur de Lemeille Patrimoine. Formé en école de commerce — <strong>Bachelor à NEOMA
              Business School (Rouen)</strong> puis <strong>Master à KEDGE Business School
              (Bordeaux)</strong> — et fort de <strong>huit années d&apos;expérience commerciale</strong>,
              d&apos;abord dans le conseil en supply chain, puis dans le développement commercial.
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              De retour sur ses terres rouennaises, il se consacre à l&apos;immobilier de caractère et à
              la défiscalisation, avec un principe simple : un seul interlocuteur, de la première
              estimation à l&apos;acte authentique.
            </p>
            <Link href="/qui-suis-je" className="group inline-flex items-center gap-1.5 font-medium text-[#B89C6D] hover:gap-2.5 transition-all" data-testid="link-qui-suis-je">
              Mon parcours, ma méthode et mon cadre d&apos;exercice
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>
      </Section>

      {/* SEO JSON-LD */}
    </main>
  );
}
