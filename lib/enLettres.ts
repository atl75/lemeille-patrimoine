// Conversion d'un entier en toutes lettres (français), pour les montants.
export function enLettres(value: number): string {
  const n = Math.round(Math.abs(value || 0));
  if (n === 0) return 'zéro';

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  const below100 = (x: number): string => {
    if (x < 20) return units[x];
    const t = Math.floor(x / 10), u = x % 10;
    if (t === 7 || t === 9) {
      const base = t === 7 ? 'soixante' : 'quatre-vingt';
      return base + (u === 1 && t === 7 ? ' et onze' : '-' + units[10 + u]);
    }
    let w = tens[t];
    if (u === 0) return t === 8 ? w + 's' : w;
    if (u === 1 && t !== 8) return w + ' et un';
    return w + '-' + units[u];
  };

  const below1000 = (x: number): string => {
    if (x < 100) return below100(x);
    const c = Math.floor(x / 100), r = x % 100;
    const w = c === 1 ? 'cent' : units[c] + ' cent';
    if (r === 0) return c > 1 ? w + 's' : w;
    return w + ' ' + below100(r);
  };

  const parts: string[] = [];
  let m = n;
  const millions = Math.floor(m / 1000000); m %= 1000000;
  const thousands = Math.floor(m / 1000); m %= 1000;
  const rest = m;
  if (millions) parts.push(millions === 1 ? 'un million' : below1000(millions) + ' millions');
  if (thousands) parts.push(thousands === 1 ? 'mille' : below1000(thousands) + ' mille');
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

export function eurosEnLettres(value: number): string {
  const s = enLettres(value);
  return s.charAt(0).toUpperCase() + s.slice(1) + ' euros';
}
