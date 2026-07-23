export default function PatrimoineSeoJsonLd(){
  const service = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": "Conseil en gestion de patrimoine — Lemeille Patrimoine",
    "areaServed": ["Paris","Normandie","Côte d'Azur"],
    "provider": { "@type": "Organization", "name": "Lemeille Patrimoine" },
    "url": (process.env.NEXT_PUBLIC_SITE_URL || "") + "/patrimoine"
  };
  const faq = {
    "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      {"@type":"Question","name":"Que comprend votre accompagnement patrimonial ?","acceptedAnswer":{"@type":"Answer","text":"Bilan initial, définition d'objectifs, allocation long terme, stratégie fiscale (déficit foncier, Malraux, MH), transmission et suivi annuel."}},
      {"@type":"Question","name":"Proposez-vous des simulations ?","acceptedAnswer":{"@type":"Answer","text":"Oui, scénarios chiffrés (cash-flow, effort d'épargne, impact fiscal, horizon) et comparaison par dispositifs."}},
      {"@type":"Question","name":"Intervenez-vous en location ?","acceptedAnswer":{"@type":"Answer","text":"Non, uniquement transaction dans l'ancien et opérations patrimoniales dédiées."}},
      {"@type":"Question","name":"Quelles zones géographiques ?","acceptedAnswer":{"@type":"Answer","text":"Paris (Rive gauche/Ouest/Centre), Rouen et 76 (Mont-Saint-Aignan, Bois-Guillaume), Côte d'Azur (Saint-Aygulf, Fréjus, Golfe de St-Tropez, Estérel)."}}
    ]
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(service)}}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faq)}}/>
    </>
  );
}
