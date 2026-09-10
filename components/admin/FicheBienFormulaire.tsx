"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import FeaturePicker from "@/components/FeaturePicker";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { nombreDecimalFr } from "@/lib/formatFr";
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
  /**
   * Y a-t-il du travail non enregistré ?
   *
   * CALCULÉ, JAMAIS DÉCLARÉ. La version précédente reposait sur un
   * `setDirty(true)` qu'il fallait penser à appeler à chaque champ : il ne
   * l'était NULLE PART dans le projet. `dirty` valait donc false en
   * permanence, et les deux protections qui s'appuient dessus — l'alerte de
   * fermeture d'onglet et la confirmation du bouton Annuler — ne se sont
   * jamais déclenchées. Le formulaire le plus long du back-office était le
   * moins protégé.
   *
   * Comparer un instantané ne s'oublie pas quand on ajoute un champ.
   */
  const enregistre = useRef<string>(JSON.stringify(bienInitial ?? null));
  const [pointDeReference, setPointDeReference] = useState(0);
  const dirty = useMemo(
    () => JSON.stringify(editing ?? null) !== enregistre.current,
    // `pointDeReference` force le recalcul quand l'instantané est reposé après
    // un enregistrement : une ref ne déclenche pas de rendu à elle seule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editing, pointDeReference],
  );
  /**
   * Brouillon LOCAL, dans le navigateur.
   *
   * Pas d'enregistrement automatique vers le serveur ici, contrairement à
   * l'estimation : `handleSave` refuse les fiches incomplètes et NAVIGUE en cas
   * de succès, et sur un bien neuf chaque envoi créerait un doublon. Un
   * brouillon local n'a aucun de ces défauts et couvre le vrai risque : le
   * téléphone qui tue l'onglet en rendez-vous.
   */
  const cleBrouillon = bienInitial?.id ? `bien-brouillon:${bienInitial.id}` : null;
  const [brouillonPropose, setBrouillonPropose] = useState<Partial<Bien> | null>(null);

  useEffect(() => {
    if (!cleBrouillon) return;
    try {
      const brut = localStorage.getItem(cleBrouillon);
      if (!brut) return;
      const { valeur, a } = JSON.parse(brut);
      // Un brouillon plus vieux qu'une semaine n'apprend plus rien.
      if (!valeur || Date.now() - (a || 0) > 7 * 86400000) { localStorage.removeItem(cleBrouillon); return; }
      if (JSON.stringify(valeur) === JSON.stringify(bienInitial)) return;
      setBrouillonPropose(valeur);
    } catch { /* stockage indisponible : on continue sans brouillon */ }
    // Au montage seulement : ensuite c'est l'utilisateur qui décide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cleBrouillon || !dirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(cleBrouillon, JSON.stringify({ valeur: editing, a: Date.now() })); }
      catch { /* quota atteint : le brouillon est un filet, pas une garantie */ }
    }, 1200);
    return () => clearTimeout(t);
  }, [editing, dirty, cleBrouillon]);

  /** Repose l'instantané : ce qui est à l'écran devient « enregistré ». */
  const marquerEnregistre = (valeur?: Partial<Bien> | null) => {
    enregistre.current = JSON.stringify(valeur !== undefined ? valeur : editing ?? null);
    setPointDeReference((n) => n + 1);
    // Le brouillon n'a plus lieu d'être : le garder ferait proposer une
    // restauration de ce qui vient précisément d'être enregistré.
    if (cleBrouillon) { try { localStorage.removeItem(cleBrouillon); } catch {} }
  };
  const [suppression, setSuppression] = useState(false);

  /**
   * Suppression définitive du bien.
   *
   * Déplacée depuis la liste, où elle voisinait « Modifier » sur chaque ligne :
   * un clic de travers sur la mauvaise carte et le bien disparaissait. Ici, il
   * faut d'abord avoir ouvert LA fiche que l'on supprime — le geste engage
   * quelqu'un qui sait ce qu'il regarde.
   */
  const supprimer = async () => {
    if (!editing?.id) return;
    const quoi = [editing.title, editing.city].filter(Boolean).join(' — ') || 'ce bien';
    if (!(await confirm(`« ${quoi} » sera définitivement supprimé, ainsi que ses photos et documents.`,
                        { title: 'Supprimer ce bien ?' }))) return;
    setSuppression(true);
    try {
      const res = await fetch(`/api/properties/${editing.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { toast('Erreur lors de la suppression.'); setSuppression(false); return; }
      // Sans cela l'alerte « modifications non enregistrées » se déclenche en
      // quittant une fiche qui vient précisément d'être effacée.
      marquerEnregistre(null);
      onEnregistre();
    } catch {
      toast('Erreur réseau lors de la suppression.');
      setSuppression(false);
    }
  };

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

  // Résumé porté par l'onglet du tiroir « Prix et finances ». Replier ne doit
  // pas obliger à ouvrir pour lire les deux chiffres qui comptent — ni,
  // surtout, masquer une erreur qui empêche d'enregistrer.
  const eurCourt = (n?: number) =>
    (n || n === 0) ? Math.round(n).toLocaleString('fr-FR') + ' €' : null;
  // Résumés portés par les onglets des tiroirs : replier ne doit pas obliger
  // à ouvrir pour savoir ce qu'il y a dedans.
  const resumeDescription = (() => {
    const d = String(editing?.description || '').trim();
    if (!d) return 'Vide — une fiche vendue sans texte ni photo sort de l\'index';
    const n = d.length;
    // Seuil réel de lib/thinListing : moins de 40 caractères ET au plus une
    // photo, sur un bien VENDU. Sur un bien en vente, la longueur n'exclut rien.
    const vendu = editing?.status === 'SOLD' || editing?.status === 'UNDER_OFFER' || !!(editing as any)?.sold;
    const court = n < 40 && (editing?.images?.length || 0) <= 1 && vendu;
    return `${n} caractère${n > 1 ? 's' : ''}` + (court ? ' — trop court : la fiche sort de l\'index' : '');
  })();

  const resumeCarteDpe = (() => {
    const adresse = String((editing as any)?.map?.query || '').trim();
    const classe = (editing as any)?.dpe?.classEnergy;
    return [
      adresse ? 'adresse renseignée' : 'aucune adresse',
      classe ? `DPE ${classe}` : 'DPE non renseigné',
    ].join(' · ');
  })();

  const resumePrestations = (() => {
    const n = editing?.features?.length || 0;
    return n === 0 ? 'Aucune prestation cochée' : `${n} prestation${n > 1 ? 's' : ''}`;
  })();

  const resumePrix = (() => {
    if (priceError || netError) return '⚠ ' + (priceError || netError) + ' — à corriger pour enregistrer';
    if (editing?.priceOnRequest) return 'Prix sur demande — « Nous consulter »';
    const fai = eurCourt(editing?.price);
    const net = eurCourt(editing?.netSellerAmount);
    if (!fai && !net) return 'Aucun prix saisi';
    return [fai && `${fai} FAI`, net && `net vendeur ${net}`].filter(Boolean).join(' · ');
  })();

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
        marquerEnregistre(propertyToSave as Partial<Bien>);
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

            {brouillonPropose && (
              <div
                className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                data-testid="bandeau-brouillon"
              >
                <span className="mr-auto">
                  Une saisie non enregistrée a été retrouvée sur cette fiche. La reprendre ?
                </span>
                <button
                  type="button"
                  className="rounded border border-amber-400 bg-white px-2.5 py-1 text-xs hover:bg-amber-100"
                  onClick={() => { setEditing(brouillonPropose); setBrouillonPropose(null); }}
                >
                  Reprendre
                </button>
                <button
                  type="button"
                  className="rounded px-2.5 py-1 text-xs hover:bg-amber-100"
                  onClick={() => {
                    if (cleBrouillon) { try { localStorage.removeItem(cleBrouillon); } catch {} }
                    setBrouillonPropose(null);
                  }}
                >
                  Ignorer
                </button>
              </div>
            )}


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
                    className="w-full px-2 py-1.5 text-sm border rounded"
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
                      step="0.01"
                      inputMode="decimal"
                      value={editing.surface ?? ''}
                      onChange={e => updateField('surface', nombreDecimalFr(e.target.value))}
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
                      step="0.01"
                      inputMode="decimal"
                      value={editing.annexSurface || ''}
                      onChange={e => updateField('annexSurface', nombreDecimalFr(e.target.value))}
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

        {/* Ce que le PUBLIC voit du bien. Remonté au-dessus du prix : ce sont
            les trois réglages qu'on vérifie en premier avant de publier, et
            ils vivaient tout en bas, après quatre tiroirs. */}
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="flex gap-4 flex-wrap">
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
        </div>

        {/* Prix, finances et mandat — voir components/admin/SectionFinances.
            En tiroir, comme les photos : le bloc déroule le mode de calcul, le
            net vendeur, la commission et la génération de mandat, alors qu'on
            n'y revient pas à chaque édition.

            DEUX PRÉCAUTIONS. Les chiffres qui comptent — prix FAI et net
            vendeur — sont annoncés sur l'onglet : replier ne doit pas obliger
            à ouvrir pour les lire. Et le tiroir s'ouvre de lui-même si le prix
            porte une erreur : ces erreurs bloquent l'enregistrement, et fermé,
            le tiroir aurait caché la raison du refus. */}
        <CollapsibleSection
          title="Prix et finances"
          subtitle={resumePrix}
          defaultOpen={!!priceError || !!netError}
        >
          <SectionFinances
            bien={editing}
            setBien={setEditing}
            updateField={updateField}
            priceError={priceError}
            netError={netError}
          />
        </CollapsibleSection>
            {/* Description, en tiroir. Le sous-titre compte les caractères et
                rappelle le seuil réel : une fiche VENDUE de moins de 40
                caractères et d'au plus une photo sort de l'index — c'est la
                règle de lib/thinListing, pas une estimation. */}
            <CollapsibleSection title="Description" subtitle={resumeDescription}>
              <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea
                value={editing.description || ''}
                onChange={e => updateField('description', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border rounded resize-y min-h-[10rem]"
                rows={10}
                data-testid="input-description"
              />
              </div>
            </CollapsibleSection>

            {/* Carte et DPE, en tiroir : deux blocs qu'on renseigne une fois. */}
            <CollapsibleSection title="Carte et DPE" subtitle={resumeCarteDpe}>
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
            </CollapsibleSection>

            {/* Prestations, en tiroir : la liste des cases à cocher est longue
                et l'on n'y revient pas à chaque édition. */}
            <CollapsibleSection title="Prestations" subtitle={resumePrestations}>
              <FeaturePicker
                value={editing.features || []}
                onChange={features => updateField('features', features)}
              />
            </CollapsibleSection>

            {/* Photos, en tiroir : la grille de vignettes occupait toute la
                hauteur de l'écran et repoussait le reste du formulaire, alors
                qu'on ne la touche pas à chaque édition. Le nombre est annoncé
                sur l'onglet, pour savoir sans avoir à ouvrir. */}
            <CollapsibleSection
              title="Photos et vidéo"
              subtitle={
                (editing.images?.length || 0) === 0
                  ? "Aucune photo — la fiche sort de l'index sans visuel"
                  : `${editing.images!.length} photo${editing.images!.length > 1 ? 's' : ''}`
                    + ' · la première sert de couverture'
                    + (editing.videoUrl ? ' · une vidéo' : '')
              }
            >
              <ImageUploader
                images={editing.images || []}
                onChange={images => updateField('images', images)}
              />

              {/* La vidéo tient au même sujet que les photos : c'est le visuel
                  du bien. Elle vivait juste sous le tiroir, seule, ce qui
                  laissait une ligne orpheline sous un bloc replié. */}
              <div className="mt-3">
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
            </CollapsibleSection>

            {/* Documents (repliable) */}
            <DocumentsSection editing={editing} updateField={updateField} setEditing={setEditing} analyzing={analyzing} analyzeDocument={analyzeDocument} />

            {/* Information de vente : acquéreur, notaires (+ clerc chacun), finances négociées, mobilier */}
            <InfoVenteSection editing={editing} updateField={updateField} />

            <div className="flex items-center gap-2">
              {dirty && (
                <span className="mr-auto text-sm text-amber-700" data-testid="etat-non-enregistre">
                  ● Modifications non enregistrées
                </span>
              )}
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
                  // `setEditing(null)` laissait une PAGE BLANCHE : le composant
                  // n'a plus rien à rendre. Les deux appelants passent pourtant
                  // un `onAnnule` qui ramène à la liste — il n'était jamais
                  // appelé. On marque d'abord la fiche propre, sinon l'alerte
                  // de sortie se déclenche sur le départ qu'on vient d'accepter.
                  marquerEnregistre();
                  onAnnule();
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
                data-testid="button-cancel"
              >
                Annuler
              </button>

              {/* Écarté des deux autres et repoussé à droite : une action
                  irréversible ne se place pas à côté d'« Annuler ». Absent
                  d'une fiche neuve, qui n'a rien à supprimer. */}
              {editing.id && (
                <button
                  onClick={supprimer}
                  disabled={suppression}
                  className="ml-auto px-4 py-2 border border-red-500 text-red-600 rounded hover:bg-red-500 hover:text-white disabled:opacity-50"
                  data-testid="button-delete-property"
                >
                  {suppression ? 'Suppression…' : 'Supprimer ce bien'}
                </button>
              )}
            </div>
          </div>
    </>
  );
}
