"use client";
import AdminShell from "@/components/AdminShell";
import Breadcrumb from "@/components/Breadcrumb";
import FeaturePicker from "@/components/FeaturePicker";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import GoogleMapsScript from "@/components/GoogleMapsScript";
import ImageUploader from "@/components/ImageUploader";
import CompanyAutocomplete from "@/components/CompanyAutocomplete";
import CollapsibleSection from "@/components/CollapsibleSection";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import InfoVenteSection from "@/components/biens/InfoVenteSection";
import { propertyLabel } from "@/lib/propertyLabel";
import DocumentsSection from "@/components/biens/DocumentsSection";
import { useEffect, useRef, useState } from "react";

type Property = {
  id: string;
  title: string;
  type: string;
  city: string;
  region: string;
  price: number;
  priceOnRequest?: boolean;
  surface: number;
  rooms: number;
  landSize?: number;
  annexSurface?: number;
  propertyTaxAmount?: number;
  coproChargesMonthly?: number;
  netSellerAmount?: number;
  commissionAmount?: number;
  commissionPercentage?: number;
  finalSalePrice?: number;
  negotiatedCommission?: number;
  sequestreAmount?: number;
  notaryClerk?: { name?: string; email?: string };
  buyerFirstName?: string;
  buyerLastName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  sellerNotary?: {
    officeName?: string;
    notaryName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    clerkName?: string;
    clerkEmail?: string;
  };
  buyerNotary?: {
    officeName?: string;
    notaryName?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    clerkName?: string;
    clerkEmail?: string;
  };
  furniture?: { label?: string; value?: number }[];
  description: string;
  images: string[];
  features: string[];
  map: {
    precision: string;
    query: string;
    zoom: number;
  };
  dpe: {
    classEnergy: string;
    classGES: string;
    consumptionKwh: number;
    emissionsKg: number;
    date: string;
    ref: string;
  };
  featured?: boolean;
  entreeDeGamme?: boolean;
  visible?: boolean;
  sold?: boolean;
  status?: 'AVAILABLE' | 'UNDER_OFFER' | 'SOLD';
  soldDate?: string;
  sortOrder?: number;
  // Informations cadastrales
  cadastralReference?: string;
  // Propriétaires
  owners?: Array<{type: string, firstName?: string, lastName?: string, name?: string, siren?: string, legalForm?: string, managerFirstName?: string, managerLastName?: string, managerRole?: string, email?: string, phone?: string, address?: string}>;
  mandateType?: 'SIMPLE' | 'EXCLUSIF' | 'SUCCES';
  mandateNumber?: string;
  mandateHonorairesCharge?: 'VENDEUR' | 'ACQUEREUR';
  occupancy?: 'LIBRE' | 'OCCUPE';
  mandatePlace?: string;
  mandateSignToken?: string;
  mandateSignStatus?: 'PENDING' | 'SIGNED';
  mandateSignature?: { signedAt?: string };
  // Documents
  titleDeed?: string;
  dpeDocument?: string;
  propertyTax?: string;
  mandate?: string;
  estimation?: string;
  propertyRules?: string;
  agMinutes?: string[];
  chargesStatement?: string;
  // Plan et vidéo
  floorPlan?: string;
  floorPlans?: string[];
  videoUrl?: string;
};

const EMPTY_PROPERTY: Partial<Property> = {
  title: "",
  type: "APPARTEMENT",
  city: "",
  region: "PARIS",
  price: 0,
  surface: 0,
  rooms: 0,
  landSize: undefined,
  description: "",
  images: [],
  features: [],
  map: { precision: "AREA", query: "", zoom: 14 },
  dpe: {
    classEnergy: "D",
    classGES: "D",
    consumptionKwh: 0,
    emissionsKg: 0,
    date: new Date().toISOString().split('T')[0],
    ref: ""
  },
  featured: false,
  visible: true,
  sold: false,
  status: 'AVAILABLE',
  soldDate: undefined,
  cadastralReference: undefined,
  owners: [],
  titleDeed: undefined,
  dpeDocument: undefined,
  propertyTax: undefined,
  mandate: undefined,
  estimation: undefined,
  propertyRules: undefined,
  agMinutes: [],
  chargesStatement: undefined,
  floorPlan: undefined,
  videoUrl: undefined
};

