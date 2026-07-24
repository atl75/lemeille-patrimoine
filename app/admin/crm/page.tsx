"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useConfirm } from "@/components/ConfirmDialog";
import { useEffect, useState } from "react";
import { Plus, X, Calendar, CheckCircle2, Circle, Edit2, Trash2, Paperclip, Download, Eye } from "lucide-react";

type Action = {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'other';
  description: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
};

type Attachment = {
  id: string;
  name: string;
  type: string;
  data: string; // Base64
  uploadedAt: string;
};

type Lead = {
  id: string;
  createdAt: string;
  status?: string;
  category?: 'immobilier' | 'patrimoine';
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  topic?: string;
  source?: string;
  message?: string;
  meta?: any;
  actions?: Action[];
  attachments?: Attachment[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export default function Page(){
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    category: 'immobilier' as 'immobilier' | 'patrimoine',
    topic: 'Demande de renseignements',
    source: 'manual',
    status: 'new',
    message: ''
  });
  const [showActionForm, setShowActionForm] = useState<string | null>(null);
  const [actionFormData, setActionFormData] = useState({
    type: 'call' as 'call' | 'email' | 'meeting' | 'other',
    description: '',
    dueDate: ''
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { confirm, dialog } = useConfirm();

  const fetchLeads = () => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLeads([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attachments,
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          category: 'immobilier',
          topic: 'Demande de renseignements',
          source: 'manual',
          status: 'new',
          message: ''
        });
        setAttachments([]);
        setShowForm(false);
        fetchLeads();
      } else {
        alert('Erreur lors de l\'ajout du lead');
      }
    } catch (error) {
      alert('Erreur lors de l\'ajout du lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAction = async (leadId: string) => {
    if (!actionFormData.description || !actionFormData.dueDate) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const newAction: Action = {
      id: `ACT-${Date.now()}`,
      type: actionFormData.type,
      description: actionFormData.description,
      dueDate: actionFormData.dueDate,
      completed: false,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`/api/leads/${leadId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAction)
      });

      if (response.ok) {
        setActionFormData({ type: 'call', description: '', dueDate: '' });
        setShowActionForm(null);
        fetchLeads();
      } else {
        alert('Erreur lors de l\'ajout de l\'action');
      }
    } catch (error) {
      alert('Erreur lors de l\'ajout de l\'action');
    }
  };

  const handleToggleAction = async (leadId: string, actionId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/actions/${actionId}/toggle`, {
        method: 'PATCH'
      });

      if (response.ok) {
        fetchLeads();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'action');
    }
  };

  const handleEditLead = (lead: Lead) => {
    setFormData({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      email: lead.email,
      phone: lead.phone || '',
      category: lead.category || 'immobilier',
      topic: lead.topic || 'Demande de renseignements',
      source: lead.source || 'manual',
      status: lead.status || 'new',
      message: lead.message || ''
    });
    setAttachments(lead.attachments || []);
    setEditingLead(lead.id);
    setShowForm(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/leads/${editingLead}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attachments
        })
      });

      if (response.ok) {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          category: 'immobilier',
          topic: 'Demande de renseignements',
          source: 'manual',
          status: 'new',
          message: ''
        });
        setAttachments([]);
        setEditingLead(null);
        setShowForm(false);
        fetchLeads();
      } else {
        alert('Erreur lors de la modification du lead');
      }
    } catch (error) {
      alert('Erreur lors de la modification du lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = async (leadId: string, leadName: string) => {
    if (!(await confirm(`Le lead "${leadName}" sera définitivement supprimé.`, { title: "Supprimer ce lead ?" }))) {
      return;
    }

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchLeads();
      } else {
        alert('Erreur lors de la suppression du lead');
      }
    } catch (error) {
      alert('Erreur lors de la suppression du lead');
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      category: 'immobilier',
      topic: 'Demande de renseignements',
      source: 'manual',
      status: 'new',
      message: ''
    });
    setAttachments([]);
    setEditingLead(null);
    setShowForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`Le fichier ${file.name} est trop volumineux (max 5MB)`);
        continue;
      }

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `ATT-${Date.now()}-${i}`,
          name: file.name,
          type: file.type,
          data: base64,
          uploadedAt: new Date().toISOString()
        });
      } catch (error) {
        alert(`Erreur lors du chargement de ${file.name}`);
      }
    }

    setAttachments([...attachments, ...newAttachments]);
    setUploadingFile(false);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter(a => a.id !== attachmentId));
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    link.click();
  };

  const sortedLeads = [...leads].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sources = Array.from(new Set(leads.map(l => l.source || 'contact-form')));
  const bySource = leads.reduce((acc, l) => {
    const src = l.source || 'contact-form';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byStatus = leads.reduce((acc, l) => {
    const status = l.status || 'new';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byCategory = leads.reduce((acc, l) => {
    const category = l.category || 'immobilier';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminShell title="CRM">
      <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Administration", href:"/admin"},{label:"CRM"}]} />
      
      <div className="card p-6 mb-4">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="grid md:grid-cols-5 gap-3 flex-1">
            <div className="p-3 bg-black/5 rounded">
              <div className="text-sm opacity-70">Total leads</div>
              <div className="text-2xl font-semibold">{leads.length}</div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm text-blue-700">🏠 Immobilier</div>
              <div className="text-2xl font-semibold text-blue-700">{byCategory.immobilier || 0}</div>
            </div>

            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="text-sm text-purple-700">💼 Patrimoine</div>
              <div className="text-2xl font-semibold text-purple-700">{byCategory.patrimoine || 0}</div>
            </div>

            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-sm text-green-700">Nouveaux</div>
              <div className="text-2xl font-semibold text-green-700">{byStatus.new || 0}</div>
            </div>

            <div className="p-3 bg-black/5 rounded">
              <div className="text-sm opacity-70">Sources</div>
              <div className="text-2xl font-semibold">{sources.length}</div>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-gold flex items-center gap-2"
            data-testid="button-add-lead"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Annuler' : 'Ajouter un lead'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={editingLead ? handleUpdateLead : handleSubmit} className="border-t pt-4 mt-4">
            <h3 className="luxe text-lg mb-4">{editingLead ? 'Modifier le lead' : 'Nouveau lead'}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prénom *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  className="input"
                  data-testid="input-first-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  className="input"
                  data-testid="input-last-name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Catégorie de deal *</label>
                <select
                  required
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value as 'immobilier' | 'patrimoine'})}
                  className="input"
                  data-testid="select-category"
                >
                  <option value="immobilier">🏠 Immobilier</option>
                  <option value="patrimoine">💼 Gestion de Patrimoine</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="input"
                  data-testid="input-email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="input"
                  data-testid="input-phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sujet *</label>
                <select
                  required
                  value={formData.topic}
                  onChange={e => setFormData({...formData, topic: e.target.value})}
                  className="input"
                  data-testid="select-topic"
                >
                  <option value="Demande de renseignements">Demande de renseignements</option>
                  <option value="Achat immobilier">Achat immobilier</option>
                  <option value="Vente immobilier">Vente immobilier</option>
                  <option value="Estimation">Estimation</option>
                  <option value="Patrimoine">Patrimoine</option>
                  <option value="Programmes fiscaux">Programmes fiscaux</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Statut *</label>
                <select
                  required
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="input"
                  data-testid="select-status"
                >
                  <option value="new">Nouveau</option>
                  <option value="contacted">Contacté</option>
                  <option value="qualified">Qualifié</option>
                  <option value="closed">Fermé</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="input"
                  rows={4}
                  data-testid="textarea-message"
                />
              </div>

              {/* Section fichiers joints */}
              <div className="md:col-span-2 border-t pt-4">
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Fichiers joints
                </label>
                
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="input text-sm"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  data-testid="input-attachments"
                  disabled={uploadingFile}
                />
                <p className="text-xs text-gray-500 mt-1">Max 5MB par fichier. Formats acceptés : PDF, DOC, DOCX, JPG, PNG, TXT</p>

                {/* Liste des fichiers joints */}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                        <Paperclip className="w-4 h-4 opacity-60" />
                        <span className="flex-1 text-sm">{att.name}</span>
                        <span className="text-xs opacity-60">{(att.data.length / 1024).toFixed(0)} KB</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-red-600 hover:text-red-800"
                          data-testid={`button-remove-attachment-${att.id}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-luxe"
                data-testid="button-submit-lead"
              >
                {submitting 
                  ? (editingLead ? 'Modification en cours...' : 'Ajout en cours...') 
                  : (editingLead ? 'Modifier le lead' : 'Ajouter le lead')
                }
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn"
                data-testid="button-cancel"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      {loading && <div className="card p-6">Chargement...</div>}

      {!loading && sortedLeads.length === 0 && (
        <div className="card p-6 opacity-70">Aucun lead enregistré.</div>
      )}

      {!loading && sortedLeads.length > 0 && (
        <div className="grid gap-4">
          {sortedLeads.map(lead => (
            <div key={lead.id} className="card p-6" data-testid={`lead-${lead.id}`}>
              <div className="flex flex-wrap gap-4 justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-lg">
                      {lead.firstName} {lead.lastName}
                    </h3>
                    <span className={`pill text-xs font-semibold ${
                      lead.category === 'patrimoine' 
                        ? 'bg-purple-100 border-purple-300 text-purple-700' 
                        : 'bg-blue-100 border-blue-300 text-blue-700'
                    }`}>
                      {lead.category === 'patrimoine' ? '💼 Patrimoine' : '🏠 Immobilier'}
                    </span>
                    <span className={`pill text-xs ${lead.status === 'new' ? 'border-green-600 text-green-700' : ''}`}>
                      {lead.status === 'new' ? 'Nouveau' : lead.status === 'contacted' ? 'Contacté' : lead.status === 'qualified' ? 'Qualifié' : lead.status || 'new'}
                    </span>
                    <span className="pill text-xs opacity-60">
                      {lead.source || 'contact-form'}
                    </span>
                    
                    {/* Boutons Modifier et Supprimer */}
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => handleEditLead(lead)}
                        className="btn text-xs flex items-center gap-1 px-2 py-1 hover:bg-blue-50"
                        data-testid={`button-edit-${lead.id}`}
                        title="Modifier ce lead"
                      >
                        <Edit2 className="w-3 h-3" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id, `${lead.firstName} ${lead.lastName}`)}
                        className="btn text-xs flex items-center gap-1 px-2 py-1 hover:bg-red-50 text-red-600"
                        data-testid={`button-delete-${lead.id}`}
                        title="Supprimer ce lead"
                      >
                        <Trash2 className="w-3 h-3" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-2 text-sm mb-3">
                    <div>📧 {lead.email}</div>
                    {lead.phone && <div>📞 {lead.phone}</div>}
                    {lead.topic && <div>🏷️ {lead.topic}</div>}
                    <div className="opacity-60">📅 {formatDate(lead.createdAt)}</div>
                  </div>

                  {lead.message && (
                    <p className="text-sm opacity-80 mt-2 p-3 bg-black/5 rounded">
                      {lead.message}
                    </p>
                  )}

                  {lead.meta && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm opacity-70 hover:opacity-100">
                        📊 Données détaillées (simulateur/estimation)
                      </summary>
                      <pre className="text-xs mt-2 p-3 bg-black/5 rounded overflow-auto max-h-96">
                        {JSON.stringify(lead.meta, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* Section Fichiers joints */}
                  {lead.attachments && lead.attachments.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Paperclip className="w-4 h-4" />
                        Fichiers joints ({lead.attachments.length})
                      </h4>
                      <div className="space-y-2">
                        {lead.attachments.map(att => (
                          <div 
                            key={att.id} 
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded border text-sm"
                            data-testid={`attachment-${att.id}`}
                          >
                            <Paperclip className="w-4 h-4 opacity-60" />
                            <span className="flex-1">{att.name}</span>
                            <span className="text-xs opacity-60">
                              {new Date(att.uploadedAt).toLocaleDateString('fr-FR')}
                            </span>
                            <button
                              onClick={() => handleDownloadAttachment(att)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Télécharger"
                              data-testid={`button-download-${att.id}`}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section Actions */}
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Actions planifiées
                      </h4>
                      <button
                        onClick={() => setShowActionForm(showActionForm === lead.id ? null : lead.id)}
                        className="text-xs btn-gold flex items-center gap-1 px-2 py-1"
                        data-testid={`button-add-action-${lead.id}`}
                      >
                        {showActionForm === lead.id ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {showActionForm === lead.id ? 'Annuler' : 'Nouvelle action'}
                      </button>
                    </div>

                    {/* Formulaire d'ajout d'action */}
                    {showActionForm === lead.id && (
                      <div className="bg-black/5 p-3 rounded mb-3">
                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Type d&apos;action</label>
                            <select
                              value={actionFormData.type}
                              onChange={e => setActionFormData({...actionFormData, type: e.target.value as any})}
                              className="input text-sm"
                              data-testid="select-action-type"
                            >
                              <option value="call">📞 Appel téléphonique</option>
                              <option value="email">📧 Envoyer un email</option>
                              <option value="meeting">👥 Réunion</option>
                              <option value="other">📝 Autre</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Date prévue</label>
                            <input
                              type="datetime-local"
                              value={actionFormData.dueDate}
                              onChange={e => setActionFormData({...actionFormData, dueDate: e.target.value})}
                              className="input text-sm"
                              data-testid="input-action-date"
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="Ex: Rappeler pour prise de rendez-vous"
                            value={actionFormData.description}
                            onChange={e => setActionFormData({...actionFormData, description: e.target.value})}
                            className="input text-sm"
                            data-testid="input-action-description"
                          />
                        </div>
                        <button
                          onClick={() => handleAddAction(lead.id)}
                          className="btn-luxe text-sm px-3 py-1"
                          data-testid="button-save-action"
                        >
                          Ajouter l&apos;action
                        </button>
                      </div>
                    )}

                    {/* Liste des actions */}
                    {lead.actions && lead.actions.length > 0 ? (
                      <div className="space-y-2">
                        {lead.actions
                          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                          .map(action => {
                            const dueDate = new Date(action.dueDate);
                            const isPast = dueDate < new Date();
                            const actionIcons = {
                              call: '📞',
                              email: '📧',
                              meeting: '👥',
                              other: '📝'
                            };

                            return (
                              <div
                                key={action.id}
                                className={`flex items-start gap-3 p-3 rounded border ${
                                  action.completed 
                                    ? 'bg-green-50 border-green-200 opacity-60' 
                                    : isPast 
                                    ? 'bg-red-50 border-red-200' 
                                    : 'bg-white border-gray-200'
                                }`}
                                data-testid={`action-${action.id}`}
                              >
                                <button
                                  onClick={() => handleToggleAction(lead.id, action.id)}
                                  className="mt-0.5"
                                  data-testid={`button-toggle-${action.id}`}
                                >
                                  {action.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={action.completed ? 'line-through opacity-60' : ''}>
                                      {actionIcons[action.type]} {action.description}
                                    </span>
                                  </div>
                                  <div className="text-xs opacity-60">
                                    📅 {dueDate.toLocaleDateString('fr-FR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    {isPast && !action.completed && (
                                      <span className="ml-2 text-red-600 font-semibold">⚠️ En retard</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-sm opacity-60 italic">Aucune action planifiée</p>
                    )}
                  </div>
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
