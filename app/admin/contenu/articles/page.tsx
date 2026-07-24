"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import ImageUploader from "@/components/ImageUploader";
import { useConfirm } from "@/components/ConfirmDialog";
import { useEffect, useState } from "react";

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  tags: string[];
  author?: string;
  publishedAt: string;
  published?: boolean;
  seoTitle?: string;
  seoDescription?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const EMPTY_ARTICLE: Partial<Article> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  coverImage: "",
  tags: [],
  author: "Arthur Lemeille",
  publishedAt: new Date().toISOString().split("T")[0],
  published: true,
  seoTitle: "",
  seoDescription: ""
};

export default function Page() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const { confirm, dialog } = useConfirm();

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles");
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch {
      setArticles([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? "PUT" : "POST";
      const url = editing.id ? `/api/articles/${editing.id}` : "/api/articles";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing)
      });
      if (res.ok) {
        await fetchArticles();
        setEditing(null);
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la sauvegarde");
      }
    } catch {
      alert("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Cet article sera définitivement supprimé.", { title: "Supprimer cet article ?" }))) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (res.ok) await fetchArticles();
    } catch {
      alert("Erreur lors de la suppression");
    }
  };

  const updateField = (field: string, value: any) => {
    setEditing(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const startNew = () => {
    setSlugTouched(false);
    setEditing(EMPTY_ARTICLE);
  };

  const startEdit = (article: Article) => {
    setSlugTouched(true);
    setEditing(article);
  };

  return (
    <AdminShell title="Actualités">
      <Breadcrumb items={[
        { label: "Accueil", href: "/" },
        { label: "Administration", href: "/admin" },
        { label: "Contenu", href: "/admin/contenu" },
        { label: "Articles" }
      ]} />

      <div className="mb-6">
        <button
          onClick={startNew}
          className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D]"
          data-testid="button-new-article"
        >
          + Nouvel article
        </button>
      </div>

      {editing && (
        <div className="card p-6 mb-6" data-testid="form-article">
          <h2 className="text-2xl font-semibold mb-4">
            {editing.id ? "Modifier l'article" : "Nouvel article"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre</label>
              <input
                type="text"
                value={editing.title || ""}
                onChange={e => {
                  const title = e.target.value;
                  updateField("title", title);
                  if (!slugTouched) updateField("slug", slugify(title));
                }}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Slug (URL)</label>
              <input
                type="text"
                value={editing.slug || ""}
                onChange={e => {
                  setSlugTouched(true);
                  updateField("slug", slugify(e.target.value));
                }}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-slug"
              />
              <p className="text-xs opacity-60 mt-1">/actualites/{editing.slug || "..."}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Auteur</label>
              <input
                type="text"
                value={editing.author || ""}
                onChange={e => updateField("author", e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-author"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date de publication</label>
              <input
                type="date"
                value={editing.publishedAt || ""}
                onChange={e => updateField("publishedAt", e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-published-at"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Tags (séparés par une virgule)</label>
              <input
                type="text"
                value={(editing.tags || []).join(", ")}
                onChange={e => updateField("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border rounded"
                placeholder="Malraux, Défiscalisation, Rouen"
                data-testid="input-tags"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Image de couverture</label>
            <ImageUploader
              images={editing.coverImage ? [editing.coverImage] : []}
              onChange={imgs => updateField("coverImage", imgs[0] || "")}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Extrait (affiché dans la liste)</label>
            <textarea
              value={editing.excerpt || ""}
              onChange={e => updateField("excerpt", e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              data-testid="input-excerpt"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Contenu (un paragraphe par ligne)</label>
            <textarea
              value={editing.content || ""}
              onChange={e => updateField("content", e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              rows={14}
              data-testid="input-content"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre SEO (optionnel)</label>
              <input
                type="text"
                value={editing.seoTitle || ""}
                onChange={e => updateField("seoTitle", e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-seo-title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Meta description (optionnel)</label>
              <input
                type="text"
                value={editing.seoDescription || ""}
                onChange={e => updateField("seoDescription", e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-seo-description"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.published !== false}
                onChange={e => updateField("published", e.target.checked)}
                data-testid="checkbox-published"
              />
              <span>Publié</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D] disabled:opacity-50"
              data-testid="button-save-article"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              data-testid="button-cancel"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading && <div className="card p-6">Chargement...</div>}

      {!loading && articles.length === 0 && (
        <div className="card p-6 opacity-70">Aucun article publié pour le moment.</div>
      )}

      {!loading && articles.length > 0 && (
        <div className="grid gap-4">
          {articles.map(article => (
            <div key={article.id} className="card p-6" data-testid={`article-${article.id}`}>
              <div className="flex gap-4 justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{article.title}</h3>
                    {article.published === false && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        Brouillon
                      </span>
                    )}
                  </div>
                  <div className="text-sm opacity-70 mb-2">
                    /actualites/{article.slug} · {new Date(article.publishedAt).toLocaleDateString("fr-FR")}
                  </div>
                  <p className="text-sm opacity-80 line-clamp-2">{article.excerpt}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(article)}
                    className="px-3 py-1 border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white"
                    data-testid={`button-edit-${article.id}`}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white"
                    data-testid={`button-delete-${article.id}`}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </AdminShell>
  );
}
