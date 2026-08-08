"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import DocumentUploader from "@/components/DocumentUploader";
import { useConfirm } from "@/components/ConfirmDialog";
import { useEffect, useState } from "react";

type Program = {
  id: string;
  slug?: string;
  title: string;
  city: string;
  region?: string;
  address?: string;
  dispositif: string;
  dispositifs?: string[];
  summary: string;
  accroche?: string;
  livraison?: string;
  intro?: string;
  caracteristiques?: string[];
  finitions?: string[];
  pointsForts?: string[];
  proximite?: { nom: string; distance?: string }[];
  lots?: any[];
  projections?: { title?: string; image?: string }[];
  dpe?: { classEnergy?: string; classGES?: string; consumption?: string; emissions?: string };
  equipements?: { title?: string; subtitle?: string }[];
  documents?: { name?: string; subtitle?: string; url?: string }[];
  calendrier?: { etape?: string; date?: string; description?: string; done?: boolean }[];
  mapQuery?: string;
  virtualTourUrl?: string;
  externalUrl?: string;
  coverImage?: string;
  heroImage?: string;
  visible?: boolean;
};

const DISPOS = [
  { code: "MALRAUX", label: "Malraux" },
  { code: "MONUMENT_HISTORIQUE", label: "Monument Historique" },
  { code: "DEFICIT_FONCIER", label: "Déficit Foncier" },
  { code: "DENORMANDIE", label: "Denormandie" },
];

const STATUTS = [
  { code: "DISPONIBLE", label: "Disponible" },
  { code: "OPTION", label: "Sous option" },
  { code: "RESERVE", label: "Réservé" },
  { code: "VENDU", label: "Vendu" },
];

const EMPTY_PROGRAM: Partial<Program> = {
  title: "",
  city: "",
  dispositif: "MALRAUX",
  dispositifs: ["MALRAUX"],
  summary: "",
  externalUrl: "",
  lots: [],
  visible: true
};

