/**
 * Garde-fou pour toute requête sortante vers une URL fournie par l'utilisateur.
 *
 * POURQUOI. C'est la première route du site à récupérer un domaine arbitraire ;
 * partout ailleurs les hôtes sont en dur. Sans contrôle, elle devient un proxy
 * ouvert vers l'INTÉRIEUR de l'infrastructure. Sur Cloud Run la cible évidente
 * est 169.254.169.254, le serveur de métadonnées, qui délivre des jetons
 * d'identité de service — et le service tourne sans connecteur VPC, donc cette
 * adresse est joignable depuis l'instance.
 *
 * LA RÉÉCRITURE DNS EST FERMÉE, ELLE AUSSI. Le schéma naïf « je résous, je
 * valide, puis je fetch » laisse une fenêtre : le client HTTP refait sa propre
 * résolution, qu'un domaine hostile peut détourner avec un TTL nul. On ne
 * colmate pas cette fenêtre, on la supprime — l'adresse validée est ÉPINGLÉE
 * sur la socket via l'option `lookup` de node:https. Vérifié : en épinglant
 * l'adresse d'un autre domaine, la connexion part bien vers elle et la
 * poignée de main TLS échoue, preuve que l'option est honorée.
 */

import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { request as requeteHttp } from 'http';
import { request as requeteHttps } from 'https';

/** Plages IPv4 interdites, en notation CIDR. */
const IPV4_INTERDIT: [string, number][] = [
  ['0.0.0.0', 8],        // « ce réseau »
  ['10.0.0.0', 8],       // privé
  ['100.64.0.0', 10],    // CGNAT
  ['127.0.0.0', 8],      // boucle locale
  ['169.254.0.0', 16],   // lien-local — contient le serveur de métadonnées
  ['172.16.0.0', 12],    // privé
  ['192.0.0.0', 24],     // affectations IETF
  ['192.0.2.0', 24],     // documentation
  ['192.168.0.0', 16],   // privé
  ['198.18.0.0', 15],    // bancs d'essai
  ['198.51.100.0', 24],  // documentation
  ['203.0.113.0', 24],   // documentation
  ['224.0.0.0', 4],      // multidiffusion
  ['240.0.0.0', 4],      // réservé
];

const enEntier = (ip: string) =>
  ip.split('.').reduce((acc, o) => (acc << 8 >>> 0) + Number(o), 0) >>> 0;

function ipv4Interdite(ip: string): boolean {
  const v = enEntier(ip);
  return IPV4_INTERDIT.some(([base, bits]) => {
    const masque = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (v & masque) === (enEntier(base) & masque);
  });
}

/**
 * Développe une adresse IPv6 en huit groupes de 16 bits.
 *
 * INDISPENSABLE, et pas seulement par élégance : `new URL()` CANONISE
 * l'adresse. « [::ffff:169.254.169.254] » devient « [::ffff:a9fe:a9fe] », que
 * la notation pointée ne reconnaît plus — et le serveur de métadonnées
 * redevenait joignable par ce détour. Mesuré, puis fermé.
 */
function groupesIpv6(brut: string): number[] | null {
  let ip = brut.toLowerCase().split('%')[0];

  // Une queue en notation pointée (::ffff:127.0.0.1) devient deux groupes.
  const pointee = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (pointee) {
    const o = pointee[1].split('.').map(Number);
    if (o.some(n => n > 255)) return null;
    ip = ip.slice(0, -pointee[1].length)
       + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
  }

  const cotes = ip.split('::');
  if (cotes.length > 2) return null;
  const lire = (part: string) => (part ? part.split(':').map(x => parseInt(x, 16)) : []);
  const gauche = lire(cotes[0]);
  const droite = cotes.length === 2 ? lire(cotes[1]) : [];
  const manquants = 8 - gauche.length - droite.length;
  if (cotes.length === 1 && gauche.length !== 8) return null;
  if (manquants < 0) return null;

  const tous = [...gauche, ...Array(cotes.length === 2 ? manquants : 0).fill(0), ...droite];
  return tous.length === 8 && tous.every(n => Number.isInteger(n) && n >= 0 && n <= 0xffff)
    ? tous : null;
}

