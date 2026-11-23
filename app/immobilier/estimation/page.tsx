import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Section from "@/components/Section";
import EstimationForm from "@/components/EstimationFormLoader";

import { pageMetadata } from '@/lib/pageMetadata';

export const metadata = pageMetadata({
  title: "Estimation immobilière gratuite à Rouen | Lemeille Patrimoine",
  description: "Vous vendez à Rouen ou sur le Plateau Nord ? Demandez une estimation gratuite et un avis de valeur personnalisé, remis sous 24 heures maximum après la visite.",
  alternates: { canonical: "/immobilier/estimation" }
});

export default function Page(){
  return (
    <main>
      <Hero
        title="Estimation gratuite"
        subtitle="Décrivez votre bien pour préparer notre échange. Je vous remets un avis de valeur argumenté sous 24 heures maximum après la visite, gratuitement et sans engagement."
        primary={{ label: "Décrire mon bien", href: "#estimation" }}
        compact
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Immobilier", href:"/immobilier"},{label:"Estimation gratuite"}]} />
      </section>
      <div id="estimation" className="scroll-mt-24">
      <Section>
        {/* Client component */}
        <EstimationForm />
      </Section>
      </div>
    </main>
  );
}
