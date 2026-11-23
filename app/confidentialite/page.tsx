import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = pageMetadata({
  title: "Politique de confidentialité | Lemeille Patrimoine",
  description: "Politique de confidentialité de Lemeille Patrimoine : traitement des données personnelles, droits RGPD et protection de la vie privée.",
  alternates: {
    canonical: '/confidentialite'
  }
});

export default function Page(){
  return (
    <main>
      <Hero title="Politique de confidentialité" subtitle="Transparence sur l'utilisation de vos données." />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Confidentialité"}]} />
      </section>
      <section className="container pb-14">
        <div className="prose max-w-none">
        <h2 className="luxe text-2xl">Responsable de traitement</h2>
        <p>Novus Capital (SIREN 937 847 937) — Lemeille Patrimoine.</p>

        <h2 className="luxe text-2xl mt-8">Données collectées</h2>
        <p>Les formulaires transmettent les informations que vous renseignez pour votre demande : identité, coordonnées, message et, selon le parcours, renseignements sur votre bien ou votre projet. Google Analytics mesure la navigation uniquement après votre accord. Il ne s&apos;agit pas d&apos;une garantie d&apos;anonymat. Consultez la <Link href="/cookies" className="underline">gestion des cookies</Link> pour accepter, refuser ou retirer cet accord.</p>

        <h2 className="luxe text-2xl mt-8">Finalités</h2>
        <p>Réponse à vos demandes, gestion de la relation client et obligations légales. Avec votre consentement distinct, mesure des visites et des demandes de contact abouties pour améliorer le site. Refuser cette mesure n&apos;empêche pas de contacter Arthur Lemeille.</p>

        <h2 className="luxe text-2xl mt-8">Durées de conservation</h2>
        <p>Jusqu&apos;à 3 ans après le dernier contact pour la prospection ; obligations légales pour le reste.</p>

        <h2 className="luxe text-2xl mt-8">Vos droits</h2>
        <p>Accès, rectification, opposition, effacement, limitation, portabilité. Exercez vos droits via <Link href="/contact" className="underline">le formulaire</Link>.</p>

        <h2 className="luxe text-2xl mt-8">Sous-traitants</h2>
        <p>Suggestions d&apos;adresses : lorsque vous renseignez au moins trois caractères dans un champ d&apos;adresse avec suggestions, le texte recherché est transmis directement depuis votre navigateur au service de géocodage de la Géoplateforme (IGN), qui reçoit également votre adresse IP. Cet appel n&apos;envoie ni vos coordonnées de contact renseignées dans les autres champs, ni les cookies du site. Le formulaire d&apos;estimation accepte aussi une adresse saisie sans sélectionner de suggestion.</p>
        <p>Hébergement du site sur Google Cloud Platform (Google Cloud Run, région europe-west1, UE) ; nom de domaine géré par Squarespace Domains II LLC. La localisation du serveur ne garantit pas que tous les services externes traitent leurs données uniquement dans l&apos;UE. Google Analytics et les contenus tiers ont leurs propres conditions de traitement, précisées dans la <Link href="/cookies" className="underline">page cookies</Link>.</p>
        </div>
      </section>
    </main>
  );
}
