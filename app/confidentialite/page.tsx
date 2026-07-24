import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Politique de confidentialité | Lemeille Patrimoine",
  description: "Politique de confidentialité de Lemeille Patrimoine : traitement des données personnelles, droits RGPD et protection de la vie privée.",
  alternates: {
    canonical: '/confidentialite'
  }
};

export default function Page(){
  return (
    <main>
      <Hero title="Politique de confidentialité" subtitle="Transparence sur l'utilisation de vos données." />
      <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Confidentialité"}]} />
      <section className="container pb-14 prose max-w-none">
        <h2 className="luxe text-2xl">Responsable de traitement</h2>
        <p>Novus Capital (SIREN 937 847 937) — Lemeille Patrimoine.</p>

        <h2 className="luxe text-2xl mt-8">Données collectées</h2>
        <p>Formulaire de contact (identité, coordonnées, sujet, message). Cookies techniques et de mesure d&apos;audience anonymisée.</p>

        <h2 className="luxe text-2xl mt-8">Finalités</h2>
        <p>Réponse à vos demandes, gestion de la relation client et obligations légales.</p>

        <h2 className="luxe text-2xl mt-8">Durées de conservation</h2>
        <p>Jusqu&apos;à 3 ans après le dernier contact pour la prospection ; obligations légales pour le reste.</p>

        <h2 className="luxe text-2xl mt-8">Vos droits</h2>
        <p>Accès, rectification, opposition, effacement, limitation, portabilité. Exercez vos droits via <Link href="/contact" className="underline">le formulaire</Link>.</p>

        <h2 className="luxe text-2xl mt-8">Sous-traitants</h2>
        <p>Hébergement Replit, DNS/Squarespace. Les données sont stockées au sein de l&apos;UE ou avec garanties adéquates.</p>
      </section>
    </main>
  );
}