function ipv6Interdite(brut: string): boolean {
  const g = groupesIpv6(brut);
  if (!g) return true; // illisible : on refuse

  const douzePremiersNuls = g.slice(0, 5).every(x => x === 0);

  // ::1 (boucle) et :: (non spécifiée)
  if (douzePremiersNuls && g[5] === 0 && g[6] === 0 && (g[7] === 0 || g[7] === 1)) return true;

  // IPv4 mappée ::ffff:a.b.c.d — et sa forme compressée ::ffff:7f00:1
  if (douzePremiersNuls && g[5] === 0xffff) {
    const v4 = [g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff].join('.');
    return ipv4Interdite(v4);
  }
  // ::a.b.c.d, forme compatible IPv4, dépréciée mais toujours acceptée
  if (douzePremiersNuls && g[5] === 0) {
    const v4 = [g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff].join('.');
    return ipv4Interdite(v4);
  }

  if ((g[0] & 0xfe00) === 0xfc00) return true;          // fc00::/7 uniques locales
  if ((g[0] & 0xffc0) === 0xfe80) return true;          // fe80::/10 lien-local
  if ((g[0] & 0xff00) === 0xff00) return true;          // ff00::/8 multidiffusion
  if (g[0] === 0x64 && g[1] === 0xff9b) return true;    // NAT64
  if (g[0] === 0x100 && g.slice(1, 4).every(x => x === 0)) return true; // trou noir

  return false;
}

export function adresseInterdite(ip: string): boolean {
  const famille = isIP(ip);
  if (famille === 4) return ipv4Interdite(ip);
  if (famille === 6) return ipv6Interdite(ip);
  return true; // ni IPv4 ni IPv6 : on refuse par défaut
}

export type Verdict = { ok: true; url: URL; ip: string } | { ok: false; raison: string };

/**
 * L'URL est-elle récupérable sans danger ? Vérifie le schéma, puis résout le
 * nom et refuse toute adresse interne.
 */
export async function urlAutorisee(brut: string): Promise<Verdict> {
  let url: URL;
  try {
    url = new URL(brut.trim());
  } catch {
    return { ok: false, raison: "Ce lien n'est pas une adresse valide." };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, raison: 'Seuls les liens http et https sont acceptés.' };
  }

  const hote = url.hostname.replace(/^\[|\]$/g, '');

  // Une IP écrite en clair se vérifie directement, sans résolution.
  if (isIP(hote)) {
    return adresseInterdite(hote)
      ? { ok: false, raison: 'Cette adresse est interne au réseau.' }
      : { ok: true, url, ip: hote };
  }

  let adresses: { address: string }[];
  try {
    adresses = await lookup(hote, { all: true });
  } catch {
    return { ok: false, raison: "Ce domaine n'existe pas ou ne répond pas." };
  }

  if (!adresses.length) return { ok: false, raison: 'Domaine sans adresse.' };
  // UNE SEULE adresse interne suffit à refuser : un domaine qui en expose une
  // n'a rien à faire dans une requête sortante.
  if (adresses.some(a => adresseInterdite(a.address))) {
    return { ok: false, raison: 'Ce domaine pointe vers une adresse interne.' };
  }

  // On rend l'adresse retenue : c'est ELLE qu'on épinglera sur la socket.
  return { ok: true, url, ip: adresses[0].address };
}

const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mio : l'instance n'a qu'1 Gio
const DELAI_MS = 8000;              // au-delà, l'utilisateur a déjà collé son texte

/**
 * Une requête vers une adresse ÉPINGLÉE.
 *
 * C'est le cœur de la protection contre la réécriture DNS. Le schéma naïf
 * « je résous, je valide, puis je fetch(url) » laisse une fenêtre : le client
 * HTTP refait sa propre résolution, et un domaine hostile peut alors répondre
 * 127.0.0.1 avec un TTL nul. On ne colmate pas cette fenêtre en revalidant
 * davantage — on la supprime, en imposant l'adresse déjà validée par l'option
 * `lookup`. fetch() ne le permet pas ; node:http et node:https, si.
 *
 * Le nom d'hôte reste celui de l'URL : l'en-tête Host et le certificat TLS
 * sont donc vérifiés normalement.
 */
