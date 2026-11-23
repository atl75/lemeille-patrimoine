import { readJSON } from './utils.ts';

export type PublicArticle = {
  id: string; slug: string; title: string; excerpt: string; content: string;
  publishedAt: string; published?: boolean | null; tags?: string[];
  author?: string | null; coverImage?: string | null;
  seoTitle?: string | null; seoDescription?: string | null;
};
const PUBLIC_FIELDS = new Set([
  'id', 'slug', 'title', 'excerpt', 'content', 'publishedAt', 'published',
  'tags', 'author', 'coverImage', 'seoTitle', 'seoDescription',
]);

// Projection explicite : un futur champ interne n'est jamais publié par défaut.
// Compatibilité historique conservée : seul published:false est un brouillon.
export function toPublicArticle(value: unknown): PublicArticle | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const article = value as Record<string, unknown>;
  if (article.published === false) return null;
  return Object.fromEntries(Object.entries(article).filter(([key]) => PUBLIC_FIELDS.has(key))) as PublicArticle;
}

export function publicArticles(data: unknown): PublicArticle[] {
  if (!Array.isArray(data)) throw new Error('Collection articles invalide');
  return data.map(toPublicArticle).filter((a): a is PublicArticle => a !== null);
}

// Lecteur injectable ; aucune erreur de stockage transformée en « introuvable ».
export function createArticleReader(read: (file: string, options: { fresh: boolean }) => Promise<unknown>) {
  const list = async () => publicArticles(await read('articles.json', { fresh: true }));
  return {
    list,
    bySlug: async (slug: string) => (await list()).find(a => a.slug === slug) ?? null,
  };
}

export const articleReader = createArticleReader(readJSON);