export default function Page() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Program> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { confirm, dialog } = useConfirm();

  const handlePhoto = async (file: File | undefined, field: string = 'coverImage') => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image trop volumineuse (10 Mo max)'); return; }
    setUploadingPhoto(true);
    try {
      const dataUri: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUri }),
      });
      const data = await res.json();
      if (res.ok && data.url) updateField(field, data.url);
      else alert(data.error || "Échec de l'envoi de la photo");
    } catch {
      alert("Échec de l'envoi de la photo");
    }
    setUploadingPhoto(false);
  };

  // Upload d'une image et renvoi de l'URL (pour les lots / projections).
  const uploadImage = async (file: File | undefined): Promise<string | null> => {
    if (!file) return null;
    if (file.size > 10 * 1024 * 1024) { alert('Image trop volumineuse (10 Mo max)'); return null; }
    try {
      const dataUri: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await fetch('/api/upload-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUri }),
      });
      const data = await res.json();
      if (res.ok && data.url) return data.url;
      alert(data.error || "Échec de l'envoi de la photo");
      return null;
    } catch { alert("Échec de l'envoi de la photo"); return null; }
  };

  // Upload d'un plan : PDF → volume persistant (/api/upload-document), image → Cloudinary.
  const uploadPlan = async (file: File | undefined): Promise<string | null> => {
    if (!file) return null;
    if (file.type !== 'application/pdf') return uploadImage(file);
    if (file.size > 22 * 1024 * 1024) { alert('Fichier trop volumineux (20 Mo max)'); return null; }
    try {
      const dataUri: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await fetch('/api/upload-document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: dataUri }),
      });
      const data = await res.json();
      if (res.ok && data.url) return data.url;
      alert(data.error || "Échec de l'envoi du plan");
      return null;
    } catch { alert("Échec de l'envoi du plan"); return null; }
  };

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

  // ---- Helpers listes de chaînes (caractéristiques, finitions, points forts) ----
  const strList = (field: string): string[] => Array.isArray((editing as any)?.[field]) ? (editing as any)[field] : [];
  const addStr = (field: string) => updateField(field, [...strList(field), ""]);
  const setStr = (field: string, i: number, v: string) => { const a = [...strList(field)]; a[i] = v; updateField(field, a); };
  const rmStr = (field: string, i: number) => updateField(field, strList(field).filter((_, j) => j !== i));

  // ---- Dispositifs (multi) ----
  const dispoList = (): string[] => Array.isArray(editing?.dispositifs) ? editing!.dispositifs! : (editing?.dispositif ? [editing.dispositif] : []);
  const toggleDispo = (code: string) => {
    const cur = dispoList();
    const next = cur.includes(code) ? cur.filter(c => c !== code) : [...cur, code];
    setEditing(prev => prev ? { ...prev, dispositifs: next, dispositif: next[0] || "" } : null);
  };

  // ---- Proximité ----
  const proxList = (): any[] => Array.isArray(editing?.proximite) ? editing!.proximite! : [];
  const addProx = () => updateField('proximite', [...proxList(), { nom: "", distance: "" }]);
  const setProx = (i: number, key: string, v: string) => { const a = [...proxList()]; a[i] = { ...a[i], [key]: v }; updateField('proximite', a); };
  const rmProx = (i: number) => updateField('proximite', proxList().filter((_, j) => j !== i));

  // ---- Lots ----
  const lotList = (): any[] => Array.isArray(editing?.lots) ? editing!.lots! : [];
  const addLot = () => updateField('lots', [...lotList(), { numero: lotList().length + 1, type: "", etage: "", statut: "DISPONIBLE" }]);
  const setLot = (i: number, key: string, v: any) => { const a = [...lotList()]; a[i] = { ...a[i], [key]: v }; updateField('lots', a); };
  const rmLot = (i: number) => updateField('lots', lotList().filter((_, j) => j !== i));

  // ---- Projections / plans (image + titre) ----
  const projList = (): any[] => Array.isArray(editing?.projections) ? editing!.projections! : [];
  const addProj = () => updateField('projections', [...projList(), { title: "", image: "" }]);
  const setProj = (i: number, key: string, v: string) => { const a = [...projList()]; a[i] = { ...a[i], [key]: v }; updateField('projections', a); };
  const rmProj = (i: number) => updateField('projections', projList().filter((_, j) => j !== i));

  // ---- DPE cible ----
  const setDpe = (key: string, v: string) => updateField('dpe', { ...(editing?.dpe || {}), [key]: v });

  // ---- Calendrier du projet ----
  const calList = (): any[] => Array.isArray((editing as any)?.calendrier) ? (editing as any).calendrier : [];
  const addCal = () => updateField('calendrier', [...calList(), { etape: "", date: "", description: "" }]);
  const setCal = (i: number, key: string, v: any) => { const a = [...calList()]; a[i] = { ...a[i], [key]: v }; updateField('calendrier', a); };
  const rmCal = (i: number) => updateField('calendrier', calList().filter((_, j) => j !== i));

  // ---- Équipements performants (DPE) ----
  const eqList = (): any[] => Array.isArray((editing as any)?.equipements) ? (editing as any).equipements : [];
  const addEq = () => updateField('equipements', [...eqList(), { title: "", subtitle: "" }]);
  const setEq = (i: number, key: string, v: string) => { const a = [...eqList()]; a[i] = { ...a[i], [key]: v }; updateField('equipements', a); };
  const rmEq = (i: number) => updateField('equipements', eqList().filter((_, j) => j !== i));

  // ---- Documents du programme (communs) ----
  const docList = (): any[] => Array.isArray((editing as any)?.documents) ? (editing as any).documents : [];
  const addDoc = () => updateField('documents', [...docList(), { name: "", subtitle: "", url: "" }]);
  const setDoc = (i: number, key: string, v: string) => { const a = [...docList()]; a[i] = { ...a[i], [key]: v }; updateField('documents', a); };
  const rmDoc = (i: number) => updateField('documents', docList().filter((_, j) => j !== i));

  // ---- Documents propres à un lot ----
  const lotDocs = (li: number): any[] => Array.isArray(lotList()[li]?.documents) ? lotList()[li].documents : [];
  const addLotDoc = (li: number) => setLot(li, 'documents', [...lotDocs(li), { name: "", url: "" }]);
  const setLotDoc = (li: number, di: number, key: string, v: string) => { const a = [...lotDocs(li)]; a[di] = { ...a[di], [key]: v }; setLot(li, 'documents', a); };
  const rmLotDoc = (li: number, di: number) => setLot(li, 'documents', lotDocs(li).filter((_, j) => j !== di));

  // Petit éditeur de liste de chaînes réutilisable.
  const StrListEditor = ({ field, label }: { field: string; label: string }) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="space-y-2">
        {strList(field).map((v, i) => (
          <div key={i} className="flex gap-2">
            <input value={v} onChange={e => setStr(field, i, e.target.value)} className="flex-1 px-3 py-1.5 text-sm border rounded" />
            <button type="button" onClick={() => rmStr(field, i)} className="px-2 text-red-500 hover:bg-red-50 rounded">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => addStr(field)} className="text-sm text-[#B89C6D] hover:underline">+ Ajouter</button>
      </div>
    </div>
  );

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
            <label className="block text-sm font-medium mb-1">Photo du programme (optionnel)</label>
            {editing.coverImage ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editing.coverImage} alt="Aperçu du programme" className="w-40 h-28 object-cover rounded border" />
                <button
                  type="button"
                  onClick={() => updateField('coverImage', '')}
                  className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white text-sm"
                  data-testid="button-remove-photo"
                >
                  Retirer
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={e => handlePhoto(e.target.files?.[0])}
                disabled={uploadingPhoto}
                className="text-sm"
                data-testid="input-program-photo"
              />
            )}
            {uploadingPhoto && <div className="text-xs opacity-60 mt-1">Envoi en cours…</div>}
          </div>

          {/* Identité enrichie */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Slug (URL) <span className="opacity-50">— ex : 98-carmes</span></label>
              <input type="text" value={editing.slug || ''} onChange={e => updateField('slug', e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse complète</label>
              <input type="text" value={editing.address || ''} onChange={e => updateField('address', e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="98 rue des Carmes, 76000 Rouen" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Livraison</label>
              <input type="text" value={editing.livraison || ''} onChange={e => updateField('livraison', e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="T2 2027" />
            </div>
          </div>

          {/* Dispositifs applicables (multi) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Dispositifs applicables <span className="opacity-50">— le 1er est le principal</span></label>
            <div className="flex flex-wrap gap-3">
              {DISPOS.map(d => (
                <label key={d.code} className="flex items-center gap-1.5 text-sm border rounded px-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={dispoList().includes(d.code)} onChange={() => toggleDispo(d.code)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Accroche (hero)</label>
            <textarea value={editing.accroche || ''} onChange={e => updateField('accroche', e.target.value)} className="w-full px-3 py-2 border rounded" rows={2} />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Introduction (« Le programme »)</label>
            <textarea value={editing.intro || ''} onChange={e => updateField('intro', e.target.value)} className="w-full px-3 py-2 border rounded" rows={4} />
          </div>

          {/* Photo hero */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Photo hero (grande image en tête)</label>
            {editing.heroImage ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editing.heroImage} alt="Aperçu hero" className="w-40 h-24 object-cover rounded border" />
                <button type="button" onClick={() => updateField('heroImage', '')} className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white text-sm">Retirer</button>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={e => handlePhoto(e.target.files?.[0], 'heroImage')} disabled={uploadingPhoto} className="text-sm" />
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <StrListEditor field="caracteristiques" label="Caractéristiques générales" />
            <StrListEditor field="finitions" label="Finitions & équipements" />
            <StrListEditor field="pointsForts" label="Points forts (chips)" />
          </div>

          {/* Emplacement */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Requête carte (Google Maps)</label>
              <input type="text" value={editing.mapQuery || ''} onChange={e => updateField('mapQuery', e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="98 rue des Carmes, 76000 Rouen" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Visite virtuelle (URL d&apos;iframe, optionnel)</label>
              <input type="text" value={editing.virtualTourUrl || ''} onChange={e => updateField('virtualTourUrl', e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">À proximité</label>
            <div className="space-y-2">
              {proxList().map((pt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={pt.nom || ''} onChange={e => setProx(i, 'nom', e.target.value)} placeholder="Cathédrale Notre-Dame" className="flex-1 px-3 py-1.5 text-sm border rounded" />
                  <input value={pt.distance || ''} onChange={e => setProx(i, 'distance', e.target.value)} placeholder="5 min" className="w-28 px-3 py-1.5 text-sm border rounded" />
                  <button type="button" onClick={() => rmProx(i)} className="px-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                </div>
              ))}
              <button type="button" onClick={addProx} className="text-sm text-[#B89C6D] hover:underline">+ Ajouter un point d&apos;intérêt</button>
            </div>
          </div>

          {/* Projections / plans */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Projections & plans (images)</label>
            <div className="grid md:grid-cols-2 gap-2">
              {projList().map((pj, i) => (
                <div key={i} className="flex items-center gap-2 border rounded p-2">
                  {pj.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pj.image} alt="" className="w-20 h-14 object-cover rounded" />
                  ) : (
                    <input type="file" accept="image/*" onChange={async e => { const url = await uploadImage(e.target.files?.[0]); if (url) setProj(i, 'image', url); }} className="text-xs w-24" />
                  )}
                  <input value={pj.title || ''} onChange={e => setProj(i, 'title', e.target.value)} placeholder="Légende" className="flex-1 px-2 py-1 text-sm border rounded" />
                  <button type="button" onClick={() => rmProj(i)} className="px-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addProj} className="text-sm text-[#B89C6D] hover:underline mt-2">+ Ajouter une image</button>
          </div>

          {/* DPE cible */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">DPE cible (après travaux)</label>
            <div className="flex flex-wrap gap-3">
              <div>
                <span className="block text-xs opacity-60 mb-0.5">Classe énergie</span>
                <select value={editing.dpe?.classEnergy || ''} onChange={e => setDpe('classEnergy', e.target.value)} className="px-3 py-2 border rounded text-sm">
                  <option value="">—</option>
                  {["A","B","C","D","E","F","G"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <span className="block text-xs opacity-60 mb-0.5">Classe climat (GES)</span>
                <select value={editing.dpe?.classGES || ''} onChange={e => setDpe('classGES', e.target.value)} className="px-3 py-2 border rounded text-sm">
                  <option value="">—</option>
                  {["A","B","C","D","E","F","G"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <input value={editing.dpe?.consumption || ''} onChange={e => setDpe('consumption', e.target.value)} placeholder="Consommation (ex : 110-180 kWh/m²/an)" className="px-3 py-2 border rounded text-sm" />
              <input value={editing.dpe?.emissions || ''} onChange={e => setDpe('emissions', e.target.value)} placeholder="Émissions (ex : 25-45 kg CO₂/m²/an)" className="px-3 py-2 border rounded text-sm" />
            </div>
          </div>

          {/* Équipements performants */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Équipements performants (DPE cible)</label>
            <div className="space-y-2">
              {eqList().map((eq, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input value={eq.title || ''} onChange={e => setEq(i, 'title', e.target.value)} placeholder="Titre (ex : VMC double flux)" className="flex-1 min-w-[160px] px-3 py-1.5 text-sm border rounded" />
                  <input value={eq.subtitle || ''} onChange={e => setEq(i, 'subtitle', e.target.value)} placeholder="Détail (ex : Récupération de chaleur)" className="flex-1 min-w-[160px] px-3 py-1.5 text-sm border rounded" />
                  <button type="button" onClick={() => rmEq(i)} className="px-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                </div>
              ))}
              <button type="button" onClick={addEq} className="text-sm text-[#B89C6D] hover:underline">+ Ajouter un équipement</button>
            </div>
          </div>

          {/* Calendrier du projet */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Calendrier du projet</label>
            <div className="space-y-2">
              {calList().map((et, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input value={et.etape || ''} onChange={e => setCal(i, 'etape', e.target.value)} placeholder="Étape (ex : Livraison)" className="w-44 px-3 py-1.5 text-sm border rounded" />
                  <input value={et.date || ''} onChange={e => setCal(i, 'date', e.target.value)} placeholder="Date (ex : T2 2027)" className="w-32 px-3 py-1.5 text-sm border rounded" />
                  <input value={et.description || ''} onChange={e => setCal(i, 'description', e.target.value)} placeholder="Description" className="flex-1 min-w-[180px] px-3 py-1.5 text-sm border rounded" />
                  <button type="button" onClick={() => rmCal(i)} className="px-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                </div>
              ))}
              <button type="button" onClick={addCal} className="text-sm text-[#B89C6D] hover:underline">+ Ajouter une étape</button>
            </div>
          </div>

          {/* Lots */}
          <div className="mb-4 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">Grille des lots ({lotList().length})</label>
              <button type="button" onClick={addLot} className="text-sm px-3 py-1 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D]">+ Ajouter un lot</button>
            </div>
            <div className="space-y-3">
              {lotList().map((lot, i) => (
                <div key={i} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Lot {lot.numero ?? i + 1}</span>
                    <button type="button" onClick={() => rmLot(i)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                  </div>
                  <div className="grid md:grid-cols-4 gap-2">
                    <input value={lot.numero ?? ''} onChange={e => setLot(i, 'numero', e.target.value)} placeholder="N°" className="px-2 py-1 text-sm border rounded" />
                    <input value={lot.type || ''} onChange={e => setLot(i, 'type', e.target.value)} placeholder="Type (T2)" className="px-2 py-1 text-sm border rounded" />
                    <input value={lot.etage || ''} onChange={e => setLot(i, 'etage', e.target.value)} placeholder="Étage (1er)" className="px-2 py-1 text-sm border rounded" />
                    <select value={lot.statut || 'DISPONIBLE'} onChange={e => setLot(i, 'statut', e.target.value)} className="px-2 py-1 text-sm border rounded">
                      {STATUTS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                    <input type="number" value={lot.surfaceActuelle ?? ''} onChange={e => setLot(i, 'surfaceActuelle', e.target.value)} placeholder="Surface actuelle m²" className="px-2 py-1 text-sm border rounded" />
                    <input type="number" value={lot.surfaceApresTravaux ?? ''} onChange={e => setLot(i, 'surfaceApresTravaux', e.target.value)} placeholder="Surface après travaux m²" className="px-2 py-1 text-sm border rounded" />
                    <input type="number" value={lot.prixPlateau ?? ''} onChange={e => setLot(i, 'prixPlateau', e.target.value)} placeholder="Prix plateau €" className="px-2 py-1 text-sm border rounded" />
                    <input type="number" value={lot.prixTravaux ?? ''} onChange={e => setLot(i, 'prixTravaux', e.target.value)} placeholder="Prix travaux €" className="px-2 py-1 text-sm border rounded" />
                    <input value={lot.annexeDescription || ''} onChange={e => setLot(i, 'annexeDescription', e.target.value)} placeholder="Annexe (Cave)" className="px-2 py-1 text-sm border rounded" />
                    <input type="number" value={lot.annexeSurface ?? ''} onChange={e => setLot(i, 'annexeSurface', e.target.value)} placeholder="Annexe m²" className="px-2 py-1 text-sm border rounded" />
                    <input value={lot.dispositif || ''} onChange={e => setLot(i, 'dispositif', e.target.value)} placeholder="Dispositif éligible (ex : Monument Historique / Déficit Foncier)" className="md:col-span-2 px-2 py-1 text-sm border rounded" />
                    <input value={lot.description || ''} onChange={e => setLot(i, 'description', e.target.value)} placeholder="Description" className="md:col-span-2 px-2 py-1 text-sm border rounded" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {lot.image ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={lot.image} alt="" className="w-20 h-14 object-cover rounded border" />
                        <button type="button" onClick={() => setLot(i, 'image', '')} className="text-xs text-red-500 hover:underline">Retirer photo</button>
                      </>
                    ) : (
                      <input type="file" accept="image/*" onChange={async e => { const url = await uploadImage(e.target.files?.[0]); if (url) setLot(i, 'image', url); }} className="text-xs" />
                    )}
                    <span className="text-xs opacity-60 ml-3">Plan :</span>
                    {lot.plan ? (
                      <>
                        {/\.pdf($|\?)/i.test(lot.plan) ? (
                          <a href={lot.plan} target="_blank" rel="noopener noreferrer" className="text-xs text-[#B89C6D] underline">📄 Plan PDF</a>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={lot.plan} alt="" className="w-20 h-14 object-contain rounded border bg-white" />
                        )}
                        <button type="button" onClick={() => setLot(i, 'plan', '')} className="text-xs text-red-500 hover:underline">Retirer</button>
                      </>
                    ) : (
                      <input type="file" accept="image/*,application/pdf" onChange={async e => { const url = await uploadPlan(e.target.files?.[0]); if (url) setLot(i, 'plan', url); }} className="text-xs w-28" />
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs opacity-60">Documents du lot (Carrez, plan PDF…)</span>
                    <div className="space-y-1 mt-1">
                      {lotDocs(i).map((d: any, di: number) => (
                        <div key={di} className="flex items-center gap-2">
                          <input value={d.name || ''} onChange={e => setLotDoc(i, di, 'name', e.target.value)} placeholder="Nom du document" className="w-52 px-2 py-1 text-xs border rounded" />
                          <div className="flex-1"><DocumentUploader document={d.url} onChange={(url) => setLotDoc(i, di, 'url', url || '')} label="" uploadToCloud /></div>
                          <button type="button" onClick={() => rmLotDoc(i, di)} className="px-1 text-red-500">✕</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addLotDoc(i)} className="text-xs text-[#B89C6D] hover:underline">+ Document du lot</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents communs du programme */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Documents du programme (communs à tous les lots)</label>
            <div className="space-y-2">
              {docList().map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={d.name || ''} onChange={e => setDoc(i, 'name', e.target.value)} placeholder="Nom (ex : Plans de l'immeuble)" className="w-52 px-2 py-1 text-sm border rounded" />
                  <input value={d.subtitle || ''} onChange={e => setDoc(i, 'subtitle', e.target.value)} placeholder="Sous-titre (optionnel)" className="w-40 px-2 py-1 text-sm border rounded" />
                  <div className="flex-1"><DocumentUploader document={d.url} onChange={(url) => setDoc(i, 'url', url || '')} label="" uploadToCloud /></div>
                  <button type="button" onClick={() => rmDoc(i)} className="px-1 text-red-500">✕</button>
                </div>
              ))}
              <button type="button" onClick={addDoc} className="text-sm text-[#B89C6D] hover:underline">+ Ajouter un document</button>
            </div>
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
                {program.coverImage && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={program.coverImage} alt="" className="w-24 h-20 object-cover rounded border shrink-0" />
                )}
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
