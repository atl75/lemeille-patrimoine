export default function HomeSeoJsonLd(){
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://lemeillepatrimoine.com";
  const json = {
    "@context":"https://schema.org",
    "@type":"RealEstateAgent",
    "name":"Lemeille Patrimoine",
    "url":base,
    "image":`${base}/og-image.jpg`,
    "priceRange":"€€€€",
    "brand":{"@type":"Brand","name":"Lemeille Patrimoine"},
    "parentOrganization":{"@type":"Organization","name":"Novus Capital","url":"https://www.pappers.fr/entreprise/novus-capital-937847937"},
    "email":"arthur.lemeille@lemeillepatrimoine.com",
    "telephone":"+33687157259",
    "address":[
      {"@type":"PostalAddress","streetAddress":"50 rue de la Garenne","addressLocality":"Mont-Saint-Aignan","postalCode":"76130","addressCountry":"FR"},
      {"@type":"PostalAddress","streetAddress":"35 rue Ganterie","addressLocality":"Rouen","postalCode":"76000","addressCountry":"FR"},
      {"@type":"PostalAddress","streetAddress":"722 avenue Alfred de Musset","addressLocality":"Fréjus","postalCode":"83370","addressCountry":"FR"}
    ],
    "areaServed":[
      "Rouen","Mont-Saint-Aignan","Bois-Guillaume","Bihorel","Isneauville",
      "Le Mesnil-Esnard","Franqueville-Saint-Pierre","Déville-lès-Rouen","Bonsecours",
      "Normandie","Seine-Maritime","Métropole Rouen Normandie",
      "Paris","Neuilly-sur-Seine","Boulogne-Billancourt",
      "Saint-Aygulf","Fréjus","Sainte-Maxime","Côte d'Azur"
    ],
    "openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"09:00","closes":"19:00"}]
  };
  const faq = {
    "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      {"@type":"Question","name":"Quelle agence immobilière à Rouen pour vendre une maison de caractère ?","acceptedAnswer":{"@type":"Answer","text":"Lemeille Patrimoine est une agence immobilière basée à Rouen (35 rue Ganterie) et Mont-Saint-Aignan, spécialisée dans les maisons et appartements de caractère à Rouen et sur le Plateau Nord. Estimation gratuite et avis de valeur sous 7 jours."}},
      {"@type":"Question","name":"Intervenez-vous en location ?","acceptedAnswer":{"@type":"Answer","text":"Non. Lemeille Patrimoine réalise uniquement de la transaction dans l'ancien (achat / vente)."}},
      {"@type":"Question","name":"Proposez-vous des dispositifs de défiscalisation ?","acceptedAnswer":{"@type":"Answer","text":"Oui : Déficit foncier, Loi Malraux, Monument Historique, avec une page programme dédiée pour chaque opération."}},
      {"@type":"Question","name":"Dans quelles zones intervenez-vous ?","acceptedAnswer":{"@type":"Answer","text":"Principalement Rouen et sa métropole : Rouen centre et rive gauche, Mont-Saint-Aignan, Bois-Guillaume, Bihorel, Isneauville, Le Mesnil-Esnard et Franqueville-Saint-Pierre. En complément, nous accompagnons également nos clients à Paris et sur la Côte d'Azur."}},
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
