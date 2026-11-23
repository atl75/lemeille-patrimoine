import { referenceBien } from './propertyContact.ts';

/** Une référence saisie dans l'URL ne prouve ni l'existence ni la disponibilité. */
export function referenceLot(value: unknown): string {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
  return typeof text === 'string' && /^[\p{L}\p{N} ._-]{1,60}$/u.test(text) && text.trim() && !['.', '..'].includes(text.trim()) ? text : '';
}

export function contactProgramme(programme: unknown, lot?: unknown): string {
  const id = referenceBien(programme);
  const numero = id ? referenceLot(lot) : '';
  const params = new URLSearchParams({ topic: 'Défiscalisation' });
  if (id) params.set('programme', id);
  if (numero) params.set('lot', numero);
  return `/contact?${params}#form`;
}

export function lienProgramme(programme: unknown, lot?: unknown): string {
  const id = referenceBien(programme);
  if (!id) return '';
  const numero = referenceLot(lot);
  return `/programmes/${encodeURIComponent(id)}${numero ? `/lots/${encodeURIComponent(numero)}` : ''}`;
}

/** Préfixe visible, joint au même message transmis au CRM et à sa notification. */
export function contexteProgramme(programme: unknown, lot?: unknown): string {
  const id = referenceBien(programme);
  if (!id) return '';
  const numero = referenceLot(lot);
  return `Programme concerné : ${id}${numero ? ` — Lot ${numero}` : ''}\n\n`;
}
