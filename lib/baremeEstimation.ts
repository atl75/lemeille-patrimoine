import type { Bareme } from './estimation.ts';

/**
 * Les coefficients de marché. UNIQUEMENT des chiffres, avec leur provenance.
 *
 * CE QUE CE FICHIER N'EST PAS : une opinion. Chaque valeur porte sa source et
 * son niveau de preuve, et les trois niveaux ne se valent pas :
 *
 *   `mesuree` — une étude statistique sur des transactions réelles. En France
 *               il n'y en a que deux qui comptent ici : la valeur verte des
 *               Notaires (DPE) et l'étude MeilleursAgents 2017 (étage).
 *   `estimee` — un ordre de grandeur issu d'une étude, mais transposé : borne
 *               d'une fourchette, calibrage sur un autre marché, autre époque.
 *   `usage`   — la pratique de la profession. Aucune étude derrière. C'est le
 *               cas de TOUT ce qui touche à l'état du bien, au bruit de
 *               voisinage et à la luminosité.
 *
 * POURQUOI CETTE DISTINCTION EST DANS LE CODE ET PAS DANS UN COIN DE TÊTE :
 * le document sort de l'imprimante et se pose devant un vendeur. Présenter
 * « -22 % parce que le bien est à rénover » avec le même aplomb que « -25 %
 * parce que la maison est en G » serait un mensonge par mise en page — le
 * second est mesuré sur 308 627 ventes, le premier ne l'est nulle part.
 *
 * CE QUI N'EXISTE PAS, ET QU'ON NE FABRIQUE PAS :
 *   · La décote d'un bien « à rénover ». La variable existe dans PERVAL mais
 *     n'est renseignée qu'à 50-60 %, sur simple déclaration des parties :
 *     DINAMIC a eu la donnée en main et a REFUSÉ d'en publier un coefficient.
 *   · Un coefficient français de décote par décibel. Le référentiel de l'État
 *     monétise le bruit en €/personne exposée, jamais en % de valeur vénale.
 *   · L'écart de prix entre une exposition sud et une exposition nord. La seule
 *     mesure française porte sur des LOYERS de 1996, significative dans deux
 *     régressions sur huit.
 *   · La surcote du haut de gamme. Ce n'est pas un pourcentage ajouté à un
 *     prix de secteur, c'est un autre marché, avec ses propres acheteurs — il
 *     a monté quand le marché courant baissait.
 *
 * RÉVISION. Les Notaires republient la valeur verte chaque année, vers
 * décembre. La table DPE ci-dessous est celle des transactions 2024 ; elle a
 * bougé de huit points sur les maisons G depuis 2021. À reprendre à chaque
 * parution — c'est la seule ligne de ce fichier qui se périme vite.
 */

const NOTAIRES = 'Notaires de France / ADNOV, « La valeur verte des logements en France — Transactions 2024 », décembre 2025';
const MA2017 = 'MeilleursAgents, communiqué du 19 mai 2017 (50 000 transactions, Paris et 10 plus grandes villes)';
const ADEME = 'ADEME / Conseil national du bruit, « Coût social du bruit en France », juillet 2021';

/**
 * L'écart régional est considérable et le barème est national.
 *
 * Sur une maison G, les Notaires mesurent -11 % en Petite Couronne et -32 %
 * en Nouvelle-Aquitaine : du simple au triple. La décote se creuse en marché
 * détendu, où l'acquéreur a le choix, et s'écrase en marché tendu. Cette note
 * s'affiche à côté du critère DPE pour que l'agent corrige à la main plutôt
 * que d'appliquer une moyenne nationale à sa rue.
 */
const NOTE_REGION =
  "Moyenne nationale. L'écart régional est du simple au triple sur les mauvaises " +
  "étiquettes (maison G : -11 % en Petite Couronne, -20 % en PACA, -30 % en Grand Est, " +
  "-32 % en Nouvelle-Aquitaine). À corriger à la main en marché détendu.";

