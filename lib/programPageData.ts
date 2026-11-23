import { cache } from 'react';
import { programReader } from './programsData';

// Partage limité à la requête React serveur entre métadonnées et corps.
export const getProgram = cache(programReader.bySlugOrId);
