import { emailPlausible, telephonePlausible } from './validationLead.ts';

export function erreursBien({ city, surface }: { city: string; surface: number | '' }): Record<string, string> {
  const erreurs: Record<string, string> = {};
  if (!city.trim()) erreurs.city = 'Indiquez l’adresse du bien.';
  if (surface === '' || !Number.isFinite(surface) || surface <= 0) erreurs.surface = 'Indiquez la surface habitable.';
  return erreurs;
}

export function erreursContact({ phone, email, consent }: { phone: string; email: string; consent: boolean }): Record<string, string> {
  const erreurs: Record<string, string> = {};
  if (!telephonePlausible(phone)) erreurs.phone = 'Indiquez un numéro de téléphone valide pour que je puisse vous rappeler.';
  if (email.trim() && !emailPlausible(email)) erreurs.email = 'Vérifiez votre adresse email.';
  if (!consent) erreurs.consent = 'Merci de confirmer que vous acceptez d’être recontacté au sujet de votre demande.';
  return erreurs;
}
