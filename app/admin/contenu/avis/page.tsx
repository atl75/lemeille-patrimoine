"use client";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";
import Breadcrumb from "@/components/Breadcrumb";
import { useConfirm } from "@/components/ConfirmDialog";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  author: string;
  rating: number;
  source: string;
  text: string;
  date: string;
  published?: boolean;
};

const EMPTY_REVIEW: Partial<Review> = {
  author: "",
  rating: 5,
  source: "Google",
  text: "",
  date: new Date().toISOString().split('T')[0],
  published: false
};

export default function Page() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<Review> | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `/api/reviews/${editing.id}` : '/api/reviews';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing)
      });
      if (res.ok) {
        await fetchReviews();
        setEditing(null);
      }
    } catch (err) {
      toast('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Cet avis sera définitivement supprimé.', { title: 'Supprimer cet avis ?' }))) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchReviews();
      }
    } catch (err) {
      toast('Erreur lors de la suppression');
    }
  };

  const updateField = (field: string, value: any) => {
    setEditing(prev => prev ? { ...prev, [field]: value } : null);
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <AdminShell title="Avis clients">
      <Breadcrumb items={[
        { label: "Accueil", href: "/" },
        { label: "Administration", href: "/admin" },
        { label: "Contenu", href: "/admin/contenu" },
        { label: "Avis" }
      ]} />

      <div className="mb-6">
        <button
          onClick={() => setEditing(EMPTY_REVIEW)}
          className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D]"
          data-testid="button-new-review"
        >
          + Nouvel avis
        </button>
      </div>

      {editing && (
        <div className="card p-6 mb-6" data-testid="form-review">
          <h2 className="text-2xl font-semibold mb-4">
            {editing.id ? 'Modifier l\'avis' : 'Nouvel avis'}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Auteur</label>
              <input
                type="text"
                value={editing.author || ''}
                onChange={e => updateField('author', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-author"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <input
                type="text"
                value={editing.source || ''}
                onChange={e => updateField('source', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-source"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Note (1-5)</label>
              <select
                value={editing.rating || 5}
                onChange={e => updateField('rating', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded"
                data-testid="select-rating"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{renderStars(n)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={editing.date || ''}
                onChange={e => updateField('date', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-date"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Texte de l&apos;avis</label>
            <textarea
              value={editing.text || ''}
              onChange={e => updateField('text', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={4}
              data-testid="input-text"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.published === true}
                onChange={e => updateField('published', e.target.checked)}
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
              data-testid="button-save-review"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
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

      {!loading && reviews.length === 0 && (
        <div className="card p-6 opacity-70">Aucun avis enregistré.</div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="grid gap-4">
          {reviews.map(review => (
            <div key={review.id} className="card p-6" data-testid={`review-${review.id}`}>
              <div className="flex gap-4 justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{review.author}</h3>
                    <span className="text-yellow-500 text-lg">{renderStars(review.rating)}</span>
                    {review.published === false && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        Non publié
                      </span>
                    )}
                  </div>
                  <div className="text-sm opacity-70 mb-2">
                    {review.source} • {new Date(review.date).toLocaleDateString('fr-FR')}
                  </div>
                  <p className="text-sm opacity-80 line-clamp-3">
                    {review.text}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(review)}
                    className="px-3 py-1 border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white"
                    data-testid={`button-edit-${review.id}`}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white"
                    data-testid={`button-delete-${review.id}`}
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
