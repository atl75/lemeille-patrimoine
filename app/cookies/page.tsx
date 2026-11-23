import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';
import { AudiencePreferencesButton } from '@/components/AnalyticsProvider';

import { pageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: "Gestion des cookies | Lemeille Patrimoine",
  description: "Politique de gestion des cookies et traceurs sur le site Lemeille Patrimoine.",
  alternates: {
    canonical: '/cookies'
  }
});

export default function Page(){
  return (
    <main>
      <Hero title="Cookies" subtitle="Gestion des cookies et traceurs." />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Cookies"}]} />
      </section>
      <section className="container pb-14">
        <div className="prose max-w-none">
        <h2 className="luxe text-2xl">Votre choix</h2>
        <p>La mesure d&apos;audience avec Google Analytics est désactivée tant que vous ne l&apos;avez pas acceptée. Vous pouvez accepter ou refuser dans le bandeau, puis changer d&apos;avis à tout moment ici ou depuis le pied de page. Les annonces et les formulaires restent accessibles si vous refusez.</p>
        <AudiencePreferencesButton />
        <h2 className="luxe text-2xl mt-8">Stockage nécessaire et mesure d&apos;audience</h2>
        <ul>
          <li><strong>Préférence de consentement</strong> : le stockage local de votre navigateur mémorise uniquement votre choix et sa date pendant 180 jours, que vous acceptiez ou refusiez. Il ne contient pas d&apos;identifiant de visiteur. Il est propre à cet appareil et à ce navigateur.</li>
          <li><strong>Session</strong> : les outils sécurisés utilisent des cookies nécessaires à l&apos;authentification, indépendamment du choix de mesure d&apos;audience.</li>
          <li><strong>Google Analytics</strong> : après acceptation, Google peut déposer des cookies <code>_ga</code> et <code>_ga_…</code> pour distinguer les visites. Leur durée est limitée par le site à 180 jours sans renouvellement automatique. Les statistiques portent notamment sur les pages visitées, les caractéristiques techniques du navigateur et les demandes de contact abouties.</li>
        </ul>
        <p>Le site ne transmet pas les noms, coordonnées, messages ou montants saisis dans les formulaires dans ses événements de conversion Analytics. Les fonctionnalités de signaux Google et de personnalisation publicitaire sont désactivées dans le code du site. Ces mesures ne constituent pas une garantie d&apos;anonymat.</p>
        <h2 className="luxe text-2xl mt-8">Retirer votre accord</h2>
        <p>Choisissez « Refuser » dans « Gérer les cookies ». Le suivi Analytics est désactivé et les cookies Analytics accessibles sur le domaine sont effacés. Ce retrait ne supprime pas rétroactivement les statistiques déjà transmises. Si votre navigateur bloque le stockage local, le choix ne peut pas être conservé après rechargement et Analytics reste désactivé par défaut.</p>
        <h2 className="luxe text-2xl mt-8">Services externes</h2>
        <p>Les cartes Google Maps sont chargées uniquement lorsque vous demandez leur affichage. Ce choix est distinct de la mesure d&apos;audience et n&apos;est pas mémorisé après rechargement. Les vidéos et visites virtuelles peuvent aussi faire appel à des fournisseurs externes : leur lecture implique une connexion à leurs services.</p>
        <p>Google peut traiter des données hors de l&apos;Espace économique européen. Pour connaître ses traitements et exercer les droits correspondants, consultez les <a href="https://policies.google.com/privacy?hl=fr" target="_blank" rel="noopener noreferrer">règles de confidentialité de Google</a> et les <a href="https://policies.google.com/technologies/partner-sites?hl=fr" target="_blank" rel="noopener noreferrer">informations sur les sites utilisant ses services</a>.</p>
        </div>
      </section>
    </main>
  );
}
