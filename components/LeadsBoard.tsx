"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import { useConfirm } from "@/components/ConfirmDialog";
import CompanyAutocomplete from "@/components/CompanyAutocomplete";
import { useEffect, useState } from "react";
import { Plus, X, Calendar, CheckCircle2, Circle, Edit2, Trash2, Paperclip, Download, Eye, FileText, Search, Mail } from "lucide-react";

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
  role?: 'ACHETEUR' | 'VENDEUR';
  company?: boolean;
  companyName?: string;
  siren?: string;
  legalForm?: string;
  managerFirstName?: string;
  managerLastName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  topic?: string;
  source?: string;
  message?: string;
  meta?: any;
  actions?: Action[];
  attachments?: Attachment[];
  // Critères de recherche (leads acheteurs)
  buyerCriteria?: { budgetMin?: number; budgetMax?: number; sector?: string; type?: string; roomsMin?: number; surfaceMin?: number };
  buyerSegment?: 'ANCIEN' | 'DEFISCALISATION';
  interestPropertyId?: string;
  priority?: 'hot' | 'warm' | 'cold' | null;
};

// Priorisation / scoring des leads (cliquable, cycle none → chaud → tiède → froid).
const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  hot: { label: '🔥 Chaud', cls: 'bg-red-100 border-red-300 text-red-700' },
  warm: { label: '🌤️ Tiède', cls: 'bg-amber-100 border-amber-300 text-amber-700' },
  cold: { label: '❄️ Froid', cls: 'bg-sky-100 border-sky-300 text-sky-700' },
};
const PRIORITY_CYCLE: (('hot' | 'warm' | 'cold' | null))[] = [null, 'hot', 'warm', 'cold'];

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

