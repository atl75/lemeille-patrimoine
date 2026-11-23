import { cache } from 'react';
import { articleReader } from './articlesData';

// Même lecture pour métadonnées et corps d'une requête RSC, pas de cache ISR.
// Les pages restent force-dynamic et le lecteur contourne le cache GCS court.
export const getArticle = cache(articleReader.bySlug);
