// Adresse mise en copie (BCC) de tous les emails sortants, pour qu'Arthur
// reçoive une copie de chaque message envoyé au nom de l'agence.
export const MAIL_COPY = process.env.MAIL_BCC || 'arthur.lemeille@lemeillepatrimoine.com';