export const BAREME_COURANT: Bareme = {
  version: '2026.1',
  revuLe: '2026-09-09',
  /**
   * Plafond de l'ajustement cumulé.
   *
   * Calibré sur la seule mesure française qui croise deux critères : DINAMIC
   * a chiffré une maison G ET en mauvais état à -21 % par rapport à une D en
   * bon état (ventes 2010-2011), écart qui s'est creusé depuis. Trente points
   * est donc le bas de ce qu'un cumul réel peut atteindre, et le haut de ce
   * qu'on peut défendre devant un vendeur sans autre preuve. Au-delà, ce n'est
   * plus le prix qui absorbe les défauts du bien, c'est le délai de vente.
   */
  plafond: 30,

  criteres: {
    dpe: {
      libelle: 'Étiquette énergie',
      neutre: 'Classe D, la plus fréquente du parc ancien',
      explication:
        "Le seul critère de cette liste qui soit mesuré sur des transactions réelles : " +
        "308 627 maisons et 244 223 appartements, à caractéristiques égales. L'écart est " +
        "deux fois plus fort sur une maison que sur un appartement — en copropriété, " +
        "l'acquéreur ne maîtrise pas seul les travaux.",
      modalites: [
        { cle: 'A', libelle: 'A', pourcent: { Appartement: 16, Maison: 17 }, source: NOTAIRES, fiabilite: 'mesuree', note: "Biais de sélection : les biens A sont surtout des constructions récentes, pas des rénovations. " + NOTE_REGION },
        { cle: 'B', libelle: 'B', pourcent: { Appartement: 12, Maison: 13 }, source: NOTAIRES, fiabilite: 'mesuree', note: NOTE_REGION },
        { cle: 'C', libelle: 'C', pourcent: { Appartement: 6, Maison: 7 }, source: NOTAIRES, fiabilite: 'mesuree', note: NOTE_REGION },
        { cle: 'D', libelle: 'D — référence', pourcent: 0, source: NOTAIRES, fiabilite: 'mesuree', note: "Classe de référence de l'étude." },
        { cle: 'E', libelle: 'E', pourcent: { Appartement: -4, Maison: -9 }, source: NOTAIRES, fiabilite: 'mesuree', note: "La décote a doublé depuis 2021 sur les maisons (-5 % alors). " + NOTE_REGION },
        { cle: 'F', libelle: 'F — passoire', pourcent: { Appartement: -8, Maison: -18 }, source: NOTAIRES, fiabilite: 'mesuree', note: "Location interdite en 2028. La décote maison a quasiment doublé depuis 2021. " + NOTE_REGION },
        { cle: 'G', libelle: 'G — passoire', pourcent: { Appartement: -12, Maison: -25 }, source: NOTAIRES, fiabilite: 'mesuree', note: "Location déjà interdite depuis 2025. " + NOTE_REGION },
      ],
    },

    etat: {
      libelle: 'État du bien',
      neutre: 'Habitable en l\'état, sans travaux à engager',
      explication:
        "AUCUNE de ces valeurs n'est mesurée. Il n'existe pas de statistique publique " +
        "française donnant la décote d'un bien à rénover : la variable existe dans les " +
        "bases notariales mais, renseignée à moitié et sur simple déclaration des parties, " +
        "elle a été jugée inexploitable. Ces chiffres sont ceux de la profession, à " +
        "confronter systématiquement à un devis de travaux.",
      modalites: [
        {
          cle: 'A_RENOVER', libelle: 'À rénover entièrement', pourcent: -22,
          source: "Pratique professionnelle (fourchette -25 à -40 % relevée sur les portails, rapportée ici à un bien médian et non à un bien refait à neuf)",
          fiabilite: 'usage',
          note: "Effet de seuil, non linéaire : un bien à rénover sort du marché des acquéreurs financés par un crédit classique, ce qui décroche le prix bien au-delà du coût des travaux. Les Notaires constatent une décote « désormais systématiquement supérieure au coût des travaux », sans publier de ratio. À chiffrer par devis.",
        },
        { cle: 'TRAVAUX', libelle: 'Travaux à prévoir', pourcent: -8, source: 'Pratique professionnelle', fiabilite: 'usage', note: "Rafraîchissement : compter 150 à 300 €/m². Rénovation partielle : 350 à 1 000 €/m² (sources commerciales, à valider par devis)." },
        { cle: 'CORRECT', libelle: "Correct, habitable en l'état", pourcent: 0, source: 'Point neutre de l\'échelle', fiabilite: 'usage' },
        { cle: 'RENOVE', libelle: 'Rénové récemment', pourcent: 7, source: 'Pratique professionnelle', fiabilite: 'usage', note: "Aucune étude française n'isole l'effet d'une rénovation récente à DPE constant : aucune base ne date les travaux. Les « +5 à +15 % » qui circulent mesurent en réalité la valeur verte, donc le DPE — déjà compté au-dessus." },
        {
          cle: 'HAUT_DE_GAMME', libelle: 'Prestations haut de gamme', pourcent: 12,
          source: 'Pratique professionnelle — à remplacer par des comparables directs',
          fiabilite: 'usage',
          note: "Réserve de méthode : le haut de gamme n'est pas un pourcentage ajouté au prix du secteur, c'est un segment distinct, avec d'autres acquéreurs et une autre dynamique (+1,7 % l'année où le marché courant reculait de 2,5 %). Sur ce niveau, estimer par comparaison directe avec des biens de standing équivalent plutôt que par ce coefficient.",
        },
      ],
    },

    etage: {
      libelle: 'Étage',
      neutre: 'Deuxième ou troisième étage',
      seulementPour: 'Appartement',
      explication:
        "Mesuré, mais par un seul opérateur privé et en 2017. L'effet n'est PAS linéaire : " +
        "à Paris, la marche du rez-de-chaussée au premier pèse autant que les cinq étages " +
        "suivants réunis. Et la surcote du dernier étage n'existe QUE s'il y a un ascenseur.",
      modalites: [
        {
          cle: 'RDC', libelle: 'Rez-de-chaussée', pourcent: -10,
          source: MA2017, fiabilite: 'mesuree',
          note: "Fourchette large selon les sources : -11,3 % sur transactions (MeilleursAgents 2017), -6,1 % sur annonces (Liberkeys 2020). Un jardin ou une terrasse privative peut annuler cette décote. Attention : ce chiffre contient déjà, en moyenne, le vis-à-vis et le manque de lumière — ne pas cumuler avec l'ensoleillement.",
        },
        { cle: 'PREMIER', libelle: 'Premier étage', pourcent: -3, source: MA2017, fiabilite: 'mesuree' },
        { cle: 'COURANT', libelle: 'Deuxième ou troisième', pourcent: 0, source: MA2017, fiabilite: 'mesuree' },
        { cle: 'HAUT', libelle: 'Quatrième ou cinquième', pourcent: 2, source: MA2017, fiabilite: 'mesuree', note: "Vaut avec ascenseur. Sans ascenseur, le prix plafonne au 4e à Paris puis retombe." },
        { cle: 'DERNIER_ASC', libelle: 'Dernier étage avec ascenseur', pourcent: 5, source: MA2017, fiabilite: 'mesuree', note: "Une part inconnue de cette surcote capte la vue et la lumière, pas l'altitude. Un dernier étage sous toiture mal isolée (surchauffe estivale, étiquette dégradée) peut inverser le signe." },
        { cle: 'DERNIER_SANS', libelle: 'Dernier étage sans ascenseur', pourcent: -1, source: MA2017, fiabilite: 'mesuree', note: "Contre-intuitif mais mesuré : sans ascenseur, le dernier étage est une légère décote, pas une surcote." },
      ],
    },

    ascenseur: {
      libelle: 'Ascenseur',
      neutre: 'Ascenseur présent, ou bien de plain-pied',
      seulementPour: 'Appartement',
      explication:
        "Il n'existe pas d'effet « ascenseur » indépendant de l'étage : au rez-de-chaussée " +
        "il est rigoureusement nul. Ce qui se paie, c'est de ne pas monter à pied. Le modèle " +
        "officiel des indices Notaires-INSEE ne retient d'ailleurs l'ascenseur qu'à partir " +
        "du quatrième étage.",
      modalites: [
        { cle: 'AVEC', libelle: 'Ascenseur, ou rez-de-chaussée', pourcent: 0, source: MA2017, fiabilite: 'mesuree' },
        { cle: 'SANS_BAS', libelle: 'Sans ascenseur, 1er ou 2e étage', pourcent: -3, source: MA2017, fiabilite: 'mesuree' },
        { cle: 'SANS_MOYEN', libelle: 'Sans ascenseur, 3e ou 4e étage', pourcent: -4, source: MA2017, fiabilite: 'mesuree' },
        { cle: 'SANS_HAUT', libelle: 'Sans ascenseur, 5e étage ou plus', pourcent: -8, source: MA2017, fiabilite: 'mesuree', note: "Décrochage net à partir du 5e (-7,8 %) et du 6e (-9,0 %). Calculé à partir des €/m² publiés ; effectifs probablement faibles à ces étages." },
      ],
    },

    bruit: {
      libelle: 'Environnement sonore',
      neutre: 'Calme, aucune nuisance identifiée',
      explication:
        "Il n'existe aucun coefficient français officiel de décote par décibel. Ces valeurs " +
        "sont des bornes de fourchettes d'études, transposées. Le vrai point d'appui devant " +
        "un vendeur n'est pas le pourcentage, c'est la pièce : classement sonore préfectoral, " +
        "plan d'exposition au bruit, cartes de bruit stratégiques — vérifiables à l'adresse.",
      modalites: [
        { cle: 'CALME', libelle: 'Calme', pourcent: 0, source: "Point neutre de l'échelle", fiabilite: 'usage' },
        {
          cle: 'ROUTIER', libelle: 'Trafic routier soutenu', pourcent: -4,
          source: ADEME + ' ; borne haute Beimer & Maennig (Berlin, 2017)',
          fiabilite: 'estimee',
          note: "Écart énorme entre les sources : la fonction française donne -0,9 % seulement entre 53 et 68 dB (l'ADEME la qualifie elle-même de conservatrice), le coefficient berlinois qu'elle cite comme majorant donne -8,8 % sur le même écart. -4 % est le milieu de cet intervalle, pas une mesure.",
        },
        { cle: 'FERROVIAIRE', libelle: 'Voie ferrée à proximité', pourcent: -6, source: ADEME + ' (étude Sedoarisoa 2017, Seine-Saint-Denis)', fiabilite: 'estimee', note: "L'ADEME retient -5 à -10 % au-delà de 60 dB, sans publier la pente. Ne distingue ni le fret nocturne, pourtant la nuisance la plus contestée, ni la LGV." },
        { cle: 'AERIEN', libelle: "Sous trajectoire aérienne / plan d'exposition au bruit", pourcent: -10, source: ADEME + ' (étude Sedoarisoa 2017, Roissy-CDG)', fiabilite: 'estimee', note: "Fourchette très large : -3 à -22 % selon le niveau. Le seul cas où la décote atteint des ordres de grandeur que le marché reconnaît spontanément. Vérifier le PEB : il est opposable, et un logement insonorisé capitalise en sens inverse." },
        {
          cle: 'NOCTURNE', libelle: 'Nuisance nocturne avérée', pourcent: -6,
          source: "ADEME 2021 — hypothèse que le rapport qualifie lui-même d'arbitraire",
          fiabilite: 'usage',
          note: "À manier avec prudence dans les deux sens : un bar à 50 m est mesuré comme une AMÉNITÉ (+2,3 % en grande ville), et l'effet ne s'inverse qu'à moins de 25 m ou dans une rue à forte concentration festive. Ne pas décoter un bien au seul motif qu'un commerce est en pied d'immeuble.",
        },
      ],
    },

    ensoleillement: {
      libelle: 'Luminosité et vue',
      neutre: 'Exposition et luminosité ordinaires pour le secteur',
      explication:
        "Le critère le moins étayé de tous. La seule étude française qui ait testé la vue " +
        "dégagée n'y a trouvé AUCUN prix significatif ; l'exposition sud n'est mesurée que " +
        "sur des loyers de 1996, et dans deux régressions sur huit. À utiliser comme un " +
        "ajustement qualitatif borné, jamais comme un coefficient de barème.",
      modalites: [
        { cle: 'EXCEPTIONNEL', libelle: 'Vue remarquable, traversant, sans vis-à-vis', pourcent: 5, source: 'Pratique professionnelle', fiabilite: 'usage', note: "Repère mesuré, et instructif : une vue sur la Tour Eiffel ne vaut que +2 % en moyenne à Paris, contre les +15 à +30 % annoncés par les agences de prestige. Une vue mer excellente vaut +21 % dans le Finistère (étude académique 2008) — mais rien ne permet de transposer ce chiffre à la Méditerranée." },
        { cle: 'LUMINEUX', libelle: 'Lumineux, exposition favorable', pourcent: 2, source: 'Pratique professionnelle', fiabilite: 'usage' },
        { cle: 'ORDINAIRE', libelle: 'Ordinaire', pourcent: 0, source: "Point neutre de l'échelle", fiabilite: 'usage' },
        { cle: 'PEU_LUMINEUX', libelle: 'Peu lumineux, vis-à-vis', pourcent: -4, source: 'Pratique professionnelle', fiabilite: 'usage' },
        { cle: 'SOMBRE', libelle: 'Sombre, vis-à-vis immédiat', pourcent: -7, source: 'Pratique professionnelle', fiabilite: 'usage' },
      ],
    },
  },
};
