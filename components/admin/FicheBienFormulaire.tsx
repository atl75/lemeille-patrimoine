"use client";
import { useEffect, useRef, useState } from "react";
import FeaturePicker from "@/components/FeaturePicker";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ImageUploader from "@/components/ImageUploader";
import CompanyAutocomplete from "@/components/CompanyAutocomplete";
import CollapsibleSection from "@/components/CollapsibleSection";
import InfoVenteSection from "@/components/biens/InfoVenteSection";
import DocumentsSection from "@/components/biens/DocumentsSection";
import MoneyInput from "@/components/MoneyInput";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import SectionFinances from "@/components/admin/SectionFinances";
import type { Bien } from "@/lib/typesBien";
import {
  erreursProprietaires,
  erreurPrix,
  erreurNetVendeur,
  erreursFiche,
} from "@/lib/validationBien";

/**
 * Formulaire de création et de modification d'un bien.
 *
 * Deuxième tranche du découpage de app/admin/contenu/biens/page.tsx. Le
 * formulaire y vivait au milieu de la liste et de l'aperçu — 1 231 lignes de
 * rendu, plus l'état et les gestionnaires, dans un fichier de 2 227 lignes.
 *
 * Le code est repris À L'IDENTIQUE, à une exception près : handleSave ne
 * rafraîchit plus la liste lui-même — elle n'est plus là — il appelle
 * `onEnregistre`. C'est le seul changement de comportement, et il est
 * volontaire. Tout le reste est du déplacement, pas de la réécriture : c'est ce
 * qui rend l'opération vérifiable alors qu'aucun test ne couvre cet écran.
 */
export default function FicheBienFormulaire({
  bienInitial,
  onEnregistre,
  onAnnule,
}: {
  bienInitial: Partial<Bien>;
  onEnregistre: () => void;
  onAnnule: () => void;
}) {
  const toast = useToast();
  // useConfirm renvoie aussi le dialogue à monter — sans lui, la confirmation
  // ne s'affiche jamais et la promesse ne se résout pas.
  const { confirm, dialog } = useConfirm();

  const [editing, setEditing] = useState<Partial<Bien> | null>(bienInitial);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [genMandate, setGenMandate] = useState(false);
  const [searchingCadastre, setSearchingCadastre] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'FROM_NET' | 'FROM_FAI'>('FROM_NET');
  const [dirty, setDirty] = useState(false);

  // Avertit avant de quitter la page si des modifications ne sont pas
  // enregistrées. Repris tel quel de la page liste.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  // Les règles vivent dans lib/validationBien, où elles se testent.
  const ownerErrors = erreursProprietaires(editing?.owners);
  const priceError = erreurPrix(editing);
  const netError = erreurNetVendeur(editing);
  const formErrors = erreursFiche(editing);
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
        setDirty(false);
        toast('✅ Bien immobilier enregistré avec succès');
        // Le parent décide de la suite : recharger la liste, ou revenir en arrière.
        onEnregistre();
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

  if (!editing) return null;

  return (
    <>
      {dialog}
    <div className="card p-6 mb-6" data-testid="form-property">
            <h2 className="text-2xl font-semibold mb-4">
              {editing.id ? 'Modifier le bien' : 'Nouveau bien'}
            </h2>

            {/* Tiroir de modification rapide — ce qui change le plus souvent au fil
                d'une commercialisation. Les champs pilotent le même état que ceux
                du formulaire détaillé ci-dessous : les deux restent synchronisés. */}
            <div className="mb-4">
                <CollapsibleSection
                  title="Modifications rapides"
                  subtitle="Prix · description · prestations · photos et vidéo — sans parcourir toute la fiche"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label htmlFor="rapide-prix" className="block text-xs font-medium mb-1">Prix FAI (€)</label>
                      <MoneyInput
                        id="rapide-prix"
                        value={editing.price ?? ''}
                        onChange={e => updateField('price', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-2 py-1.5 text-sm border rounded"
                        placeholder="ex : 250 000"
                        data-testid="input-rapide-prix"
                      />
                      <label className="mt-2 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={!!editing.priceOnRequest}
                          onChange={e => updateField('priceOnRequest', e.target.checked || undefined)}
                        />
                        <span>Prix sur demande — « Nous consulter »</span>
                      </label>
                      <p className="mt-2 text-[11px] opacity-70">
                        Le net vendeur et la commission se recalculent dans la section Finances.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="rapide-video" className="block text-xs font-medium mb-1">Vidéo (YouTube / Vimeo)</label>
                      <input
                        id="rapide-video"
                        type="url"
                        value={editing.videoUrl || ''}
                        onChange={e => updateField('videoUrl', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded"
                        placeholder="https://www.youtube.com/watch?v=…"
                        data-testid="input-rapide-video"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="rapide-description" className="block text-xs font-medium mb-1">Description</label>
                      <textarea
                        id="rapide-description"
                        value={editing.description || ''}
                        onChange={e => updateField('description', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded resize-y min-h-[8rem]"
                        rows={7}
                        data-testid="input-rapide-description"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Prestations</label>
                      <FeaturePicker
                        value={editing.features || []}
                        onChange={features => updateField('features', features)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Photos</label>
                      <ImageUploader
                        images={editing.images || []}
                        onChange={images => updateField('images', images)}
                      />
                    </div>
                  </div>
                </CollapsibleSection>
            </div>

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
                    <MoneyInput
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
                      <MoneyInput
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
                        onClick={() => setEditing(prev => prev ? { ...prev, status: 'OFFER_RECEIVED', sold: false } : null)}
                        className={`px-2 py-1.5 rounded text-left transition-colors ${
                          editing.status === 'OFFER_RECEIVED'
                            ? 'bg-amber-500 text-white font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        data-testid="button-status-offer-received"
                      >
                        ✉ Sous offre
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

        {/* Prix, finances et mandat — voir components/admin/SectionFinances. */}
        <SectionFinances
          bien={editing}
          setBien={setEditing}
          updateField={updateField}
          priceError={priceError}
          netError={netError}
        />
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
                  <span>Bien d&apos;investissement</span>
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
    </>
  );
}
