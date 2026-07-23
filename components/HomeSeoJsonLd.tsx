export default function HomeSeoJsonLd(){
  const json = {
    "@context":"https://schema.org",
    "@type":"RealEstateAgent",
    "name":"Lemeille Patrimoine",
    "url":process.env.NEXT_PUBLIC_SITE_URL || "",
    "brand":{"@type":"Brand","name":"Lemeille Patrimoine"},
    "parentOrganization":{"@type":"Organization","name":"Novus Capital","url":"https://www.pappers.fr/entreprise/novus-capital-937847937"},
    "email":"arthur.lemeille@lemeillepatrimoine.com",
    "telephone":"+33687157259",
    "address":[
      {"@type":"PostalAddress","streetAddress":"19 rue de l'École","addressLocality":"Rouen","postalCode":"76000","addressCountry":"FR"},
      {"@type":"PostalAddress","streetAddress":"722 avenue Alfred de Musset","addressLocality":"Fréjus","postalCode":"83370","addressCountry":"FR"}
    ],
    "areaServed":[
      "Paris","Paris 7e","Paris 6e","Paris 5e","Paris 16e",
      "Neuilly-sur-Seine","Boulogne-Billancourt","Louvre","Marais",
      "Rouen","Mont-Saint-Aignan","Bois-Guillaume",
      "Saint-Aygulf","Fréjus","Sainte-Maxime","Golfe de Saint-Tropez",
      "Estérel","Théoule-sur-Mer","Agay",
      "Normandie","Côte d'Azur"
    ],
    "openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"09:00","closes":"19:00"}]
  };
  const faq = {
    "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      {"@type":"Question","name":"Intervenez-vous en location ?","acceptedAnswer":{"@type":"Answer","text":"Non. Lemeille Patrimoine réalise uniquement de la transaction dans l'ancien (achat / vente)."}},
      {"@type":"Question","name":"Proposez-vous des dispositifs de défiscalisation ?","acceptedAnswer":{"@type":"Answer","text":"Oui : Déficit foncier, Loi Malraux, Monument Historique, avec une page programme dédiée pour chaque opération."}},
      {"@type":"Question","name":"Dans quelles zones intervenez-vous ?","acceptedAnswer":{"@type":"Answer","text":"Paris (Rive gauche, Ouest, Centre), Normandie (Rouen, Mont-Saint-Aignan, Bois-Guillaume), Côte d'Azur (Saint-Aygulf, Fréjus, Golfe de Saint-Tropez, Estérel)."}},
      {"@type":"Question","name":"Comment se déroule l'accompagnement ?","acceptedAnswer":{"@type":"Answer","text":"1. Brief & audit patrimonial 2. Sélection et visites 3. Négociation 4. Suivi jusqu'à la signature et mise en relation partenaires."}}
    ]
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(json)}}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faq)}}/>
    </>
  );
}