export default function Page() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Property> | null>(null);
  const [viewing, setViewing] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSoldView, setShowSoldView] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [genMandate, setGenMandate] = useState(false);
  const [searchingCadastre, setSearchingCadastre] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'FROM_NET' | 'FROM_FAI'>('FROM_NET'); // Mode de calcul financier
  const [gmail, setGmail] = useState<{ configured: boolean; connected: boolean; email: string }>({ configured: false, connected: false, email: '' });
  const [notaireBusy, setNotaireBusy] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  // Suivi des modifications non enregistrées de la fiche bien.
  const [dirty, setDirty] = useState(false);
  const openingRef = useRef(false);
  // Ouvre la fiche en marquant l'état « propre » (non modifié).
  const startEdit = (p: Partial<Property> | null) => { openingRef.current = true; setDirty(false); setEditing(p); };
  // Toute modification de `editing` (sauf l'ouverture) marque la fiche « sale ».
  useEffect(() => {
    if (!editing) return;
    if (openingRef.current) { openingRef.current = false; return; }
    setDirty(true);
  }, [editing]);
  // Avertit avant de quitter/rafraîchir si des modifications ne sont pas enregistrées.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // Validation inline des champs sensibles (email/SIREN propriétaire, prix).
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ownerErrors = ((editing?.owners as any[]) || []).map((o: any) => ({
    email: o?.email && !emailRe.test(String(o.email).trim()) ? 'Adresse email invalide' : '',
    siren: o?.type === 'COMPANY' && o?.siren && !/^\d{9}$/.test(String(o.siren).replace(/\s/g, '')) ? 'Le SIREN doit comporter 9 chiffres' : '',
  }));
  const priceError = editing && !editing.priceOnRequest && editing.price != null && (isNaN(Number(editing.price)) || Number(editing.price) <= 0) ? 'Prix invalide' : '';
  const netError = editing && editing.netSellerAmount != null && editing.price != null && Number(editing.netSellerAmount) > Number(editing.price) ? 'Le net vendeur ne peut pas dépasser le prix FAI' : '';
  const formErrors = [priceError, netError, ...ownerErrors.flatMap((e: any) => [e.email, e.siren])].filter(Boolean);
  const errCls = "text-xs text-red-600 mt-1";

  // Fonction pour rechercher la parcelle cadastrale
  const searchCadastralReference = async () => {
    // Utiliser l'adresse complète du champ map.query, ou construire à partir de la ville
    const fullAddress = editing?.map?.query || editing?.city;
    
    if (!fullAddress) {
      toast('⚠️ Veuillez d\'abord renseigner l\'adresse complète');
      return;
    }

    // Utiliser l'adresse complète pour une meilleure précision
    const address = fullAddress.includes(',') ? fullAddress : `${fullAddress}, France`;

    setSearchingCadastre(true);
    try {
      const response = await fetch(`/api/cadastre?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Erreur lors de la recherche');
      }

      const data = await response.json();

      if (data.success) {
        setEditing(prev => {
          if (!prev) return null;
          return {
            ...prev,
            cadastralReference: data.cadastralReference,
            // Stocker la surface du terrain depuis le cadastre
            landSize: data.details.surface ? Math.round(data.details.surface) : prev.landSize
          };
        });
        
        toast(`✅ Parcelle cadastrale trouvée !\n\nRéférence: ${data.cadastralReference}\nCommune: ${data.details.commune}\nSurface du terrain: ${data.details.surface ? Math.round(data.details.surface) + ' m²' : 'N/A'}`);
      } else {
        toast(`⚠️ ${data.message}`);
      }
    } catch (error: any) {
      console.error('Erreur cadastre:', error);
      toast(`❌ Erreur: ${error.message}`);
    } finally {
      setSearchingCadastre(false);
    }
  };

  // Fonction pour analyser un document avec l'IA
  const analyzeDocument = async (documentBase64: string) => {
    if (!documentBase64) {
      toast('⚠️ Aucun document à analyser');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: documentBase64 })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Erreur lors de l\'analyse');
      }

      const analysis = await response.json();
      
      // Fusionner les données analysées avec le formulaire actuel
      setEditing(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          // Informations générales
          ...(analysis.title && { title: analysis.title }),
          ...(analysis.type && { type: analysis.type }),
          ...(analysis.city && { city: analysis.city }),
          ...(analysis.region && { region: analysis.region }),
          ...(analysis.price && { price: analysis.price }),
          ...(analysis.surface && { surface: analysis.surface }),
          ...(analysis.rooms && { rooms: analysis.rooms }),
          ...(analysis.landSize && { landSize: analysis.landSize }),
          ...(analysis.description && { description: analysis.description }),
          ...(analysis.features && { features: analysis.features }),
          // DPE
          ...(analysis.dpe && {
            dpe: {
              ...prev.dpe,
              ...analysis.dpe,
              ref: prev.dpe?.ref || ''
            }
          })
        };
      });

      toast('✅ Document analysé ! Les informations ont été préremplies.');
    } catch (error: any) {
      console.error('Erreur d\'analyse:', error);
      toast(`❌ Erreur: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Fonction pour ouvrir un document dans un nouvel onglet
  const openDocument = (url: string) => {
    if (url.startsWith('data:')) {
      // Convertir Base64 en blob URL pour les documents encodés
      try {
        const [header, base64Data] = url.split(',');
        const mimeMatch = header.match(/data:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        
        // Ouvrir dans un nouvel onglet
        window.open(blobUrl, '_blank');
        
        // Nettoyer l'URL après un délai
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (error) {
        console.error('Erreur de conversion Base64:', error);
        toast('❌ Erreur lors de l\'ouverture du document');
      }
    } else {
      // URL externe - ouvrir directement
      window.open(url, '_blank');
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      // Assigner un type par défaut aux propriétés existantes qui n'en ont pas
      const propertiesWithType = Array.isArray(data) 
        ? data.map((p: any) => ({ ...p, type: p.type || 'APPARTEMENT' }))
        : [];
      setProperties(propertiesWithType);
    } catch {
      setProperties([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // État de connexion Gmail + retour du flux OAuth (?gmail=...).
  useEffect(() => {
    fetch('/api/google/status').then(r => r.json()).then(setGmail).catch(() => {});
    const g = new URLSearchParams(window.location.search).get('gmail');
    if (g === 'connected') toast('✅ Gmail connecté. Vous pouvez générer les brouillons pour les notaires.');
    else if (g === 'notconfigured') toast('⚠️ Identifiants Google non configurés côté serveur (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
    else if (g === 'denied') toast('Connexion Gmail refusée.');
    else if (g === 'error') toast('Échec de la connexion Gmail. Réessayez.');
  }, []);

  // Crée un brouillon Gmail à destination des notaires (dossier du bien).
  const sendNotaireDraft = async (property: Property) => {
    if (!gmail.connected) {
      if (await confirm("Gmail n'est pas connecté. Se connecter maintenant pour déposer les brouillons ?")) {
        window.location.href = '/api/google/oauth/start?return=/admin/contenu/biens';
      }
      return;
    }
    setNotaireBusy(property.id);
    try {
      const res = await fetch(`/api/properties/${property.id}/notaire-draft`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) toast(`✅ Brouillon créé dans Gmail (${gmail.email})\nDestinataires : ${(d.recipients || []).join(', ')}\nPièces jointes : ${d.attachments}\n\nRelisez-le dans vos Brouillons avant de l'envoyer.`);
      else toast(d.error || 'Erreur lors de la création du brouillon.');
    } catch { toast('Erreur réseau.'); }
    setNotaireBusy(null);
  };

  // Ouverture directe d'une fiche via ?edit=<id> (ex. depuis le CRM, après
  // création d'une fiche bien à partir d'un lead pour saisir le mandat).
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (openedFromUrl.current || properties.length === 0) return;
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    const prop = properties.find(p => p.id === editId);
    if (prop) {
      openedFromUrl.current = true;
      startEdit(prop);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [properties]);

  const [reordering, setReordering] = useState(false);

  // Ordre d'affichage public des biens « en vente » : sortOrder puis prix décroissant
  const enVenteOrdered = () =>
    properties
      .filter(p => !(p.sold || p.status === 'UNDER_OFFER' || p.status === 'SOLD'))
      .sort((a, b) => {
        const ao = typeof a.sortOrder === 'number' ? a.sortOrder : null;
        const bo = typeof b.sortOrder === 'number' ? b.sortOrder : null;
        if (ao !== null && bo !== null && ao !== bo) return ao - bo;
        if (ao !== null && bo === null) return -1;
        if (bo !== null && ao === null) return 1;
        return (b.price || 0) - (a.price || 0);
      });

  // Monter/descendre un bien : réordonne la liste en vente et persiste sortOrder
  const moveProperty = async (id: string, dir: 'up' | 'down') => {
    const ordered = enVenteOrdered();
    const idx = ordered.findIndex(p => p.id === id);
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    [ordered[idx], ordered[swap]] = [ordered[swap], ordered[idx]];
    setReordering(true);
    try {
      // Réassigner un sortOrder séquentiel et n'enregistrer que ce qui change
      const changed = ordered
        .map((p, i) => ({ ...p, sortOrder: i }))
        .filter(p => p.sortOrder !== properties.find(q => q.id === p.id)?.sortOrder);
      await Promise.all(
        changed.map(p =>
          fetch(`/api/properties/${p.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...p, type: p.type || 'APPARTEMENT' }),
          })
        )
      );
      await fetchProperties();
    } catch {
      toast('Erreur lors du réordonnancement');
    }
    setReordering(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    
    // Validation rapide
    if (!editing.title || !editing.city || !editing.description) {
      toast('⚠️ Veuillez remplir tous les champs obligatoires (Titre, Ville, Description)');
      return;
    }
    // Validation inline (email/SIREN propriétaire, prix)
    if (formErrors.length) {
      toast(`⚠️ Corrigez les erreurs avant d'enregistrer :\n• ${formErrors.join('\n• ')}`);
      return;
    }

    // S'assurer que le type a une valeur par défaut
    const propertyToSave = {
      ...editing,
      type: editing.type || 'APPARTEMENT'
    };
    
    setSaving(true);
    try {
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `/api/properties/${editing.id}` : '/api/properties';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyToSave),
        credentials: 'include'
      });
      
      if (res.ok) {
        await fetchProperties();
        setDirty(false);
        setEditing(null);
        toast('✅ Bien immobilier enregistré avec succès');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur serveur:', res.status, errorData);
        toast(`❌ Erreur ${res.status}: ${errorData.error || JSON.stringify(errorData)}`);
      }
    } catch (err: any) {
      console.error('❌ Erreur réseau:', err);
      toast(`❌ Erreur lors de la sauvegarde: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm('Ce bien sera définitivement supprimé.', { title: 'Supprimer ce bien ?' }))) return;
    try {
      const res = await fetch(`/api/properties/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        await fetchProperties();
      }
    } catch (err) {
      toast('Erreur lors de la suppression');
    }
  };

  const updateField = (field: string, value: any) => {
    setEditing(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateNestedField = (parent: 'map' | 'dpe', field: string, value: any) => {
    setEditing(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [parent]: { ...(prev[parent] || {}), [field]: value }
      };
    });
  };


  return (
    <AdminShell title="Biens immobiliers">
      <GoogleMapsScript />
      <Breadcrumb items={[
        { label: "Accueil", href: "/" },
        { label: "Administration", href: "/admin" },
        { label: "Contenu", href: "/admin/contenu" },
        { label: "Biens" }
      ]} />

      {/* Boutons de bascule entre vues */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowSoldView(false)}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            !showSoldView
              ? 'bg-[#1F3B2C] text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid="button-view-available"
        >
          Biens en vente
        </button>
        <button
          onClick={() => setShowSoldView(true)}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            showSoldView
              ? 'bg-[#1F3B2C] text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid="button-view-sold"
        >
          Biens vendus
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => startEdit(EMPTY_PROPERTY)}
          className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D]"
          data-testid="button-new-property"
        >
          + Nouveau bien
        </button>
        {gmail.connected ? (
          <span className="text-xs text-green-700 flex items-center gap-1" title="Les brouillons pour notaires seront déposés dans cette boîte">
            ✅ Gmail connecté{gmail.email ? ` (${gmail.email})` : ''}
            <a href="/api/google/oauth/start?return=/admin/contenu/biens" className="ml-1 underline text-[#1F3B2C]/70 hover:text-[#1F3B2C]" title="Ré-autoriser Google (pour ajouter un nouveau droit)">· Reconnecter</a>
          </span>
        ) : (
          <a href="/api/google/oauth/start?return=/admin/contenu/biens" className="text-xs px-3 py-1.5 border border-[#1F3B2C] text-[#1F3B2C] rounded hover:bg-[#1F3B2C]/5">
            Connecter Gmail (brouillons notaires)
          </a>
        )}
      </div>


      {/* Modal de lecture complète du bien */}
      {viewing && (
        <div className="card p-6 mb-6" data-testid="view-property">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Fiche complète - {viewing.title}</h2>
            <button
              onClick={() => setViewing(null)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              data-testid="button-close-view"
            >
              Fermer
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Colonne gauche */}
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Informations générales</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type :</span>
                    <span className="font-medium">{viewing.type === 'APPARTEMENT' ? 'Appartement' : 'Maison'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ville :</span>
                    <span className="font-medium">{viewing.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Région :</span>
                    <span className="font-medium">{viewing.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix :</span>
                    <span className="font-medium text-[#B89C6D]">{viewing.priceOnRequest ? 'Nous consulter' : `${viewing.price.toLocaleString('fr-FR')} €`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Surface :</span>
                    <span className="font-medium">{viewing.surface} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pièces :</span>
                    <span className="font-medium">{viewing.rooms}</span>
                  </div>
                  {viewing.landSize && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Terrain :</span>
                      <span className="font-medium">{viewing.landSize} m²</span>
                    </div>
                  )}
                  {viewing.annexSurface && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Surface hors Carrez :</span>
                      <span className="font-medium">{viewing.annexSurface} m²</span>
                    </div>
                  )}
                  {viewing.propertyTaxAmount ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxe foncière :</span>
                      <span className="font-medium">{viewing.propertyTaxAmount.toLocaleString('fr-FR')} €/an</span>
                    </div>
                  ) : null}
                  {viewing.coproChargesMonthly ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Charges copropriété :</span>
                      <span className="font-medium">{viewing.coproChargesMonthly.toLocaleString('fr-FR')} €/mois</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Référence :</span>
                    <span className="font-medium">{viewing.id}</span>
                  </div>
                  {viewing.cadastralReference && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parcelle cadastrale :</span>
                      <span className="font-medium">{viewing.cadastralReference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Description</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewing.description}</p>
              </div>

              {/* Prestations */}
              {viewing.features && viewing.features.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Prestations</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewing.features.map((feature, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white border rounded-lg text-sm">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* DPE */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Diagnostic de Performance Énergétique</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Classe énergie :</span>
                    <span className="font-medium">{viewing.dpe.classEnergy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Classe GES :</span>
                    <span className="font-medium">{viewing.dpe.classGES}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Consommation :</span>
                    <span className="font-medium">{viewing.dpe.consumptionKwh} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Émissions :</span>
                    <span className="font-medium">{viewing.dpe.emissionsKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date :</span>
                    <span className="font-medium">{viewing.dpe.date}</span>
                  </div>
                </div>
              </div>

              {/* Configuration carte */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Configuration carte</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Précision :</span>
                    <span className="font-medium">{viewing.map.precision === 'EXACT' ? 'Exacte' : 'Zone'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Zoom :</span>
                    <span className="font-medium">{viewing.map.zoom}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Requête :</span>
                    <p className="font-medium text-xs mt-1 break-words">{viewing.map.query}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              {/* Images */}
              {viewing.images && viewing.images.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Images ({viewing.images.length})</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {viewing.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Image ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        {idx === 0 && (
                          <span className="absolute top-2 left-2 bg-[#B89C6D] text-white text-xs px-2 py-1 rounded">
                            Principale
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents administratifs */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Documents administratifs</h3>
                {(() => {
                  const docs = [];
                  
                  if (viewing.titleDeed) docs.push({ name: "Titre de propriété", url: viewing.titleDeed });
                  if (viewing.dpeDocument) docs.push({ name: "Document DPE", url: viewing.dpeDocument });
                  if (viewing.propertyTax) docs.push({ name: "Taxe foncière", url: viewing.propertyTax });
                  if (viewing.mandate) docs.push({ name: "Mandat", url: viewing.mandate });
                  if (viewing.estimation) docs.push({ name: "Estimation", url: viewing.estimation });
                  {
                    const vplans = (Array.isArray(viewing.floorPlans) && viewing.floorPlans.length)
                      ? viewing.floorPlans
                      : (viewing.floorPlan ? [viewing.floorPlan] : []);
                    vplans.forEach((plan: string, idx: number) => {
                      docs.push({ name: vplans.length > 1 ? `Plan ${idx + 1}` : "Plan du bien", url: plan });
                    });
                  }

                  if (viewing.type === 'APPARTEMENT') {
                    if (viewing.propertyRules) docs.push({ name: "Règlement de propriété", url: viewing.propertyRules });
                    if (viewing.chargesStatement) docs.push({ name: "Relevé de charges", url: viewing.chargesStatement });
                    if (Array.isArray(viewing.agMinutes) && viewing.agMinutes.length > 0) {
                      viewing.agMinutes.forEach((doc: string, idx: number) => {
                        docs.push({ name: `PV d'AG ${idx + 1}`, url: doc });
                      });
                    }
                  }
                  
                  if (docs.length === 0) {
                    return (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Aucun document disponible
                      </p>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {docs.map((doc, idx) => (
                        <div
                          key={idx}
                          className="p-3 border bg-white rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📄</span>
                              <span className="text-sm font-medium">{doc.name}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openDocument(doc.url)}
                              className="flex-1 px-3 py-2 text-sm border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white transition text-center"
                              data-testid={`button-read-document-${idx}`}
                            >
                              👁️ Lire
                            </button>
                            <a
                              href={doc.url}
                              download
                              className="flex-1 px-3 py-2 text-sm bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D] transition text-center"
                              data-testid={`button-download-document-${idx}`}
                            >
                              ⬇️ Télécharger
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="card p-6 mb-6" data-testid="form-property">
          <h2 className="text-2xl font-semibold mb-4">
            {editing.id ? 'Modifier le bien' : 'Nouveau bien'}
          </h2>

          {/* Infos générales + Propriétaires en 2 colonnes */}
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            {/* Colonne 1: Informations générales */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base mb-2 pb-2 border-b">Informations générales</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Titre</label>
                  <input
                    type="text"
                    value={editing.title || ''}
                    onChange={e => updateField('title', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded"
                    data-testid="input-title"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={editing.type || 'APPARTEMENT'}
                    onChange={e => updateField('type', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded"
                    data-testid="select-type"
                  >
                    <option value="APPARTEMENT">Appartement</option>
                    <option value="MAISON">Maison</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Occupation</label>
                <select
                  value={editing.occupancy || 'LIBRE'}
                  onChange={e => updateField('occupancy', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border rounded"
                  data-testid="select-occupancy"
                >
                  <option value="LIBRE">Libre</option>
                  <option value="OCCUPE">Loué (occupé)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1">Repris automatiquement sur le mandat (bien libre / loué).</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Adresse</label>
                <AddressAutocomplete
                  value={editing.map?.query || ''}
                  onChange={(components) => {
                    setEditing({
                      ...editing,
                      city: components.city,
                      region: components.region,
                      map: {
                        ...(editing.map || { precision: 'AREA', zoom: 14 }),
                        query: components.address
                      }
                    });
                  }}
                  placeholder="123 Avenue, Paris"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Ville</label>
                  <input
                    type="text"
                    value={editing.city || ''}
                    onChange={e => updateField('city', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-gray-50"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Région</label>
                  <select
                    value={editing.region || 'PARIS'}
                    onChange={e => updateField('region', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-gray-50"
                    data-testid="select-region"
                  >
                    <option value="PARIS">Paris</option>
                    <option value="NORMANDIE">Normandie</option>
                    <option value="COTE_D_AZUR">Côte d&apos;Azur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Surface (m²)</label>
                  <input
                    type="number"
                    value={editing.surface ?? ''}
                    onChange={e => updateField('surface', e.target.value === '' ? undefined : (parseInt(e.target.value) || 0))}
                    onFocus={e => e.target.select()}
                    className="w-full px-2 py-1.5 text-sm border rounded"
                    data-testid="input-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Pièces</label>
                  <input
                    type="number"
                    value={editing.rooms ?? ''}
                    onChange={e => updateField('rooms', e.target.value === '' ? undefined : (parseInt(e.target.value) || 0))}
                    onFocus={e => e.target.select()}
                    className="w-full px-2 py-1.5 text-sm border rounded"
                    data-testid="input-rooms"
                  />
                </div>
                {editing.type === 'MAISON' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Terrain (m²)</label>
                    <input
                      type="number"
                      value={editing.landSize || ''}
                      onChange={e => updateField('landSize', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-2 py-1.5 text-sm border rounded"
                      data-testid="input-land-size"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1">Surface HC (m²)</label>
                  <input
                    type="number"
                    value={editing.annexSurface || ''}
                    onChange={e => updateField('annexSurface', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1.5 text-sm border rounded"
                    data-testid="input-annex-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Taxe foncière (€/an)</label>
                  <input
                    type="number"
                    value={editing.propertyTaxAmount ?? ''}
                    onChange={e => updateField('propertyTaxAmount', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1.5 text-sm border rounded"
                    data-testid="input-property-tax-amount"
                    placeholder="ex : 1200"
                  />
                </div>
                {editing.type === 'APPARTEMENT' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Charges copropriété (€/mois)</label>
                    <input
                      type="number"
                      value={editing.coproChargesMonthly ?? ''}
                      onChange={e => updateField('coproChargesMonthly', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-2 py-1.5 text-sm border rounded"
                      data-testid="input-copro-charges-monthly"
                      placeholder="ex : 180"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Parcelle cadastrale</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={editing.cadastralReference || ''}
                      onChange={e => updateField('cadastralReference', e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border rounded"
                      data-testid="input-cadastral-reference"
                      placeholder="AB 0123"
                    />
                    <button
                      type="button"
                      onClick={searchCadastralReference}
                      disabled={searchingCadastre || !editing?.map?.query}
                      className="px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      data-testid="button-search-cadastre"
                    >
                      {searchingCadastre ? '...' : '🔍'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Statut</label>
                  <div className="flex flex-col gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditing(prev => prev ? { ...prev, status: 'AVAILABLE', sold: false } : null)}
                      className={`px-2 py-1.5 rounded text-left transition-colors ${
                        editing.status === 'AVAILABLE'
                          ? 'bg-green-600 text-white font-medium'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid="button-status-available"
                    >
                      ✓ En vente
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(prev => prev ? { ...prev, status: 'UNDER_OFFER', sold: false } : null)}
                      className={`px-2 py-1.5 rounded text-left transition-colors ${
                        editing.status === 'UNDER_OFFER'
                          ? 'bg-orange-500 text-white font-medium'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid="button-status-under-offer"
                    >
                      ⏳ Sous promesse
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(prev => {
                          if (!prev) return null;
                          return {
                            ...prev,
                            status: 'SOLD',
                            soldDate: prev.soldDate 
                              ? prev.soldDate 
                              : new Date().toISOString().split('T')[0]
                          };
                        });
                      }}
                      className={`px-2 py-1.5 rounded text-left transition-colors ${
                        editing.status === 'SOLD'
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      data-testid="button-status-sold"
                    >
                      ✓ Vendu
                    </button>
                  </div>
                </div>
              </div>

              {editing.status === 'SOLD' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Date de vente</label>
                  <input
                    type="date"
                    value={editing.soldDate || ''}
                    onChange={e => updateField('soldDate', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded"
                    data-testid="input-sold-date"
                  />
                </div>
              )}
            </div>

            {/* Colonne 2: Propriétaires */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <h3 className="font-semibold text-base">Propriétaires</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        owners: [...(prev.owners || []), { type: 'INDIVIDUAL', name: '' }]
                      };
                    });
                  }}
                  className="px-2 py-1 text-xs bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D]"
                  data-testid="button-add-owner"
                >
                  + Ajouter
                </button>
              </div>

              {(!editing.owners || editing.owners.length === 0) && (
                <p className="text-xs text-gray-500 text-center py-3 bg-gray-50 rounded">
                  Aucun propriétaire
                </p>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {editing.owners?.map((owner, index) => (
                  <div key={index} className="p-2 bg-white border rounded text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            name={`owner-type-${index}`}
                            value="INDIVIDUAL"
                            checked={owner.type === 'INDIVIDUAL'}
                            onChange={() => {
                              const newOwners = [...(editing.owners || [])];
                              newOwners[index] = { ...owner, type: 'INDIVIDUAL', siren: undefined };
                              updateField('owners', newOwners);
                            }}
                            data-testid={`radio-owner-individual-${index}`}
                          />
                          <span className="text-xs">Physique</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            name={`owner-type-${index}`}
                            value="COMPANY"
                            checked={owner.type === 'COMPANY'}
                            onChange={() => {
                              const newOwners = [...(editing.owners || [])];
                              newOwners[index] = { ...owner, type: 'COMPANY' };
                              updateField('owners', newOwners);
                            }}
                            data-testid={`radio-owner-company-${index}`}
                          />
                          <span className="text-xs">Société</span>
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newOwners = [...(editing.owners || [])];
                          newOwners.splice(index, 1);
                          updateField('owners', newOwners);
                        }}
                        className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        data-testid={`button-remove-owner-${index}`}
                      >
                        ✕
                      </button>
                    </div>

                    {owner.type === 'COMPANY' ? (
                      <div className="space-y-2">
                        <CompanyAutocomplete
                          value={owner.name || ''}
                          onSelect={(company) => {
                            const newOwners = [...(editing.owners || [])];
                            newOwners[index] = {
                              ...owner,
                              name: company.name,
                              siren: company.siren,
                              address: company.address,
                              legalForm: company.legalForm || owner.legalForm,
                              managerFirstName: company.managerFirstName || owner.managerFirstName,
                              managerLastName: company.managerLastName || owner.managerLastName,
                              managerRole: company.managerRole || owner.managerRole,
                            };
                            updateField('owners', newOwners);
                          }}
                          label="Raison sociale (recherche par nom ou SIREN)"
                        />
                        {owner.siren && (
                          <div>
                            <label className="block text-xs mb-1">SIREN</label>
                            <input
                              type="text"
                              value={owner.siren}
                              readOnly
                              className="w-full px-2 py-1 text-xs border rounded bg-gray-50"
                              data-testid={`input-owner-siren-${index}`}
                            />
                            {ownerErrors[index]?.siren && <p className={errCls}>{ownerErrors[index].siren}</p>}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs mb-1">Prénom gérant</label>
                            <input
                              type="text"
                              value={owner.managerFirstName || ''}
                              onChange={(e) => {
                                const newOwners = [...(editing.owners || [])];
                                newOwners[index] = { ...owner, managerFirstName: e.target.value };
                                updateField('owners', newOwners);
                              }}
                              className="w-full px-2 py-1 text-xs border rounded"
                              data-testid={`input-owner-manager-firstname-${index}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1">Nom représentant</label>
                            <input
                              type="text"
                              value={owner.managerLastName || ''}
                              onChange={(e) => {
                                const newOwners = [...(editing.owners || [])];
                                newOwners[index] = { ...owner, managerLastName: e.target.value };
                                updateField('owners', newOwners);
                              }}
                              className="w-full px-2 py-1 text-xs border rounded"
                              data-testid={`input-owner-manager-lastname-${index}`}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs mb-1">Qualité</label>
                            <input
                              type="text"
                              value={owner.managerRole || ''}
                              onChange={(e) => {
                                const newOwners = [...(editing.owners || [])];
                                newOwners[index] = { ...owner, managerRole: e.target.value };
                                updateField('owners', newOwners);
                              }}
                              placeholder="Président, Gérant…"
                              className="w-full px-2 py-1 text-xs border rounded"
                              data-testid={`input-owner-manager-role-${index}`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs mb-1">Forme juridique</label>
                            <input
                              type="text"
                              value={owner.legalForm || ''}
                              onChange={(e) => {
                                const newOwners = [...(editing.owners || [])];
                                newOwners[index] = { ...owner, legalForm: e.target.value };
                                updateField('owners', newOwners);
                              }}
                              placeholder="SAS, SCI…"
                              className="w-full px-2 py-1 text-xs border rounded"
                              data-testid={`input-owner-legalform-${index}`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs mb-1">Prénom</label>
                          <input
                            type="text"
                            value={owner.firstName || ''}
                            onChange={(e) => {
                              const newOwners = [...(editing.owners || [])];
                              newOwners[index] = { ...owner, firstName: e.target.value };
                              updateField('owners', newOwners);
                            }}
                            className="w-full px-2 py-1 text-xs border rounded"
                            data-testid={`input-owner-firstname-${index}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Nom</label>
                          <input
                            type="text"
                            value={owner.lastName || ''}
                            onChange={(e) => {
                              const newOwners = [...(editing.owners || [])];
                              newOwners[index] = { ...owner, lastName: e.target.value };
                              updateField('owners', newOwners);
                            }}
                            className="w-full px-2 py-1 text-xs border rounded"
                            data-testid={`input-owner-lastname-${index}`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-xs mb-1">Email</label>
                        <input
                          type="email"
                          value={owner.email || ''}
                          onChange={(e) => {
                            const newOwners = [...(editing.owners || [])];
                            newOwners[index] = { ...owner, email: e.target.value };
                            updateField('owners', newOwners);
                          }}
                          className={`w-full px-2 py-1 text-xs border rounded ${ownerErrors[index]?.email ? 'border-red-500' : ''}`}
                          data-testid={`input-owner-email-${index}`}
                        />
                        {ownerErrors[index]?.email && <p className={errCls}>{ownerErrors[index].email}</p>}
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Téléphone</label>
                        <input
                          type="tel"
                          value={owner.phone || ''}
                          onChange={(e) => {
                            const newOwners = [...(editing.owners || [])];
                            newOwners[index] = { ...owner, phone: e.target.value };
                            updateField('owners', newOwners);
                          }}
                          className="w-full px-2 py-1 text-xs border rounded"
                          data-testid={`input-owner-phone-${index}`}
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="block text-xs mb-1">Adresse</label>
                      <AddressAutocomplete
                        value={owner.address || ''}
                        onChange={(components) => {
                          const newOwners = [...(editing.owners || [])];
                          newOwners[index] = { ...owner, address: components.address };
                          updateField('owners', newOwners);
                        }}
                        onTextChange={(text) => {
                          const newOwners = [...(editing.owners || [])];
                          newOwners[index] = { ...owner, address: text };
                          updateField('owners', newOwners);
                        }}
                        placeholder="12 rue…, 76000 Rouen"
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prix — dans Informations générales */}
          <div className="mb-3">
            <h3 className="font-semibold text-base mb-2 pb-2 border-b">Prix</h3>
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={!!editing.priceOnRequest} onChange={e => updateField('priceOnRequest', e.target.checked || undefined)} data-testid="input-price-on-request" />
              <span>Prix sur demande — « Nous consulter » (prix à discrétion)</span>
            </label>
            {!editing.priceOnRequest && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="flex justify-between items-center mb-2 pb-2 border-b">
                <h3 className="font-semibold text-base">Finances</h3>
              
              {/* Sélecteur du mode de calcul */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCalculationMode('FROM_NET')}
                  className={`px-4 py-2 border rounded text-sm font-medium ${calculationMode === 'FROM_NET' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  data-testid="button-calc-from-net"
                >
                  Net Vendeur → FAI
                </button>
                <button
                  type="button"
                  onClick={() => setCalculationMode('FROM_FAI')}
                  className={`px-4 py-2 border rounded text-sm font-medium ${calculationMode === 'FROM_FAI' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  data-testid="button-calc-from-fai"
                >
                  FAI → Net Vendeur
                </button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Premier champ: Net Vendeur OU Prix FAI selon le mode */}
              <div>
                {calculationMode === 'FROM_NET' ? (
                  <>
                    <label className="block text-sm font-medium mb-1">Montant Net Vendeur (€)</label>
                    <input
                      type="number"
                      value={editing.netSellerAmount || ''}
                      onChange={(e) => {
                        const netAmount = e.target.value ? parseFloat(e.target.value) : undefined;
                        const updates: any = { netSellerAmount: netAmount };
                        
                        // Recalculer la commission et le FAI
                        if (netAmount && netAmount > 0) {
                          if (editing.commissionPercentage && editing.commissionPercentage > 0) {
                            // Si commission en %, calculer le montant absolu et le FAI
                            const commissionAbs = netAmount * (editing.commissionPercentage / 100);
                            updates.commissionAmount = Math.round(commissionAbs);
                            updates.price = Math.round(netAmount + commissionAbs);
                          } else if (editing.commissionAmount && editing.commissionAmount > 0) {
                            // Si commission en €, calculer le % et le FAI
                            const commissionPct = (editing.commissionAmount / netAmount) * 100;
                            updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                            updates.price = Math.round(netAmount + editing.commissionAmount);
                          } else {
                            // Pas de commission, FAI = net vendeur
                            updates.price = Math.round(netAmount);
                            updates.commissionAmount = undefined;
                            updates.commissionPercentage = undefined;
                          }
                        } else {
                          // Nettoyer tout si pas de montant valide
                          updates.commissionAmount = undefined;
                          updates.commissionPercentage = undefined;
                          updates.price = 0;
                        }
                        
                        setEditing({ ...editing, ...updates });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                      data-testid="input-net-seller-amount"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium mb-1">Prix FAI (€)</label>
                    <input
                      type="number"
                      value={editing.price || ''}
                      onChange={(e) => {
                        const faiAmount = e.target.value ? parseFloat(e.target.value) : 0;
                        const updates: any = { price: faiAmount };
                        
                        // Recalculer le net vendeur
                        if (faiAmount && faiAmount > 0) {
                          if (editing.commissionPercentage && editing.commissionPercentage > 0) {
                            // Si commission en %, calculer le montant absolu et le net vendeur
                            const commissionAbs = faiAmount * (editing.commissionPercentage / 100);
                            updates.commissionAmount = Math.round(commissionAbs);
                            updates.netSellerAmount = Math.round(faiAmount - commissionAbs);
                          } else if (editing.commissionAmount && editing.commissionAmount > 0) {
                            // Si commission en €, calculer le % et le net vendeur
                            const commissionPct = (editing.commissionAmount / faiAmount) * 100;
                            updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                            updates.netSellerAmount = Math.round(faiAmount - editing.commissionAmount);
                          } else {
                            // Pas de commission, net vendeur = FAI
                            updates.netSellerAmount = Math.round(faiAmount);
                            updates.commissionAmount = undefined;
                            updates.commissionPercentage = undefined;
                          }
                        } else {
                          // Nettoyer tout si pas de montant valide
                          updates.netSellerAmount = undefined;
                          updates.commissionAmount = undefined;
                          updates.commissionPercentage = undefined;
                        }
                        
                        setEditing({ ...editing, ...updates });
                      }}
                      className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                      data-testid="input-fai-amount"
                    />
                  </>
                )}
                {priceError && <p className={errCls}>{priceError}</p>}
                {netError && <p className={errCls}>{netError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Commission</label>
                <div className="flex gap-2">
                  {/* Champ commission en % */}
                  {editing.commissionAmount === undefined && (
                    <input
                      type="number"
                      step="0.01"
                      value={editing.commissionPercentage || ''}
                      onChange={(e) => {
                        const commissionPct = e.target.value ? parseFloat(e.target.value) : undefined;
                        const updates: any = { 
                          commissionPercentage: commissionPct
                        };
                        
                        if (calculationMode === 'FROM_NET') {
                          // Mode Net → FAI
                          if (commissionPct && commissionPct > 0 && editing.netSellerAmount && editing.netSellerAmount > 0) {
                            const commissionAbs = editing.netSellerAmount * (commissionPct / 100);
                            updates.commissionAmount = Math.round(commissionAbs);
                            updates.price = Math.round(editing.netSellerAmount + commissionAbs);
                          } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                            updates.price = Math.round(editing.netSellerAmount);
                          } else {
                            updates.price = 0;
                          }
                        } else {
                          // Mode FAI → Net
                          if (commissionPct && commissionPct > 0 && editing.price && editing.price > 0) {
                            const commissionAbs = editing.price * (commissionPct / 100);
                            updates.commissionAmount = Math.round(commissionAbs);
                            updates.netSellerAmount = Math.round(editing.price - commissionAbs);
                          } else if (editing.price && editing.price > 0) {
                            updates.netSellerAmount = Math.round(editing.price);
                          } else {
                            updates.netSellerAmount = undefined;
                          }
                        }
                        
                        setEditing({ ...editing, ...updates });
                      }}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                      data-testid="input-commission-percentage"
                    />
                  )}

                  {/* Champ commission en € */}
                  {editing.commissionAmount !== undefined && (
                    <input
                      type="number"
                      value={editing.commissionAmount || ''}
                      onChange={(e) => {
                        const commissionAbs = e.target.value ? parseInt(e.target.value) : 0;
                        const updates: any = { 
                          commissionAmount: commissionAbs
                        };
                        
                        if (calculationMode === 'FROM_NET') {
                          // Mode Net → FAI
                          if (commissionAbs && commissionAbs > 0 && editing.netSellerAmount && editing.netSellerAmount > 0) {
                            const commissionPct = (commissionAbs / editing.netSellerAmount) * 100;
                            updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                            updates.price = Math.round(editing.netSellerAmount + commissionAbs);
                          } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                            updates.commissionPercentage = undefined;
                            updates.price = Math.round(editing.netSellerAmount);
                          } else {
                            updates.commissionPercentage = undefined;
                            updates.price = 0;
                          }
                        } else {
                          // Mode FAI → Net
                          if (commissionAbs && commissionAbs > 0 && editing.price && editing.price > 0) {
                            const commissionPct = (commissionAbs / editing.price) * 100;
                            updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                            updates.netSellerAmount = Math.round(editing.price - commissionAbs);
                          } else if (editing.price && editing.price > 0) {
                            updates.commissionPercentage = undefined;
                            updates.netSellerAmount = Math.round(editing.price);
                          } else {
                            updates.commissionPercentage = undefined;
                            updates.netSellerAmount = undefined;
                          }
                        }
                        
                        setEditing({ ...editing, ...updates });
                      }}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                      data-testid="input-commission-absolute"
                    />
                  )}

                  {/* Boutons de basculement */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        // Basculer vers % - calculer le % depuis le montant absolu si disponible
                        const updates: any = { 
                          commissionAmount: undefined
                        };
                        
                        // Si on a un montant absolu, calculer le % correspondant
                        if (editing.commissionAmount && editing.commissionAmount > 0) {
                          if (calculationMode === 'FROM_NET' && editing.netSellerAmount && editing.netSellerAmount > 0) {
                            const commissionPct = (editing.commissionAmount / editing.netSellerAmount) * 100;
                            updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                          } else if (calculationMode === 'FROM_FAI' && editing.price && editing.price > 0) {
                            const commissionPct = (editing.commissionAmount / editing.price) * 100;
                            updates.commissionPercentage = parseFloat(commissionPct.toFixed(2));
                          }
                        } else {
                          updates.commissionPercentage = editing.commissionPercentage || undefined;
                        }
                        
                        if (calculationMode === 'FROM_NET') {
                          // Recalculer FAI si on a les données nécessaires
                          if (editing.netSellerAmount && editing.netSellerAmount > 0 && updates.commissionPercentage && updates.commissionPercentage > 0) {
                            const commissionAbs = editing.netSellerAmount * (updates.commissionPercentage / 100);
                            updates.price = Math.round(editing.netSellerAmount + commissionAbs);
                          } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                            updates.price = Math.round(editing.netSellerAmount);
                          }
                        } else {
                          // Recalculer Net si on a les données nécessaires
                          if (editing.price && editing.price > 0 && updates.commissionPercentage && updates.commissionPercentage > 0) {
                            const commissionAbs = editing.price * (updates.commissionPercentage / 100);
                            updates.netSellerAmount = Math.round(editing.price - commissionAbs);
                          } else if (editing.price && editing.price > 0) {
                            updates.netSellerAmount = Math.round(editing.price);
                          }
                        }
                        
                        setEditing({ ...editing, ...updates });
                      }}
                      className={`px-3 py-2 border rounded text-sm font-medium ${editing.commissionAmount === undefined ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      data-testid="button-commission-percentage"
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Basculer vers € - calculer le montant € depuis le % si disponible
                        const updates: any = { 
                          commissionPercentage: undefined
                        };
                        
                        // Si on a un %, calculer le montant absolu correspondant
                        if (editing.commissionPercentage && editing.commissionPercentage > 0) {
                          if (calculationMode === 'FROM_NET' && editing.netSellerAmount && editing.netSellerAmount > 0) {
                            const commissionAbs = editing.netSellerAmount * (editing.commissionPercentage / 100);
                            updates.commissionAmount = Math.round(commissionAbs);
                          } else if (calculationMode === 'FROM_FAI' && editing.price && editing.price > 0) {
                            const commissionAbs = editing.price * (editing.commissionPercentage / 100);
                            updates.commissionAmount = Math.round(commissionAbs);
                          }
                        } else {
                          updates.commissionAmount = editing.commissionAmount !== undefined ? editing.commissionAmount : 0;
                        }
                        
                        if (calculationMode === 'FROM_NET') {
                          // Recalculer FAI si on a les données nécessaires
                          if (editing.netSellerAmount && editing.netSellerAmount > 0 && updates.commissionAmount && updates.commissionAmount > 0) {
                            updates.price = Math.round(editing.netSellerAmount + updates.commissionAmount);
                          } else if (editing.netSellerAmount && editing.netSellerAmount > 0) {
                            updates.price = Math.round(editing.netSellerAmount);
                          }
                        } else {
                          // Recalculer Net si on a les données nécessaires
                          if (editing.price && editing.price > 0 && updates.commissionAmount && updates.commissionAmount > 0) {
                            updates.netSellerAmount = Math.round(editing.price - updates.commissionAmount);
                          } else if (editing.price && editing.price > 0) {
                            updates.netSellerAmount = Math.round(editing.price);
                          }
                        }
                        
                        setEditing({ ...editing, ...updates });
                      }}
                      className={`px-3 py-2 border rounded text-sm font-medium ${editing.commissionAmount !== undefined ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      data-testid="button-commission-absolute"
                    >
                      €
                    </button>
                  </div>
                </div>
              </div>

              {/* Affichage du calcul */}
              {editing.netSellerAmount && editing.price && (editing.commissionAmount || editing.commissionPercentage) && (
                <div className="md:col-span-2 p-4 bg-white border-2 border-blue-400 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Net Vendeur</p>
                      <p className="text-lg font-bold text-gray-900">
                        {editing.netSellerAmount?.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Commission</p>
                      <p className="text-lg font-bold text-blue-600">
                        {editing.commissionAmount?.toLocaleString('fr-FR')} €
                        {editing.commissionPercentage && (
                          <span className="text-sm ml-1">({editing.commissionPercentage}%)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Prix FAI</p>
                      <p className="text-lg font-bold text-green-600">
                        {editing.price?.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Honoraires à la charge de</label>
                <select
                  value={editing.mandateHonorairesCharge || 'ACQUEREUR'}
                  onChange={e => updateField('mandateHonorairesCharge', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  data-testid="input-honoraires-charge"
                >
                  <option value="ACQUEREUR">Charge acquéreur</option>
                  <option value="VENDEUR">Charge vendeur</option>
                </select>
              </div>
            </div>
            </div>
            )}
          </div>

          {/* Mandat — crée un mandat AUTONOME (snapshot du bien), édité dans le registre */}
          <div className="mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={genMandate}
                onClick={async () => {
                  setGenMandate(true);
                  try {
                    const res = await fetch('/api/mandats', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        propertyId: editing.id,
                        title: editing.title, type: editing.type, rooms: editing.rooms,
                        city: editing.city, region: editing.region, map: editing.map, address: editing.map?.query,
                        surface: editing.surface, annexSurface: editing.annexSurface, landSize: editing.landSize,
                        description: editing.description,
                        price: editing.price, netSellerAmount: editing.netSellerAmount,
                        commissionAmount: editing.commissionAmount, commissionPercentage: editing.commissionPercentage,
                        occupancy: editing.occupancy, owners: editing.owners,
                        sellerNotary: editing.sellerNotary, buyerNotary: editing.buyerNotary,
                      }),
                    });
                    const d = await res.json();
                    if (res.ok) {
                      if (await confirm(`Le mandat ${d.mandateNumber} a été créé à partir de ce bien. Le compléter et le signer dans le registre des mandats ?`, { title: 'Mandat généré' })) {
                        window.location.href = '/admin/mandats';
                      }
                    } else { toast(d.error || 'Erreur lors de la génération du mandat.'); }
                  } catch { toast('Erreur réseau.'); }
                  setGenMandate(false);
                }}
                className="btn-luxe text-sm disabled:opacity-60"
                data-testid="button-generate-mandate"
              >
                {genMandate ? 'Génération…' : 'Générer un mandat'}
              </button>
              <span className="text-xs text-gray-500">
                Crée un mandat <strong>autonome</strong> à partir des données de ce bien. Il se complète et se signe ensuite dans le <a href="/admin/mandats" className="underline">registre des mandats</a>.
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={editing.description || ''}
              onChange={e => updateField('description', e.target.value)}
              className="w-full px-2 py-1.5 text-xs border rounded resize-y min-h-[10rem]"
              rows={10}
              data-testid="input-description"
            />
          </div>

          {/* Carte + DPE en 2 colonnes */}
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="p-2 bg-gray-50 rounded">
              <h3 className="font-semibold text-sm mb-2">Carte</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1">Précision</label>
                  <select
                    value={editing.map?.precision || 'AREA'}
                    onChange={e => updateNestedField('map', 'precision', e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="select-map-precision"
                  >
                    <option value="EXACT">Exacte</option>
                    <option value="AREA">Zone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1">Zoom</label>
                  <input
                    type="number"
                    value={editing.map?.zoom || 14}
                    onChange={e => updateNestedField('map', 'zoom', parseInt(e.target.value) || 14)}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="input-map-zoom"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1">Requête</label>
                  <input
                    type="text"
                    value={editing.map?.query || ''}
                    onChange={e => updateNestedField('map', 'query', e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="input-map-query"
                  />
                </div>
              </div>
            </div>

            <div className="p-2 bg-gray-50 rounded">
              <h3 className="font-semibold text-sm mb-2">DPE</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1">Énergie</label>
                  <select
                    value={editing.dpe?.classEnergy || 'D'}
                    onChange={e => updateNestedField('dpe', 'classEnergy', e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="select-dpe-energy"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1">GES</label>
                  <select
                    value={editing.dpe?.classGES || 'D'}
                    onChange={e => updateNestedField('dpe', 'classGES', e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="select-dpe-ges"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1">kWh</label>
                  <input
                    type="number"
                    value={editing.dpe?.consumptionKwh ?? ''}
                    onChange={e => updateNestedField('dpe', 'consumptionKwh', e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0))}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="input-dpe-consumption"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1">kg CO2</label>
                  <input
                    type="number"
                    value={editing.dpe?.emissionsKg ?? ''}
                    onChange={e => updateNestedField('dpe', 'emissionsKg', e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0))}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="input-dpe-emissions"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1">Date</label>
                  <input
                    type="date"
                    value={editing.dpe?.date || ''}
                    onChange={e => updateNestedField('dpe', 'date', e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded"
                    data-testid="input-dpe-date"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Prestations */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Prestations</label>
            <FeaturePicker
              value={editing.features || []}
              onChange={features => updateField('features', features)}
            />
          </div>

          {/* Statut + Options */}
          <div className="mb-3 p-2 bg-gray-50 rounded">
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={editing.featured || false}
                  onChange={e => updateField('featured', e.target.checked)}
                  data-testid="checkbox-featured"
                  className="w-3.5 h-3.5"
                />
                <span>À la une</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={editing.visible !== false}
                  onChange={e => updateField('visible', e.target.checked)}
                  data-testid="checkbox-visible"
                  className="w-3.5 h-3.5"
                />
                <span>Visible</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={editing.entreeDeGamme || false}
                  onChange={e => updateField('entreeDeGamme', e.target.checked)}
                  data-testid="checkbox-entree-gamme"
                  className="w-3.5 h-3.5"
                />
                <span>Entrée de gamme</span>
              </label>
            </div>

            {editing.status === 'SOLD' && (
              <div className="max-w-xs">
                <label className="block text-xs mb-1">Date de vente</label>
                <input
                  type="date"
                  value={editing.soldDate || ''}
                  onChange={e => updateField('soldDate', e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded"
                  data-testid="input-sold-date"
                />
              </div>
            )}
          </div>

          {/* Images */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Images</label>
            <ImageUploader
              images={editing.images || []}
              onChange={images => updateField('images', images)}
            />
          </div>

          {/* Vidéo */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Vidéo (lien YouTube / Vimeo)</label>
            <input
              type="url"
              value={editing.videoUrl || ''}
              onChange={(e) => updateField('videoUrl', e.target.value)}
              className="w-full px-2 py-1 text-xs border rounded"
              placeholder="https://www.youtube.com/watch?v=..."
              data-testid="input-video-url"
            />
          </div>

          {/* Documents (repliable) */}
          <DocumentsSection editing={editing} updateField={updateField} setEditing={setEditing} analyzing={analyzing} analyzeDocument={analyzeDocument} />

          {/* Information de vente : acquéreur, notaires (+ clerc chacun), finances négociées, mobilier */}
          <InfoVenteSection editing={editing} updateField={updateField} />

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#B89C6D] text-white rounded hover:bg-[#A68B5D] disabled:opacity-50"
              data-testid="button-save-property"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={async () => {
                if (dirty && !(await confirm('Vos modifications non enregistrées seront perdues.', { title: 'Abandonner les modifications ?' }))) return;
                setDirty(false);
                setEditing(null);
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              data-testid="button-cancel"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading && <div className="card p-6">Chargement...</div>}

      {!loading && properties.length === 0 && (
        <div className="card p-6 opacity-70">Aucun bien enregistré.</div>
      )}

      {!loading && properties.length > 0 && (() => {
        // Un bien n'est plus « en vente » s'il est vendu OU sous promesse.
        const isUnavailable = (p: Property) =>
          !!p.sold || p.status === 'UNDER_OFFER' || p.status === 'SOLD';
        let filteredProperties = showSoldView
          ? properties.filter(isUnavailable)
          : properties.filter(p => !isUnavailable(p));
        // Vue « vendus » : toujours les biens sous promesse avant les vendus.
        if (showSoldView) {
          filteredProperties = [...filteredProperties].sort(
            (a, b) => (a.status === 'UNDER_OFFER' ? 0 : 1) - (b.status === 'UNDER_OFFER' ? 0 : 1)
          );
        } else {
          // Vue « en vente » : afficher dans l'ordre public (réordonnable)
          filteredProperties = enVenteOrdered();
        }

        return (
          <>
            {/* Compteur */}
            <div className="mb-4 text-lg font-medium text-gray-700">
              {filteredProperties.length} bien{filteredProperties.length > 1 ? 's' : ''} {showSoldView ? 'vendu' : 'en vente'}{filteredProperties.length > 1 ? 's' : ''}
            </div>

            {filteredProperties.length === 0 ? (
              <div className="card p-6 opacity-70">
                Aucun bien {showSoldView ? 'vendu' : 'en vente'}.
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredProperties.map((property, idx) => (
                  <div key={property.id} className="card p-6" data-testid={`property-${property.id}`}>
                    <div className="flex gap-4 justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{propertyLabel(property)}</h3>
                          {property.featured && (
                            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                              À la une
                            </span>
                          )}
                          {property.visible === false && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              Masqué
                            </span>
                          )}
                          {showSoldView && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded font-semibold">
                              {property.soldDate 
                                ? `Vendu le ${new Date(property.soldDate).toLocaleDateString('fr-FR')}` 
                                : 'Vendu'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm opacity-70 mb-2">
                          {property.city} • {property.region} • {property.rooms} pièces • {property.surface} m²
                        </div>
                        <div className="text-lg font-semibold text-[#B89C6D]">
                          {property.price.toLocaleString('fr-FR')} €
                        </div>
                        {/* Indicateur de documents */}
                        {(() => {
                          const docsCount = [
                            property.titleDeed,
                            property.dpeDocument,
                            property.propertyTax,
                            property.mandate,
                            property.estimation,
                            property.floorPlan,
                            property.propertyRules,
                            property.chargesStatement,
                            ...(Array.isArray(property.floorPlans) ? property.floorPlans : []),
                            ...(Array.isArray(property.agMinutes) ? property.agMinutes : [])
                          ].filter(Boolean).length;
                          
                          if (docsCount > 0) {
                            return (
                              <div className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                                📄 {docsCount} document{docsCount > 1 ? 's' : ''} uploadé{docsCount > 1 ? 's' : ''}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex gap-2 items-start">
                        {!showSoldView && (
                          <div className="flex flex-col gap-1 mr-1">
                            <button
                              onClick={() => moveProperty(property.id, 'up')}
                              disabled={idx === 0 || reordering}
                              title="Monter"
                              aria-label="Monter le bien"
                              className="px-2 py-0.5 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              data-testid={`button-move-up-${property.id}`}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveProperty(property.id, 'down')}
                              disabled={idx === filteredProperties.length - 1 || reordering}
                              title="Descendre"
                              aria-label="Descendre le bien"
                              className="px-2 py-0.5 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              data-testid={`button-move-down-${property.id}`}
                            >
                              ↓
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => setViewing(property)}
                          className="px-3 py-1 border border-gray-400 text-gray-700 rounded hover:bg-gray-100"
                          data-testid={`button-view-${property.id}`}
                        >
                          Lecture
                        </button>
                        <button
                          onClick={() => sendNotaireDraft(property)}
                          disabled={notaireBusy === property.id}
                          title="Créer un brouillon Gmail vers les notaires (avec les documents du bien)"
                          className="px-3 py-1 border border-[#1F3B2C] text-[#1F3B2C] rounded hover:bg-[#1F3B2C] hover:text-white disabled:opacity-50"
                          data-testid={`button-notaire-draft-${property.id}`}
                        >
                          {notaireBusy === property.id ? '…' : 'Notaires'}
                        </button>
                        <button
                          onClick={() => startEdit(property)}
                          className="px-3 py-1 border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white"
                          data-testid={`button-edit-${property.id}`}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(property.id)}
                          className="px-3 py-1 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white"
                          data-testid={`button-delete-${property.id}`}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}
      {dialog}
    </AdminShell>
  );
}
