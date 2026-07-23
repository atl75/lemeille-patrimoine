import Hero from "@/components/Hero";
import Breadcrumb from "@/components/Breadcrumb";
import Section from "@/components/Section";
import Accordion from "@/components/Accordion";
import PatrimoineSeoJsonLd from "@/components/PatrimoineSeoJsonLd";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestion de patrimoine - Conseil patrimonial sur mesure | Lemeille Patrimoine',
  description: 'Conseil en gestion de patrimoine sur mesure : structuration patrimoniale, transmission, optimisation fiscale (Malraux, Monument Historique, Déficit Foncier). Expertise Paris, Normandie, Côte d\'Azur.',
  alternates: {
    canonical: '/patrimoine'
  },
  openGraph: {
    title: 'Gestion de patrimoine - Conseil patrimonial sur mesure',
    description: 'Conseil en gestion de patrimoine sur mesure : structuration patrimoniale, transmission, optimisation fiscale.',
    url: '/patrimoine',
    type: 'website',
  }
};

export default function Page(){
  return (
    <main>
      <Hero
        title="Gestion de patrimoine"
        subtitle="Conseil sur-mesure en structuration patrimoniale, transmission, optimisation fiscale et allocation long terme."
        primary={{ label: "Voir les programmes", href: "/programmes" }}
        secondary={{ label: "Contact", href: "/contact?topic=Gestion%20de%20patrimoine" }}
      />
      <section className="container py-6">
        <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Gestion de patrimoine"}]} />
      </section>

      {/* 1) Nos expertises */}
      <Section title="Nos expertises patrimoniales" subtitle="Un accompagnement complet et discret, aligné sur vos objectifs.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Bilan & stratégie","Analyse globale, objectifs familiaux et patrimoniaux, horizon d'investissement."],
            ["Allocation long terme","Gestion par poches (immobilier, financier, trésorerie, transmission)."],
            ["Optimisation fiscale","Déficit foncier, Loi Malraux, Monument Historique selon votre profil."],
            ["Transmission","Organisation, démembrement, donation & pacte Dutreil (avec partenaires notaires)."],
            ["Financement","Optimisation de l'effet de levier, mise en relation banques privées."],
            ["Suivi annuel","Point de situation, arbitrages, reporting."]
          ].map(([t,s],i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80">{s}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 2) Démarche */}
      <Section title="Notre démarche">
        <ol className="grid md:grid-cols-4 gap-6 list-decimal pl-6">
          {[
            ["Brief & cadrage","Critères, fiscalité, horizon, tolérance au risque."],
            ["Audit & scénarios","Simulations chiffrées (cash-flow, impact fiscal, effort d'épargne)."],
            ["Mise en œuvre","Sélection des opérations, coordination notaire/banque/travaux."],
            ["Suivi & arbitrages","Bilan annuel, options de refinancement et transmission."]
          ].map(([t,s],i)=>(
            <li key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80">{s}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 3) Dispositifs de défiscalisation */}
      <Section title="Dispositifs de défiscalisation" subtitle="Sélection d'opérations en déficit foncier, loi Malraux et Monument Historique.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Déficit foncier","Imputation des travaux sur les revenus fonciers puis sur le revenu global (plafond légal)."],
            ["Loi Malraux","Réduction d'impôt 22–30% du montant des travaux, biens en Secteur Sauvegardé/ZPPAUP."],
            ["Monument Historique","Déduction intégrale des travaux (sous conditions), conservation longue durée."]
          ].map(([t,s],i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80">{s}</p>
            </div>
          ))}
        </div>

        {/* tableau comparatif */}
        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm border-separate [border-spacing:0]">
            <thead>
              <tr className="bg-[#F4F1EB]">
                <th className="text-left p-3 rounded-tl-2xl">Critères</th>
                <th className="text-left p-3">Déficit foncier</th>
                <th className="text-left p-3">Loi Malraux</th>
                <th className="text-left p-3 rounded-tr-2xl">Monument Historique</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {[
                ["Nature", "Déduction de charges", "Réduction d'impôt", "Déduction des charges/travaux"],
                ["Travaux", "Part importante de l'opération", "Encadrés et agréés", "Restaurations lourdes"],
                ["Horizon", "4–9 ans recommandés", "9–12 ans", "Long terme (conservation)"],
                ["Profil", "Revenus fonciers / TMI élevée", "TMI moyenne/élevée", "Patrimonial à très long terme"]
              ].map((row,i)=>(
                <tr key={i} className="border-t">
                  {row.map((cell,j)=>(
                    <td key={j} className={`p-3 ${i===3 && j===3 ? 'rounded-br-2xl' : ''}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs opacity-70 mt-2">
          * Informations indicatives et non contractuelles. Un conseil personnalisé et une étude fiscale sont requis.
        </div>
      </Section>

      {/* 4) Solutions d'investissement */}
      <Section title="Solutions d'investissement" subtitle="Diversification et allocation sur-mesure selon vos objectifs patrimoniaux.">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            ["Assurance-vie","Enveloppe fiscale privilégiée pour l'épargne long terme. Diversification (fonds euros sécurisés, unités de compte dynamiques), transmission optimisée après 8 ans, liquidité totale."],
            ["PER (Plan Épargne Retraite)","Déduction fiscale des versements, capitalisation différée, sortie en rente ou capital à la retraite. Idéal pour préparer revenus complémentaires et réduire l'impôt pendant la vie active."],
            ["SCPI","Pierre-papier : revenus locatifs réguliers sans contraintes de gestion. Démembrement possible pour optimiser fiscalité et transmission. Diversification géographique et sectorielle (bureaux, commerces, santé)."],
            ["Private equity","Investissement au capital de PME/ETI non cotées. Horizon 5–10 ans, potentiel de plus-value élevé, diversification hors marchés financiers traditionnels. Réduction IR possible selon le véhicule (FCPI, FIP)."],
            ["Produits structurés","Instruments sur-mesure combinant protection du capital et participation aux marchés. Profils variés : garantie partielle, autocall, participation conditionnelle. Réservés aux investisseurs avertis."]
          ].map(([t,s],i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80 text-sm">{s}</p>
            </div>
          ))}
        </div>
        <div className="text-xs opacity-70 mt-4">
          * Investir comporte des risques de perte en capital. Performances passées non garanties. Un conseil personnalisé est indispensable.
        </div>
      </Section>

      {/* 5) Cas pratiques */}
      <Section title="Cas pratiques (exemples)">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["Jeune cadre","Objectif : constituer un patrimoine et optimiser la fiscalité. Piste : nue-propriété avec décote initiale + assurance-vie pour diversification et liquidité."],
            ["Couple avec enfants","Objectif : transmission et optimisation fiscale. Piste : Loi Malraux en secteur sauvegardé + démembrement SCPI pour revenus complémentaires et donation future."],
            ["Chef d'entreprise avec locatif","Objectif : optimiser le parc locatif existant et diversifier. Piste : déficit foncier sur travaux de rénovation + allocation financière (private equity, SCPI)."]
          ].map(([t,s],i)=>(
            <div key={i} className="card p-6">
              <div className="luxe text-xl mb-2">{t}</div>
              <p className="opacity-80">{s}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6) FAQ */}
      <Section title="Questions fréquentes">
        <Accordion items={[
          { q: "Combien de temps dure l'accompagnement ?", a: "Le cadrage et l'audit s'effectuent en 1 à 2 rendez-vous, puis la mise en œuvre selon le calendrier des opérations (généralement 1 à 3 mois). Un suivi annuel est compris." },
          { q: "Proposez-vous des simulations chiffrées ?", a: "Oui : effort d'épargne, cash-flow prévisionnel, impact IR et prélèvements sociaux, horizons, sensibilité taux/travaux." },
          { q: "Vos honoraires ?", a: "Transparents et précisés dans le mandat. Ils dépendent de la complexité et du montage retenu." },
          { q: "Zones couvertes ?", a: "Toute la France." }
        ]}/>
      </Section>

      {/* 7) Bandeau d'appel */}
      <section className="container pb-12">
        <div className="card p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="luxe text-xl">Diagnostic patrimonial offert</div>
            <div className="opacity-80 text-sm">Échange de 30 min pour clarifier objectifs et contraintes.</div>
          </div>
          <a className="btn btn-gold" href="tel:+33687157259" data-testid="link-contact-patrimoine">Parler à un conseiller</a>
        </div>
      </section>

      {/* SEO JSON-LD */}
      <PatrimoineSeoJsonLd />
    </main>
  );
}
