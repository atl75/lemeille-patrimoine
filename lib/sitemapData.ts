import { SECTORS } from './sectors.ts';

// Même référentiel que les pages ; nouveaux secteurs exclus par défaut jusqu'au
// choix éditorial. Les sept secteurs actuellement promus restent les mêmes.
export function sitemapSectorSlugs(): string[] {
  return Object.entries(SECTORS).filter(([, sector]) => sector.sitemap === true).map(([slug]) => slug);
}

// Les dates absentes ou invalides ne doivent pas casser tout le sitemap ni être
// remplacées par « maintenant ». Conserver aussi les horodatages ISO historiques.
export function articleSitemapDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/.exec(value);
  if (!match) return undefined;
  const day = new Date(`${match[1]}T00:00:00.000Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== match[1]) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}
