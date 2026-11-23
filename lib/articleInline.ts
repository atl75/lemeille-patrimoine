/** Sous-ensemble éditorial : texte, gras et liens explicites. Aucun HTML brut. */
export type ArticleInline =
  | { type: 'text'; value: string }
  | { type: 'strong'; children: ArticleInline[] }
  | { type: 'link'; href: string; children: ArticleInline[] };

export function safeArticleHref(value: string): string | null {
  // Ni caractères de contrôle, ni espaces, ni antislash (normalisé en slash
  // par certains navigateurs), ni syntaxe HTML dans une destination.
  if (!value || /[\u0000-\u0020\u007f\\<>"`]/u.test(value)) return null;
  if (value.startsWith('#')) return value.length > 1 ? value : null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

const ESCAPABLE = '\\[]()*';

function readLink(text: string, start: number) {
  let i = start + 1;
  let label = '';
  // Bornes locales : des milliers de crochets mal formés ne déclenchent pas
  // une recherche jusqu'à la fin du document pour chaque caractère.
  const labelEnd = Math.min(text.length, start + 302);
  for (; i < labelEnd; i++) {
    const char = text[i];
    if (char === '\n' || char === '[') return null;
    if (char === '\\' && ESCAPABLE.includes(text[i + 1] || '\0')) {
      label += char + text[++i];
    } else if (char === ']') break;
    else label += char;
  }
  if (!label.trim() || text[i] !== ']' || text[i + 1] !== '(') return null;
  i += 2;
  const urlEnd = Math.min(text.length, i + 2049);
  let href = '';
  let depth = 0;
  for (; i < urlEnd; i++) {
    const char = text[i];
    if (char === '\n') return null;
    if (char === '\\' && ['(', ')'].includes(text[i + 1])) href += text[++i];
    else if (char === '(') { if (++depth > 8) return null; href += char; }
    else if (char === ')') {
      if (depth === 0) {
        const safe = safeArticleHref(href);
        return safe ? { href: safe, label, end: i + 1 } : null;
      }
      depth--; href += char;
    } else href += char;
  }
  return null;
}

export function parseArticleInline(text: string, allowLinks = true, allowStrong = true): ArticleInline[] {
  const nodes: ArticleInline[] = [];
  let plain = '';
  const flush = () => { if (plain) { nodes.push({ type: 'text', value: plain }); plain = ''; } };
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && ESCAPABLE.includes(text[i + 1] || '\0')) {
      plain += text[i + 1]; i += 2; continue;
    }
    if (allowStrong && text.startsWith('**', i)) {
      const end = text.indexOf('*', i + 2);
      if (end > i + 2 && text[end + 1] === '*') {
        flush(); nodes.push({ type: 'strong', children: parseArticleInline(text.slice(i + 2, end), allowLinks, false) });
        i = end + 2; continue;
      }
    }
    if (allowLinks && text[i] === '[' && text[i - 1] !== '!') {
      const link = readLink(text, i);
      if (link) {
        flush(); nodes.push({ type: 'link', href: link.href, children: parseArticleInline(link.label, false, allowStrong) });
        i = link.end; continue;
      }
    }
    plain += text[i++];
  }
  flush();
  return nodes;
}
