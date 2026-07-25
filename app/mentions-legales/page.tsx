import Link from "next/link";
import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Mentions légales | Lemeille Patrimoine",
  description: "Mentions légales de Lemeille Patrimoine : éditeur, hébergement, responsabilité et propriété intellectuelle.",
  alternates: {
    canonical: '/mentions-legales'
  }
};

export default function Page(){
  return (
    <main>
      <Hero title="Mentions légales" subtitle="Informations relatives à l'éditeur et à l'hébergement du site." />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Mentions légales"}]} />
      </section>
      <section className="container pb-14">
        <div className="prose max-w-none">
        <h2 className="luxe text-2xl">Éditeur</h2>
        <p><strong>Lemeille Patrimoine</strong>, marque du groupe <strong>Novus Capital</strong> (SIREN 937 847 937).<br/>
        Siège social : 50 rue de la Garenne, 76130 Mont-Saint-Aignan.<br/>
        Bureaux : 35 rue Ganterie, 76000 Rouen — 722 avenue Alfred de Musset, 83370 Saint-Aygulf.</p>

        <h2 className="luxe text-2xl mt-8">Hébergement</h2>
        <p>Application hébergée sur Google Cloud Platform (Google Cloud Run, région europe-west1). Le nom de domaine est géré par Squarespace Domains II LLC.</p>

        <h2 className="luxe text-2xl mt-8">Responsabilité</h2>
        <p>Les informations publiées sont fournies à titre indicatif et ne sauraient se substituer à un conseil personnalisé.</p>

        <h2 className="luxe text-2xl mt-8">Propriété intellectuelle</h2>
        <p>Contenus et éléments graphiques © Lemeille Patrimoine. Toute reproduction non autorisée est interdite.</p>

        <h2 className="luxe text-2xl mt-8">Contact</h2>
        <p>Pour toute question, utilisez le formulaire de <Link href="/contact" className="underline">contact</Link>.</p>
        </div>
      </section>
    </main>
  );
}