function requeteEpinglee(url: URL, ip: string, delaiMs: number): Promise<{
  status: number; emplacement: string | null; type: string; corps: string;
}> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? requeteHttps : requeteHttp;
    let fini = false;
    const terminer = (v: any) => { if (!fini) { fini = true; resolve(v); } };

    const req = client({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      timeout: delaiMs,
      headers: {
        // On s'annonce pour ce qu'on est : ni usurpation de navigateur, ni
        // contournement d'une protection anti-robot.
        'User-Agent': 'LemeillePatrimoine/1.0 (+https://lemeillepatrimoine.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'identity',
      },
      // Depuis Node 18.18, autoSelectFamily impose le contrat `all` : un
      // rappel qui rend une adresse nue casse la connexion.
      lookup: (_hote: string, options: any, rappel: any) => {
        const famille = isIP(ip) || 4;
        if (options && options.all) rappel(null, [{ address: ip, family: famille }]);
        else rappel(null, ip, famille);
      },
    } as any, (res: any) => {
      const morceaux: Buffer[] = [];
      let taille = 0;
      res.on('data', (c: Buffer) => {
        taille += c.length;
        // Lecture bornée : une page de 500 Mo ne doit pas emporter l'instance.
        if (taille > TAILLE_MAX) { res.destroy(); return; }
        morceaux.push(c);
      });
      const rendre = () => terminer({
        status: res.statusCode ?? 0,
        emplacement: res.headers?.location ?? null,
        type: String(res.headers?.['content-type'] ?? ''),
        corps: Buffer.concat(morceaux).toString('utf-8'),
      });
      res.on('end', rendre);
      res.on('close', rendre);
    });

    req.on('timeout', () => req.destroy(new Error('TIMEOUT')));
    req.on('error', (e: any) => { if (!fini) { fini = true; reject(e); } });
    req.end();
  });
}

/**
 * Récupère une page en refusant les redirections vers l'intérieur.
 *
 * Les redirections sont suivies À LA MAIN : le comportement par défaut de Node
 * en suit jusqu'à vingt sans consulter personne, et une URL publique pourrait
 * ainsi renvoyer vers 169.254.169.254. Chaque saut est donc revalidé, puis
 * épinglé.
 */
export async function recupererPage(
  depart: string,
  sautsMax = 4,
): Promise<{ ok: true; html: string; url: string } | { ok: false; raison: string }> {
  let courante = depart;
  const echeance = Date.now() + DELAI_MS;

  for (let saut = 0; saut <= sautsMax; saut++) {
    const verdict = await urlAutorisee(courante);
    if (!verdict.ok) return { ok: false, raison: verdict.raison };

    const restant = echeance - Date.now();
    if (restant <= 0) return { ok: false, raison: "Le site n'a pas répondu à temps." };

    let r: { status: number; emplacement: string | null; type: string; corps: string };
    try {
      r = await requeteEpinglee(verdict.url, verdict.ip, restant);
    } catch (e: any) {
      return {
        ok: false,
        raison: /TIMEOUT/.test(String(e?.message))
          ? "Le site n'a pas répondu à temps."
          : 'Impossible de joindre ce site.',
      };
    }

    if (r.status >= 300 && r.status < 400) {
      if (!r.emplacement) return { ok: false, raison: 'Redirection sans destination.' };
      courante = new URL(r.emplacement, verdict.url).toString();
      continue;
    }

    if (r.status === 401 || r.status === 403 || r.status === 429) {
      return { ok: false, raison: 'BLOQUE' };
    }
    if (r.status < 200 || r.status >= 300) {
      return { ok: false, raison: `Le site a répondu ${r.status}.` };
    }
    if (!/text\/html|application\/xhtml/i.test(r.type)) {
      return { ok: false, raison: 'Ce lien ne pointe pas vers une page web.' };
    }

    return { ok: true, html: r.corps, url: verdict.url.toString() };
  }

  return { ok: false, raison: 'Trop de redirections.' };
}
