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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
// Le type vivait ici, en tête de 2 227 lignes. Il est partagé depuis le
// 3 septembre 2026 avec la page par bien, qui manipule la même forme.
import type { Bien as Property } from "@/lib/typesBien";



export default function Page() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSoldView, setShowSoldView] = useState(false);
  const [gmail, setGmail] = useState<{ configured: boolean; connected: boolean; email: string }>({ configured: false, connected: false, email: '' });
  const [notaireBusy, setNotaireBusy] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  // Suivi des modifications non enregistrées de la fiche bien.
  // La modification a désormais sa propre adresse : le formulaire vit dans
  // app/admin/contenu/biens/[id]/modifier, plus dans cette page.
  const ouvrirEdition = (p: Partial<Property>) =>
    router.push(p.id ? `/admin/contenu/biens/${p.id}/modifier` : '/admin/contenu/biens/nouveau');
  // Toute modification de `editing` (sauf l'ouverture) marque la fiche « sale ».




  // Fonction pour ouvrir un document dans un nouvel onglet

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
      // Ancien lien ?edit=<id> : on l'honore en redirigeant vers la page dédiée,
      // pour ne casser aucun favori ni aucun lien déjà envoyé.
      openedFromUrl.current = true;
      router.replace(`/admin/contenu/biens/${prop.id}/modifier`);
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
          onClick={() => router.push('/admin/contenu/biens/nouveau')}
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
                        {/* La lecture a désormais sa propre adresse : le lien
                            peut être mis en favori, envoyé, ou rouvert après un
                            rafraîchissement — ce que le panneau dépliant ne
                            permettait pas. */}
                        <Link
                          href={`/admin/contenu/biens/${property.id}`}
                          className="px-3 py-1 border border-gray-400 text-gray-700 rounded hover:bg-gray-100"
                          data-testid={`button-view-${property.id}`}
                        >
                          Lecture
                        </Link>
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
                          onClick={() => ouvrirEdition(property)}
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
