import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Section from "@/components/Section";
import EstimationForm from "@/components/EstimationFormLoader";

export const metadata = {
  title: "Estimation gratuite — Lemeille Patrimoine",
  description: "Obtenez une première estimation indicative de votre bien et un avis de valeur par un conseiller."
};

export default function Page(){
  return (
    <main>
      <Hero
        title="Estimation gratuite"
        subtitle="Obtenez immédiatement une fourchette indicative, puis un avis de valeur précis par un conseiller."
        primary={{ label: "Nous contacter", href: "/contact?topic=Estimation" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Immobilier", href:"/immobilier"},{label:"Estimation gratuite"}]} />
      </section>
      <Section>
        {/* Client component */}
        <EstimationForm />
      </Section>
    </main>
  );
}
