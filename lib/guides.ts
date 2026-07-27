export type GuideSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export type Guide = {
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
  keyFigures: { label: string; value: string }[];
  sections: GuideSection[];
};

export const GUIDES: Guide[] = [
  {
    slug: 'malraux',
    title: 'Loi Malraux',
    subtitle: 'Réduire son impôt en restaurant l’immobilier ancien de caractère',
    intro:
      'Le dispositif Malraux permet de transformer une partie de son impôt en patrimoine, en restaurant un immeuble ancien situé dans un secteur protégé. Ce guide en présente le principe, les conditions et l’avantage fiscal.',
    keyFigures: [
      { label: 'Réduction d’impôt', value: '22 % à 30 %' },
      { label: 'Plafond de travaux', value: '400 000 € / 4 ans' },
      { label: 'Engagement de location', value: '9 ans' },
    ],
    sections: [
      {
        heading: 'Le principe',
        paragraphs: [
          'Instaurée en 1962, la loi Malraux encourage la restauration complète d’immeubles anciens situés dans les sites patrimoniaux remarquables (SPR). En contrepartie de travaux de restauration réalisés sous le contrôle des Architectes des Bâtiments de France, l’investisseur bénéficie d’une réduction d’impôt calculée sur le montant des travaux.',
          'C’est un dispositif de conviction : on investit dans un bien d’exception, au cœur des villes historiques, tout en réduisant sensiblement son imposition.',
        ],
      },
      {
        heading: 'Conditions d’éligibilité',
        bullets: [
          'Immeuble situé dans un site patrimonial remarquable (SPR) doté d’un plan (PSMV ou PVAP).',
          'Restauration complète de l’immeuble, sous le contrôle des Architectes des Bâtiments de France.',
          'Engagement de louer le bien nu, à usage de résidence principale, pendant au moins 9 ans.',
          'Travaux déclarés d’utilité publique le cas échéant.',
        ],
      },
      {
        heading: 'L’avantage fiscal',
        paragraphs: [
          'La réduction d’impôt s’élève à 30 % du montant des travaux dans un SPR couvert par un plan de sauvegarde et de mise en valeur (PSMV) approuvé, et à 22 % dans les autres cas. Elle porte sur les dépenses de travaux retenues dans la limite de 400 000 € sur une période de 4 ans.',
          'Exemple : pour 200 000 € de travaux éligibles à 30 %, la réduction d’impôt atteint 60 000 €, imputable sur l’impôt dû au fur et à mesure des travaux.',
        ],
      },
      {
        heading: 'Points de vigilance',
        bullets: [
          'Atout majeur : la réduction Malraux n’entre pas dans le plafonnement global des niches fiscales (10 000 €/an).',
          'La qualité de l’emplacement et le sérieux de l’opérateur sont déterminants pour la valeur du bien.',
          'Le respect de l’engagement de location conditionne le maintien de l’avantage fiscal.',
        ],
      },
    ],
  },
  {
    slug: 'monument-historique',
    title: 'Monument Historique',
    subtitle: 'La déduction fiscale sans plafonnement, pour les patrimoines d’exception',
    intro:
      'Le régime Monument Historique est l’un des plus puissants leviers de défiscalisation pour les contribuables fortement imposés. Ce guide en détaille le mécanisme et les engagements.',
    keyFigures: [
      { label: 'Déduction des travaux', value: '100 %' },
      { label: 'Plafonnement', value: 'aucun' },
      { label: 'Engagement de conservation', value: '15 ans' },
    ],
    sections: [
      {
        heading: 'Le principe',
        paragraphs: [
          'Le régime Monument Historique permet de déduire de son revenu global la totalité des charges et des travaux de restauration d’un bien classé ou inscrit, sans plafonnement et sans limite de montant.',
          'L’économie d’impôt dépend directement de la tranche marginale d’imposition : plus celle-ci est élevée, plus l’avantage est important. C’est le dispositif de référence pour les hauts revenus attachés au patrimoine.',
        ],
      },
      {
        heading: 'Conditions d’éligibilité',
        bullets: [
          'Bien classé ou inscrit au titre des Monuments Historiques, ou bénéficiant du label de la Fondation du patrimoine.',
          'Engagement de conservation du bien pendant au moins 15 ans.',
          'Les modalités de déduction varient selon que le bien est occupé, loué, ou ouvert à la visite.',
        ],
      },
      {
        heading: 'L’avantage fiscal',
        paragraphs: [
          'Les travaux et charges étant déductibles du revenu global sans plafond, l’économie d’impôt correspond au montant des travaux multiplié par la tranche marginale d’imposition.',
          'Exemple : pour 300 000 € de travaux et une tranche marginale de 45 %, l’économie d’impôt atteint 135 000 €. Cet avantage n’entre pas dans le plafonnement des niches fiscales.',
        ],
      },
      {
        heading: 'Points de vigilance',
        bullets: [
          'Les contraintes patrimoniales et d’entretien sont fortes : le bien doit être préservé dans les règles de l’art.',
          'L’intérêt du dispositif est maximal pour les tranches marginales de 41 % et 45 %.',
          'Un accompagnement spécialisé est indispensable pour sécuriser le montage.',
        ],
      },
    ],
  },
  {
    slug: 'deficit-foncier',
    title: 'Déficit Foncier',
    subtitle: 'Gommer ses revenus fonciers et réduire son impôt',
    intro:
      'Le déficit foncier est un mécanisme simple et efficace pour les propriétaires bailleurs : il permet d’imputer les travaux sur ses revenus et de diminuer son imposition. Ce guide en explique le fonctionnement.',
    keyFigures: [
      { label: 'Imputation sur revenu global', value: '10 700 € / an' },
      { label: 'Report', value: '10 ans' },
      { label: 'Économie', value: 'TMI + 17,2 %' },
    ],
    sections: [
      {
        heading: 'Le principe',
        paragraphs: [
          'Lorsqu’un bien loué nu génère plus de charges déductibles que de loyers, il crée un déficit foncier. Ce déficit s’impute sur le revenu global, dans la limite de 10 700 € par an ; l’excédent est reporté sur les revenus fonciers des 10 années suivantes.',
          'C’est un outil particulièrement adapté aux contribuables disposant déjà de revenus fonciers, qu’il permet d’effacer tout en réduisant l’impôt sur le revenu.',
        ],
      },
      {
        heading: 'Conditions d’éligibilité',
        bullets: [
          'Location nue, au régime réel d’imposition des revenus fonciers.',
          'Travaux d’entretien, de réparation ou d’amélioration (hors construction et agrandissement).',
          'Engagement de location du bien pendant 3 ans après la dernière imputation.',
        ],
      },
      {
        heading: 'L’avantage fiscal',
        paragraphs: [
          'La part du déficit imputée sur le revenu global génère une économie d’impôt au taux de votre tranche marginale ; la part imputée sur les revenus fonciers économise en outre les prélèvements sociaux de 17,2 %.',
          'Le plafond d’imputation sur le revenu global est porté à 21 400 € pour les travaux de rénovation énergétique, sous conditions et pour une période limitée.',
        ],
      },
      {
        heading: 'Points de vigilance',
        bullets: [
          'Seuls certains travaux sont déductibles : l’analyse préalable est essentielle.',
          'Le respect de l’engagement de location conditionne le maintien de l’avantage.',
          'Le déficit foncier se combine efficacement avec l’achat d’un bien à rénover bien situé.',
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
