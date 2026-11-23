import { createGcsClient } from './gcsClient.ts';
export { analyserContenu } from './gcsClient.ts';

// Une instance unique pour le cache court et le choix du stockage.
// Le client réel reste désactivé par NODE_TEST_CONTEXT / NODE_ENV=test.
// En environnement GCS déclaré, toute panne est propagée : aucun repli disque.
const client = createGcsClient({ env: process.env, fetcher: (...args) => fetch(...args) });
export const disponible = client.disponible;
export const lireJSON = client.lireJSON;
export const ecrireJSON = client.ecrireJSON;
export const modifierAtomiquement = client.modifierAtomiquement;
export const oublier = client.oublier;
