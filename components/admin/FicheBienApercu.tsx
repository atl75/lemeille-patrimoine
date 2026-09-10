"use client";
import { useEffect, useState } from "react";
import { cldImg } from "@/lib/cldImg";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import type { Bien } from "@/lib/typesBien";

// Même visionneuse que le site public : chargée au clic, pas avant.
const Lightbox = dynamic(() => import("@/components/Lightbox"), { ssr: false });

/**
 * Aperçu en lecture seule d'un bien, côté admin.
 *
 * Extrait de app/admin/contenu/biens/page.tsx le 3 septembre 2026 : la page
 * liste embarquait cet aperçu ET le formulaire d'édition, soit 2 227 lignes en
 * un seul fichier. Ce composant sert désormais à deux endroits — le panneau
 * dépliant de la liste, et la page /admin/contenu/biens/[id] qui donne à chaque
 * bien sa propre adresse.
 *
 * `onClose` n'est fourni que par la liste : sur la page dédiée, il n'y a rien
 * à refermer.
 */
export default function FicheBienApercu({
  bien,
  onClose,
}: {
  bien: Bien;
  onClose?: () => void;
}) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  // Agrandissement des photos. La fiche en lecture les affichait en vignettes
  // de 128 px sans aucun moyen de les voir en grand : pour juger une photo
  // avant de publier, c'était trop peu.
  const [zoom, setZoom] = useState<number | null>(null);
  const photos = Array.isArray(bien.images) ? bien.images : [];

  // État de la connexion Gmail, requise pour déposer le brouillon notaire.
  const [gmail, setGmail] = useState<{ connected: boolean; email?: string } | null>(null);
  useEffect(() => {
    fetch("/api/google/status")
      .then((r) => r.json())
      .then(setGmail)
      .catch(() => setGmail({ connected: false }));
  }, []);

  const [envoiNotaire, setEnvoiNotaire] = useState(false);

  // Reprend à l'identique le comportement du bouton de la liste : un
  // BROUILLON est déposé dans Gmail, jamais un envoi. Arthur relit et envoie
  // lui-même — un dossier notaire ne part pas sans relecture.
  const envoyerAuNotaire = async () => {
    if (!gmail?.connected) {
      if (await confirm("Gmail n'est pas connecté. Se connecter maintenant pour déposer le brouillon ?")) {
        window.location.href = `/api/google/oauth/start?return=/admin/contenu/biens/${bien.id}`;
      }
      return;
    }
    setEnvoiNotaire(true);
    try {
      const res = await fetch(`/api/properties/${bien.id}/notaire-draft`, { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        toast(
          `✅ Brouillon créé dans Gmail (${gmail.email})\n` +
          `Destinataires : ${(d.recipients || []).join(", ")}\n` +
          `Pièces jointes : ${d.attachments}\n\n` +
          `Relisez-le dans vos Brouillons avant de l'envoyer.`
        );
      } else {
        toast(d.error || "Erreur lors de la création du brouillon.");
      }
    } catch {
      toast("Erreur réseau.");
    }
    setEnvoiNotaire(false);
  };

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

  return (
    <div className="card p-6 mb-6" data-testid="view-property">
      {dialog}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <h2 className="text-2xl font-semibold">Fiche complète - {bien.title}</h2>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/admin/contenu/biens/${bien.id}/modifier`}
                  className="px-4 py-2 border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white transition-colors"
                  data-testid="button-modifier-bien"
                >
                  Modifier
                </Link>
                <Link
                  href={`/admin/contenu/biens/${bien.id}/ajustement`}
                  title="Comparer le prix aux biens concurrents, pour l'entretien avec le vendeur"
                  className="px-4 py-2 border border-[#B89C6D] text-[#B89C6D] rounded hover:bg-[#B89C6D] hover:text-white transition-colors"
                  data-testid="button-ajustement-prix"
                >
                  Argumentaire de prix
                </Link>
                <button
                  onClick={envoyerAuNotaire}
                  disabled={envoiNotaire}
                  title="Dépose un BROUILLON dans Gmail, avec les documents du bien en pièces jointes. Rien n'est envoyé : vous relisez et vous envoyez."
                  className="px-4 py-2 border border-[#1F3B2C] text-[#1F3B2C] rounded hover:bg-[#1F3B2C] hover:text-white disabled:opacity-50 transition-colors"
                  data-testid="button-dossier-notaire"
                >
                  {envoiNotaire ? "Préparation…" : "Dossier au notaire"}
                </button>
                {onClose && (
                  <button
                    onClick={() => onClose()}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                    data-testid="button-close-view"
                  >
                    Fermer
                  </button>
                )}
              </div>
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
                      <span className="font-medium">{bien.type === 'APPARTEMENT' ? 'Appartement' : 'Maison'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ville :</span>
                      <span className="font-medium">{bien.city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Région :</span>
                      <span className="font-medium">{bien.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix :</span>
                      <span className="font-medium text-[#B89C6D]">{bien.priceOnRequest ? 'Nous consulter' : `${bien.price.toLocaleString('fr-FR')} €`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Surface :</span>
                      <span className="font-medium">{bien.surface} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pièces :</span>
                      <span className="font-medium">{bien.rooms}</span>
                    </div>
                    {bien.landSize && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Terrain :</span>
                        <span className="font-medium">{bien.landSize} m²</span>
                      </div>
                    )}
                    {bien.annexSurface && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Surface hors Carrez :</span>
                        <span className="font-medium">{bien.annexSurface} m²</span>
                      </div>
                    )}
                    {bien.propertyTaxAmount ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxe foncière :</span>
                        <span className="font-medium">{bien.propertyTaxAmount.toLocaleString('fr-FR')} €/an</span>
                      </div>
                    ) : null}
                    {bien.coproChargesMonthly ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Charges copropriété :</span>
                        <span className="font-medium">{bien.coproChargesMonthly.toLocaleString('fr-FR')} €/mois</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Référence :</span>
                      <span className="font-medium">{bien.id}</span>
                    </div>
                    {bien.cadastralReference && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parcelle cadastrale :</span>
                        <span className="font-medium">{bien.cadastralReference}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{bien.description}</p>
                </div>

                {/* Prestations */}
                {bien.features && bien.features.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">Prestations</h3>
                    <div className="flex flex-wrap gap-2">
                      {bien.features.map((feature, idx) => (
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
                      <span className="font-medium">{bien.dpe.classEnergy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Classe GES :</span>
                      <span className="font-medium">{bien.dpe.classGES}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consommation :</span>
                      <span className="font-medium">{bien.dpe.consumptionKwh} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Émissions :</span>
                      <span className="font-medium">{bien.dpe.emissionsKg} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date :</span>
                      <span className="font-medium">{bien.dpe.date}</span>
                    </div>
                  </div>
                </div>

                {/* Configuration carte */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Configuration carte</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Précision :</span>
                      <span className="font-medium">{bien.map.precision === 'EXACT' ? 'Exacte' : 'Zone'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zoom :</span>
                      <span className="font-medium">{bien.map.zoom}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Requête :</span>
                      <p className="font-medium text-xs mt-1 break-words">{bien.map.query}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne droite */}
              <div className="space-y-6">
                {/* Images */}
                {bien.images && bien.images.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3">
                      Images ({bien.images.length})
                      <span className="ml-2 text-xs font-normal opacity-60">cliquez pour agrandir</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {bien.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <button
                            type="button"
                            onClick={() => setZoom(idx)}
                            className="block w-full rounded-lg overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B89C6D]"
                            aria-label={`Agrandir l'image ${idx + 1} sur ${bien.images!.length}`}
                            data-testid={`button-zoom-image-${idx}`}
                          >
                          {/* 320 px, pas l'original : une photo du portefeuille
                              pèse jusqu'à 5,9 Mo, et cette fiche en affiche 28.
                              Le plein format reste servi par la Lightbox au clic. */}
                          <img
                            src={cldImg(img, 320)}
                            alt={`Image ${idx + 1}`}
                            loading="lazy"
                            className="w-full h-32 object-cover rounded-lg border cursor-zoom-in transition-opacity hover:opacity-85"
                          />
                          </button>
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
                
                    if (bien.titleDeed) docs.push({ name: "Titre de propriété", url: bien.titleDeed });
                    if (bien.dpeDocument) docs.push({ name: "Document DPE", url: bien.dpeDocument });
                    if (bien.propertyTax) docs.push({ name: "Taxe foncière", url: bien.propertyTax });
                    if (bien.mandate) docs.push({ name: "Mandat", url: bien.mandate });
                    if (bien.estimation) docs.push({ name: "Estimation", url: bien.estimation });
                    {
                      const vplans = (Array.isArray(bien.floorPlans) && bien.floorPlans.length)
                        ? bien.floorPlans
                        : (bien.floorPlan ? [bien.floorPlan] : []);
                      vplans.forEach((plan: string, idx: number) => {
                        docs.push({ name: vplans.length > 1 ? `Plan ${idx + 1}` : "Plan du bien", url: plan });
                      });
                    }

                    if (bien.type === 'APPARTEMENT') {
                      if (bien.propertyRules) docs.push({ name: "Règlement de propriété", url: bien.propertyRules });
                      if (bien.chargesStatement) docs.push({ name: "Relevé de charges", url: bien.chargesStatement });
                      if (Array.isArray(bien.agMinutes) && bien.agMinutes.length > 0) {
                        bien.agMinutes.forEach((doc: string, idx: number) => {
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

      {/* Visionneuse : la même que celle du site public, avec sa navigation au
          clavier et son aperçu immédiat. Montée seulement au clic. */}
      {zoom !== null && photos.length > 0 && (
        <Lightbox
          images={photos}
          currentIndex={zoom}
          title={bien.title}
          onClose={() => setZoom(null)}
          onNext={() => setZoom((i) => ((i ?? 0) + 1) % photos.length)}
          onPrev={() => setZoom((i) => ((i ?? 0) - 1 + photos.length) % photos.length)}
        />
      )}
          </div>
  );
}
