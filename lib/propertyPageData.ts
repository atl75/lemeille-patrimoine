import { cache } from 'react';
import { propertyReader } from './propertyData';

// Une lecture partagée entre métadonnées et corps de la requête RSC ; pas d'ISR.
export const getProperty = cache(propertyReader.byId);
