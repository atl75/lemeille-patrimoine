import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Gestion des cookies | Lemeille Patrimoine",
  description: "Politique de gestion des cookies et traceurs sur le site Lemeille Patrimoine.",
  alternates: {
    canonical: '/cookies'
  }
};

export default function Page(){
  return (
    <main>
      <Hero title="Cookies" subtitle="Gestion des cookies et traceurs." />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Cookies"}]} />
      </section>
      <section className="container pb-14">
        <div className="prose max-w-none">
        <h2 className="luxe text-2xl">Types de cookies</h2>
        <ul>
          <li><strong>Techniques</strong> : essentiels au fonctionnement du site.</li>
          <li><strong>Mesure d&apos;audience</strong> : statistiques anonymisées, si activées.</li>
        </ul>
        <h2 className="luxe text-2xl mt-8">Paramétrage</h2>
        <p>Vous pouvez configurer votre navigateur pour accepter ou refuser les cookies. Certains éléments peuvent ne plus fonctionner sans cookies techniques.</p>
        </div>
      </section>
    </main>
  );
}