export function LeadsBoard({ role }: { role: 'ACHETEUR' | 'VENDEUR' }){
  const roleLabel = role === 'VENDEUR' ? 'Vendeurs' : 'Acheteurs';
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
    address: '',
    company: false,
    companyName: '',
    siren: '',
    legalForm: '',
    managerFirstName: '',
    managerLastName: '',
    category: 'immobilier' as 'immobilier' | 'patrimoine',
    role: 'ACHETEUR' as 'ACHETEUR' | 'VENDEUR',
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
  const [properties, setProperties] = useState<any[]>([]);
  const [mandatLeadId, setMandatLeadId] = useState<string | null>(null);
  const [creatingMandat, setCreatingMandat] = useState<string | null>(null);
  // Filtres de recherche
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'contacted' | 'qualified' | 'closed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');

  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, string> = { new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié', closed: 'Fermé', estimation: 'Estimation', mandate: 'Mandat pris' };
  const pipelineCols = role === 'VENDEUR' ? ['new', 'contacted', 'estimation', 'mandate'] : ['new', 'contacted', 'qualified', 'closed'];

  // Déplace un lead dans le pipeline (change son statut ; optimiste + PATCH).
  const changeStatus = async (leadId: string, status: string) => {
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, status } : l));
    try {
      await fetch(`/api/leads/${leadId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    } catch { fetchLeads(); }
  };

  // Change la priorité d'un lead (optimiste + PATCH).
  const cyclePriority = async (lead: Lead) => {
    const idx = PRIORITY_CYCLE.indexOf((lead.priority as any) ?? null);
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, priority: next } : l));
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: next }),
      });
    } catch { fetchLeads(); }
  };
  // Éléments du mandat saisis pour un vendeur (avant création du bien)
  const [mandatForm, setMandatForm] = useState({
    type: 'APPARTEMENT', rooms: '', surface: '', annexSurface: '', landSize: '', cadastre: '', address: '',
    netSellerAmount: '', commissionMode: 'PCT', commissionPercentage: '', commissionAmount: '',
    mandateType: 'EXCLUSIF', mandateNumber: '', mandateHonorairesCharge: 'VENDEUR', occupancy: 'LIBRE',
    description: '',
  });
  const [linkPropertyId, setLinkPropertyId] = useState<string>('');
  // Panneau acheteur : critères de recherche
  const [buyerLeadId, setBuyerLeadId] = useState<string | null>(null);
  const [savingBuyer, setSavingBuyer] = useState(false);
  const [buyerForm, setBuyerForm] = useState({ budgetMin: '', budgetMax: '', sector: '', type: '', roomsMin: '', surfaceMin: '', segment: '', interestPropertyId: '' });
  const [proposing, setProposing] = useState<string | null>(null);
  const [proposeMsg, setProposeMsg] = useState<{ leadId: string; text: string; ok: boolean } | null>(null);
  const { confirm, dialog } = useConfirm();

  const refreshProperties = () =>
    fetch('/api/properties').then(r => r.json()).then(d => setProperties(Array.isArray(d) ? d : [])).catch(() => {});

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
    refreshProperties();
  }, []);


  // Crée une fiche bien masquée (non publiée) pré-remplie avec le mandant issu
  // du lead, puis ouvre l'éditeur de biens pour compléter et générer le mandat.
  const handleCreatePropertyFromLead = async (lead: Lead) => {
    setCreatingMandat(lead.id);
    try {
      // Adresse du bien : depuis le formulaire mandat, sinon le lead. On extrait
      // la ville après le code postal.
      const address = (mandatForm.address || lead.address || '').trim();
      const cityMatch = address.match(/\b\d{5}\s+([A-Za-zÀ-ÿ'’\-\s]+)$/);
      const city = cityMatch ? cityMatch[1].trim() : '';
      const net = Number(mandatForm.netSellerAmount) || 0;
      let honoraires = 0, pct = 0;
      if (mandatForm.commissionMode === 'EUR') {
        honoraires = Number(mandatForm.commissionAmount) || 0;
        pct = net ? +(honoraires / net * 100).toFixed(2) : 0;
      } else {
        pct = Number(mandatForm.commissionPercentage) || 0;
        honoraires = Math.round(net * pct / 100);
      }
      const prixFAI = net + honoraires; // FAI = net vendeur + honoraires
      const isMaison = mandatForm.type === 'MAISON';
      const owner: any = lead.company
        ? {
            type: 'COMPANY',
            name: lead.companyName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            siren: lead.siren || '',
            legalForm: lead.legalForm || '',
            managerFirstName: lead.managerFirstName || lead.firstName || '',
            managerLastName: lead.managerLastName || lead.lastName || '',
            address: lead.address || '',
            email: lead.email || '',
            phone: lead.phone || '',
          }
        : {
            type: 'INDIVIDUAL',
            firstName: lead.firstName || '',
            lastName: lead.lastName || '',
            email: lead.email || '',
            phone: lead.phone || '',
            address: lead.address || '',
          };
      const body: any = {
        title: `Mandat — ${lead.company ? (lead.companyName || '') : [lead.firstName, lead.lastName].filter(Boolean).join(' ')}`.trim() || 'Nouveau bien (mandat)',
        type: mandatForm.type || 'APPARTEMENT',
        city,
        region: '',
        price: prixFAI,
        surface: Number(mandatForm.surface) || 0,
        annexSurface: Number(mandatForm.annexSurface) || undefined,
        landSize: isMaison ? (Number(mandatForm.landSize) || undefined) : undefined,
        rooms: Number(mandatForm.rooms) || 0,
        cadastralReference: mandatForm.cadastre || undefined,
        description: mandatForm.description || '',
        images: [],
        features: [],
        map: { precision: 'AREA', query: address, zoom: 12 },
        dpe: { classEnergy: 'D', classGES: 'D', consumptionKwh: 0, emissionsKg: 0, date: '', ref: '' },
        visible: false,
        netSellerAmount: net || undefined,
        commissionPercentage: pct || undefined,
        commissionAmount: honoraires || undefined,
        mandateType: mandatForm.mandateType || undefined,
        mandateNumber: mandatForm.mandateNumber || undefined,
        mandateHonorairesCharge: mandatForm.mandateHonorairesCharge || undefined,
        occupancy: mandatForm.occupancy || undefined,
        mandatePlace: city || undefined,
        sellerLeadIds: [lead.id],
        owners: [owner],
      };
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert('Erreur lors de la création de la fiche bien.');
        setCreatingMandat(null);
        return;
      }
      const created = await res.json();
      window.location.href = `/admin/contenu/biens?edit=${created.id}`;
    } catch {
      alert('Erreur lors de la création de la fiche bien.');
      setCreatingMandat(null);
    }
  };

  // Ouvre le panneau vendeur en préremplissant les éléments du mandat.
  const openMandatPanel = (lead: Lead) => {
    if (mandatLeadId === lead.id) { setMandatLeadId(null); return; }
    setMandatLeadId(lead.id);
    setLinkPropertyId('');
    setMandatForm({
      type: 'APPARTEMENT', rooms: '', surface: '', annexSurface: '', landSize: '', cadastre: '', address: lead.address || '',
      netSellerAmount: '', commissionMode: 'PCT', commissionPercentage: '', commissionAmount: '',
      mandateType: 'EXCLUSIF', mandateNumber: '', mandateHonorairesCharge: 'VENDEUR', occupancy: 'LIBRE',
      description: '',
    });
  };

  // Biens reliés à un vendeur (lead).
  const biensOfSeller = (leadId: string) => properties.filter((p: any) => Array.isArray(p.sellerLeadIds) && p.sellerLeadIds.includes(leadId));

  // ---- Acheteur : critères de recherche + biens correspondants ----
  const openBuyerPanel = (lead: Lead) => {
    if (buyerLeadId === lead.id) { setBuyerLeadId(null); return; }
    setBuyerLeadId(lead.id);
    const c = lead.buyerCriteria || {};
    setBuyerForm({
      budgetMin: c.budgetMin != null ? String(c.budgetMin) : '',
      budgetMax: c.budgetMax != null ? String(c.budgetMax) : '',
      sector: c.sector || '',
      type: c.type || '',
      roomsMin: c.roomsMin != null ? String(c.roomsMin) : '',
      surfaceMin: c.surfaceMin != null ? String(c.surfaceMin) : '',
      segment: lead.buyerSegment || '',
      interestPropertyId: lead.interestPropertyId || '',
    });
  };

  // Critères construits à partir du formulaire en cours (aperçu live).
  const currentBuyerCriteria = (): Lead['buyerCriteria'] => ({
    budgetMin: Number(buyerForm.budgetMin) || undefined,
    budgetMax: Number(buyerForm.budgetMax) || undefined,
    sector: buyerForm.sector.trim() || undefined,
    type: buyerForm.type || undefined,
    roomsMin: Number(buyerForm.roomsMin) || undefined,
    surfaceMin: Number(buyerForm.surfaceMin) || undefined,
  });

  const saveBuyerCriteria = async (lead: Lead) => {
    setSavingBuyer(true);
    const bc = currentBuyerCriteria();
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerCriteria: bc,
          buyerSegment: buyerForm.segment || null,
          interestPropertyId: buyerForm.interestPropertyId || null,
        }),
      });
      if (res.ok) fetchLeads(); else alert('Erreur lors de l\'enregistrement des critères.');
    } catch { alert('Erreur réseau.'); }
    setSavingBuyer(false);
  };

  // Envoie au client la sélection de biens correspondants par email.
  const proposeBiens = async (lead: Lead) => {
    const ids = matchingBiens(currentBuyerCriteria()).map((b: any) => b.id);
    if (!ids.length) { alert('Aucun bien à proposer.'); return; }
    if (!lead.email) { alert("Ce lead n'a pas d'email."); return; }
    setProposing(lead.id);
    setProposeMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/propose-biens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyIds: ids }),
      });
      const d = await res.json();
      if (res.ok) setProposeMsg({ leadId: lead.id, ok: true, text: `✉️ ${d.count} bien(s) envoyé(s) à ${lead.email}` });
      else setProposeMsg({ leadId: lead.id, ok: false, text: d.error || 'Échec de l\'envoi.' });
    } catch { setProposeMsg({ leadId: lead.id, ok: false, text: 'Erreur réseau.' }); }
    setProposing(null);
  };

  // Biens disponibles correspondant aux critères d'un acheteur.
  const matchingBiens = (c?: Lead['buyerCriteria']) => {
    if (!c) return [];
    return properties.filter((p: any) => {
      if (p.visible === false || p.sold || p.status === 'SOLD') return false;
      if (c.type && (p.type || 'APPARTEMENT') !== c.type) return false;
      if (c.roomsMin && (p.rooms || 0) < c.roomsMin) return false;
      if (c.surfaceMin && (p.surface || 0) < c.surfaceMin) return false;
      if (!p.priceOnRequest) {
        if (c.budgetMax && (p.price || 0) > c.budgetMax) return false;
        if (c.budgetMin && (p.price || 0) < c.budgetMin) return false;
      }
      if (c.sector) {
        const hay = [p.city, String(p.region || '').replaceAll('_', ' '), p.map?.query].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(c.sector.toLowerCase())) return false;
      }
      return true;
    });
  };
  const hasCriteria = (c?: Lead['buyerCriteria']) => !!(c && (c.budgetMin || c.budgetMax || c.sector || c.type || c.roomsMin || c.surfaceMin));

  const linkExistingBien = async (lead: Lead) => {
    if (!linkPropertyId) return;
    try {
      const res = await fetch(`/api/properties/${linkPropertyId}/link-seller`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (res.ok) { await refreshProperties(); setLinkPropertyId(''); }
      else alert('Erreur lors de la liaison du bien.');
    } catch { alert('Erreur réseau.'); }
  };

  const unlinkBien = async (propertyId: string, leadId: string) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/link-seller`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) await refreshProperties();
    } catch { /* silencieux */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          category: 'immobilier',
          role,
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
          address: '',
          company: false,
          companyName: '',
          siren: '',
          legalForm: '',
          managerFirstName: '',
          managerLastName: '',
          category: 'immobilier',
          role: 'ACHETEUR',
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
      address: lead.address || '',
      company: !!lead.company,
      companyName: lead.companyName || '',
      siren: lead.siren || '',
      legalForm: lead.legalForm || '',
      managerFirstName: lead.managerFirstName || '',
      managerLastName: lead.managerLastName || '',
      category: lead.category || 'immobilier',
      role: lead.role || 'ACHETEUR',
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
          category: 'immobilier',
          role,
          attachments
        })
      });

      if (response.ok) {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          company: false,
          companyName: '',
          siren: '',
          legalForm: '',
          managerFirstName: '',
          managerLastName: '',
          category: 'immobilier',
          role: 'ACHETEUR',
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
      address: '',
      company: false,
      companyName: '',
      siren: '',
      legalForm: '',
      managerFirstName: '',
      managerLastName: '',
      category: 'immobilier',
      role: 'ACHETEUR',
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

  const q = search.trim().toLowerCase();
  const filteredLeads = sortedLeads.filter(l => {
    // Page dédiée à un rôle : ne montre que les leads immobilier de ce rôle.
    if ((l.category || 'immobilier') !== 'immobilier') return false;
    if ((l.role || 'ACHETEUR') !== role) return false;
    if (filterStatus !== 'all' && (l.status || 'new') !== filterStatus) return false;
    if (filterPriority !== 'all' && (l.priority || '') !== filterPriority) return false;
    if (q) {
      const hay = [l.firstName, l.lastName, l.email, l.phone, l.address, l.topic, l.message].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const byRole = leads.reduce((acc, l) => {
    if ((l.category || 'immobilier') === 'immobilier') { const r = l.role || 'ACHETEUR'; acc[r] = (acc[r] || 0) + 1; }
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
    <AdminShell title={`CRM — ${roleLabel}`}>
      <Breadcrumb items={[{label:"Accueil", href:"/"},{label:"Administration", href:"/admin"},{label:"CRM", href:"/admin/crm"},{label:roleLabel}]} />
      
      <div className="card p-6 mb-4">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 flex-1">
            <div className="p-3 bg-black/5 rounded">
              <div className="text-sm opacity-70">Total</div>
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
            <div className="p-3 bg-teal-50 rounded border border-teal-200">
              <div className="text-sm text-teal-700">🔑 Acheteurs</div>
              <div className="text-2xl font-semibold text-teal-700">{byRole.ACHETEUR || 0}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <div className="text-sm text-amber-700">🏷️ Vendeurs</div>
              <div className="text-2xl font-semibold text-amber-700">{byRole.VENDEUR || 0}</div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-sm text-green-700">Nouveaux</div>
              <div className="text-2xl font-semibold text-green-700">{byStatus.new || 0}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border overflow-hidden text-sm" role="group" aria-label="Vue">
              <button type="button" onClick={() => setView('list')} className={`px-3 py-1.5 ${view === 'list' ? 'bg-[#1F3B2C] text-white' : 'bg-white hover:bg-black/5'}`} data-testid="view-list">Liste</button>
              <button type="button" onClick={() => setView('pipeline')} className={`px-3 py-1.5 ${view === 'pipeline' ? 'bg-[#1F3B2C] text-white' : 'bg-white hover:bg-black/5'}`} data-testid="view-pipeline">Pipeline</button>
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
        </div>

        {/* Filtres de recherche */}
        <div className="grid md:grid-cols-3 gap-3 border-t pt-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher (nom, email, téléphone, adresse…)"
            className="input"
            data-testid="input-search"
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="input" data-testid="filter-status">
            <option value="all">Tous statuts</option>
            {role === 'VENDEUR' ? (
              <>
                <option value="new">Nouveau</option>
                <option value="contacted">Contacté</option>
                <option value="estimation">Estimation</option>
                <option value="mandate">Mandat pris</option>
              </>
            ) : (
              <>
                <option value="new">Nouveau</option>
                <option value="contacted">Contacté</option>
                <option value="qualified">Qualifié</option>
                <option value="closed">Fermé</option>
              </>
            )}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)} className="input" data-testid="filter-priority">
            <option value="all">Toutes priorités</option>
            <option value="hot">🔥 Chaud</option>
            <option value="warm">🌤️ Tiède</option>
            <option value="cold">❄️ Froid</option>
          </select>
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

              <div className="md:col-span-2 flex items-center gap-3 flex-wrap">
                <span className={`pill text-xs font-semibold ${role === 'VENDEUR' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-teal-100 border-teal-300 text-teal-800'}`}>
                  {role === 'VENDEUR' ? '🏷️ Lead vendeur (immobilier)' : '🔑 Lead acheteur (immobilier)'}
                </span>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.company} onChange={e => setFormData({ ...formData, company: e.target.checked })} data-testid="checkbox-company" />
                  C&apos;est une société
                </label>
              </div>

              {formData.company && (
                <div className="md:col-span-2 p-3 rounded border bg-gray-50">
                  <CompanyAutocomplete
                    value={formData.companyName}
                    label="Raison sociale (recherche automatique SIREN)"
                    onSelect={(c: any) => setFormData({
                      ...formData,
                      companyName: c.name || '',
                      siren: c.siren || '',
                      legalForm: c.legalForm || '',
                      managerFirstName: c.managerFirstName || '',
                      managerLastName: c.managerLastName || '',
                      firstName: c.managerFirstName || formData.firstName,
                      lastName: c.managerLastName || formData.lastName,
                      address: c.address || formData.address,
                    })}
                  />
                  {formData.siren && (
                    <p className="text-xs opacity-70 mt-2">
                      SIREN <strong>{formData.siren}</strong>{formData.legalForm ? ` · ${formData.legalForm}` : ''}
                      {(formData.managerFirstName || formData.managerLastName) ? ` · Représentant : ${formData.managerFirstName} ${formData.managerLastName}` : ''}
                    </p>
                  )}
                </div>
              )}

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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Adresse du bien</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="input"
                  placeholder="Ex : 12 Promenade des Anglais, 06000 Nice"
                  data-testid="input-address"
                />
                <p className="text-xs opacity-60 mt-1">Sert à pré-remplir la fiche bien et le mandat lors de la création depuis ce lead.</p>
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
                  {role === 'VENDEUR' ? (
                    <>
                      <option value="estimation">Estimation</option>
                      <option value="mandate">Mandat pris</option>
                    </>
                  ) : (
                    <>
                      <option value="qualified">Qualifié</option>
                      <option value="closed">Fermé</option>
                    </>
                  )}
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

      {!loading && view === 'list' && filteredLeads.length === 0 && (
        <div className="card p-6 opacity-70">
          {leads.length === 0 ? 'Aucun lead enregistré.' : 'Aucun lead ne correspond aux filtres.'}
          {leads.length > 0 && <span className="ml-2 opacity-70">({leads.length} au total)</span>}
        </div>
      )}

      {!loading && view === 'list' && filteredLeads.length > 0 && (
        <div className="grid gap-4">
          {filteredLeads.map(lead => (
            <div
              key={lead.id}
              className={`card p-6 border-l-4 ${
                (lead.category || 'immobilier') === 'patrimoine'
                  ? 'border-l-purple-400'
                  : (lead.role || 'ACHETEUR') === 'VENDEUR'
                    ? 'border-l-amber-400'
                    : 'border-l-teal-400'
              }`}
              data-testid={`lead-${lead.id}`}
            >
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
                    {(lead.category || 'immobilier') === 'immobilier' && (
                      <span className={`pill text-xs font-semibold ${
                        (lead.role || 'ACHETEUR') === 'VENDEUR'
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-teal-100 border-teal-300 text-teal-800'
                      }`}>
                        {(lead.role || 'ACHETEUR') === 'VENDEUR' ? '🏷️ Vendeur' : '🔑 Acheteur'}
                      </span>
                    )}
                    <span className={`pill text-xs ${lead.status === 'new' ? 'border-green-600 text-green-700' : ''}`}>
                      {({ new: 'Nouveau', contacted: 'Contacté', qualified: 'Qualifié', closed: 'Fermé', estimation: 'Estimation', mandate: 'Mandat pris' } as Record<string, string>)[lead.status || 'new'] || lead.status || 'new'}
                    </span>
                    <span className="pill text-xs opacity-60">
                      {lead.source || 'contact-form'}
                    </span>
                    <button
                      type="button"
                      onClick={() => cyclePriority(lead)}
                      className={`pill text-xs font-semibold transition-colors ${lead.priority ? PRIORITY_META[lead.priority].cls : 'border-dashed opacity-60 hover:opacity-100'}`}
                      data-testid={`priority-${lead.id}`}
                      title="Cliquer pour changer la priorité (chaud / tiède / froid)"
                    >
                      {lead.priority ? PRIORITY_META[lead.priority].label : '± Priorité'}
                    </button>

                    {/* Boutons d'action (spécifiques au rôle), Modifier et Supprimer */}
                    <div className="flex gap-2 ml-auto">
                      {(lead.category || 'immobilier') === 'immobilier' && (lead.role || 'ACHETEUR') === 'ACHETEUR' && (
                        <button
                          onClick={() => openBuyerPanel(lead)}
                          className="btn text-xs flex items-center gap-1 px-2 py-1 hover:bg-teal-50 text-teal-700"
                          data-testid={`button-buyer-${lead.id}`}
                          title="Recherche & biens correspondants"
                        >
                          <Search className="w-3 h-3" />
                          Recherche & biens
                        </button>
                      )}
                      {(lead.category || 'immobilier') === 'immobilier' && (lead.role || 'ACHETEUR') === 'VENDEUR' && (
                        <button
                          onClick={() => openMandatPanel(lead)}
                          className="btn text-xs flex items-center gap-1 px-2 py-1 hover:bg-amber-50 text-[#B89C6D]"
                          data-testid={`button-mandat-${lead.id}`}
                          title="Mandat & bien du vendeur"
                        >
                          <FileText className="w-3 h-3" />
                          Mandat & bien
                        </button>
                      )}
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
                    {lead.address && <div>📍 {lead.address}</div>}
                    {lead.topic && <div>🏷️ {lead.topic}</div>}
                    <div className="opacity-60">📅 {formatDate(lead.createdAt)}</div>
                  </div>

                  {/* Biens reliés au vendeur (résumé permanent) */}
                  {(lead.category || 'immobilier') === 'immobilier' && (lead.role || 'ACHETEUR') === 'VENDEUR' && biensOfSeller(lead.id).length > 0 && (
                    <div className="mb-3 text-sm">
                      <span className="font-medium text-[#B89C6D]">🏠 Biens en vente ({biensOfSeller(lead.id).length}) :</span>{' '}
                      {biensOfSeller(lead.id).map((b: any, i: number) => (
                        <span key={b.id}>
                          {i > 0 && ', '}
                          <a href={`/admin/contenu/biens?edit=${b.id}`} className="underline hover:opacity-70">{b.title || b.id}</a>
                          {b.mandateSignStatus === 'SIGNED' ? ' ✔' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Résumé acheteur : catégorie recherchée + bien précis d'intérêt */}
                  {(lead.category || 'immobilier') === 'immobilier' && (lead.role || 'ACHETEUR') === 'ACHETEUR' && (lead.buyerSegment || lead.interestPropertyId) && (
                    <div className="mb-2 text-sm flex items-center gap-2 flex-wrap">
                      {lead.buyerSegment && (
                        <span className="pill text-xs border-teal-300 text-teal-700">{lead.buyerSegment === 'ANCIEN' ? '🏛️ Ancien' : '📉 Défiscalisation'}</span>
                      )}
                      {lead.interestPropertyId && (() => {
                        const b = properties.find((p: any) => p.id === lead.interestPropertyId);
                        return (
                          <span className="opacity-80">
                            <span className="font-medium text-teal-700">🎯 Bien visé :</span>{' '}
                            {b ? (
                              <a href={`/immobilier/biens/${b.id}`} target="_blank" rel="noopener noreferrer" className="underline">{b.title || b.id}{b.city ? ` — ${b.city}` : ''}</a>
                            ) : lead.interestPropertyId}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Résumé acheteur (critères + biens correspondants) */}
                  {(lead.category || 'immobilier') === 'immobilier' && (lead.role || 'ACHETEUR') === 'ACHETEUR' && hasCriteria(lead.buyerCriteria) && (
                    <div className="mb-3 text-sm">
                      <span className="font-medium text-teal-700">🔎 Recherche :</span>{' '}
                      <span className="opacity-80">
                        {[
                          lead.buyerCriteria?.type ? (lead.buyerCriteria.type === 'MAISON' ? 'Maison' : 'Appartement') : null,
                          lead.buyerCriteria?.roomsMin ? `${lead.buyerCriteria.roomsMin}+ pièces` : null,
                          lead.buyerCriteria?.surfaceMin ? `≥ ${lead.buyerCriteria.surfaceMin} m²` : null,
                          lead.buyerCriteria?.budgetMax ? `≤ ${Number(lead.buyerCriteria.budgetMax).toLocaleString('fr-FR')} €` : null,
                          lead.buyerCriteria?.sector ? `secteur ${lead.buyerCriteria.sector}` : null,
                        ].filter(Boolean).join(' · ') || 'critères enregistrés'}
                      </span>
                      <span className="ml-2 pill text-xs border-teal-300 text-teal-700">{matchingBiens(lead.buyerCriteria).length} bien(s) correspondant(s)</span>
                    </div>
                  )}

                  {/* Panneau acheteur : critères de recherche + biens correspondants */}
                  {buyerLeadId === lead.id && (
                    <div className="mb-3 p-3 rounded border border-teal-200 bg-teal-50" data-testid={`buyer-panel-${lead.id}`}>
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1 text-teal-700">
                        <Search className="w-3 h-3" />
                        Recherche de l&apos;acheteur
                      </label>
                      <div className="grid md:grid-cols-2 gap-2 mb-2">
                        <select className="input text-sm" value={buyerForm.segment} onChange={e => setBuyerForm({ ...buyerForm, segment: e.target.value })}>
                          <option value="">Catégorie — indifférent</option>
                          <option value="ANCIEN">Ancien</option>
                          <option value="DEFISCALISATION">Défiscalisation</option>
                        </select>
                        <select className="input text-sm" value={buyerForm.interestPropertyId} onChange={e => setBuyerForm({ ...buyerForm, interestPropertyId: e.target.value })}>
                          <option value="">Bien précis — aucun</option>
                          {properties
                            .filter((p: any) => p.visible !== false && !p.sold && p.status !== 'SOLD')
                            .map((p: any) => (
                              <option key={p.id} value={p.id}>{p.title || p.id}{p.city ? ` — ${p.city}` : ''}</option>
                            ))}
                        </select>
                      </div>
                      <label className="block text-xs opacity-70 mb-1">Critères de recherche</label>
                      <div className="grid md:grid-cols-3 gap-2">
                        <select className="input text-sm" value={buyerForm.type} onChange={e => setBuyerForm({ ...buyerForm, type: e.target.value })}>
                          <option value="">Type — indifférent</option>
                          <option value="APPARTEMENT">Appartement</option>
                          <option value="MAISON">Maison</option>
                        </select>
                        <input className="input text-sm" type="number" min="0" placeholder="Pièces min." value={buyerForm.roomsMin} onChange={e => setBuyerForm({ ...buyerForm, roomsMin: e.target.value })} />
                        <input className="input text-sm" type="number" min="0" placeholder="Surface min. (m²)" value={buyerForm.surfaceMin} onChange={e => setBuyerForm({ ...buyerForm, surfaceMin: e.target.value })} />
                        <input className="input text-sm" type="number" min="0" placeholder="Budget min. (€)" value={buyerForm.budgetMin} onChange={e => setBuyerForm({ ...buyerForm, budgetMin: e.target.value })} />
                        <input className="input text-sm" type="number" min="0" placeholder="Budget max. (€)" value={buyerForm.budgetMax} onChange={e => setBuyerForm({ ...buyerForm, budgetMax: e.target.value })} />
                        <input className="input text-sm" placeholder="Secteur (ville / région)" value={buyerForm.sector} onChange={e => setBuyerForm({ ...buyerForm, sector: e.target.value })} />
                      </div>
                      <button
                        onClick={() => saveBuyerCriteria(lead)}
                        disabled={savingBuyer}
                        className="btn-luxe text-sm px-3 py-1.5 flex items-center gap-1 disabled:opacity-60 mt-3"
                        data-testid={`button-save-buyer-${lead.id}`}
                      >
                        <Search className="w-3 h-3" />
                        {savingBuyer ? 'Enregistrement…' : 'Enregistrer les critères'}
                      </button>

                      {/* Biens correspondants (aperçu live selon le formulaire) */}
                      <div className="mt-3 pt-3 border-t border-teal-200">
                        <label className="block text-xs opacity-70 mb-1">Biens disponibles correspondants ({matchingBiens(currentBuyerCriteria()).length})</label>
                        {matchingBiens(currentBuyerCriteria()).length === 0 ? (
                          <p className="text-xs opacity-60">Aucun bien ne correspond {hasCriteria(currentBuyerCriteria()) ? 'à ces critères' : '— renseignez des critères ci-dessus'}.</p>
                        ) : (
                          <div className="space-y-1">
                            {matchingBiens(currentBuyerCriteria()).map((b: any) => (
                              <div key={b.id} className="flex items-center gap-2 text-sm">
                                <a href={`/immobilier/biens/${b.id}`} target="_blank" rel="noopener noreferrer" className="underline flex-1">
                                  {b.title || b.id}{b.city ? ` — ${b.city}` : ''}{!b.priceOnRequest && b.price ? ` · ${Number(b.price).toLocaleString('fr-FR')} €` : ''}
                                </a>
                                <a href={`/admin/contenu/biens?edit=${b.id}`} className="text-gray-500 hover:opacity-70" title="Ouvrir le bien"><Edit2 className="w-3.5 h-3.5" /></a>
                              </div>
                            ))}
                          </div>
                        )}
                        {lead.email && matchingBiens(currentBuyerCriteria()).length > 0 && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => proposeBiens(lead)}
                              disabled={proposing === lead.id}
                              className="btn text-sm px-3 py-1 flex items-center gap-1 disabled:opacity-60"
                              data-testid={`button-propose-${lead.id}`}
                            >
                              <Mail className="w-3.5 h-3.5" /> {proposing === lead.id ? 'Envoi…' : 'Proposer ces biens par email'}
                            </button>
                            {proposeMsg?.leadId === lead.id && (
                              <span className={`text-xs ${proposeMsg.ok ? 'text-green-700' : 'text-red-600'}`}>{proposeMsg.text}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Panneau vendeur : éléments du mandat + création du bien + liaison */}
                  {mandatLeadId === lead.id && (
                    <div className="mb-3 p-3 rounded border border-amber-200 bg-amber-50" data-testid={`mandat-picker-${lead.id}`}>
                      <label className="block text-xs font-semibold mb-2 flex items-center gap-1 text-[#B89C6D]">
                        <FileText className="w-3 h-3" />
                        Éléments du mandat — création du bien
                      </label>

                      {/* Le bien */}
                      <div className="text-xs font-semibold text-gray-600 mb-1">🏠 Le bien</div>
                      <div className="grid md:grid-cols-3 gap-2">
                        <select className="input text-sm" value={mandatForm.type} onChange={e => setMandatForm({ ...mandatForm, type: e.target.value })}>
                          <option value="APPARTEMENT">Appartement</option>
                          <option value="MAISON">Maison</option>
                        </select>
                        <input className="input text-sm" type="number" min="0" placeholder="Pièces" value={mandatForm.rooms} onChange={e => setMandatForm({ ...mandatForm, rooms: e.target.value })} />
                        <input className="input text-sm" placeholder="Réf. cadastrale" value={mandatForm.cadastre} onChange={e => setMandatForm({ ...mandatForm, cadastre: e.target.value })} />
                        <input className="input text-sm" type="number" min="0" placeholder="Surface Carrez (m²)" value={mandatForm.surface} onChange={e => setMandatForm({ ...mandatForm, surface: e.target.value })} />
                        <input className="input text-sm" type="number" min="0" placeholder="Surface hors Carrez (m²)" value={mandatForm.annexSurface} onChange={e => setMandatForm({ ...mandatForm, annexSurface: e.target.value })} />
                        {mandatForm.type === 'MAISON' && (
                          <input className="input text-sm" type="number" min="0" placeholder="Terrain (m²)" value={mandatForm.landSize} onChange={e => setMandatForm({ ...mandatForm, landSize: e.target.value })} />
                        )}
                        <input className="input text-sm md:col-span-3" placeholder="Adresse du bien (avec code postal + ville)" value={mandatForm.address} onChange={e => setMandatForm({ ...mandatForm, address: e.target.value })} />
                      </div>

                      {/* Le mandat */}
                      <div className="text-xs font-semibold text-gray-600 mt-3 mb-1">📄 Le mandat</div>
                      <div className="grid md:grid-cols-3 gap-2">
                        <select className="input text-sm" value={mandatForm.mandateType} onChange={e => setMandatForm({ ...mandatForm, mandateType: e.target.value })}>
                          <option value="SIMPLE">Mandat simple</option>
                          <option value="EXCLUSIF">Mandat exclusif</option>
                          <option value="SUCCES">Mandat succès</option>
                        </select>
                        <input className="input text-sm" placeholder="N° de mandat" value={mandatForm.mandateNumber} onChange={e => setMandatForm({ ...mandatForm, mandateNumber: e.target.value })} />
                        <select className="input text-sm" value={mandatForm.occupancy} onChange={e => setMandatForm({ ...mandatForm, occupancy: e.target.value })}>
                          <option value="LIBRE">Bien libre</option>
                          <option value="OCCUPE">Bien occupé / loué</option>
                        </select>
                        <textarea className="input text-sm md:col-span-3" rows={2} placeholder="Description du bien" value={mandatForm.description} onChange={e => setMandatForm({ ...mandatForm, description: e.target.value })} />
                        <input className="input text-sm" type="number" min="0" placeholder="Prix net vendeur (€)" value={mandatForm.netSellerAmount} onChange={e => setMandatForm({ ...mandatForm, netSellerAmount: e.target.value })} />
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setMandatForm({ ...mandatForm, commissionMode: 'PCT' })} className={`px-2 rounded text-sm border ${mandatForm.commissionMode === 'PCT' ? 'bg-[#B89C6D] text-white border-[#B89C6D]' : 'bg-white border-gray-300'}`}>%</button>
                          <button type="button" onClick={() => setMandatForm({ ...mandatForm, commissionMode: 'EUR' })} className={`px-2 rounded text-sm border ${mandatForm.commissionMode === 'EUR' ? 'bg-[#B89C6D] text-white border-[#B89C6D]' : 'bg-white border-gray-300'}`}>€</button>
                          {mandatForm.commissionMode === 'PCT' ? (
                            <input className="input text-sm flex-1" type="number" min="0" step="0.1" placeholder="Honoraires (%)" value={mandatForm.commissionPercentage} onChange={e => setMandatForm({ ...mandatForm, commissionPercentage: e.target.value })} />
                          ) : (
                            <input className="input text-sm flex-1" type="number" min="0" placeholder="Honoraires (€)" value={mandatForm.commissionAmount} onChange={e => setMandatForm({ ...mandatForm, commissionAmount: e.target.value })} />
                          )}
                        </div>
                        <select className="input text-sm" value={mandatForm.mandateHonorairesCharge} onChange={e => setMandatForm({ ...mandatForm, mandateHonorairesCharge: e.target.value })}>
                          <option value="VENDEUR">Honoraires charge vendeur</option>
                          <option value="ACQUEREUR">Honoraires charge acquéreur</option>
                        </select>
                      </div>
                      {(() => {
                        const net = Number(mandatForm.netSellerAmount) || 0;
                        const hon = mandatForm.commissionMode === 'EUR' ? (Number(mandatForm.commissionAmount) || 0) : Math.round(net * (Number(mandatForm.commissionPercentage) || 0) / 100);
                        if (!net) return null;
                        return (
                          <div className="mt-2 text-xs bg-white border border-amber-200 rounded px-2 py-1">
                            Net vendeur <strong>{net.toLocaleString('fr-FR')} €</strong> · Honoraires <strong>{hon.toLocaleString('fr-FR')} €</strong> · Prix FAI <strong className="text-[#B89C6D]">{(net + hon).toLocaleString('fr-FR')} €</strong>
                          </div>
                        );
                      })()}

                      <button
                        onClick={() => handleCreatePropertyFromLead(lead)}
                        disabled={creatingMandat === lead.id}
                        className="btn-luxe text-sm px-3 py-1.5 flex items-center gap-1 disabled:opacity-60 mt-3"
                        data-testid={`button-create-property-${lead.id}`}
                      >
                        <FileText className="w-3 h-3" />
                        {creatingMandat === lead.id ? 'Création…' : 'Créer le bien + mandat'}
                      </button>
                      <p className="text-xs opacity-60 mt-1">
                        Crée une fiche bien <strong>masquée</strong> pré-remplie avec ces éléments et le vendeur comme mandant, puis ouvre l&apos;éditeur. Le mandat signé est automatiquement archivé dans les documents du bien.
                      </p>

                      {/* Relier un bien existant à ce vendeur (indivision, biens multiples) */}
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <label className="block text-xs opacity-70 mb-1">Relier un bien existant à ce vendeur</label>
                        <div className="flex flex-wrap gap-2 items-center">
                          <select value={linkPropertyId} onChange={e => setLinkPropertyId(e.target.value)} className="input text-sm flex-1 min-w-[220px]">
                            <option value="">— Sélectionner un bien —</option>
                            {properties.filter((prop: any) => !(prop.sellerLeadIds || []).includes(lead.id)).map((prop: any) => (
                              <option key={prop.id} value={prop.id}>{prop.title || prop.id}{prop.city ? ` — ${prop.city}` : ''}</option>
                            ))}
                          </select>
                          <button onClick={() => linkExistingBien(lead)} className="btn text-sm px-3 py-1">Relier</button>
                        </div>
                      </div>

                      {/* Biens déjà reliés (avec délier) */}
                      {biensOfSeller(lead.id).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-amber-200">
                          <label className="block text-xs opacity-70 mb-1">Biens de ce vendeur</label>
                          <div className="space-y-1">
                            {biensOfSeller(lead.id).map((b: any) => (
                              <div key={b.id} className="flex items-center gap-2 text-sm">
                                <a href={`/admin/contenu/biens?edit=${b.id}`} className="underline flex-1">{b.title || b.id}{b.city ? ` — ${b.city}` : ''}</a>
                                <a href={`/api/properties/${b.id}/mandat/pdf`} target="_blank" rel="noopener noreferrer" className="text-[#B89C6D]" title="Mandat PDF"><Download className="w-4 h-4" /></a>
                                <button onClick={() => unlinkBien(b.id, lead.id)} className="text-red-600" title="Délier"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
      {!loading && view === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start" data-testid="pipeline-board">
          {pipelineCols.map(col => {
            const colLeads = filteredLeads.filter(l => (l.status || 'new') === col);
            return (
              <div
                key={col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragLeadId) changeStatus(dragLeadId, col); setDragLeadId(null); }}
                className="rounded-xl border bg-black/[0.02] p-2 min-h-[140px]"
              >
                <div className="flex items-center justify-between px-2 py-1.5 mb-2 border-b">
                  <span className="text-sm font-semibold">{STATUS_LABELS[col] || col}</span>
                  <span className="text-xs opacity-60">{colLeads.length}</span>
                </div>
                <div className="space-y-2">
                  {colLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragLeadId(lead.id)}
                      onDragEnd={() => setDragLeadId(null)}
                      className={`rounded-lg border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing ${dragLeadId === lead.id ? 'opacity-50' : ''}`}
                      data-testid={`pipeline-card-${lead.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{lead.firstName} {lead.lastName}</span>
                        {lead.priority && <span className={`pill text-[10px] font-semibold shrink-0 ${PRIORITY_META[lead.priority].cls}`}>{PRIORITY_META[lead.priority].label}</span>}
                      </div>
                      <div className="text-xs opacity-70 truncate">{lead.email}</div>
                      {lead.phone && <div className="text-xs opacity-70">{lead.phone}</div>}
                      {lead.topic && <div className="text-xs opacity-60 truncate mt-1">🏷️ {lead.topic}</div>}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] opacity-50">{formatDate(lead.createdAt)}</span>
                        <button type="button" onClick={() => handleEditLead(lead)} className="text-[11px] underline opacity-70 hover:opacity-100">Ouvrir</button>
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && <div className="text-xs opacity-40 px-2 py-6 text-center">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {dialog}
    </AdminShell>
  );
}
