"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useConfirm } from "@/components/ConfirmDialog";
import { useEffect, useState } from "react";

type Program = {
  id: string;
  title: string;
  city: string;
  dispositif: string;
  summary: string;
  externalUrl?: string;
  visible?: boolean;
};

const EMPTY_PROGRAM: Partial<Program> = {
  title: "",
  city: "",
  dispositif: "MALRAUX",
  summary: "",
  externalUrl: "",
  visible: true
};

export default function Page() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Program> | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs');
      const data = await res.json();
      setPrograms(Array.isArray(data) ? data : []);
    } catch {
      setPrograms([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `/api/programs/${editing.id}` : '/api/programs';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing)
      });
      if (res.ok) {
        await fetchPrograms();
        setEditing(null);
      }
    } catch (err) {
      alert('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Ce programme sera définitivement supprimé.', { title: 'Supprimer ce programme ?' }))) return;
    try {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPrograms();
      }
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const updateField = (field: string, value: any) => {
    setEditing(prev => prev ? { ...prev, [field]: value } : null);
  };

  return (
    <AdminShell title="Programmes">
      <Breadcrumb items={[
        { label: "Accueil", href: "/" },
        { label: "Administration", href: "/admin" },
        { label: "Contenu", href: "/admin/contenu" },
        { label: "Programmes" }
      ]} />

      <div className="mb-6">
        <button
          onClick={() => setEditing(EMPTY_PROGRAM)}
          className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D]"
          data-testid="button-new-program"
        >
          + Nouveau programme
        </button>
      </div>

      {editing && (
        <div className="card p-6 mb-6" data-testid="form-program">
          <h2 className="text-2xl font-semibold mb-4">
            {editing.id ? 'Modifier le programme' : 'Nouveau programme'}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre</label>
              <input
                type="text"
                value={editing.title || ''}
                onChange={e => updateField('title', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <input
                type="text"
                value={editing.city || ''}
                onChange={e => updateField('city', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dispositif</label>
              <select
                value={editing.dispositif || 'MALRAUX'}
                onChange={e => updateField('dispositif', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="select-dispositif"
              >
                <option value="MALRAUX">Malraux</option>
                <option value="MONUMENT_HISTORIQUE">Monument Historique</option>
                <option value="DEFICIT_FONCIER">Déficit Foncier</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL externe (optionnel)</label>
              <input
                type="text"
                value={editing.externalUrl || ''}
                onChange={e => updateField('externalUrl', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                data-testid="input-external-url"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Résumé</label>
            <textarea
              value={editing.summary || ''}
              onChange={e => updateField('summary', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={4}
              data-testid="input-summary"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.visible !== false}
                onChange={e => updateField('visible', e.target.checked)}
                data-testid="checkbox-visible"
              />
              <span>Visible</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D] disabled:opacity-50"
              data-testid="button-save-program"
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

      {!loading && programs.length === 0 && (
        <div className="card p-6 opacity-70">Aucun programme enregistré.</div>
      )}

      {!loading && programs.length > 0 && (
        <div className="grid gap-4">
          {programs.map(program => (
            <div key={program.id} className="card p-6" data-testid={`program-${program.id}`}>
              <div className="flex gap-4 justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{program.title}</h3>
                    <span className="text-xs px-2 py-1 bg-[#B89C6D]/10 text-[#B89C6D] rounded">
                      {program.dispositif}
                    </span>
                    {program.visible === false && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        Masqué
                      </span>
                    )}
                  </div>
                  <div className="text-sm opacity-70 mb-2">
                    {program.city}
                  </div>
                  <p className="text-sm opacity-80 line-clamp-2">
                    {program.summary}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(program)}
                    className="px-3 py-1 border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white"
                    data-testid={`button-edit-${program.id}`}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(program.id)}
                    className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white"
                    data-testid={`button-delete-${program.id}`}
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
