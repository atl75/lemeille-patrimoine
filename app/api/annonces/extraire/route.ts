import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminGuard';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { recupererPage } from '@/lib/urlSortante';
import {
  extraireDepuisHtml, extraireDepuisTexte, fusionner, sourceDepuisUrl,
} from '@/lib/annonceConcurrente';

/**
 * Lit une annonce concurrente, pour nourrir l'argumentaire de prix.
 *
 * Deux entrées, et l'ordre n'est pas anodin :
 *  - `texte` : l'annonce copiée depuis le navigateur. C'est le chemin
 *    PRINCIPAL. Il réussit partout, il résiste aux refontes de sites, et le
 *    contenu vient de l'utilisateur, qui y a légitimement accédé.
 *  - `url` : un accélérateur, quand le site se laisse lire. Mesuré le
 *    2026-09-08 : SeLoger rend une page vide depuis un centre de données,
 *    LeBonCoin et PAP répondent 403 même depuis une IP résidentielle, et
 *    Bien'ici sert une coquille JavaScript sans prix ni surface. Les sites
 *    d'agences, eux, passent très bien.
 *
 * On ne cherche jamais à contourner une protection anti-robot : au-delà des
 * conditions d'utilisation, contourner une mesure technique relève de
 * l'article 323-1 du code pénal. Quand un site refuse, on le dit et on
 * propose le collage de texte.
 */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = rateLimit('annonce-extraire:' + ip, 30, 10 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de lectures d’annonces, merci de patienter quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    );
  }

  let corps: any;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }

  const texte = typeof corps?.texte === 'string' ? corps.texte.slice(0, 200_000) : '';
  const url = typeof corps?.url === 'string' ? corps.url.trim().slice(0, 2000) : '';
  // `titre` vient d'une impression PDF : c'est le <title> normalisé du portail.
  const titre = typeof corps?.titre === 'string' ? corps.titre.trim().slice(0, 300) : '';

  // Le texte collé prime : s'il est là, c'est lui la source de vérité.
  if (texte.trim().length > 30 || titre) {
    const parCorps = extraireDepuisTexte(texte);
    // Le titre d'impression fait autorité sur le corps, qui mélange la fiche
    // et les biens similaires.
    const { champs, provenance } = titre
      ? fusionner(extraireDepuisTexte(titre), parCorps)
      : parCorps;
    if (url) {
      champs.lien = url;
      const src = sourceDepuisUrl(url);
      if (src) { champs.source = src; provenance.source = 'domaine du lien'; }
    }
    return NextResponse.json({ champs, provenance, origine: titre ? 'pdf' : 'texte' });
  }

  if (!url) {
    return NextResponse.json(
      { error: 'Collez un lien ou le texte de l’annonce.' },
      { status: 400 },
    );
  }

  const page = await recupererPage(url);

  if (!page.ok) {
    // Un site qui refuse n'est pas une panne de notre outil : on rend quand
    // même ce que le lien seul apprend (la source), et on invite au collage.
    const bloque = page.raison === 'BLOQUE';
    const source = sourceDepuisUrl(url);
    return NextResponse.json({
      champs: { lien: url, ...(source ? { source } : {}) },
      provenance: source ? { source: 'domaine du lien' } : {},
      origine: 'lien-refuse',
      avertissement: bloque
        ? `${source ?? 'Ce site'} ne laisse pas lire ses annonces automatiquement.`
        : page.raison,
    });
  }

  const { champs, provenance } = extraireDepuisHtml(page.html, page.url);
  const vide = champs.prix == null && champs.surface == null;

  return NextResponse.json({
    champs, provenance,
    origine: 'lien',
    ...(vide
      ? { avertissement: 'Cette page ne publie ni prix ni surface exploitables.' }
      : {}),
  });
}
